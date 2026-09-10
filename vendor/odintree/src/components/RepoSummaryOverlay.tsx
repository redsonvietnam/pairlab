import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Shield, TrendingUp, AlertTriangle, Layers, Code2, Bug, Network, GitBranch, Crosshair, FileDown, FileText, Loader2, Copy, Check, BookOpen, Boxes, ListOrdered, Cpu, Globe2, Library, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AIAnalysisDebug, AIRepoAnalysis, AIRepoSummary } from "@/lib/ai-analysis";
import { revalidateRawAnalysis, renderVerification } from "@/lib/ai-analysis";
import { MermaidDiagram } from "./MermaidDiagram";
import { downloadMarkdown, downloadPdf } from "@/lib/security-report";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { toast } from "sonner";

interface RepoSummaryOverlayProps {
  summary: AIRepoSummary;
  debug?: AIAnalysisDebug;
  onClose: () => void;
  repoName?: string;
  /** Files used to revalidate edited debug payloads. */
  files?: { path: string; content: string; language?: string }[];
}

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? "hsl(152, 55%, 45%)" : score >= 50 ? "hsl(45, 70%, 50%)" : "hsl(0, 65%, 50%)";

  return (
    <div className="relative w-32 h-32">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--border) / 0.2)" strokeWidth="6" />
        <motion.circle
          cx="60" cy="60" r={r} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-3xl font-bold text-foreground tabular-nums"
        >
          {score}
        </motion.span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">/100</span>
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: "hsl(var(--card) / 0.6)",
        border: "1px solid hsl(var(--border) / 0.3)",
      }}
    >
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function DebugTextarea({ label, value, onChange, onPaste }: { label: string; value?: string; onChange?: (v: string) => void; onPaste?: () => void }) {
  const [copied, setCopied] = useState(false);
  const draft = value || "";
  const copy = async () => {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  const paste = async () => {
    try {
      const txt = await navigator.clipboard.readText();
      onChange?.(txt);
      onPaste?.();
      toast.success(`${label}: pasted from clipboard`);
    } catch {
      toast.error("Clipboard read blocked by the browser");
    }
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1">
          {onChange && (
            <button onClick={paste} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary/60 transition-colors">
              Paste
            </button>
          )}
          <button onClick={copy} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary/60 transition-colors">
            {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <textarea
        value={draft}
        placeholder="No data stored for this section."
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={!onChange}
        spellCheck={false}
        className="min-h-40 w-full resize-y rounded-lg border border-border/40 bg-secondary/30 p-3 font-mono text-[10px] leading-relaxed text-foreground/75 outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

export function RepoSummaryOverlay({ summary, debug, onClose, repoName = "repository", files = [] }: RepoSummaryOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, onClose, true);
  const [exporting, setExporting] = useState<"md" | "pdf" | null>(null);
  // Always render whatever we have (partial, fallback, or valid). No debug drawer surface.
  const showPartial = true;
  const debugOpen = false;
  const hasDebugIssues = false;
  void debug; void files;

  const handleExport = async (kind: "md" | "pdf") => {
    if (exporting) return;
    setExporting(kind);
    try {
      await new Promise((r) => setTimeout(r, 30));
      if (kind === "md") downloadMarkdown(summary, repoName);
      else downloadPdf(summary, repoName);
      toast.success(kind === "md" ? "Markdown report downloaded" : "PDF report downloaded");
    } catch (e: any) {
      console.error("export failed", e);
      toast.error(`Export failed: ${e?.message || "unknown error"}`);
    } finally {
      setExporting(null);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: "hsl(var(--background) / 0.85)", backdropFilter: "blur(12px)" }}
      onClick={handleBackdropClick}
    >
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-4xl h-[92vh] sm:h-auto sm:max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl"
        style={{
          background: "hsl(var(--card) / 0.95)",
          border: "1px solid hsl(var(--border) / 0.4)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 24px 80px -16px hsl(var(--foreground) / 0.15)",
        }}
      >
        {/* Fixed Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0" style={{ borderBottom: "1px solid hsl(var(--border) / 0.2)" }}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Repository Analysis</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">{summary.description}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleExport("md")}
              disabled={exporting !== null}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] hover:bg-secondary/60 transition-colors text-muted-foreground disabled:opacity-50"
              title="Export as Markdown"
            >
              {exporting === "md" ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
              {exporting === "md" ? "Exporting" : "Markdown"}
            </button>
            <button
              onClick={() => handleExport("pdf")}
              disabled={exporting !== null}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] hover:bg-secondary/60 transition-colors text-muted-foreground disabled:opacity-50"
              title="Export as PDF"
            >
              {exporting === "pdf" ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
              {exporting === "pdf" ? "Exporting" : "PDF"}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors" aria-label="Close">
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-4 space-y-6 overscroll-contain">
          {showPartial && (
            <>

          {/* Scores + Architecture */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex gap-4 shrink-0">
              <div className="flex flex-col items-center gap-1">
                <ScoreRing score={summary.overallScore} />
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Quality</span>
              </div>
              {typeof summary.securityScore === "number" && (
                <div className="flex flex-col items-center gap-1">
                  <ScoreRing score={summary.securityScore} />
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Security</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3 w-full">
              <SectionCard icon={Layers} title="Architecture">
                <p className="text-sm text-foreground/80 leading-relaxed">{summary.architecture}</p>
              </SectionCard>
            </div>
          </div>

          {/* Deep Dive narrative */}
          {summary.deepDive && summary.deepDive.trim().length > 0 && (
            <SectionCard icon={BookOpen} title="Deep Dive">
              <article className="prose-readme max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h2 className="text-lg font-serif font-semibold text-foreground mt-3 mb-2">{children}</h2>,
                    h2: ({ children }) => <h3 className="text-[15px] font-semibold text-foreground mt-4 mb-1.5">{children}</h3>,
                    h3: ({ children }) => <h4 className="text-[13px] font-semibold text-foreground mt-3 mb-1">{children}</h4>,
                    p: ({ children }) => <p className="text-[12.5px] text-foreground/80 leading-relaxed my-2">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 text-[12.5px] text-foreground/80 my-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 text-[12.5px] text-foreground/80 my-2">{children}</ol>,
                    code: ({ children }: any) => <code className="text-[11.5px] px-1 py-0.5 bg-secondary/50 rounded font-mono">{children}</code>,
                    table: ({ children }) => <div className="overflow-x-auto my-3"><table className="w-full text-[11.5px] border-collapse">{children}</table></div>,
                    th: ({ children }) => <th className="text-left font-semibold px-2.5 py-1.5 border-b border-border/60 text-foreground">{children}</th>,
                    td: ({ children }) => <td className="px-2.5 py-1.5 border-b border-border/30 text-foreground/75 align-top">{children}</td>,
                  }}
                >
                  {summary.deepDive}
                </ReactMarkdown>
              </article>
            </SectionCard>
          )}

          {/* Component Breakdown */}
          {summary.componentBreakdown && summary.componentBreakdown.length > 0 && (
            <SectionCard icon={Boxes} title="Component Breakdown">
              <ul className="space-y-2.5">
                {summary.componentBreakdown.map((c, i) => (
                  <li key={i} className="rounded-lg p-3 bg-secondary/30 border border-border/30">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-foreground">{c.name}</span>
                      {c.path && <span className="text-[10px] font-mono text-muted-foreground">{c.path}</span>}
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-auto">{c.role}</span>
                    </div>
                    <p className="text-[12px] text-foreground/75 leading-relaxed mt-1.5">{c.description}</p>
                    {c.technologies && c.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {c.technologies.map((t, j) => (
                          <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-background/60 text-foreground/70 font-medium">{t}</span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* Execution Flow */}
          {summary.executionFlow && summary.executionFlow.length > 0 && (
            <SectionCard icon={ListOrdered} title="Execution Flow">
              <ol className="space-y-2">
                {summary.executionFlow.map((s) => (
                  <li key={s.step} className="flex gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-foreground text-background text-[11px] font-bold flex items-center justify-center tabular-nums">{s.step}</span>
                    <div className="flex-1">
                      <p className="text-[12.5px] font-semibold text-foreground">{s.title}</p>
                      <p className="text-[12px] text-foreground/75 leading-relaxed mt-0.5">{s.detail}</p>
                      {s.files && s.files.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {s.files.map((f, j) => <span key={j} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/60 text-foreground/70">{f}</span>)}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </SectionCard>
          )}

          {/* Key Algorithms */}
          {summary.keyAlgorithms && summary.keyAlgorithms.length > 0 && (
            <SectionCard icon={Cpu} title="Key Algorithms and Techniques">
              <ul className="space-y-2">
                {summary.keyAlgorithms.map((a, i) => (
                  <li key={i} className="rounded-lg p-3 bg-secondary/30 border border-border/30">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-foreground">{a.name}</span>
                      {a.where && <span className="text-[10px] font-mono text-muted-foreground">{a.where}</span>}
                    </div>
                    <p className="text-[12px] text-foreground/75 leading-relaxed mt-1">{a.explanation}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* Language Breakdown */}
          {summary.languageBreakdown && summary.languageBreakdown.length > 0 && (
            <SectionCard icon={Globe2} title="Language Breakdown">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr><th className="text-left font-semibold px-2.5 py-1.5 border-b border-border/60">Language</th><th className="text-left font-semibold px-2.5 py-1.5 border-b border-border/60">Share</th><th className="text-left font-semibold px-2.5 py-1.5 border-b border-border/60">Used for</th></tr>
                  </thead>
                  <tbody>
                    {summary.languageBreakdown.map((l, i) => (
                      <tr key={i}><td className="px-2.5 py-1.5 border-b border-border/30 font-medium text-foreground">{l.language}</td><td className="px-2.5 py-1.5 border-b border-border/30 text-foreground/75 tabular-nums">{l.share}</td><td className="px-2.5 py-1.5 border-b border-border/30 text-foreground/75">{l.purpose}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* Glossary */}
          {summary.glossary && summary.glossary.length > 0 && (
            <SectionCard icon={Library} title="Glossary">
              <dl className="space-y-2">
                {summary.glossary.map((g, i) => (
                  <div key={i} className="grid grid-cols-[140px_1fr] gap-3">
                    <dt className="text-[12px] font-semibold text-foreground">{g.term}</dt>
                    <dd className="text-[12px] text-foreground/75 leading-relaxed">{g.definition}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>
          )}

          {/* Risk Breakdown */}
          {summary.riskBreakdown && (
            <SectionCard icon={Crosshair} title="Risk Breakdown">
              <div className="grid grid-cols-4 gap-2">
                {(["critical","high","medium","low"] as const).map((sev) => {
                  const colors: Record<string,string> = {
                    critical: "hsl(0, 65%, 50%)",
                    high: "hsl(28, 75%, 48%)",
                    medium: "hsl(45, 70%, 48%)",
                    low: "hsl(var(--muted-foreground))",
                  };
                  const v = summary.riskBreakdown![sev] || 0;
                  return (
                    <div key={sev} className="rounded-lg p-3 text-center" style={{ background: `${colors[sev]}15`, border: `1px solid ${colors[sev]}30` }}>
                      <p className="text-2xl font-bold tabular-nums" style={{ color: colors[sev] }}>{v}</p>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{sev}</p>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* Architecture Diagram */}
          {summary.architectureDiagram && (
            <SectionCard icon={GitBranch} title="Architecture Diagram">
              <MermaidDiagram chart={summary.architectureDiagram} />
            </SectionCard>
          )}

          {/* Data Flow Diagram */}
          {summary.dataFlowDiagram && (
            <SectionCard icon={Network} title="Data Flow">
              <MermaidDiagram chart={summary.dataFlowDiagram} />
            </SectionCard>
          )}

          {/* Attack Surface */}
          {summary.attackSurface && summary.attackSurface.length > 0 && (
            <SectionCard icon={Crosshair} title="Attack Surface">
              <ul className="space-y-1.5">
                {summary.attackSurface.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-foreground/40" />
                    <span className="text-[12px] text-foreground/80 leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* Tech Stack */}
          {summary.techStack.length > 0 && (
            <SectionCard icon={Code2} title="Tech Stack">
              <div className="flex flex-wrap gap-2">
                {summary.techStack.map((tech, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
                    style={{
                      background: "hsl(var(--secondary) / 0.6)",
                      color: "hsl(var(--foreground) / 0.8)",
                    }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Security & Vulnerabilities */}
          {summary.securityFindings && summary.securityFindings.length > 0 && (
            <SectionCard icon={Bug} title="Security Findings">
              <ul className="space-y-2">
                {summary.securityFindings.map((f, i) => (
                  <li key={i} className="rounded-lg p-3 space-y-1" style={{ background: "hsl(var(--secondary) / 0.3)", border: "1px solid hsl(var(--border) / 0.2)" }}>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                        background: f.severity === "critical" ? "hsl(0, 65%, 50%)" : f.severity === "high" ? "hsl(28, 75%, 48%)" : f.severity === "medium" ? "hsl(45, 70%, 48%)" : "hsl(var(--muted-foreground))"
                      }} />
                      <span className="text-[12px] font-semibold text-foreground flex-1">{f.title}</span>
                      {f.category && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide bg-secondary/60 text-foreground/70">{f.category}</span>
                      )}
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{
                        color: f.severity === "critical" ? "hsl(0, 65%, 50%)" : f.severity === "high" ? "hsl(28, 75%, 48%)" : f.severity === "medium" ? "hsl(45, 70%, 48%)" : "hsl(var(--muted-foreground))",
                        background: f.severity === "critical" ? "hsl(0, 65%, 50% / 0.12)" : f.severity === "high" ? "hsl(28, 75%, 48% / 0.12)" : f.severity === "medium" ? "hsl(45, 70%, 48% / 0.12)" : "hsl(var(--muted-foreground) / 0.12)",
                      }}>{f.severity}</span>
                    </div>
                    <p className="text-[11px] text-foreground/70 leading-relaxed">{f.description}</p>
                    {f.recommendation && (
                      <div className="mt-1.5 rounded-md p-2 bg-secondary/30 border border-border/30">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Recommendation</p>
                        <p className="text-[11px] text-foreground/80 leading-relaxed">{f.recommendation}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {f.file && <p className="text-[10px] font-mono text-muted-foreground">{f.file}</p>}
                      {f.cwe && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-secondary/60 text-foreground/70">{f.cwe}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {summary.strengths.length > 0 && (
              <SectionCard icon={TrendingUp} title="Strengths">
                <ul className="space-y-2">
                  {summary.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "hsl(152, 55%, 45%)" }} />
                      <span className="text-[12px] text-foreground/75 leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {summary.weaknesses.length > 0 && (
              <SectionCard icon={AlertTriangle} title="Weaknesses">
                <ul className="space-y-2">
                  {summary.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "hsl(28, 75%, 50%)" }} />
                      <span className="text-[12px] text-foreground/75 leading-relaxed">{w}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}
          </div>
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 shrink-0 text-center" style={{ borderTop: "1px solid hsl(var(--border) / 0.2)" }}>
          <p className="text-[10px] text-muted-foreground/60">Press ESC or click outside to close</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
