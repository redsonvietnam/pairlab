import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, Copy, Wand2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { CommitHeatmap } from "./CommitHeatmap";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  fetchCommits, enrichCommitsWithChurn, fetchMilestones,
  bucketByMonth, buildHeatmap, detectBiggestRewrites,
  type RawCommit, type MonthBucket, type Milestone, type BiggestRewrite, type HeatmapCell,
} from "@/lib/commit-timeline";

interface Props {
  owner: string;
  repo: string;
  onClose: () => void;
}

type ActivitySummary = {
  digest: string[];
  changelog: string;
  readmeSnippet: string;
  highlights: string[];
};

export function TimelineOverlay({ owner, repo, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose, true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commits, setCommits] = useState<RawCommit[]>([]);
  const [buckets, setBuckets] = useState<MonthBucket[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [rewrites, setRewrites] = useState<BiggestRewrite[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const [window, setWindow] = useState<7 | 30 | 90>(7);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [summaryError, setSummaryError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const raw = await fetchCommits(owner, repo, 200);
        if (cancelled) return;
        setCommits(raw);
        setBuckets(bucketByMonth(raw));
        setHeatmap(buildHeatmap(raw));
        const enriched = await enrichCommitsWithChurn(owner, repo, raw, 15);
        if (cancelled) return;
        setRewrites(detectBiggestRewrites(enriched));
        const ms = await fetchMilestones(owner, repo);
        if (cancelled) return;
        setMilestones(ms);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load commit history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [owner, repo]);

  const runSummary = async () => {
    setSummarizing(true);
    setSummaryError("");
    try {
      const cutoff = Date.now() - window * 24 * 60 * 60 * 1000;
      const filtered = commits.filter((c) => new Date(c.date).getTime() >= cutoff);
      if (filtered.length === 0) {
        setSummaryError(`No commits in the last ${window} days.`);
        return;
      }
      const { aiOverridePayload } = await import("@/lib/user-config");
      const { data, error } = await supabase.functions.invoke("summarize-activity", {
        body: { commits: filtered, repoName: `${owner}/${repo}`, windowDays: window, ...aiOverridePayload() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSummary(data as ActivitySummary);
    } catch (e: any) {
      setSummaryError(e?.message || "Failed to summarize activity");
    } finally {
      setSummarizing(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 odin-overlay-backdrop flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        ref={ref}
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl odin-overlay-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Commit timeline"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-card/95 backdrop-blur border-b border-border/40">
          <div>
            <h2 className="text-2xl font-display">Commit story</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{owner}/{repo}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-6 space-y-8">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Loading commit history...
            </div>
          )}
          {error && <div className="text-sm text-destructive">{error}</div>}

          {!loading && !error && (
            <>
              {/* Heatmap */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Commit intensity
                </h3>
                <CommitHeatmap cells={heatmap} />
              </section>

              {/* Monthly timeline */}
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Monthly timeline
                </h3>
                <div className="space-y-2">
                  {buckets.length === 0 && <div className="text-xs text-muted-foreground">No commits loaded.</div>}
                  {buckets.map((b) => (
                    <div key={b.key} className="flex items-baseline gap-4 py-2 border-b border-border/20">
                      <div className="w-24 text-sm font-display">{b.label}</div>
                      <div className="flex-1">
                        <div className="text-sm">{b.theme}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {b.count} commit{b.count === 1 ? "" : "s"}
                          {b.authors.length > 0 && ` · ${b.authors.map((a) => `${a.name} (${a.count})`).join(", ")}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Biggest rewrites */}
              {rewrites.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Biggest rewrites
                  </h3>
                  <div className="space-y-2">
                    {rewrites.map((r) => (
                      <div key={r.sha} className="flex items-start gap-3 text-sm py-2 border-b border-border/20">
                        <code className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{r.sha.slice(0, 7)}</code>
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{r.message}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.author} · {r.churn.toLocaleString()} lines changed across {r.files} files
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Milestones */}
              {milestones.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Milestones
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {milestones.slice(0, 8).map((m, i) => (
                      <div key={i} className="rounded-lg border border-border/30 p-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="font-display text-base truncate">{m.name}</div>
                          {m.date && <div className="text-xs text-muted-foreground">{m.date.slice(0, 10)}</div>}
                        </div>
                        {m.body && <div className="text-xs text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap">{m.body}</div>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Activity report */}
              <section>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    AI activity report
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-border/40 overflow-hidden text-xs">
                      {([7, 30, 90] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setWindow(d)}
                          className={`px-2.5 py-1 ${window === d ? "bg-foreground text-background" : "bg-transparent text-muted-foreground hover:bg-secondary"}`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={runSummary}
                      disabled={summarizing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-foreground text-background disabled:opacity-50"
                    >
                      {summarizing ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      {summarizing ? "Summarizing" : summary ? "Regenerate" : "Generate"}
                    </button>
                  </div>
                </div>
                {summaryError && <div className="text-xs text-destructive mb-2">{summaryError}</div>}
                {summary && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">Digest</div>
                        <button onClick={() => copy(summary.digest.map((d) => `- ${d}`).join("\n"), "Digest")} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Copy size={11} /> Copy</button>
                      </div>
                      <ul className="text-sm space-y-1 list-disc pl-5">
                        {summary.digest.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">Changelog</div>
                        <button onClick={() => copy(summary.changelog, "Changelog")} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Copy size={11} /> Copy</button>
                      </div>
                      <pre className="text-xs bg-secondary/40 p-3 rounded-lg whitespace-pre-wrap font-mono">{summary.changelog}</pre>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">README snippet</div>
                        <button onClick={() => copy(summary.readmeSnippet, "README snippet")} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Copy size={11} /> Copy</button>
                      </div>
                      <p className="text-sm text-foreground/90">{summary.readmeSnippet}</p>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
