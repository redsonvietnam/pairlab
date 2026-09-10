import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ClipboardPaste } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { parseRepoUrl } from "@/lib/github";

export default function Landing() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handlePasteFromClipboard = async () => {
    try {
      const txt = await navigator.clipboard.readText();
      if (txt) { setUrl(txt); setError(""); }
    } catch {
      setError("Clipboard blocked. Paste manually with Cmd/Ctrl+V.");
    }
  };

  const handleAnalyze = async () => {
    const raw = url.trim();
    if (!raw) {
      setError("Paste a GitHub repository link to begin.");
      return;
    }
    const parsed = parseRepoUrl(raw);
    if (!parsed) {
      setError("That doesn't look like a GitHub repo. Try github.com/owner/repo, owner/repo, or a git@github.com:owner/repo.git URL.");
      return;
    }
    setError("");
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      }
    } catch { /* fullscreen blocked, continue anyway */ }
    // Normalize: always pass a clean canonical URL to the workspace
    navigate(`/workspace?repo=${encodeURIComponent(`https://github.com/${parsed.owner}/${parsed.repo}`)}`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const txt = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("text/uri-list");
    if (txt) { setUrl(txt); setError(""); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-4xl"
        >
          <h1
            style={{ fontFamily: "'Instrument Serif', 'Times New Roman', serif", fontWeight: 400, letterSpacing: "-0.02em" }}
            className="text-[clamp(3.25rem,9vw,9rem)] leading-[0.88] text-foreground mb-8"
          >
            Explore code
            <br />
            <em style={{ fontStyle: "italic" }}>visually.</em>
          </h1>

          <p className="text-[15px] md:text-lg text-muted-foreground max-w-md mx-auto mb-10 md:mb-12 font-light px-2">
            Paste a GitHub repository link and instantly see its architecture as an interactive flowchart.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="max-w-3xl mx-auto px-2 sm:px-0"
          >
            <div
              className="flex items-center border border-border bg-card rounded-2xl p-1.5 sm:p-2 shadow-sm gap-1.5 sm:gap-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0 px-2.5 sm:px-3">
                <input
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  placeholder="github.com/owner/repo  ·  owner/repo  ·  paste a link"
                  className="flex-1 min-w-0 bg-transparent text-[14px] sm:text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none py-2.5 sm:py-3 font-mono"
                />
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  title="Paste from clipboard"
                  className="hidden sm:flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors shrink-0"
                >
                  <ClipboardPaste size={14} />
                </button>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={!url.trim()}
                className="flex items-center gap-1.5 sm:gap-2 bg-foreground text-background text-sm font-medium px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl transition-all hover:opacity-80 disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
              >
                <span className="font-serif italic" style={{ fontFamily: "'Instrument Serif', serif" }}>Analyze</span>
                <ArrowRight size={14} />
              </button>
            </div>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-destructive mt-3 font-medium"
              >
                {error}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      </main>

      <section className="px-6 md:px-16 lg:px-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="max-w-5xl mx-auto"
        >
          <VideoPlayer src="/hero-placeholder.mp4" />
        </motion.div>
      </section>

      <section className="px-6 md:px-16 lg:px-24 pb-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto"
        >
          <div className="border-t border-border pt-6 pb-2 mb-2">
            <h2 className="text-[clamp(2rem,5vw,4rem)] font-serif tracking-tight text-foreground leading-[1]">
              What <span className="italic">Odin</span> does.
            </h2>
          </div>
          <div className="border-b border-border mb-8" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="space-y-6">
              <article>
                <h3 className="text-sm font-serif text-foreground tracking-wider mb-2">Interactive Graphs</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every repository is transformed into a node based flowchart. Files, functions, classes, and modules become draggable, zoomable nodes connected by their real import relationships.
                </p>
              </article>
              <article>
                <h3 className="text-sm font-serif text-foreground tracking-wider mb-2">Code Preview</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Click any node to instantly see its source code, syntax highlighted, scrollable, and annotated with AI generated explanations of what each section does.
                </p>
              </article>
            </div>
            <div className="space-y-6">
              <article>
                <h3 className="text-sm font-serif text-foreground tracking-wider mb-2">Performance Analysis</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Complexity scores, dependency depth, and file size heatmaps help you identify bottlenecks and areas that need refactoring before they become problems.
                </p>
              </article>
              <article>
                <h3 className="text-sm font-serif text-foreground tracking-wider mb-2">Vulnerability Detection</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Automatically scan for hardcoded secrets, unsafe patterns, and known dependency vulnerabilities. Security insights are surfaced directly on each node.
                </p>
              </article>
            </div>
            <div className="space-y-6">
              <article>
                <h3 className="text-sm font-serif text-foreground tracking-wider mb-2">Multi Language Support</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  JavaScript, TypeScript, Python, Java, Go, Rust, all color coded by language with intelligent parsing that understands each ecosystem's import patterns.
                </p>
              </article>
              <article>
                <h3 className="text-sm font-serif text-foreground tracking-wider mb-2">Comparisons and Insights</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Compare repository structures side by side. Understand architectural patterns, spot anti patterns, and learn how well designed projects organize their code.
                </p>
              </article>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="px-6 md:px-16 lg:px-24 pb-16">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto"
        >
          <div className="pt-8">
            <h3 className="font-serif italic text-lg text-foreground mb-2">Why Odin?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
              In Norse mythology, Odin is the god who seeks knowledge across all realms. This tool does the same, traversing repositories across GitHub to reveal the hidden architecture of code.
            </p>
          </div>
        </motion.div>
      </section>

      <footer className="py-8 px-6 md:px-16 lg:px-24">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="https://github.com/Thanas-R" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
            <span className="text-muted-foreground/30">|</span>
            <a href="https://thanas.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Portfolio</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
