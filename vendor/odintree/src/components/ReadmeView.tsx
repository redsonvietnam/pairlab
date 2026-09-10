import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, Loader2, FileText, Code2, Download, RefreshCw, AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fetchReadme } from "@/lib/ai-analysis";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useIsDark } from "@/hooks/use-theme";

interface Props {
  files: { path: string; content: string }[];
  repoName: string;
  repoUrl: string;
  existingReadme?: string;
}

export function ReadmeView({ files, repoName, repoUrl, existingReadme }: Props) {
  const hasExisting = Boolean(existingReadme && existingReadme.trim().length > 100);
  const [markdown, setMarkdown] = useState<string>(hasExisting ? existingReadme! : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [partial, setPartial] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [tab, setTab] = useState<string>("preview");
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const isDark = useIsDark();

  const generate = async (sourceReadme?: string) => {
    setLoading(true);
    setError("");
    setPartial(false);
    setValidationErrors([]);
    const res = await fetchReadme(
      files,
      repoName,
      repoUrl,
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      sourceReadme || existingReadme
    );
    if (res.error) setError(res.error);
    else {
      setMarkdown(res.markdown);
      setPartial(Boolean(res.partial));
      setValidationErrors(res.validationErrors || []);
      setHasGenerated(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (files.length > 0 && !hasExisting && !loading && !hasGenerated) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const cleaned = useMemo(() => markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, (m) => {
    // strip preview images (no embedded preview), keep shields.io badges
    return /shields\.io|img\.shields\.io|badge/.test(m) ? m : "";
  }), [markdown]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">README</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => generate()}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] hover:bg-secondary/60 transition-colors text-muted-foreground disabled:opacity-50"
            title="Regenerate"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            {loading ? "Generating" : hasExisting ? "Refine" : "Regenerate"}
          </button>
          <button
            onClick={handleDownload}
            disabled={!markdown}
            className="p-1.5 rounded-md hover:bg-secondary/60 transition-colors text-muted-foreground disabled:opacity-30"
            title="Download README.md"
          >
            <Download size={12} />
          </button>
          <button
            onClick={handleCopy}
            disabled={!markdown}
            className="p-1.5 rounded-md hover:bg-secondary/60 transition-colors text-muted-foreground disabled:opacity-30"
            title="Copy markdown"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-3 pt-2 shrink-0">
          <TabsList className="rounded-lg p-0.5 h-auto inline-flex bg-secondary/40">
            <TabsTrigger value="preview" className="text-[11px] px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5">
              <FileText size={11} /> Preview
            </TabsTrigger>
            <TabsTrigger value="source" className="text-[11px] px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5">
              <Code2 size={11} /> Source
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="preview" className="flex-1 overflow-y-auto mt-0 p-6 data-[state=inactive]:hidden">
          {loading && !markdown ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Generating README from your code</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <p className="text-sm text-destructive font-medium">README generation failed</p>
              <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
              <button
                onClick={() => generate()}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          ) : (
            <>
              {partial && (
                <div className="mb-4 rounded-lg border border-border/50 bg-secondary/40 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={13} className="mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[12px] font-medium text-foreground">README loaded with fallback validation</p>
                      <p className="text-[11px] text-muted-foreground mt-1">The AI response was incomplete or malformed, so Odin kept partial markdown visible and filled missing sections from parsed repository files.</p>
                      {validationErrors.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {validationErrors.slice(0, 6).map((err, i) => <li key={i} className="text-[10px] font-mono text-muted-foreground">{err}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <article className="prose-readme max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-2xl font-serif font-semibold text-foreground mt-2 mb-3 leading-tight">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-serif font-semibold text-foreground mt-6 mb-2 pb-1 border-b border-border/40">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-semibold text-foreground mt-4 mb-2">{children}</h3>,
                  p: ({ children }) => <p className="text-[13px] text-foreground/80 leading-relaxed my-2">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 text-[13px] text-foreground/80 my-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 text-[13px] text-foreground/80 my-2">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  code: ({ inline, className, children, ...props }: any) => {
                    if (inline) return <code className="text-[12px] px-1 py-0.5 bg-secondary/50 rounded font-mono">{children}</code>;
                    const lang = (className || "").replace("language-", "") || "text";
                    return (
                      <SyntaxHighlighter
                        language={lang}
                        style={isDark ? oneDark : oneLight}
                        customStyle={{ margin: "0.5rem 0", padding: "0.75rem", fontSize: "12px", borderRadius: "0.5rem", background: isDark ? "hsl(0 0% 6%)" : "hsl(0 0% 96%)" }}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    );
                  },
                  table: ({ children }) => <div className="overflow-x-auto my-3"><table className="w-full text-[12px] border-collapse">{children}</table></div>,
                  th: ({ children }) => <th className="text-left font-semibold px-3 py-2 border-b border-border/60 text-foreground">{children}</th>,
                  td: ({ children }) => <td className="px-3 py-2 border-b border-border/30 text-foreground/75 align-top">{children}</td>,
                  a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-foreground underline decoration-foreground/30 hover:decoration-foreground">{children}</a>,
                  img: ({ src, alt }) => {
                    if (src && /shields\.io|img\.shields\.io/.test(src)) {
                      return <img src={src} alt={alt || ""} className="inline-block mr-1 my-0.5 align-middle" />;
                    }
                    return null;
                  },
                  blockquote: ({ children }) => <blockquote className="border-l-2 border-border/60 pl-3 my-2 text-foreground/70 italic">{children}</blockquote>,
                }}
              >
                {cleaned}
              </ReactMarkdown>
              </article>
            </>
          )}
        </TabsContent>

        <TabsContent value="source" className="flex-1 overflow-y-auto mt-0 data-[state=inactive]:hidden">
          <SyntaxHighlighter
            language="markdown"
            style={isDark ? oneDark : oneLight}
            customStyle={{ margin: 0, padding: "1rem", fontSize: "12px", lineHeight: "1.7", background: "transparent" }}
          >
            {markdown || "# README will appear here"}
          </SyntaxHighlighter>
        </TabsContent>
      </Tabs>
    </div>
  );
}