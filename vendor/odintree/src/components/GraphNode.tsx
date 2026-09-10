import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FileText, Folder, Code2, FileCode, FileJson, Image, FileType, Settings, Database, GitBranch, AlertTriangle, Shield } from "lucide-react";

const LANG_COLORS: Record<string, { bg: string; border: string; dot: string; text: string }> = {
  JavaScript: { bg: "hsla(45, 85%, 55%, 0.08)", border: "hsla(45, 85%, 55%, 0.25)", dot: "hsl(var(--node-yellow))", text: "hsl(var(--node-yellow))" },
  TypeScript: { bg: "hsla(210, 70%, 55%, 0.08)", border: "hsla(210, 70%, 55%, 0.25)", dot: "hsl(var(--node-blue))", text: "hsl(var(--node-blue))" },
  Python: { bg: "hsla(152, 55%, 52%, 0.08)", border: "hsla(152, 55%, 52%, 0.25)", dot: "hsl(var(--node-green))", text: "hsl(var(--node-green))" },
  Java: { bg: "hsla(28, 85%, 56%, 0.08)", border: "hsla(28, 85%, 56%, 0.25)", dot: "hsl(var(--node-orange))", text: "hsl(var(--node-orange))" },
  Go: { bg: "hsla(195, 60%, 50%, 0.08)", border: "hsla(195, 60%, 50%, 0.25)", dot: "hsl(195, 60%, 50%)", text: "hsl(195, 60%, 50%)" },
  Rust: { bg: "hsla(0, 65%, 55%, 0.08)", border: "hsla(0, 65%, 55%, 0.25)", dot: "hsl(var(--node-red))", text: "hsl(var(--node-red))" },
  CSS: { bg: "hsla(270, 50%, 58%, 0.08)", border: "hsla(270, 50%, 58%, 0.25)", dot: "hsl(var(--node-purple))", text: "hsl(var(--node-purple))" },
  SCSS: { bg: "hsla(330, 55%, 55%, 0.08)", border: "hsla(330, 55%, 55%, 0.25)", dot: "hsl(330, 55%, 55%)", text: "hsl(330, 55%, 55%)" },
  HTML: { bg: "hsla(15, 75%, 55%, 0.08)", border: "hsla(15, 75%, 55%, 0.25)", dot: "hsl(15, 75%, 55%)", text: "hsl(15, 75%, 55%)" },
  JSON: { bg: "hsla(45, 50%, 50%, 0.08)", border: "hsla(45, 50%, 50%, 0.25)", dot: "hsl(45, 50%, 50%)", text: "hsl(45, 50%, 50%)" },
  Markdown: { bg: "hsla(0, 0%, 50%, 0.08)", border: "hsla(0, 0%, 50%, 0.25)", dot: "hsl(0, 0%, 50%)", text: "hsl(0, 0%, 50%)" },
  Shell: { bg: "hsla(152, 30%, 45%, 0.08)", border: "hsla(152, 30%, 45%, 0.25)", dot: "hsl(152, 30%, 45%)", text: "hsl(152, 30%, 45%)" },
  Ruby: { bg: "hsla(0, 55%, 50%, 0.08)", border: "hsla(0, 55%, 50%, 0.25)", dot: "hsl(0, 55%, 50%)", text: "hsl(0, 55%, 50%)" },
  Other: { bg: "hsla(0, 0%, 50%, 0.06)", border: "hsla(0, 0%, 50%, 0.15)", dot: "hsl(var(--muted-foreground))", text: "hsl(var(--muted-foreground))" },
};

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["ts", "tsx"].includes(ext)) return <FileCode size={13} />;
  if (["js", "jsx", "mjs"].includes(ext)) return <Code2 size={13} />;
  if (["json", "yaml", "yml", "toml"].includes(ext)) return <FileJson size={13} />;
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext)) return <Image size={13} />;
  if (["css", "scss", "less"].includes(ext)) return <FileType size={13} />;
  if (ext === "sql") return <Database size={13} />;
  if (["config", "rc", "env", "lock"].some((s) => name.includes(s))) return <Settings size={13} />;
  return <FileText size={13} />;
}

