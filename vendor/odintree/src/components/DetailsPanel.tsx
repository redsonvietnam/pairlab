import { useState, useEffect, useMemo, useCallback } from "react";
import { useIsDark } from "@/hooks/use-theme";
import { motion } from "framer-motion";
import { X, Copy, Check, Loader2, Shield, BarChart3, AlertTriangle, FileCode, ScanSearch, FolderOpen, FileText, Image as ImageIcon, Package, Code2, Layers, ExternalLink, Info } from "lucide-react";
import { fetchFileContent, type RepoFile } from "@/lib/github";
import { analyzeFile, getMaintainabilityLabel, type FileAnalysis, type Vulnerability } from "@/lib/code-analysis";
import { fetchAIAnalysis, getCachedAIAnalysis, setCachedAIAnalysis, type AIAnalysisResponse, type AIInsight, type AIRepoAnalysis, type AIFileAnalysis } from "@/lib/ai-analysis";
import { repoHasNpmManifests, scanRepoDependencies, type RepoDependencyAdvisory, type RepoDependencyScanResult } from "@/lib/dependency-vulnerabilities";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MermaidDiagram } from "./MermaidDiagram";
import { GitBranch, Network as NetworkIcon, ListOrdered, ArrowDownRight, ArrowUpRight, Activity } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip as RTooltip } from "recharts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface DetailsPanelProps {
  node: any | null;
  owner: string;
  repo: string;
  repoFiles: RepoFile[];
  onClose: () => void;
  cachedContent?: string;
  aiAnalysis?: AIRepoAnalysis | null;
}

const langMap: Record<string, string> = {
  JavaScript: "javascript", TypeScript: "typescript", Python: "python",
  Java: "java", Ruby: "ruby", Go: "go", Rust: "rust",
  CSS: "css", SCSS: "scss", HTML: "html", JSON: "json",
  YAML: "yaml", Markdown: "markdown", Shell: "bash", SQL: "sql",
  C: "c", "C++": "cpp",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "hsl(0, 65%, 50%)",
  high: "hsl(28, 75%, 48%)",
  medium: "hsl(45, 70%, 48%)",
  low: "hsl(var(--muted-foreground))",
  info: "hsl(210, 60%, 50%)",
};

// Royal dark tones for the details panel
const PANEL_TOKENS = {
  cardBg: "hsl(160, 18%, 14%)",       // #22382D inspired deep forest
  cardBgLight: "hsl(160, 12%, 96%)",
  statBg: "hsl(160, 15%, 11%)",
  statBgLight: "hsl(160, 8%, 94%)",
  accentTeal: "hsl(160, 40%, 42%)",
  accentGold: "hsl(38, 60%, 55%)",
  tagBg: "hsl(160, 14%, 16%)",
  tagBgLight: "hsl(160, 8%, 90%)",
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  const isDark = useIsDark();
  return (
    <div
      className="rounded-xl p-3 backdrop-blur-md transition-all duration-200 hover:scale-[1.02]"
      style={{
        background: isDark ? "hsl(160, 15%, 11% / 0.7)" : "hsl(160, 8%, 94% / 0.8)",
        border: `1px solid ${isDark ? "hsl(160, 15%, 20% / 0.4)" : "hsl(160, 10%, 85% / 0.6)"}`,
        backdropFilter: "blur(12px)",
      }}
    >
      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: isDark ? "hsl(160, 20%, 55%)" : "hsl(160, 15%, 45%)" }}>{label}</p>
      <p className="text-lg font-semibold tabular-nums" style={color ? { color } : { color: isDark ? "hsl(0, 0%, 90%)" : "hsl(0, 0%, 15%)" }}>{value}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: isDark ? "hsl(160, 15%, 45%)" : "hsl(160, 10%, 50%)" }}>{sub}</p>}
    </div>
  );
}

function VulnItem({ vuln }: { vuln: Vulnerability }) {
  const isDark = useIsDark();
  return (
    <div
      className="rounded-xl p-3 space-y-1.5 backdrop-blur-md"
      style={{
        background: isDark ? "hsl(0, 15%, 12% / 0.6)" : "hsl(0, 10%, 96% / 0.8)",
        border: `1px solid ${isDark ? "hsl(0, 20%, 22% / 0.4)" : "hsl(0, 15%, 88% / 0.6)"}`,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: SEVERITY_COLORS[vuln.severity] }} />
        <span className="text-[11px] font-medium text-foreground flex-1">{vuln.message}</span>
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ color: SEVERITY_COLORS[vuln.severity], background: `${SEVERITY_COLORS[vuln.severity]}18` }}>
          {vuln.severity}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px]" style={{ color: isDark ? "hsl(0, 0%, 50%)" : "hsl(0, 0%, 55%)" }}>Line {vuln.line}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-mono" style={{ background: isDark ? "hsl(0, 10%, 15%)" : "hsl(0, 5%, 92%)", color: isDark ? "hsl(0, 0%, 60%)" : "hsl(0, 0%, 45%)" }}>
          {vuln.type}
        </span>
      </div>
      <code className="block text-[10px] font-mono rounded-lg px-2.5 py-1.5 truncate" style={{ background: isDark ? "hsl(0, 5%, 10%)" : "hsl(0, 0%, 95%)", color: isDark ? "hsl(0, 0%, 65%)" : "hsl(0, 0%, 40%)" }}>
        {vuln.snippet}
      </code>
    </div>
  );
}

function AIInsightItem({ insight }: { insight: AIInsight }) {
  const isDark = useIsDark();
  return (
    <div
      className="rounded-xl p-3 space-y-1.5 backdrop-blur-md"
      style={{
        background: isDark ? "hsl(220, 15%, 12% / 0.6)" : "hsl(220, 10%, 96% / 0.8)",
        border: `1px solid ${isDark ? "hsl(220, 15%, 22% / 0.4)" : "hsl(220, 10%, 88% / 0.6)"}`,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: SEVERITY_COLORS[insight.severity] }} />
        <span className="text-[11px] font-semibold text-foreground flex-1">{insight.title}</span>
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ color: SEVERITY_COLORS[insight.severity], background: `${SEVERITY_COLORS[insight.severity]}18` }}>
          {insight.type}
        </span>
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: isDark ? "hsl(0, 0%, 65%)" : "hsl(0, 0%, 40%)" }}>{insight.description}</p>
      {insight.line && <span className="text-[9px]" style={{ color: isDark ? "hsl(0, 0%, 45%)" : "hsl(0, 0%, 55%)" }}>Line {insight.line}</span>}
      {insight.suggestion && (
        <div className="mt-1.5 p-2.5 rounded-lg" style={{ background: isDark ? "hsl(160, 12%, 10%)" : "hsl(160, 8%, 94%)", border: `1px solid ${isDark ? "hsl(160, 12%, 18% / 0.4)" : "hsl(160, 8%, 85% / 0.5)"}` }}>
          <p className="text-[10px] font-mono" style={{ color: isDark ? "hsl(160, 30%, 55%)" : "hsl(160, 25%, 35%)" }}>{insight.suggestion}</p>
        </div>
      )}
    </div>
  );
}

