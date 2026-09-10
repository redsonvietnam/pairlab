import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Search, FileText, Folder, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { RepoFile } from "@/lib/github";

interface SpotlightSearchProps {
  open: boolean;
  onClose: () => void;
  files: RepoFile[];
  onSelectFile: (path: string, type: "file" | "dir") => void;
  fileContents?: Record<string, string>;
}

// Build a simple inverted index for fast content search
function buildIndex(fileContents: Record<string, string>): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  for (const [path, content] of Object.entries(fileContents)) {
    const tokens = content.toLowerCase().split(/[\s\W]+/).filter((t) => t.length > 2);
    const unique = new Set(tokens);
    for (const token of unique) {
      if (!index.has(token)) index.set(token, new Set());
      index.get(token)!.add(path);
    }
  }
  return index;
}

export function SpotlightSearch({ open, onClose, files, onSelectFile, fileContents }: SpotlightSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build inverted index for search performance
  const searchIndex = useMemo(() => {
    return fileContents ? buildIndex(fileContents) : new Map();
  }, [fileContents]);

  const results = useMemo(() => {
    if (query.length === 0) return files.filter((f) => f.type === "file").slice(0, 8);
    
    const q = query.toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    
    // Score each file
    const scored: { file: RepoFile; score: number }[] = [];
    
    for (const file of files) {
      let score = 0;
      const nameL = file.name.toLowerCase();
      const pathL = file.path.toLowerCase();
      
      // Name exact match
      if (nameL === q) score += 100;
      // Name starts with
      else if (nameL.startsWith(q)) score += 50;
      // Name contains
      else if (nameL.includes(q)) score += 30;
      // Path contains
      if (pathL.includes(q)) score += 10;
      
      // Content search via index
      if (fileContents?.[file.path]) {
        const content = fileContents[file.path].toLowerCase();
        for (const token of tokens) {
          // Check index first for performance
          if (searchIndex.has(token) && searchIndex.get(token)!.has(file.path)) {
            score += 5;
          }
          // Direct substring for multi-word queries
          if (content.includes(q)) {
            score += 15;
          }
        }
      }
      
      if (score > 0) scored.push({ file, score });
    }
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((s) => s.file);
  }, [query, files, fileContents, searchIndex]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        onSelectFile(results[selectedIndex].path, results[selectedIndex].type);
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [results, selectedIndex, onSelectFile, onClose]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const getSnippet = (file: RepoFile): string | null => {
    if (!query || !fileContents?.[file.path]) return null;
    const content = fileContents[file.path];
    const idx = content.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return null;
    const start = Math.max(0, idx - 30);
    const end = Math.min(content.length, idx + query.length + 40);
    return (start > 0 ? "..." : "") + content.slice(start, end) + (end < content.length ? "..." : "");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
        onClick={onClose}
      >
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-[560px] bg-card rounded-xl border border-border shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <Search size={18} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search files, code, symbols..."
              className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
            />
            <kbd className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-mono">ESC</kbd>
          </div>

          {/* Results */}
          <div className="max-h-[340px] overflow-y-auto py-2">
            {results.length === 0 && query.length > 0 && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">No results found for "{query}"</p>
              </div>
            )}
            {results.map((file, i) => {
              const snippet = getSnippet(file);
              return (
                <button
                  key={file.path}
                  onClick={() => {
                    onSelectFile(file.path, file.type);
                    onClose();
                  }}
                  className={`w-full text-left px-5 py-2.5 flex items-start gap-3 transition-colors ${
                    i === selectedIndex ? "bg-secondary" : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {file.type === "dir" ? (
                      <Folder size={16} className="text-muted-foreground" />
                    ) : (
                      <FileText size={16} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{file.name}</span>
                      <ArrowRight size={10} className="text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">{file.path}</span>
                    </div>
                    {snippet && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{snippet}</p>
                    )}
                  </div>
                  {file.language && file.language !== "Other" && (
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{file.language}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><kbd className="bg-secondary px-1 py-0.5 rounded font-mono">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="bg-secondary px-1 py-0.5 rounded font-mono">↵</kbd> open</span>
            <span className="flex items-center gap-1"><kbd className="bg-secondary px-1 py-0.5 rounded font-mono">esc</kbd> close</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