function GraphNodeComponent({ data, selected }: NodeProps) {
  const nodeType = (data.nodeType as string) || "file";
  const isDir = nodeType === "dir";
  const isRoot = (data.path as string) === "";
  const label = data.label as string;
  const lang = (data.language as string) || "Other";
  const size = data.size as number | undefined;
  const childCount = data.childCount as number | undefined;
  const vulnCount = (data.vulnCount as number) || 0;
  const complexity = (data.complexity as number) || 0;
  const colors = LANG_COLORS[lang] || LANG_COLORS.Other;

  const sizeLabel = size ? (size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`) : null;

  if (isRoot) {
    return (
      <div
        className={`group relative transition-all duration-200 min-w-[220px] ${selected ? "scale-[1.03] z-10" : "hover:scale-[1.01]"}`}
        style={{
          background: "hsl(var(--card) / 0.95)",
          border: "1px solid hsl(var(--border) / 0.6)",
          borderRadius: "14px",
          backdropFilter: "blur(12px)",
          boxShadow: selected
            ? "0 0 0 2px hsl(var(--accent) / 0.4), 0 8px 24px hsla(0,0%,0%,0.12)"
            : "0 2px 8px hsla(0,0%,0%,0.04)",
          padding: "14px 18px",
        }}
      >
        <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-2 !h-2" />
        <div className="flex items-center gap-2.5">
          <GitBranch size={16} className="shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <span className="text-[13px] font-semibold text-foreground truncate block">{label}</span>
            <span className="text-[10px] text-muted-foreground/60">Repository root</span>
          </div>
        </div>
        <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-2 !h-2" />
      </div>
    );
  }

  // Determine if node has security issues for border highlight
  const hasVulns = vulnCount > 0;
  const borderColor = hasVulns ? "hsla(0, 65%, 55%, 0.5)" : isDir ? "hsl(var(--border) / 0.6)" : colors.border;

  return (
    <div
      className={`group relative transition-all duration-200 min-w-[140px] max-w-[240px] ${selected ? "scale-[1.03] z-10" : "hover:scale-[1.01]"}`}
      style={{
        background: isDir ? "hsl(var(--card) / 0.85)" : colors.bg,
        border: `1px solid ${borderColor}`,
        borderRadius: "12px",
        backdropFilter: "blur(12px)",
        boxShadow: selected
          ? `0 0 0 2px hsl(var(--accent) / 0.4), 0 8px 24px hsla(0,0%,0%,0.12)`
          : hasVulns
          ? "0 2px 12px hsla(0, 65%, 55%, 0.15)"
          : "0 2px 8px hsla(0,0%,0%,0.04)",
        padding: "10px 14px",
      }}
    >
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-2 !h-2" />

      {/* Vulnerability badge */}
      {hasVulns && (
        <div
          className="absolute -top-2 -right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold z-10"
          style={{
            background: "hsl(var(--node-red))",
            color: "white",
            boxShadow: "0 2px 6px hsla(0, 65%, 55%, 0.4)",
          }}
        >
          <AlertTriangle size={8} />
          {vulnCount}
        </div>
      )}

      {/* Complexity indicator */}
      {!isDir && complexity > 15 && (
        <div
          className="absolute -top-2 -left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold z-10"
          style={{
            background: complexity > 25 ? "hsl(var(--node-orange))" : "hsl(var(--node-yellow))",
            color: "white",
            boxShadow: "0 2px 6px hsla(0, 0%, 0%, 0.2)",
          }}
        >
          C{complexity}
        </div>
      )}

      <div className="flex items-center gap-2">
        {isDir ? (
          <Folder size={14} className="shrink-0 text-muted-foreground" />
        ) : (
          <span style={{ color: colors.text }} className="shrink-0">
            {getFileIcon(label)}
          </span>
        )}
        <span className="text-[12px] font-medium text-foreground truncate">{label}</span>
      </div>

      <div className="flex items-center gap-2 mt-1.5">
        {!isDir && lang !== "Other" && (
          <span className="flex items-center gap-1">
            <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: colors.dot }} />
            <span className="text-[9px] font-medium" style={{ color: colors.text }}>{lang}</span>
          </span>
        )}
        {isDir && childCount !== undefined && (
          <span className="text-[9px] text-muted-foreground/60">{childCount} items</span>
        )}
        {sizeLabel && (
          <span className="text-[9px] text-muted-foreground/50 ml-auto">{sizeLabel}</span>
        )}
        {!isDir && hasVulns && (
          <Shield size={9} className="ml-auto" style={{ color: "hsl(var(--node-red))" }} />
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-2 !h-2" />
    </div>
  );
}

export const GraphNodeType = memo(GraphNodeComponent);
