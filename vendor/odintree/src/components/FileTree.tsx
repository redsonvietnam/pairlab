import { useState, useMemo, useCallback, useEffect } from "react";
import { ChevronRight, File, Folder, FolderOpen, PanelRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { RepoFile } from "@/lib/github";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TreeNode {
  id: string;
  name: string;
  type: "folder" | "file";
  children?: TreeNode[];
}

function buildTree(files: RepoFile[]): TreeNode[] {
  const root: TreeNode = { id: "__root", name: "", type: "folder", children: [] };
  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const id = parts.slice(0, i + 1).join("/");
      const isLast = i === parts.length - 1;
      let child = current.children?.find((c) => c.id === id);
      if (!child) {
        child = { id, name: parts[i], type: isLast && file.type !== "dir" ? "file" : "folder", ...(isLast && file.type !== "dir" ? {} : { children: [] }) };
        if (!current.children) current.children = [];
        current.children.push(child);
      }
      current = child;
    }
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => { if (a.type === "folder" && b.type !== "folder") return -1; if (a.type !== "folder" && b.type === "folder") return 1; return a.name.localeCompare(b.name); });
    nodes.forEach((n) => { if (n.children) sort(n.children); });
  };
  if (root.children) sort(root.children);
  return root.children || [];
}

function flattenVisible(nodes: TreeNode[], expanded: Set<string>): TreeNode[] {
  const result: TreeNode[] = [];
  for (const n of nodes) {
    result.push(n);
    if (n.type === "folder" && expanded.has(n.id) && n.children) result.push(...flattenVisible(n.children, expanded));
  }
  return result;
}

function TreeItem({ node, depth, selectedId, focusedId, expanded, onSelect, onToggle }: {
  node: TreeNode; depth: number; selectedId: string | null; focusedId: string | null; expanded: Set<string>;
  onSelect: (id: string) => void; onToggle: (id: string) => void;
}) {
  const isFolder = node.type === "folder";
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const isFocused = focusedId === node.id;
  const hasChildren = isFolder && node.children && node.children.length > 0;

  return (
    <div>
      <button
        onClick={() => { if (isFolder) onToggle(node.id); onSelect(node.id); }}
        className={cn(
          "w-full text-left flex items-center gap-1.5 py-[5px] pr-3 text-[13px] rounded-lg transition-all duration-100 relative",
          isSelected ? "bg-secondary text-foreground" : isFocused ? "bg-secondary/60 text-foreground" : "text-foreground/70 hover:bg-secondary/40 hover:text-foreground"
        )}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
      >
        {isFolder ? (
          <motion.span animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.15 }} className="shrink-0 text-muted-foreground">
            <ChevronRight size={11} />
          </motion.span>
        ) : <span className="w-[11px] shrink-0" />}

        {isFolder ? (isOpen ? <FolderOpen size={13} className="shrink-0 text-muted-foreground" /> : <Folder size={13} className="shrink-0 text-muted-foreground/70" />) : <File size={13} className="shrink-0 text-muted-foreground/50" />}

        <span className="truncate">{node.name}</span>

        {isFolder && hasChildren && <span className="ml-auto text-[9px] text-muted-foreground/30 tabular-nums">{node.children!.length}</span>}
      </button>

      <AnimatePresence initial={false}>
        {isFolder && isOpen && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            {node.children!.map((child) => (
              <TreeItem key={child.id} node={child} depth={depth + 1} selectedId={selectedId} focusedId={focusedId} expanded={expanded} onSelect={onSelect} onToggle={onToggle} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FileTreeProps {
  files: RepoFile[];
  selectedPath: string | null;
  onSelectFile: (path: string, type: "file" | "dir") => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function FileTree({ files, selectedPath, onSelectFile, collapsed, onToggleCollapse }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const toggle = useCallback((id: string) => { setExpanded((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }, []);
  const flat = useMemo(() => flattenVisible(tree, expanded), [tree, expanded]);

  useEffect(() => {
    const nextExpanded = new Set<string>();
    tree.forEach((node) => {
      if (node.type === "folder") nextExpanded.add(node.id);
    });
    setExpanded(nextExpanded);
    setFocusedId(null);
  }, [tree]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = flat.findIndex((n) => n.id === (focusedId || selectedPath));
    if (idx === -1 && flat.length > 0 && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); setFocusedId(flat[0].id); return; }
    const cur = flat[idx];
    if (!cur) return;
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setFocusedId(flat[Math.min(flat.length - 1, idx + 1)].id); break;
      case "ArrowUp": e.preventDefault(); setFocusedId(flat[Math.max(0, idx - 1)].id); break;
      case "ArrowRight": e.preventDefault(); if (cur.type === "folder" && !expanded.has(cur.id)) toggle(cur.id); else if (cur.type === "folder" && cur.children?.length && idx + 1 < flat.length) setFocusedId(flat[idx + 1].id); break;
      case "ArrowLeft": e.preventDefault(); if (cur.type === "folder" && expanded.has(cur.id)) toggle(cur.id); else { const parent = cur.id.includes("/") ? cur.id.substring(0, cur.id.lastIndexOf("/")) : null; if (parent) { const pi = flat.findIndex((n) => n.id === parent); if (pi !== -1) setFocusedId(flat[pi].id); } } break;
      case "Enter": case " ": e.preventDefault(); if (cur.type === "folder") toggle(cur.id); onSelectFile(cur.id, cur.type === "folder" ? "dir" : "file"); break;
    }
  }, [flat, focusedId, selectedPath, expanded, toggle, onSelectFile]);

  return (
    <div className="h-full flex flex-col focus:outline-none" tabIndex={collapsed ? -1 : 0} onKeyDown={collapsed ? undefined : handleKeyDown}>
      <div className={cn("flex items-center border-b border-border/30 min-h-12", collapsed ? "justify-center px-2 py-2" : "justify-between px-3 py-2.5")}>
        <motion.div
          initial={false}
          animate={collapsed ? { opacity: 0, width: 0, x: -8 } : { opacity: 1, width: "auto", x: 0 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          className="min-w-0 overflow-hidden"
        >
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.2em] whitespace-nowrap">Explorer</span>
        </motion.div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleCollapse}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/40 bg-card/50 text-muted-foreground transition-colors hover:bg-secondary/60"
              aria-label={collapsed ? "Expand file tree" : "Collapse file tree"}
            >
              <PanelRight size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{collapsed ? "Expand file tree" : "Collapse file tree"}</TooltipContent>
        </Tooltip>
      </div>

      <motion.div
        initial={false}
        animate={collapsed ? { opacity: 0, x: -12, clipPath: "inset(0 100% 0 0 round 16px)" } : { opacity: 1, x: 0, clipPath: "inset(0 0 0 0 round 16px)" }}
        transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
        className={cn("flex-1 overflow-y-auto py-2 px-1.5", collapsed && "pointer-events-none select-none")}
      >
        {tree.map((node) => (
          <TreeItem key={node.id} node={node} depth={0} selectedId={selectedPath} focusedId={focusedId} expanded={expanded} onSelect={(id) => { setFocusedId(id); const file = files.find((f) => f.path === id); onSelectFile(id, file?.type || "file"); }} onToggle={toggle} />
        ))}
      </motion.div>
    </div>
  );
}
