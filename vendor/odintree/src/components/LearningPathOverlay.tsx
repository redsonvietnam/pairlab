import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, GraduationCap, Clock } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { supabase } from "@/integrations/supabase/client";

interface Step {
  order: number;
  title: string;
  file: string;
  why: string;
  focus: string[];
  estimatedMinutes: number;
}

interface Path {
  title: string;
  summary: string;
  steps: Step[];
  followups: string[];
}

interface Props {
  repoName: string;
  filePaths: string[];
  focusPath?: string;
  summaries?: { path: string; role?: string; purpose?: string }[];
  onSelectFile?: (path: string) => void;
  onClose: () => void;
}

export function LearningPathOverlay({ repoName, filePaths, focusPath, summaries, onSelectFile, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose, true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [path, setPath] = useState<Path | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { aiOverridePayload } = await import("@/lib/user-config");
        const { data, error: err } = await supabase.functions.invoke("learning-path", {
          body: { repoName, filePaths, focusPath, summaries, ...aiOverridePayload() },
        });
        if (cancelled) return;
        if (err) throw err;
        if ((data as any)?.error) throw new Error((data as any).error);
        setPath(data as Path);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to build learning path");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [repoName, focusPath]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 odin-overlay-backdrop flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        ref={ref}
        initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
        className="relative w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl odin-overlay-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Learning path"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-card/95 backdrop-blur border-b border-border/40">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-foreground" />
            <div>
              <h2 className="text-lg font-display font-semibold">Learning path</h2>
              <p className="text-[11px] text-muted-foreground">{repoName}{focusPath ? ` · focused on ${focusPath}` : ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary" aria-label="Close"><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Building learning path...
            </div>
          )}
          {error && <div className="text-sm text-destructive">{error}</div>}
          {path && (
            <>
              <p className="text-[13px] text-foreground/90 leading-relaxed">{path.summary}</p>
              <ol className="space-y-3">
                {path.steps.map((s) => (
                  <li key={s.order} className="rounded-xl border border-border/40 p-4 bg-secondary/20">
                    <div className="flex items-baseline gap-3">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-foreground text-background text-[12px] font-bold flex items-center justify-center tabular-nums">{s.order}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-[14px] font-semibold text-foreground">{s.title}</span>
                          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1"><Clock size={10} /> {s.estimatedMinutes} min</span>
                        </div>
                        <button
                          onClick={() => onSelectFile?.(s.file)}
                          className="block mt-1 text-[11px] font-mono text-foreground/80 hover:underline truncate"
                        >
                          {s.file}
                        </button>
                        <p className="text-[12.5px] text-foreground/85 leading-relaxed mt-2">{s.why}</p>
                        {s.focus.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {s.focus.map((f, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-background/70 border border-border/40 text-foreground/80">{f}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              {path.followups.length > 0 && (
                <div className="rounded-xl border border-border/40 p-4">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Follow-ups</p>
                  <ul className="space-y-1.5 list-disc pl-5">
                    {path.followups.map((f, i) => <li key={i} className="text-[12.5px] text-foreground/85">{f}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
