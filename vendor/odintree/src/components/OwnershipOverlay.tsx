import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, Users, AlertTriangle } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { analyzeOwnership, type OwnershipReport } from "@/lib/code-ownership";

interface Props {
  owner: string;
  repo: string;
  filePaths: string[];
  onClose: () => void;
}

export function OwnershipOverlay({ owner, repo, filePaths, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose, true);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [report, setReport] = useState<OwnershipReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await analyzeOwnership(owner, repo, filePaths, {
          maxFiles: 50,
          onProgress: (done, total) => !cancelled && setProgress({ done, total }),
        });
        if (!cancelled) setReport(r);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to analyze ownership");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [owner, repo, filePaths]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 odin-overlay-backdrop flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        ref={ref}
        initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl odin-overlay-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Code ownership"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-card/95 backdrop-blur border-b border-border/40">
          <h2 className="text-2xl font-display">Code ownership</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary" aria-label="Close"><X size={16} /></button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Analyzing {progress.done}/{progress.total || filePaths.length} files
            </div>
          )}
          {error && <div className="text-sm text-destructive">{error}</div>}

          {report && (
            <>
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  <Users size={12} className="inline mr-1" /> Top contributors
                </h3>
                <div className="flex flex-wrap gap-2">
                  {report.contributors.slice(0, 12).map((c) => (
                    <div key={c.login} className="flex items-center gap-2 px-2 py-1 rounded-full border border-border/30 text-xs">
                      {c.avatar && <img src={c.avatar} alt="" className="w-5 h-5 rounded-full" />}
                      <span>{c.login}</span>
                      <span className="text-muted-foreground">{c.contributions}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Folder ownership
                </h3>
                <div className="space-y-1">
                  {report.folders.map((f) => (
                    <div key={f.folder} className="flex items-center gap-3 text-sm py-1.5 border-b border-border/20">
                      <div className="flex-1 truncate font-mono text-xs">{f.folder}</div>
                      <div className="text-xs text-muted-foreground">{f.files} file{f.files === 1 ? "" : "s"}</div>
                      <div className="text-xs">{f.primaryAuthor}</div>
                      <div className="w-14 text-right text-xs tabular-nums">{Math.round(f.primaryShare * 100)}%</div>
                    </div>
                  ))}
                </div>
              </section>

              {report.risky.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    <AlertTriangle size={12} className="inline mr-1" /> Risky concentration
                  </h3>
                  <ul className="text-sm space-y-1">
                    {report.risky.map((r) => (
                      <li key={r.folder} className="text-muted-foreground">
                        <span className="font-mono text-xs text-foreground">{r.folder}</span> is {Math.round(r.primaryShare * 100)}% owned by {r.primaryAuthor}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {report.orphaned.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Orphaned files (no commits in 12+ months)
                  </h3>
                  <ul className="text-sm space-y-1">
                    {report.orphaned.slice(0, 20).map((f) => (
                      <li key={f.path} className="font-mono text-xs text-muted-foreground">{f.path}</li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