function DependencyAdvisoryItem({ advisory }: { advisory: RepoDependencyAdvisory }) {
  const isDark = useIsDark();
  const primaryAlias = advisory.aliases.find((alias) => alias.startsWith("CVE-")) || advisory.id;
  const extraAliases = advisory.aliases.filter((alias) => alias !== primaryAlias).slice(0, 2);

  return (
    <div
      className="rounded-xl p-3 space-y-2 backdrop-blur-md"
      style={{
        background: isDark ? "hsl(var(--card) / 0.4)" : "hsl(var(--card) / 0.88)",
        border: "1px solid hsl(var(--border) / 0.45)",
      }}
    >
      <div className="flex items-start gap-2">
        <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: SEVERITY_COLORS[advisory.severity] }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-foreground truncate">{advisory.packageName}@{advisory.version}</p>
              <p className="text-[10px] text-muted-foreground truncate">{primaryAlias}</p>
            </div>
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0" style={{ color: SEVERITY_COLORS[advisory.severity], background: `${SEVERITY_COLORS[advisory.severity]}18` }}>
              {advisory.severity}
            </span>
          </div>

          <p className="text-[11px] leading-relaxed mt-2" style={{ color: isDark ? "hsl(var(--foreground) / 0.72)" : "hsl(var(--foreground) / 0.74)" }}>
            {advisory.summary}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {advisory.manifestPath && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-md font-mono" style={{ background: isDark ? "hsl(var(--secondary) / 0.48)" : "hsl(var(--secondary) / 0.9)", color: isDark ? "hsl(var(--foreground) / 0.65)" : "hsl(var(--foreground) / 0.58)" }}>
            {advisory.manifestPath}
          </span>
        )}
        {advisory.fixedVersion && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-md font-mono" style={{ background: isDark ? "hsl(var(--accent) / 0.14)" : "hsl(var(--accent) / 0.18)", color: isDark ? "hsl(var(--accent))" : "hsl(var(--foreground))" }}>
            Fixed in {advisory.fixedVersion}
          </span>
        )}
        {extraAliases.map((alias) => (
          <span key={alias} className="text-[9px] px-1.5 py-0.5 rounded-md font-mono" style={{ background: isDark ? "hsl(var(--secondary) / 0.48)" : "hsl(var(--secondary) / 0.9)", color: isDark ? "hsl(var(--foreground) / 0.65)" : "hsl(var(--foreground) / 0.58)" }}>
            {alias}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-[9px]" style={{ color: isDark ? "hsl(var(--muted-foreground) / 0.8)" : "hsl(var(--muted-foreground))" }}>
          {advisory.published ? `Published ${new Date(advisory.published).toLocaleDateString()}` : "Known advisory"}
        </span>
        {advisory.referenceUrl && (
          <a
            href={advisory.referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-medium"
            style={{ color: isDark ? "hsl(var(--accent))" : "hsl(var(--foreground))" }}
          >
            Open advisory <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  const isDark = useIsDark();
  return (
    <div className="p-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-xl font-bold text-foreground mt-4 mb-3 leading-tight">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold text-foreground mt-3 mb-2 pb-1 border-b border-border/40">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-medium text-foreground mt-3 mb-2">{children}</h3>,
          p: ({ children }) => <p className="text-sm text-muted-foreground leading-relaxed my-2">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground my-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground my-2">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ inline, className, children, ...props }: any) => {
            if (inline) return <code className="text-[11px] px-1 py-0.5 bg-secondary/50 rounded font-mono">{children}</code>;
            const lang = (className || "").replace("language-", "") || "text";
            return (
              <SyntaxHighlighter language={lang} style={isDark ? oneDark : oneLight} customStyle={{ margin: "0.5rem 0", padding: "0.75rem", fontSize: "12px", borderRadius: "0.5rem", background: isDark ? "hsl(0 0% 6%)" : "hsl(0 0% 96%)" }}>
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            );
          },
          table: ({ children }) => <div className="overflow-x-auto my-3"><table className="w-full text-[12px] border-collapse border border-border/60 rounded-lg overflow-hidden">{children}</table></div>,
          thead: ({ children }) => <thead className="bg-secondary/40">{children}</thead>,
          th: ({ children }) => <th className="text-left font-semibold px-3 py-2 border-b border-border/60 text-foreground">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 border-b border-border/30 text-muted-foreground align-top">{children}</td>,
          tr: ({ children }) => <tr className="border-b border-border/20 last:border-b-0">{children}</tr>,
          a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-foreground underline decoration-foreground/30 hover:decoration-foreground">{children}</a>,
          img: ({ src, alt }) => {
            if (src && /shields\.io|img\.shields\.io/.test(src)) return <img src={src} alt={alt || ""} className="inline-block mr-1 my-0.5 align-middle" />;
            return null;
          },
          blockquote: ({ children }) => <blockquote className="border-l-2 border-border/60 pl-3 my-2 text-muted-foreground italic">{children}</blockquote>,
          hr: () => <hr className="border-border/40 my-3" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function FolderView({ node }: { node: any }) {
  const childCount = (node.data?.childCount as number) || 0;
  const path = (node.data?.path as string) || "";
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
        <FolderOpen size={24} className="text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{node.data?.label}</h3>
      <p className="text-sm text-muted-foreground mb-4">{path}</p>
      <div className="flex gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">{childCount}</p>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Items</p>
        </div>
      </div>
    </div>
  );
}

function ImagePreview({ path, owner, repo }: { path: string; owner: string; repo: string }) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
  return (
    <div className="flex items-center justify-center p-6 h-full">
      <img src={url} alt={path} className="max-w-full max-h-full object-contain rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
    </div>
  );
}

function getFileCategory(path: string): "code" | "markdown" | "image" | "config" | "other" {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  if (["md", "mdx"].includes(ext)) return "markdown";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext)) return "image";
  if (["json", "yaml", "yml", "toml", "env", "gitignore", "lock", "lockb"].includes(ext)) return "config";
  if (["js", "jsx", "ts", "tsx", "py", "java", "go", "rs", "rb", "css", "scss", "html", "sql", "sh", "bash", "c", "cpp", "h", "hpp"].includes(ext)) return "code";
  return "other";
}

// Analyze dependency depth
function analyzeDependencyDepth(deps: string[]): { direct: string[]; thirdParty: string[]; relative: string[]; depth: number } {
  const thirdParty = deps.filter(d => !d.startsWith(".") && !d.startsWith("@/") && !d.startsWith("~/"));
  const relative = deps.filter(d => d.startsWith(".") || d.startsWith("@/") || d.startsWith("~/"));
  const maxDepth = relative.reduce((max, d) => {
    const depth = (d.match(/\.\.\//g) || []).length;
    return Math.max(max, depth);
  }, 0);
  return { direct: deps, thirdParty, relative, depth: maxDepth };
}

// Get file purpose description
function getFilePurpose(path: string, lang: string, content: string): string {
  const name = path.split("/").pop() || "";
  const ext = name.split(".").pop()?.toLowerCase() || "";

  if (name === "package.json") return "NPM package manifest defining project dependencies, scripts, and metadata";
  if (name === "tsconfig.json") return "TypeScript compiler configuration defining compilation targets and module resolution";
  if (name === "vite.config.ts" || name === "vite.config.js") return "Vite bundler configuration for build optimization and dev server settings";
  if (name === ".gitignore") return "Git ignore rules specifying files excluded from version control";
  if (name === "README.md") return "Project documentation providing setup instructions and overview";
  if (name.includes(".test.") || name.includes(".spec.")) return "Test suite containing unit or integration tests for code validation";
  if (name.includes(".d.ts")) return "TypeScript type declaration file providing type definitions";
  if (ext === "css" || ext === "scss") return "Stylesheet defining visual presentation rules, layout and theming";
  if (name === "index.html") return "HTML entry point that bootstraps the web application";

  // Detect by content patterns
  if (content.includes("export default function") && content.includes("return (")) return "React component rendering UI elements with state management";
  if (content.includes("createContext") || content.includes("useContext")) return "React context provider managing shared state across components";
  if (content.includes("express") || content.includes("app.listen")) return "Express.js server handling HTTP requests and API routes";
  if (content.includes("router") && content.includes("Route")) return "Route definitions mapping URL paths to page components";
  if (content.includes("fetch(") && content.includes("async")) return "Data fetching utility handling API communication and responses";
  if (content.includes("export type") || content.includes("export interface")) return "Type definitions module exporting TypeScript interfaces and types";
  if (content.includes("useEffect") || content.includes("useState")) return "React component with lifecycle effects and local state management";

  if (lang === "JavaScript" || lang === "TypeScript") return "JavaScript/TypeScript module containing application logic";
  if (lang === "Python") return "Python module with application logic and data processing";
  return "Source file contributing to the project codebase";
}

export function DetailsPanel({ node, owner, repo, repoFiles, onClose, cachedContent, aiAnalysis }: DetailsPanelProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("code");
  const [repoDependencyScan, setRepoDependencyScan] = useState<RepoDependencyScanResult | null>(null);
  const [repoDependencyLoading, setRepoDependencyLoading] = useState(false);

  const isFile = node?.data?.nodeType === "file";
  const isDir = node?.data?.nodeType === "dir";
  const path = (node?.data?.path as string) || "";
  const fileCategory = getFileCategory(path);
  const hasNpmManifest = useMemo(() => repoHasNpmManifests(repoFiles), [repoFiles]);

  useEffect(() => {
    if (node && isFile) {
      if (cachedContent) {
        setContent(cachedContent);
        setLoading(false);
      } else {
        setLoading(true);
        fetchFileContent(owner, repo, path)
          .then((c) => setContent(c))
          .finally(() => setLoading(false));
      }
    }
    setAiResult(null);
  }, [node, owner, repo, cachedContent, isFile, path]);

  useEffect(() => {
    if (path) {
      const cached = getCachedAIAnalysis(path);
      if (cached) setAiResult(cached);
    }
  }, [path]);

  useEffect(() => {
    setActiveTab(fileCategory === "markdown" ? "preview" : "code");
  }, [fileCategory, path]);

  useEffect(() => {
    setRepoDependencyScan(null);
    setRepoDependencyLoading(false);
  }, [owner, repo]);

  useEffect(() => {
    if (!isFile || activeTab !== "security" || !hasNpmManifest || repoDependencyScan) return;

    let cancelled = false;
    setRepoDependencyLoading(true);

    scanRepoDependencies(owner, repo, repoFiles)
      .then((result) => {
        if (!cancelled) setRepoDependencyScan(result);
      })
      .catch((error: any) => {
        if (cancelled) return;
        setRepoDependencyScan({
          source: "OSV.dev",
          manifestPaths: [],
          scannedDependencies: 0,
          packagesWithIssues: 0,
          advisories: [],
          truncated: false,
          error: error?.message || "Failed to scan repository dependencies",
        });
      })
      .finally(() => {
        if (!cancelled) setRepoDependencyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, hasNpmManifest, isFile, owner, repo, repoFiles, repoDependencyScan]);

  const analysis = useMemo<FileAnalysis | null>(() => {
    if (!content || loading) return null;
    const lang = (node?.data?.language as string) || "Other";
    return analyzeFile(content, lang);
  }, [content, loading, node]);


  const depAnalysis = useMemo(() => {
    if (!analysis) return null;
    return analyzeDependencyDepth(analysis.dependencies);
  }, [analysis]);

  const filePurpose = useMemo(() => {
    if (!content || !isFile) return "";
    const lang = (node?.data?.language as string) || "Other";
    return getFilePurpose(path, lang, content);
  }, [content, isFile, path, node]);

  // Get per-file AI analysis if available
  const fileAI: AIFileAnalysis | null = useMemo(() => {
    if (!aiAnalysis?.fileAnalyses || !path) return null;
    return aiAnalysis.fileAnalyses[path] || null;
  }, [aiAnalysis, path]);

  const handleAIAnalysis = useCallback(async () => {
    if (!content || aiLoading) return;
    setAiLoading(true);
    const lang = (node?.data?.language as string) || "Unknown";
    const result = await fetchAIAnalysis({
      code: content,
      filename: path,
      language: lang,
      analysisType: "full",
    });
    setAiResult(result);
    if (!result.error) {
      setCachedAIAnalysis(path, result);
    }
    setAiLoading(false);
  }, [content, aiLoading, node, path]);

  if (!node) return null;

  const lang = (node.data?.language as string) || "Unknown";
  const fileName = (node.data?.label as string) || path.split("/").pop() || "";
  const syntaxLang = langMap[lang] || "text";
  const isDark = useIsDark();
  const size = node.data?.size as number | undefined;
  const lines = content ? content.split("\n").length : 0;
  const vulnCount = analysis?.vulnerabilities.length || 0;
  const repoAdvisoryCount = repoDependencyScan?.advisories.length || 0;
  const securityIssueCount = vulnCount + repoAdvisoryCount;
  const maintainability = analysis ? getMaintainabilityLabel(analysis.maintainability) : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Panel background styles
  const panelBg = isDark
    ? "hsl(160, 14%, 8% / 0.85)"
    : "hsl(160, 5%, 98% / 0.9)";
  const panelBorder = isDark
    ? "1px solid hsl(160, 12%, 18% / 0.5)"
    : "1px solid hsl(160, 8%, 88% / 0.6)";

  if (isDir) {
    return (
      <motion.div
        initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="h-full m-2 ml-0 flex flex-col rounded-2xl overflow-hidden"
        style={{ background: panelBg, backdropFilter: "blur(24px)", border: panelBorder }}
      >
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: isDark ? "1px solid hsl(160, 10%, 16% / 0.5)" : "1px solid hsl(160, 5%, 90% / 0.5)" }}>
          <h3 className="text-sm font-semibold text-foreground truncate">{fileName}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground"><X size={13} /></button>
        </div>
        <FolderView node={node} />
      </motion.div>
    );
  }

  if (fileCategory === "image") {
    return (
      <motion.div
        initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="h-full m-2 ml-0 flex flex-col rounded-2xl overflow-hidden"
        style={{ background: panelBg, backdropFilter: "blur(24px)", border: panelBorder }}
      >
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: isDark ? "1px solid hsl(160, 10%, 16% / 0.5)" : "1px solid hsl(160, 5%, 90% / 0.5)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <ImageIcon size={13} className="text-muted-foreground shrink-0" />
            <h3 className="text-sm font-semibold text-foreground truncate">{fileName}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground"><X size={13} /></button>
        </div>
        <ImagePreview path={path} owner={owner} repo={repo} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="h-full m-2 ml-0 flex flex-col rounded-2xl overflow-hidden"
      style={{ background: panelBg, backdropFilter: "blur(24px)", border: panelBorder }}
    >
      {/* Header */}
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: isDark ? "1px solid hsl(160, 10%, 16% / 0.5)" : "1px solid hsl(160, 5%, 90% / 0.5)" }}>
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground truncate">{fileName}</h3>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {lang !== "Unknown" && lang !== "Other" && <span className="text-[10px] text-muted-foreground">{lang}</span>}
              {size && <span className="text-[10px] text-muted-foreground">{(size / 1024).toFixed(1)} KB</span>}
              {lines > 0 && <span className="text-[10px] text-muted-foreground">{lines} lines</span>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isFile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground">
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Copy code</TooltipContent>
              </Tooltip>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground">
              <X size={13} />
            </button>
          </div>
        </div>
        {/* File Purpose */}
        {filePurpose && (
          <div className="mt-2 flex items-start gap-2 px-2.5 py-2 rounded-lg" style={{ background: isDark ? "hsl(160, 12%, 12% / 0.6)" : "hsl(160, 8%, 94% / 0.7)", border: `1px solid ${isDark ? "hsl(160, 10%, 18% / 0.3)" : "hsl(160, 8%, 88% / 0.4)"}` }}>
            <Info size={11} className="shrink-0 mt-0.5" style={{ color: isDark ? "hsl(160, 35%, 50%)" : "hsl(160, 30%, 40%)" }} />
            <p className="text-[11px] leading-relaxed" style={{ color: isDark ? "hsl(160, 15%, 60%)" : "hsl(160, 10%, 40%)" }}>{filePurpose}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="mx-3 mt-2 mb-0 shrink-0 overflow-x-auto">
          <TabsList className="rounded-lg p-0.5 h-auto inline-flex w-auto min-w-full" style={{ background: isDark ? "hsl(160, 10%, 10% / 0.5)" : "hsl(160, 5%, 92% / 0.6)" }}>
            {fileCategory === "markdown" ? (
              <>
                <TabsTrigger value="preview" className="text-[11px] px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 whitespace-nowrap">
                  <FileText size={11} /> Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="text-[11px] px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 whitespace-nowrap">
                  <FileCode size={11} /> Source
                </TabsTrigger>
              </>
            ) : (
              <TabsTrigger value="code" className="text-[11px] px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 whitespace-nowrap">
                <FileCode size={11} /> Code
              </TabsTrigger>
            )}
            <TabsTrigger value="analysis" className="text-[11px] px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 whitespace-nowrap">
              <BarChart3 size={11} /> Analysis
            </TabsTrigger>
            <TabsTrigger value="security" className="text-[11px] px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 relative whitespace-nowrap">
              <Shield size={11} /> Security
              {securityIssueCount > 0 && (
                <span className="ml-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ background: "hsl(0, 65%, 50%)", color: "white" }}>
                  {securityIssueCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-[11px] px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 whitespace-nowrap">
              <Layers size={11} /> Details
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Markdown Preview Tab */}
        {fileCategory === "markdown" && (
          <TabsContent value="preview" className="flex-1 overflow-y-auto mt-0 data-[state=inactive]:hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>
            ) : (
              <MarkdownPreview content={content} />
            )}
          </TabsContent>
        )}

        {/* Code Tab */}
        <TabsContent value="code" className="flex-1 overflow-y-auto mt-0 data-[state=inactive]:hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>
          ) : (
            <SyntaxHighlighter
              language={syntaxLang}
              style={isDark ? oneDark : oneLight}
              customStyle={{ margin: 0, padding: "1rem", fontSize: "12px", lineHeight: "1.7", background: "transparent" }}
              showLineNumbers
              lineNumberStyle={{ color: "hsl(var(--muted-foreground))", fontSize: "10px", opacity: 0.3, minWidth: "2.5em" }}
            >
              {content || "// No content"}
            </SyntaxHighlighter>
          )}
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="flex-1 overflow-y-auto mt-0 p-4 space-y-4 data-[state=inactive]:hidden">
          {loading || !analysis ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Lines of Code" value={analysis.codeLoc} sub={`${analysis.blankLines} blank, ${analysis.commentLines} comments`} />
                <StatCard label="Complexity" value={analysis.complexity} sub="Cyclomatic" color={analysis.complexity > 20 ? "hsl(0, 65%, 50%)" : analysis.complexity > 10 ? "hsl(28, 75%, 48%)" : undefined} />
                <StatCard label="Maintainability" value={`${analysis.maintainability}/100`} sub={maintainability?.label} color={maintainability?.color} />
                <StatCard label="Dependencies" value={analysis.dependencies.length} sub={`${analysis.exports.length} exports`} />
              </div>

              {/* Dependency Depth */}
              {depAnalysis && depAnalysis.direct.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: isDark ? "hsl(160, 20%, 50%)" : "hsl(160, 15%, 40%)" }}>
                    <Package size={11} /> Dependency Analysis
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <StatCard label="Third Party" value={depAnalysis.thirdParty.length} />
                    <StatCard label="Relative" value={depAnalysis.relative.length} />
                    <StatCard label="Max Depth" value={depAnalysis.depth} sub="Parent traversals" color={depAnalysis.depth > 3 ? "hsl(28, 75%, 48%)" : undefined} />
                  </div>
                </div>
              )}

              {analysis.dependencies.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-medium uppercase tracking-wider" style={{ color: isDark ? "hsl(160, 20%, 50%)" : "hsl(160, 15%, 40%)" }}>Imports</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.dependencies.map((dep, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 rounded-lg font-mono truncate max-w-[180px]" style={{ background: isDark ? "hsl(160, 12%, 14%)" : "hsl(160, 6%, 91%)", color: isDark ? "hsl(160, 15%, 60%)" : "hsl(160, 10%, 40%)", border: `1px solid ${isDark ? "hsl(160, 10%, 20% / 0.4)" : "hsl(160, 8%, 85% / 0.5)"}` }}>{dep}</span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.exports.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-medium uppercase tracking-wider" style={{ color: isDark ? "hsl(160, 20%, 50%)" : "hsl(160, 15%, 40%)" }}>Exports</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.exports.map((exp, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 rounded-lg font-mono" style={{ background: isDark ? "hsl(210, 12%, 14%)" : "hsl(210, 6%, 91%)", color: isDark ? "hsl(210, 20%, 60%)" : "hsl(210, 15%, 40%)", border: `1px solid ${isDark ? "hsl(210, 10%, 20% / 0.4)" : "hsl(210, 8%, 85% / 0.5)"}` }}>{exp}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-[11px] font-medium uppercase tracking-wider" style={{ color: isDark ? "hsl(160, 20%, 50%)" : "hsl(160, 15%, 40%)" }}>Composition</h4>
                <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: isDark ? "hsl(160, 8%, 12%)" : "hsl(160, 5%, 90%)" }}>
                  <div className="h-full transition-all" style={{ width: `${(analysis.codeLoc / analysis.loc) * 100}%`, background: "hsl(210, 60%, 50%)" }} title={`Code: ${analysis.codeLoc} lines`} />
                  <div className="h-full transition-all" style={{ width: `${(analysis.commentLines / analysis.loc) * 100}%`, background: "hsl(160, 40%, 42%)" }} title={`Comments: ${analysis.commentLines} lines`} />
                  <div className="h-full transition-all" style={{ width: `${(analysis.blankLines / analysis.loc) * 100}%`, background: isDark ? "hsl(160, 8%, 25%)" : "hsl(160, 5%, 80%)" }} title={`Blank: ${analysis.blankLines} lines`} />
                </div>
                <div className="flex items-center gap-4 text-[9px]" style={{ color: isDark ? "hsl(0, 0%, 50%)" : "hsl(0, 0%, 55%)" }}>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: "hsl(210, 60%, 50%)" }} />Code</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: "hsl(160, 40%, 42%)" }} />Comments</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: isDark ? "hsl(160, 8%, 25%)" : "hsl(160, 5%, 80%)" }} />Blank</span>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="flex-1 overflow-y-auto mt-0 p-4 space-y-4 data-[state=inactive]:hidden">
          {loading || !analysis ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {/* AI Analysis Button */}
              <button
                onClick={handleAIAnalysis}
                disabled={aiLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-medium disabled:opacity-50"
                style={{
                  background: isDark ? "hsl(160, 15%, 12% / 0.7)" : "hsl(160, 8%, 94% / 0.8)",
                  border: `1px solid ${isDark ? "hsl(160, 15%, 22% / 0.5)" : "hsl(160, 10%, 85% / 0.6)"}`,
                  color: isDark ? "hsl(160, 25%, 65%)" : "hsl(160, 20%, 35%)",
                }}
              >
                {aiLoading ? (
                  <><Loader2 size={14} className="animate-spin" /> Analyzing with AI...</>
                ) : (
                  <><ScanSearch size={14} /> Deep Analysis</>
                )}
              </button>

              {/* AI Results */}
              {aiResult && (
                <div className="space-y-3">
                  {aiResult.error ? (
                    <div className="p-3 rounded-xl" style={{ background: isDark ? "hsl(0, 15%, 12% / 0.6)" : "hsl(0, 10%, 96% / 0.8)", border: `1px solid ${isDark ? "hsl(0, 20%, 22% / 0.4)" : "hsl(0, 15%, 88% / 0.5)"}` }}>
                      <p className="text-[11px]" style={{ color: "hsl(0, 65%, 50%)" }}>{aiResult.error}</p>
                    </div>
                  ) : (
                    <>
                      {aiResult.score >= 0 && (
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: isDark ? "hsl(160, 12%, 10% / 0.6)" : "hsl(160, 8%, 95% / 0.8)", border: `1px solid ${isDark ? "hsl(160, 10%, 18% / 0.4)" : "hsl(160, 8%, 88% / 0.5)"}` }}>
                          <div className="text-center shrink-0">
                            <p className="text-xl font-bold tabular-nums" style={{ color: aiResult.score >= 70 ? "hsl(160, 40%, 42%)" : aiResult.score >= 40 ? "hsl(45, 70%, 48%)" : "hsl(0, 65%, 50%)" }}>
                              {aiResult.score}
                            </p>
                            <p className="text-[9px] uppercase tracking-wider" style={{ color: isDark ? "hsl(160, 15%, 45%)" : "hsl(160, 10%, 50%)" }}>Score</p>
                          </div>
                          <p className="text-[11px] leading-relaxed flex-1" style={{ color: isDark ? "hsl(0, 0%, 60%)" : "hsl(0, 0%, 40%)" }}>{aiResult.summary}</p>
                        </div>
                      )}
                      {aiResult.insights.map((insight, i) => (
                        <AIInsightItem key={i} insight={insight} />
                      ))}
                    </>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: isDark ? "hsl(160, 20%, 50%)" : "hsl(160, 15%, 40%)" }}>
                    <Package size={11} /> Dependency Advisories
                  </h4>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.18em] px-2 py-1 rounded-full" style={{ background: isDark ? "hsl(var(--secondary) / 0.55)" : "hsl(var(--secondary) / 0.9)", color: isDark ? "hsl(var(--foreground) / 0.75)" : "hsl(var(--foreground) / 0.6)" }}>
                    OSV.dev
                  </span>
                </div>

                {!hasNpmManifest ? (
                  <div className="rounded-xl p-3" style={{ background: isDark ? "hsl(var(--card) / 0.35)" : "hsl(var(--card) / 0.9)", border: "1px solid hsl(var(--border) / 0.45)" }}>
                    <p className="text-[11px] text-muted-foreground">No npm manifests were found in this repository, so dependency CVE scanning is unavailable.</p>
                  </div>
                ) : repoDependencyLoading ? (
                  <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: isDark ? "hsl(var(--card) / 0.35)" : "hsl(var(--card) / 0.9)", border: "1px solid hsl(var(--border) / 0.45)" }}>
                    <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />
                    <p className="text-[11px] text-muted-foreground">Checking locked npm dependencies against OSV.dev advisories.</p>
                  </div>
                ) : repoDependencyScan?.error ? (
                  <div className="rounded-xl p-3" style={{ background: isDark ? "hsl(0, 15%, 12% / 0.6)" : "hsl(0, 10%, 96% / 0.8)", border: `1px solid ${isDark ? "hsl(0, 20%, 22% / 0.4)" : "hsl(0, 15%, 88% / 0.5)"}` }}>
                    <p className="text-[11px]" style={{ color: "hsl(0, 65%, 50%)" }}>{repoDependencyScan.error}</p>
                  </div>
                ) : repoDependencyScan ? (
                  <>
                    <div className="rounded-xl p-3 space-y-2" style={{ background: isDark ? "hsl(var(--card) / 0.35)" : "hsl(var(--card) / 0.9)", border: "1px solid hsl(var(--border) / 0.45)" }}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold text-foreground">
                            {repoAdvisoryCount > 0
                              ? `${repoAdvisoryCount} advisories across ${repoDependencyScan.packagesWithIssues} packages`
                              : "No known npm CVEs found"}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Scanned {repoDependencyScan.scannedDependencies} dependencies from {repoDependencyScan.manifestPaths.length} manifest{repoDependencyScan.manifestPaths.length === 1 ? "" : "s"}.
                          </p>
                        </div>
                        <Shield size={14} className="shrink-0" style={{ color: repoAdvisoryCount > 0 ? "hsl(28, 75%, 48%)" : "hsl(160, 40%, 42%)" }} />
                      </div>

                      {repoDependencyScan.truncated && (
                        <p className="text-[10px]" style={{ color: isDark ? "hsl(45, 70%, 58%)" : "hsl(28, 75%, 40%)" }}>
                          Scan capped to the first {repoDependencyScan.scannedDependencies} resolved packages to keep results responsive.
                        </p>
                      )}

                      {repoDependencyScan.manifestPaths.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {repoDependencyScan.manifestPaths.map((manifestPath) => (
                            <span key={manifestPath} className="text-[9px] px-1.5 py-0.5 rounded-md font-mono" style={{ background: isDark ? "hsl(var(--secondary) / 0.48)" : "hsl(var(--secondary) / 0.9)", color: isDark ? "hsl(var(--foreground) / 0.65)" : "hsl(var(--foreground) / 0.58)" }}>
                              {manifestPath}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {repoAdvisoryCount > 0 && (
                      <div className="space-y-2">
                        {repoDependencyScan.advisories.map((advisory, index) => (
                          <DependencyAdvisoryItem key={`${advisory.id}-${advisory.packageName}-${advisory.version}-${index}`} advisory={advisory} />
                        ))}
                      </div>
                    )}
                  </>
                ) : null}
              </div>

              {/* Static Analysis Results */}
              {analysis.vulnerabilities.length === 0 && !aiResult && repoAdvisoryCount === 0 && !repoDependencyLoading && (!hasNpmManifest || !!repoDependencyScan) ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: isDark ? "hsl(160, 12%, 14%)" : "hsl(160, 8%, 92%)" }}>
                    <Shield size={18} style={{ color: isDark ? "hsl(160, 20%, 40%)" : "hsl(160, 15%, 50%)" }} />
                  </div>
                  <p className="text-sm text-foreground font-medium mb-1">No issues found</p>
                  <p className="text-[11px] max-w-[200px]" style={{ color: isDark ? "hsl(0, 0%, 45%)" : "hsl(0, 0%, 55%)" }}>
                    No hardcoded secrets, unsafe patterns, or known npm advisories detected. Click "Deep Analysis" for a thorough review.
                  </p>
                </div>
              ) : analysis.vulnerabilities.length > 0 && (
                <>
                  <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: isDark ? "hsl(28, 15%, 12% / 0.6)" : "hsl(28, 10%, 96% / 0.8)", border: `1px solid ${isDark ? "hsl(28, 15%, 22% / 0.4)" : "hsl(28, 10%, 88% / 0.5)"}` }}>
                    <AlertTriangle size={14} className="shrink-0" style={{ color: "hsl(28, 75%, 48%)" }} />
                    <p className="text-[11px]" style={{ color: isDark ? "hsl(0, 0%, 60%)" : "hsl(0, 0%, 40%)" }}>
                      <span className="font-semibold text-foreground">{vulnCount}</span> potential {vulnCount === 1 ? "issue" : "issues"} detected via static analysis.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {analysis.vulnerabilities.map((vuln, i) => (
                      <VulnItem key={i} vuln={vuln} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="insights" className="flex-1 overflow-y-auto mt-0 p-4 space-y-4 data-[state=inactive]:hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {/* AI-Powered Analysis (when available) */}
              {fileAI ? (
                <>
                  {/* Quality Score */}
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: isDark ? "hsl(160, 12%, 10% / 0.6)" : "hsl(160, 8%, 95% / 0.8)", border: `1px solid ${isDark ? "hsl(160, 10%, 18% / 0.4)" : "hsl(160, 8%, 88% / 0.5)"}` }}>
                    <div className="text-center shrink-0">
                      <p className="text-xl font-bold tabular-nums" style={{ color: fileAI.quality >= 70 ? "hsl(160, 40%, 42%)" : fileAI.quality >= 40 ? "hsl(45, 70%, 48%)" : "hsl(0, 65%, 50%)" }}>
                        {fileAI.quality}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider" style={{ color: isDark ? "hsl(160, 15%, 45%)" : "hsl(160, 10%, 50%)" }}>Quality</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] leading-relaxed" style={{ color: isDark ? "hsl(0, 0%, 70%)" : "hsl(0, 0%, 30%)" }}>{fileAI.purpose}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide" style={{
                          background: fileAI.complexity === "high" ? "hsl(0, 65%, 50% / 0.15)" : fileAI.complexity === "medium" ? "hsl(45, 70%, 48% / 0.15)" : "hsl(160, 40%, 42% / 0.15)",
                          color: fileAI.complexity === "high" ? "hsl(0, 65%, 50%)" : fileAI.complexity === "medium" ? "hsl(45, 70%, 48%)" : "hsl(160, 40%, 42%)",
                        }}>{fileAI.complexity} complexity</span>
                      </div>
                    </div>
                  </div>

                  {/* Key Functions */}
                  {fileAI.keyFunctions.length > 0 && (
                  <></>
                  )}
                  {fileAI.metrics && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: isDark ? "hsl(160, 20%, 50%)" : "hsl(160, 15%, 40%)" }}>
                        <Activity size={11} /> Quality Radar
                      </h4>
                      <div className="rounded-xl p-3" style={{ background: isDark ? "hsl(160, 10%, 10% / 0.5)" : "hsl(160, 5%, 96% / 0.7)", border: `1px solid ${isDark ? "hsl(160, 10%, 18% / 0.4)" : "hsl(160, 8%, 88% / 0.5)"}` }}>
                        <div style={{ width: "100%", height: 220 }}>
                          <ResponsiveContainer>
                            <RadarChart data={[
                              { axis: "Security", v: fileAI.metrics.security },
                              { axis: "Perf", v: fileAI.metrics.performance },
                              { axis: "Maint", v: fileAI.metrics.maintainability },
                              { axis: "Read", v: fileAI.metrics.readability },
                              { axis: "Test", v: fileAI.metrics.testability },
                              { axis: "Docs", v: fileAI.metrics.documentation },
                            ]}>
                              <PolarGrid stroke={isDark ? "hsl(0 0% 25%)" : "hsl(0 0% 80%)"} />
                              <PolarAngleAxis dataKey="axis" tick={{ fill: isDark ? "hsl(0 0% 65%)" : "hsl(0 0% 35%)", fontSize: 10 }} />
                              <Radar dataKey="v" stroke="hsl(160, 50%, 45%)" fill="hsl(160, 50%, 45%)" fillOpacity={0.35} />
                              <RTooltip contentStyle={{ background: isDark ? "hsl(0 0% 10%)" : "hsl(0 0% 98%)", border: "1px solid hsl(var(--border))", fontSize: 11, borderRadius: 8 }} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {fileAI.securityIssues.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: isDark ? "hsl(160, 20%, 50%)" : "hsl(160, 15%, 40%)" }}>
                        <Shield size={11} /> Severity Breakdown
                      </h4>
                      <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: isDark ? "hsl(160, 10%, 10% / 0.5)" : "hsl(160, 5%, 96% / 0.7)", border: `1px solid ${isDark ? "hsl(160, 10%, 18% / 0.4)" : "hsl(160, 8%, 88% / 0.5)"}` }}>
                        <div style={{ width: 140, height: 140 }} className="shrink-0">
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie
                                data={(["critical","high","medium","low"] as const).map((sev) => ({ name: sev, value: fileAI.securityIssues.filter((i) => i.severity === sev).length }))}
                                dataKey="value" innerRadius={36} outerRadius={60} stroke="none"
                              >
                                {(["critical","high","medium","low"] as const).map((sev) => (
                                  <Cell key={sev} fill={SEVERITY_COLORS[sev]} />
                                ))}
                              </Pie>
                              <RTooltip contentStyle={{ background: isDark ? "hsl(0 0% 10%)" : "hsl(0 0% 98%)", border: "1px solid hsl(var(--border))", fontSize: 11, borderRadius: 8 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-1.5">
                          {(["critical","high","medium","low"] as const).map((sev) => {
                            const c = fileAI.securityIssues.filter((i) => i.severity === sev).length;
                            return (
                              <div key={sev} className="flex items-center gap-2 text-[11px]">
                                <span className="w-2 h-2 rounded-full" style={{ background: SEVERITY_COLORS[sev] }} />
                                <span className="text-foreground/70 capitalize flex-1">{sev}</span>
                                <span className="font-mono tabular-nums text-foreground/85">{c}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {((fileAI.inboundDeps && fileAI.inboundDeps.length > 0) || (fileAI.outboundDeps && fileAI.outboundDeps.length > 0)) && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: isDark ? "hsl(160, 20%, 50%)" : "hsl(160, 15%, 40%)" }}>
                        <GitBranch size={11} /> Dependency Graph
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="rounded-xl p-3" style={{ background: isDark ? "hsl(210, 12%, 11% / 0.5)" : "hsl(210, 8%, 96% / 0.7)", border: `1px solid ${isDark ? "hsl(210, 10%, 20% / 0.3)" : "hsl(210, 8%, 88% / 0.4)"}` }}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <ArrowDownRight size={11} className="text-muted-foreground" />
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Imported by ({fileAI.inboundDeps?.length || 0})</p>
                          </div>
                          <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                            {(fileAI.inboundDeps || []).slice(0, 20).map((p) => (
                              <li key={p} className="text-[10px] font-mono truncate text-foreground/75">{p}</li>
                            ))}
                            {(!fileAI.inboundDeps || fileAI.inboundDeps.length === 0) && <li className="text-[10px] text-muted-foreground italic">No internal importers detected</li>}
                          </ul>
                        </div>
                        <div className="rounded-xl p-3" style={{ background: isDark ? "hsl(160, 12%, 11% / 0.5)" : "hsl(160, 8%, 96% / 0.7)", border: `1px solid ${isDark ? "hsl(160, 10%, 20% / 0.3)" : "hsl(160, 8%, 88% / 0.4)"}` }}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <ArrowUpRight size={11} className="text-muted-foreground" />
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Imports ({fileAI.outboundDeps?.length || 0})</p>
                          </div>
                          <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                            {(fileAI.outboundDeps || []).slice(0, 20).map((p) => (
                              <li key={p} className="text-[10px] font-mono truncate text-foreground/75">{p}</li>
                            ))}
                            {(!fileAI.outboundDeps || fileAI.outboundDeps.length === 0) && <li className="text-[10px] text-muted-foreground italic">No internal imports detected</li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Real Key Functions block (re-rendered) */}
                  {fileAI.keyFunctions.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: isDark ? "hsl(160, 20%, 50%)" : "hsl(160, 15%, 40%)" }}>
                        <Code2 size={11} /> Key Exports
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {fileAI.keyFunctions.map((fn, i) => (
                          <span key={i} className="text-[10px] px-2 py-1 rounded-lg font-mono" style={{ background: isDark ? "hsl(210, 12%, 14%)" : "hsl(210, 6%, 91%)", color: isDark ? "hsl(210, 20%, 60%)" : "hsl(210, 15%, 40%)", border: `1px solid ${isDark ? "hsl(210, 10%, 20% / 0.4)" : "hsl(210, 8%, 85% / 0.5)"}` }}>{fn}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Role badge */}
                  {fileAI.role && (
                    <div className="text-[11px] text-foreground/75">
                      <span className="text-muted-foreground uppercase tracking-wider text-[10px] mr-1.5">Role</span>
                      <span className="px-2 py-0.5 rounded-md bg-secondary/60 text-foreground/85 font-medium">{fileAI.role}</span>
                    </div>
                  )}

                  {/* Flowchart */}
                  {fileAI.flowchart && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: isDark ? "hsl(160, 20%, 50%)" : "hsl(160, 15%, 40%)" }}>
                        <GitBranch size={11} /> Flow Diagram
                      </h4>
                      <div className="rounded-xl p-2 backdrop-blur-md" style={{ background: isDark ? "hsl(160, 10%, 10% / 0.5)" : "hsl(160, 5%, 96% / 0.7)", border: `1px solid ${isDark ? "hsl(160, 10%, 18% / 0.4)" : "hsl(160, 8%, 88% / 0.5)"}` }}>
                        <MermaidDiagram chart={fileAI.flowchart} />
                      </div>
                    </div>
                  )}

                  {/* Data Flow steps */}
                  {fileAI.dataFlow && fileAI.dataFlow.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: isDark ? "hsl(160, 20%, 50%)" : "hsl(160, 15%, 40%)" }}>
                        <ListOrdered size={11} /> Data Flow
                      </h4>
                      <ol className="space-y-1.5">
                        {fileAI.dataFlow.map((s, i) => (
                          <li key={i} className="rounded-lg p-2.5 flex gap-2.5" style={{ background: isDark ? "hsl(160, 10%, 10% / 0.5)" : "hsl(160, 5%, 96% / 0.7)", border: `1px solid ${isDark ? "hsl(160, 10%, 18% / 0.3)" : "hsl(160, 8%, 88% / 0.4)"}` }}>
                            <span className="text-[10px] font-bold tabular-nums shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: isDark ? "hsl(160, 20%, 18%)" : "hsl(160, 15%, 88%)", color: isDark ? "hsl(160, 35%, 70%)" : "hsl(160, 35%, 30%)" }}>{s.step}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] text-foreground/85 leading-relaxed">{s.action}</p>
                              {s.data && <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">{s.data}</p>}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Network calls */}
                  {fileAI.networkCalls && fileAI.networkCalls.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: isDark ? "hsl(210, 40%, 55%)" : "hsl(210, 35%, 40%)" }}>
                        <NetworkIcon size={11} /> Network Calls
                      </h4>
                      <div className="space-y-1.5">
                        {fileAI.networkCalls.map((n, i) => (
                          <div key={i} className="rounded-lg p-2.5 space-y-1" style={{ background: isDark ? "hsl(210, 12%, 12% / 0.5)" : "hsl(210, 8%, 96% / 0.7)", border: `1px solid ${isDark ? "hsl(210, 10%, 20% / 0.4)" : "hsl(210, 8%, 88% / 0.5)"}` }}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded font-mono" style={{ background: isDark ? "hsl(210, 30%, 22%)" : "hsl(210, 25%, 85%)", color: isDark ? "hsl(210, 50%, 75%)" : "hsl(210, 50%, 30%)" }}>{n.method}</span>
                              <span className="text-[11px] font-mono text-foreground/85 truncate flex-1 min-w-0">{n.endpoint}</span>
                              {n.auth && <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground">{n.auth}</span>}
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">{n.purpose}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dependencies (AI-derived) */}
                  {fileAI.dependencies && fileAI.dependencies.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: isDark ? "hsl(160, 20%, 50%)" : "hsl(160, 15%, 40%)" }}>
                        <Package size={11} /> Dependency Map
                      </h4>
                      <div className="space-y-1">
                        {fileAI.dependencies.map((d, i) => (
                          <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-md" style={{ background: i % 2 === 0 ? (isDark ? "hsl(160, 10%, 10% / 0.3)" : "hsl(160, 5%, 95% / 0.4)") : "transparent" }}>
                            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 mt-0.5" style={{ background: d.kind === "external" ? (isDark ? "hsl(28, 30%, 18%)" : "hsl(28, 25%, 90%)") : (isDark ? "hsl(160, 25%, 18%)" : "hsl(160, 20%, 90%)"), color: d.kind === "external" ? (isDark ? "hsl(28, 60%, 65%)" : "hsl(28, 50%, 40%)") : (isDark ? "hsl(160, 40%, 65%)" : "hsl(160, 40%, 35%)") }}>{d.kind}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-mono text-foreground/85 truncate">{d.name}</p>
                              <p className="text-[10px] text-muted-foreground leading-relaxed">{d.purpose}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Security Issues */}
                  {fileAI.securityIssues.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: "hsl(0, 65%, 50%)" }}>
                        <Shield size={11} /> Security Issues ({fileAI.securityIssues.length})
                      </h4>
                      {fileAI.securityIssues.map((issue, i) => (
                        <div key={i} className="rounded-xl p-3 space-y-1.5 backdrop-blur-md" style={{ background: isDark ? "hsl(0, 15%, 12% / 0.6)" : "hsl(0, 10%, 96% / 0.8)", border: `1px solid ${isDark ? "hsl(0, 20%, 22% / 0.4)" : "hsl(0, 15%, 88% / 0.6)"}` }}>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: SEVERITY_COLORS[issue.severity] }} />
                            <span className="text-[11px] font-semibold text-foreground flex-1">{issue.title}</span>
                            {issue.cwe && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-secondary/60 text-foreground/70">{issue.cwe}</span>}
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ color: SEVERITY_COLORS[issue.severity], background: `${SEVERITY_COLORS[issue.severity]}18` }}>{issue.severity}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed" style={{ color: isDark ? "hsl(0, 0%, 65%)" : "hsl(0, 0%, 40%)" }}>{issue.description}</p>
                          {typeof issue.line === "number" && issue.line > 0 && (
                            <span className="text-[9px] text-muted-foreground">Line {issue.line}</span>
                          )}
                          {issue.suggestion && (
                            <div className="mt-1.5 p-2.5 rounded-lg" style={{ background: isDark ? "hsl(160, 12%, 10%)" : "hsl(160, 8%, 94%)", border: `1px solid ${isDark ? "hsl(160, 12%, 18% / 0.4)" : "hsl(160, 8%, 85% / 0.5)"}` }}>
                              <p className="text-[10px] font-mono" style={{ color: isDark ? "hsl(160, 30%, 55%)" : "hsl(160, 25%, 35%)" }}>{issue.suggestion}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Improvements */}
                  {fileAI.improvements.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: isDark ? "hsl(210, 40%, 55%)" : "hsl(210, 35%, 40%)" }}>
                        <BarChart3 size={11} /> Improvements ({fileAI.improvements.length})
                      </h4>
                      {fileAI.improvements.map((imp, i) => (
                        <div key={i} className="rounded-xl p-3 space-y-1 backdrop-blur-md" style={{ background: isDark ? "hsl(210, 15%, 12% / 0.6)" : "hsl(210, 10%, 96% / 0.8)", border: `1px solid ${isDark ? "hsl(210, 15%, 22% / 0.4)" : "hsl(210, 10%, 88% / 0.6)"}` }}>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-foreground flex-1">{imp.title}</span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide" style={{ background: isDark ? "hsl(210, 15%, 18% / 0.5)" : "hsl(210, 10%, 90% / 0.7)", color: isDark ? "hsl(210, 30%, 60%)" : "hsl(210, 25%, 45%)" }}>{imp.type}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed" style={{ color: isDark ? "hsl(0, 0%, 65%)" : "hsl(0, 0%, 40%)" }}>{imp.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {fileAI.securityIssues.length === 0 && fileAI.improvements.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: isDark ? "hsl(160, 12%, 14%)" : "hsl(160, 8%, 92%)" }}>
                        <Shield size={18} style={{ color: "hsl(160, 40%, 42%)" }} />
                      </div>
                      <p className="text-sm text-foreground font-medium">Looking good</p>
                      <p className="text-[11px] text-muted-foreground mt-1">No issues or improvements flagged by AI analysis.</p>
                    </div>
                  )}
                </>
              ) : (
                /* Fallback: original static insights */
                <>
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5" style={{ color: isDark ? "hsl(160, 20%, 50%)" : "hsl(160, 15%, 40%)" }}>
                      <Code2 size={11} /> Purpose
                    </h4>
                    <div className="rounded-xl p-3 backdrop-blur-md" style={{ background: isDark ? "hsl(160, 12%, 11% / 0.6)" : "hsl(160, 8%, 94% / 0.7)", border: `1px solid ${isDark ? "hsl(160, 10%, 18% / 0.3)" : "hsl(160, 8%, 88% / 0.4)"}` }}>
                      <p className="text-[12px] leading-relaxed" style={{ color: isDark ? "hsl(0, 0%, 70%)" : "hsl(0, 0%, 30%)" }}>{filePurpose}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-medium uppercase tracking-wider" style={{ color: isDark ? "hsl(160, 20%, 50%)" : "hsl(160, 15%, 40%)" }}>File Info</h4>
                    <div className="space-y-1.5">
                      {[
                        { label: "Path", value: path },
                        { label: "Language", value: lang },
                        { label: "Size", value: size ? `${(size / 1024).toFixed(1)} KB` : "Unknown" },
                        { label: "Lines", value: `${lines}` },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg" style={{ background: i % 2 === 0 ? (isDark ? "hsl(160, 10%, 10% / 0.3)" : "hsl(160, 5%, 95% / 0.4)") : "transparent" }}>
                          <span className="text-[10px] font-medium" style={{ color: isDark ? "hsl(160, 15%, 45%)" : "hsl(160, 10%, 50%)" }}>{item.label}</span>
                          <span className="text-[11px] font-mono text-foreground/80 text-right max-w-[60%] truncate">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Loader2 size={18} className="text-muted-foreground mb-2 animate-spin" />
                    <p className="text-[11px] text-muted-foreground">AI analysis is loading. Details will appear here once complete.</p>
                  </div>
                </>
              )}

              {/* External Links */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-medium uppercase tracking-wider" style={{ color: isDark ? "hsl(160, 20%, 50%)" : "hsl(160, 15%, 40%)" }}>Links</h4>
                <a
                  href={`https://github.com/${owner}/${repo}/blob/main/${path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-[11px] font-medium"
                  style={{
                    background: isDark ? "hsl(160, 12%, 12% / 0.5)" : "hsl(160, 8%, 94% / 0.6)",
                    border: `1px solid ${isDark ? "hsl(160, 10%, 18% / 0.3)" : "hsl(160, 8%, 88% / 0.4)"}`,
                    color: isDark ? "hsl(160, 25%, 60%)" : "hsl(160, 20%, 35%)",
                  }}
                >
                  <ExternalLink size={11} />
                  View on GitHub
                </a>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
