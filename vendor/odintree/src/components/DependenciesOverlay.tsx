import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, ShieldAlert } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { extractDependencies, analyzeDependencies, type DepRiskReport } from "@/lib/dependency-risk";

interface Props {
  files: { path: string; content: string }[];
  onClose: () => void;
}

export function DependenciesOverlay({ files, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose, true);

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [report, setReport] = useState<DepRiskReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const deps = extractDependencies(files);
        if (deps.length === 0) {
          setError("No dependency manifests detected (package.json, requirements.txt, Cargo.toml, go.mod, Gemfile).");
          setLoading(false);
          return;
        }
        setProgress({ done: 0, total: deps.length });
        const r = await analyzeDependencies(deps, (done, total) => {
          if (!cancelled) setProgress({ done, total });
        });
        if (!cancelled) setReport(r);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to analyze dependencies");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [files]);

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
        role="dialog" aria-modal="true" aria-label="Dependency risk"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-card/95 backdrop-blur border-b border-border/40">
          <h2 className="text-2xl font-display">Dependency risk</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary" aria-label="Close"><X size={16} /></button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Scanning {progress.done}/{progress.total || "..."} dependencies
            </div>
          )}
          {error && <div className="text-sm text-destructive">{error}</div>}

          {report && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                {[
                  { label: "Total", value: report.totals.total },
                  { label: "Outdated", value: report.totals.outdated },
                  { label: "Vulnerable", value: report.totals.vulnerable },
                  { label: "Abandoned", value: report.totals.abandoned },
                  { label: "High risk", value: report.totals.highRisk },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border/30 p-3">
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="text-2xl font-display">{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border/30 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2">Package</th>
                      <th className="text-left px-3 py-2">Eco</th>
                      <th className="text-left px-3 py-2">Installed</th>
                      <th className="text-left px-3 py-2">Latest</th>
                      <th className="text-left px-3 py-2">Risk</th>
                      <th className="text-left px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r) => (
                      <tr key={`${r.ecosystem}:${r.name}`} className="border-t border-border/20">
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{r.ecosystem}</td>
                        <td className="px-3 py-2 text-xs">{r.version}</td>
                        <td className="px-3 py-2 text-xs">{r.latest || "?"}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full"
                                style={{
                                  width: `${r.riskScore}%`,
                                  background: r.riskScore >= 50 ? "hsl(var(--destructive))" : "hsl(var(--foreground))",
                                }}
                              />
                            </div>
                            <span className="text-xs tabular-nums">{r.riskScore}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {r.notes.length === 0 ? "ok" : r.notes.join(" · ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {report.totals.vulnerable > 0 && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <ShieldAlert size={14} className="text-destructive mt-0.5" />
                  <div>
                    Vulnerability data via OSV.dev. Versions parsed from manifests; transitive dependencies are not analyzed here.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
