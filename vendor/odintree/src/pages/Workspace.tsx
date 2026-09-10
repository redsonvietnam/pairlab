import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ReactFlow, Controls, Background,
  useNodesState, useEdgesState, useReactFlow, ReactFlowProvider, type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Search, Filter, ChevronRight, Grip, CircleDot, LayoutGrid, Menu, X, Loader2, BookOpen, FileText, History, Package, Users, Settings, GraduationCap, Flame } from "lucide-react";
import { fetchRepoAIAnalysis, renderVerification, type AIRepoAnalysis } from "@/lib/ai-analysis";
import { toast } from "sonner";
import { parseRepoUrl, fetchRepoInfo, fetchRepoTree, fetchFileContent, type RepoInfo, type RepoFile } from "@/lib/github";
import { buildGraphFromFiles } from "@/lib/graph-builder";
import { analyzeFile } from "@/lib/code-analysis";
import { sampleRepoInfo, sampleRepoFiles, sampleFileContents } from "@/lib/sample-repo";
import { GraphNodeType } from "@/components/GraphNode";
import { DetailsPanel } from "@/components/DetailsPanel";
import { AnalyzingOverlay } from "@/components/AnalyzingOverlay";
import { RepoErrorModal } from "@/components/RepoErrorModal";
import { RepoSummaryOverlay } from "@/components/RepoSummaryOverlay";
import { RepoTooLargeModal } from "@/components/RepoTooLargeModal";
import { ReadmeOverlay } from "@/components/ReadmeOverlay";
import { TimelineOverlay } from "@/components/TimelineOverlay";
import { DependenciesOverlay } from "@/components/DependenciesOverlay";
import { OwnershipOverlay } from "@/components/OwnershipOverlay";
import { LearningPathOverlay } from "@/components/LearningPathOverlay";
import { SettingsDialog } from "@/components/SettingsDialog";
import { FileTree } from "@/components/FileTree";
import { SpotlightSearch } from "@/components/SpotlightSearch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

const nodeTypes = { graphNode: GraphNodeType };

const defaultEdgeOptions = {
  type: "bezier" as const,
  animated: false,
  style: { stroke: "hsl(var(--border))", strokeWidth: 2, strokeLinecap: "round" as const },
};

type BgMode = "dots" | "lines" | "none";
const MAX_FILES_FOR_AI = 500;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

function WorkspaceInner() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repoUrl = searchParams.get("repo") || "";
  const isTestMode = searchParams.get("test") === "1";
  const parsed = isTestMode ? { owner: sampleRepoInfo.owner, repo: sampleRepoInfo.repo } : parseRepoUrl(repoUrl);
  const { fitView, setCenter } = useReactFlow();
  const isMobile = useIsMobile();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [repoFiles, setRepoFiles] = useState<RepoFile[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [analyzing, setAnalyzing] = useState(true);
  const [langFilter, setLangFilter] = useState<string>("all");
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);
  const [bgMode, setBgMode] = useState<BgMode>("dots");
  const [mobilePanel, setMobilePanel] = useState<"graph" | "details">("graph");
  const [aiAnalysis, setAiAnalysis] = useState<AIRepoAnalysis | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string>("");
  const [showSummary, setShowSummary] = useState(false);
  const [showReadme, setShowReadme] = useState(false);
  const [tooLargeOpen, setTooLargeOpen] = useState(false);
  const [tooLargeCount, setTooLargeCount] = useState(0);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showDeps, setShowDeps] = useState(false);
  const [showOwnership, setShowOwnership] = useState(false);
  const [showLearning, setShowLearning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [heatmap, setHeatmap] = useState(false);

  const [steps, setSteps] = useState([
    { label: "Fetching repository metadata", done: false },
    { label: "Loading the file tree", done: false },
    { label: "Building the graph layout", done: false },
    { label: "Generating insights", done: false },
  ]);

  const completeStep = (index: number) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, done: true } : s)));
  };

  const enrichNodesWithAnalysis = useCallback((currentNodes: Node[], contents: Record<string, string>) => {
    return currentNodes.map((n) => {
      if (n.data.nodeType !== "file" || !contents[n.id]) return n;
      const lang = (n.data.language as string) || "Other";
      const analysis = analyzeFile(contents[n.id], lang);
      return {
        ...n,
        data: {
          ...n.data,
          vulnCount: analysis.vulnerabilities.length,
          complexity: analysis.complexity,
        },
      };
    });
  }, []);

  // Auto-trigger AI analysis
  const runAIAnalysis = useCallback(async (contents: Record<string, string>, repoName: string) => {
    const codeFiles = Object.entries(contents).filter(([_, c]) => c.length > 0);
    if (codeFiles.length === 0) return;

    // Check if repo is too large
    if (codeFiles.length > MAX_FILES_FOR_AI) {
      setTooLargeCount(codeFiles.length);
      setTooLargeOpen(true);
      return;
    }

    setAiAnalyzing(true);
    setAiError("");
    const filesToAnalyze = codeFiles.map(([path, content]) => {
      const ext = path.split(".").pop()?.toLowerCase() || "";
      const langGuess = { ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript", py: "Python", go: "Go", rs: "Rust", java: "Java", css: "CSS", html: "HTML" }[ext] || "Other";
      return { path, content, language: langGuess };
    });

    const result = await fetchRepoAIAnalysis(
      filesToAnalyze,
      repoName,
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );
    setAiAnalyzing(false);
    if (result.error) {
      setAiError(result.error);
      setAiAnalysis(null);
      toast.error(result.error, {
        action: { label: "Retry", onClick: () => runAIAnalysis(contents, repoName) },
      });
    } else {
      setAiAnalysis(result);
      const verified = renderVerification(result);
      if (!verified.ready || result.debug?.status === "partial" || result.debug?.status === "fallback") {
        toast.warning("Analysis loaded with fallback validation. Open Debug to inspect details.");
      } else {
        toast.success(`Analysis complete. Score: ${result.repoSummary.overallScore}/100`);
      }
    }
  }, []);

  const fetchAllContents = useCallback(async (owner: string, repo: string, files: RepoFile[]) => {
    const readmeFile = files.find((f) => f.type === "file" && /^readme\.md$/i.test(f.path));
    const codeFiles = files.filter((f) => f.type === "file").slice(0, 80);
    const toFetch = readmeFile && !codeFiles.some((f) => f.path === readmeFile.path)
      ? [readmeFile, ...codeFiles].slice(0, 81)
      : codeFiles;
    const contents: Record<string, string> = {};
    // Larger parallel batches for faster initial load
    const BATCH = 12;
    const batches: RepoFile[][] = [];
    for (let i = 0; i < toFetch.length; i += BATCH) batches.push(toFetch.slice(i, i + BATCH));
    for (const batch of batches) {
      const results = await Promise.all(batch.map(async (f) => ({ path: f.path, content: await fetchFileContent(owner, repo, f.path) })));
      for (const r of results) contents[r.path] = r.content;
      setFileContents((prev) => ({ ...prev, ...Object.fromEntries(results.map((r) => [r.path, r.content])) }));
    }
    setNodes((prev) => enrichNodesWithAnalysis(prev, contents));
    return contents;
  }, [enrichNodesWithAnalysis, setNodes]);

  useEffect(() => {
    if (!parsed) { setAnalyzing(false); setErrorMessage("Invalid repository URL. Please check the format."); setErrorOpen(true); return; }

    if (isTestMode) {
      const loadSample = async () => {
        setRepoInfo(sampleRepoInfo);
        completeStep(0);
        await new Promise((r) => setTimeout(r, 300));
        setRepoFiles(sampleRepoFiles);
        completeStep(1);
        await new Promise((r) => setTimeout(r, 200));
        const { nodes: gn, edges: ge } = buildGraphFromFiles(sampleRepoFiles, `${sampleRepoInfo.owner}/${sampleRepoInfo.repo}`);
        setNodes(gn);
        setEdges(ge);
        completeStep(2);
        setFileContents(sampleFileContents);
        setNodes((prev) => enrichNodesWithAnalysis(prev, sampleFileContents));
        await new Promise((r) => setTimeout(r, 300));
        completeStep(3);
        await new Promise((r) => setTimeout(r, 300));
        setAnalyzing(false);
        // Auto-analyze for test mode
        runAIAnalysis(sampleFileContents, `${sampleRepoInfo.owner}/${sampleRepoInfo.repo}`);
      };
      loadSample();
      return;
    }

    const load = async () => {
      try {
        const info = await fetchRepoInfo(parsed.owner, parsed.repo);
        setRepoInfo(info);
        completeStep(0);
        await new Promise((r) => setTimeout(r, 400));
        const files = await fetchRepoTree(parsed.owner, parsed.repo, info.defaultBranch);
        setRepoFiles(files);
        completeStep(1);

        // Check file count for large repos before building graph
        const totalFiles = files.filter((f) => f.type === "file").length;
        if (totalFiles > MAX_FILES_FOR_AI) {
          setTooLargeCount(totalFiles);
        }

        await new Promise((r) => setTimeout(r, 300));
        const { nodes: gn, edges: ge } = buildGraphFromFiles(files, `${parsed.owner}/${parsed.repo}`);
        setNodes(gn);
        setEdges(ge);
        completeStep(2);
        const contents = await fetchAllContents(parsed.owner, parsed.repo, files);
        await new Promise((r) => setTimeout(r, 500));
        completeStep(3);
        await new Promise((r) => setTimeout(r, 400));
        setAnalyzing(false);
        // Auto-analyze after loading
        if (totalFiles <= MAX_FILES_FOR_AI) {
          runAIAnalysis(contents, `${parsed.owner}/${parsed.repo}`);
        } else {
          setTooLargeOpen(true);
        }
      } catch (e: any) {
        console.error(e);
        setAnalyzing(false);
        setErrorMessage(e?.message || "Failed to load repository. Please try again.");
        setErrorOpen(true);
      }
    };
    load();
  }, [parsed?.owner, parsed?.repo, isTestMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSpotlightOpen((o) => !o); }
      if (e.key === "Escape") {
        if (showSettings) { setShowSettings(false); return; }
        if (showLearning) { setShowLearning(false); return; }
        if (showSummary) { setShowSummary(false); return; }
        if (showReadme) { setShowReadme(false); return; }
        if (showTimeline) { setShowTimeline(false); return; }
        if (showDeps) { setShowDeps(false); return; }
        if (showOwnership) { setShowOwnership(false); return; }
        if (tooLargeOpen) { setTooLargeOpen(false); return; }
        if (selectedNode) { setSelectedNode(null); return; }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showSummary, showReadme, showTimeline, showDeps, showOwnership, showLearning, showSettings, tooLargeOpen, selectedNode]);

  useEffect(() => {
    if (isMobile) setSidebarCollapsed(true);
  }, [isMobile]);

  const handleErrorClose = useCallback(() => { setErrorOpen(false); navigate("/"); }, [navigate]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setCenter(node.position.x + 100, node.position.y + 25, { zoom: 1.4, duration: 600 });
    if (isMobile) setMobilePanel("details");
  }, [setCenter, isMobile]);

  const handleFileSelect = useCallback((path: string, _type: "file" | "dir") => {
    const node = nodes.find((n) => n.id === path);
    if (node) {
      setSelectedNode(node);
      setCenter(node.position.x + 100, node.position.y + 25, { zoom: 1.4, duration: 600 });
      if (isMobile) setMobilePanel("details");
    }
  }, [nodes, setCenter, isMobile]);

  const filteredNodes = useMemo(() => {
    return nodes.map((n) => {
      const cx = (n.data.complexity as number) || 0;
      let style: any = undefined;
      if (heatmap && n.data.nodeType === "file") {
        // Heat by complexity (0-30+). Red overlay border with intensity.
        const intensity = Math.max(0, Math.min(1, cx / 30));
        style = { boxShadow: `0 0 0 2px hsla(0, 75%, 55%, ${0.15 + intensity * 0.6})`, borderRadius: 12 };
      }
      return {
        ...n,
        hidden: langFilter !== "all" && (n.data.language as string) !== langFilter,
        selected: selectedNode?.id === n.id,
        style,
      };
    });
  }, [nodes, langFilter, selectedNode, heatmap]);

  const languages = useMemo(() => {
    const set = new Set(nodes.map((n) => n.data.language as string).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [nodes]);

  const showDetailsPanel = !!selectedNode;
  const selectedFileCategory = useMemo(() => {
    const path = (selectedNode?.data?.path as string) || selectedNode?.id || "";
    const ext = path.split(".").pop()?.toLowerCase() || "";
    return ["md", "mdx"].includes(ext) ? "markdown" : "other";
  }, [selectedNode]);

  const breadcrumbParts = useMemo(() => {
    const parts: { label: string; path: string }[] = [];
    if (repoInfo) { parts.push({ label: repoInfo.owner, path: "" }); parts.push({ label: repoInfo.repo, path: "" }); }
    if (selectedNode && selectedNode.data?.path) {
      const filePath = selectedNode.data.path as string;
      const segments = filePath.split("/").filter(Boolean);
      segments.forEach((seg, i) => { parts.push({ label: seg, path: segments.slice(0, i + 1).join("/") }); });
    }
    return parts;
  }, [repoInfo, selectedNode]);

  const renderFlowCanvas = () => (
    <div className="h-full relative overflow-hidden bg-background rounded-[inherit]">
      <ReactFlow
        nodes={filteredNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        minZoom={0.02}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        onlyRenderVisibleElements={nodes.length > 250}
        nodesDraggable={nodes.length < 400}
        className="!bg-transparent relative z-10"
        style={{ background: "transparent" }}
      >
        {bgMode === "dots" && <Background variant={"dots" as any} gap={22} size={1.5} />}
        {bgMode === "lines" && <Background variant={"lines" as any} gap={22} />}
        <Controls className="!rounded-xl !flex-row !flex !border-0 !shadow-none glass-controls" orientation="horizontal" showInteractive={false} />
      </ReactFlow>
    </div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="workspace-canvas h-screen flex flex-col bg-background overflow-hidden">
        {analyzing && <AnalyzingOverlay steps={steps} />}
        <RepoErrorModal open={errorOpen} onClose={handleErrorClose} message={errorMessage} />
        <SpotlightSearch open={spotlightOpen} onClose={() => setSpotlightOpen(false)} files={repoFiles.filter((f) => f.type === "file")} onSelectFile={handleFileSelect} fileContents={fileContents} />

        {/* Summary overlay */}
        <AnimatePresence>
          {showSummary && aiAnalysis?.repoSummary && (
            <RepoSummaryOverlay
              summary={aiAnalysis.repoSummary}
              debug={aiAnalysis.debug}
              onClose={() => setShowSummary(false)}
              repoName={repoInfo ? `${repoInfo.owner}-${repoInfo.repo}` : "repository"}
              files={Object.entries(fileContents).map(([path, content]) => ({ path, content }))}
            />
          )}
        </AnimatePresence>

        {/* README overlay */}
        <AnimatePresence>
          {showReadme && (
            <ReadmeOverlay
              files={Object.entries(fileContents).map(([path, content]) => ({ path, content }))}
              repoName={repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : ""}
              repoUrl={repoInfo ? `https://github.com/${repoInfo.owner}/${repoInfo.repo}` : ""}
              existingReadme={fileContents["README.md"] || fileContents["readme.md"]}
              onClose={() => setShowReadme(false)}
            />
          )}
        </AnimatePresence>

        {/* Too large modal */}
        <AnimatePresence>
          <RepoTooLargeModal open={tooLargeOpen} onClose={() => setTooLargeOpen(false)} fileCount={tooLargeCount} />
        </AnimatePresence>

        {/* Timeline overlay */}
        <AnimatePresence>
          {showTimeline && parsed && (
            <TimelineOverlay owner={parsed.owner} repo={parsed.repo} onClose={() => setShowTimeline(false)} />
          )}
        </AnimatePresence>

        {/* Dependencies overlay */}
        <AnimatePresence>
          {showDeps && (
            <DependenciesOverlay
              files={Object.entries(fileContents).map(([path, content]) => ({ path, content }))}
              onClose={() => setShowDeps(false)}
            />
          )}
        </AnimatePresence>

        {/* Ownership overlay */}
        <AnimatePresence>
          {showOwnership && parsed && (
            <OwnershipOverlay
              owner={parsed.owner}
              repo={parsed.repo}
              filePaths={repoFiles.filter((f) => f.type === "file").map((f) => f.path)}
              onClose={() => setShowOwnership(false)}
            />
          )}
        </AnimatePresence>

        {/* Learning path overlay */}
        <AnimatePresence>
          {showLearning && (
            <LearningPathOverlay
              repoName={repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : "repository"}
              filePaths={repoFiles.filter((f) => f.type === "file").map((f) => f.path)}
              focusPath={(selectedNode?.data?.path as string) || undefined}
              summaries={aiAnalysis ? Object.entries(aiAnalysis.fileAnalyses).map(([path, a]) => ({ path, role: a.role, purpose: a.purpose })) : undefined}
              onSelectFile={(p) => { handleFileSelect(p, "file"); setShowLearning(false); }}
              onClose={() => setShowLearning(false)}
            />
          )}
        </AnimatePresence>

        <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />

        {/* Top Bar */}
        <div className="h-12 border-b border-border/50 flex items-center px-3 md:px-4 gap-2 md:gap-3 bg-card/60 backdrop-blur-md shrink-0 z-20">
          {isMobile && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors md:hidden"
            >
              {sidebarCollapsed ? <Menu size={15} className="text-muted-foreground" /> : <X size={15} className="text-muted-foreground" />}
            </button>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => navigate("/")} className="p-1.5 rounded-lg hover:bg-secondary transition-colors hidden md:block">
                <ArrowLeft size={15} className="text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Back to home</TooltipContent>
          </Tooltip>

          <div className="w-px h-5 bg-border/40 hidden md:block" />

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 min-w-0 overflow-hidden flex-1 md:flex-none">
            {breadcrumbParts.slice(isMobile ? -2 : 0).map((part, i) => (
              <span key={i} className="flex items-center gap-1.5 shrink-0">
                {i > 0 && <ChevronRight size={12} className="text-muted-foreground/30" />}
                <span className={`text-[13px] truncate ${i === breadcrumbParts.slice(isMobile ? -2 : 0).length - 1 ? "text-foreground font-semibold" : "text-muted-foreground font-medium"}`}>
                  {part.label}
                </span>
              </span>
            ))}
          </div>

          <div className="flex-1 hidden md:block" />

          <div className="flex items-center gap-1 md:gap-1.5">
            {isMobile && showDetailsPanel && mobilePanel === "details" && (
              <button
                onClick={() => setMobilePanel("graph")}
                className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors"
              >
                <ArrowLeft size={14} className="text-muted-foreground" />
              </button>
            )}

            {/* Mobile actions dropdown */}
            {isMobile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex md:hidden items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold"
                    style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))" }}
                  >
                    {aiAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <BookOpen size={12} />}
                    <span>{aiAnalyzing ? "Analyzing" : "Actions"}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[200px]">
                  <DropdownMenuItem
                    className="text-xs gap-2"
                    onClick={() => {
                      if (aiAnalysis?.repoSummary) setShowSummary(true);
                      else if (aiAnalyzing) toast.info("Analysis is still running...");
                      else if (aiError) {
                        if (/credit|rate limit|API Key|provider/i.test(aiError)) {
                          toast.error(aiError, { duration: 8000, action: { label: "Settings", onClick: () => setShowSettings(true) } });
                        } else runAIAnalysis(fileContents, repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : "repo");
                      }
                    }}
                  >
                    <BookOpen size={12} /> {aiError ? "Retry analysis" : "Summary"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs gap-2" onClick={() => setShowReadme(true)} disabled={Object.keys(fileContents).length === 0}>
                    <FileText size={12} /> README
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs gap-2" onClick={() => setShowTimeline(true)} disabled={!parsed}>
                    <History size={12} /> Timeline
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs gap-2" onClick={() => setShowDeps(true)} disabled={Object.keys(fileContents).length === 0}>
                    <Package size={12} /> Dependencies
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs gap-2" onClick={() => setShowOwnership(true)} disabled={!parsed}>
                    <Users size={12} /> Owners
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs gap-2" onClick={() => setShowLearning(true)} disabled={Object.keys(fileContents).length === 0}>
                    <GraduationCap size={12} /> Learn
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs gap-2" onClick={() => setHeatmap((h) => !h)}>
                    <Flame size={12} /> {heatmap ? "Hide heatmap" : "Show heatmap"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs gap-2" onClick={() => setSpotlightOpen(true)}>
                    <Search size={12} /> Search files
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs gap-2" onClick={() => setShowSettings(true)}>
                    <Settings size={12} /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs gap-2" onClick={() => navigate("/")}>
                    <ArrowLeft size={12} /> Back to home
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}


            {/* Summary Button (replaces Analyze) */}
            <button
              onClick={async () => {
                // Force fullscreen for an immersive analysis view
                try {
                  if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen?.();
                  }
                } catch { /* fullscreen blocked, continue anyway */ }
                if (aiAnalysis?.repoSummary) {
                  // Always show whatever we have (partial, fallback, or valid). No gating, no debug drawer.
                  setShowSummary(true);
                } else if (aiAnalyzing) {
                  toast.info("Analysis is still running...");
                } else if (aiError) {
                  if (/credit|rate limit|API Key|provider/i.test(aiError)) {
                    toast.error(aiError, { duration: 8000, action: { label: "Open Settings", onClick: () => setShowSettings(true) } });
                  } else {
                    runAIAnalysis(fileContents, repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : "repo");
                  }
                }
              }}
              disabled={!aiAnalysis && !aiAnalyzing && !aiError}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-30 font-display tracking-tight"
              style={{
                background: "hsl(var(--foreground))",
                color: "hsl(var(--background))",
              }}
            >
              {aiAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <BookOpen size={12} />}
              {aiAnalyzing ? "Analyzing..." : aiError ? "Retry analysis" : "Summary"}
            </button>

            {/* README Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowReadme(true)}
                  disabled={Object.keys(fileContents).length === 0}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-foreground bg-secondary/30 hover:bg-secondary/50 transition-colors disabled:opacity-30"
                >
                  <FileText size={12} />
                  <span>README</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Generate README</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowTimeline(true)}
                  disabled={!parsed}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-foreground bg-secondary/30 hover:bg-secondary/50 transition-colors disabled:opacity-30"
                >
                  <History size={12} />
                  <span>Timeline</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Commit timeline and activity report</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowDeps(true)}
                  disabled={Object.keys(fileContents).length === 0}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-foreground bg-secondary/30 hover:bg-secondary/50 transition-colors disabled:opacity-30"
                >
                  <Package size={12} />
                  <span>Deps</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Dependency risk analyzer</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowOwnership(true)}
                  disabled={!parsed}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-foreground bg-secondary/30 hover:bg-secondary/50 transition-colors disabled:opacity-30"
                >
                  <Users size={12} />
                  <span>Owners</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Code ownership map</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => setShowLearning(true)} disabled={Object.keys(fileContents).length === 0} className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] text-foreground bg-secondary/30 hover:bg-secondary/50 transition-colors disabled:opacity-30">
                  <GraduationCap size={12} /><span>Learn</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>AI learning path</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => setHeatmap((h) => !h)} className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors ${heatmap ? "bg-foreground text-background" : "bg-secondary/30 text-foreground hover:bg-secondary/50"}`}>
                  <Flame size={12} /><span>Heat</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Toggle complexity heatmap</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => setSpotlightOpen(true)} className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors">
                  <Search size={14} className="text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Search files</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors">
                  <Settings size={14} className="text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Settings (API keys)</TooltipContent>
            </Tooltip>

            {/* Language Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-[12px] text-foreground">
                  <Filter size={12} className="text-muted-foreground" />
                  <span>{langFilter === "all" ? "All" : langFilter}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                {languages.map((l) => (
                  <DropdownMenuItem key={l} onClick={() => setLangFilter(l)} className={`text-xs ${langFilter === l ? "font-semibold" : ""}`}>
                    {l === "all" ? "All languages" : l}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Background Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hidden md:block">
                  {bgMode === "dots" ? <CircleDot size={14} /> : bgMode === "lines" ? <LayoutGrid size={14} /> : <Grip size={14} />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px]">
                <DropdownMenuItem onClick={() => setBgMode("none")} className={`text-xs gap-2 ${bgMode === "none" ? "font-semibold" : ""}`}>
                  <Grip size={12} /> Plain
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBgMode("dots")} className={`text-xs gap-2 ${bgMode === "dots" ? "font-semibold" : ""}`}>
                  <CircleDot size={12} /> Dots
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBgMode("lines")} className={`text-xs gap-2 ${bgMode === "lines" ? "font-semibold" : ""}`}>
                  <LayoutGrid size={12} /> Grid
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle />
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Sidebar - overlay on mobile */}
          <AnimatePresence initial={false}>
            {!sidebarCollapsed && isMobile && (
              <motion.div
                initial={{ x: -32, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -28, opacity: 0 }}
                transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.9 }}
                className="absolute left-0 top-0 bottom-0 z-30 w-[240px]"
                style={{
                  background: "hsl(var(--card) / 0.95)",
                  backdropFilter: "blur(20px)",
                  borderRight: "1px solid hsl(var(--border) / 0.4)",
                }}
              >
                <FileTree files={repoFiles} selectedPath={selectedNode?.id || null} onSelectFile={(path, type) => { handleFileSelect(path, type); if (isMobile) setSidebarCollapsed(true); }} collapsed={false} onToggleCollapse={() => setSidebarCollapsed(true)} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop sidebar */}
          {!isMobile && (
            <motion.div
              initial={false}
              animate={{ width: sidebarCollapsed ? 68 : 280 }}
              transition={{ type: "spring", stiffness: 300, damping: 32, mass: 0.9 }}
              className="shrink-0 overflow-hidden m-2 mr-0 rounded-[1.35rem] will-change-[width]"
              style={{
                background: "hsl(var(--card) / 0.6)",
                backdropFilter: "blur(16px)",
                border: "1px solid hsl(var(--border) / 0.4)",
              }}
            >
              <FileTree files={repoFiles} selectedPath={selectedNode?.id || null} onSelectFile={handleFileSelect} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
            </motion.div>
          )}

          {/* Mobile: show either graph or details */}
          {isMobile ? (
            <>
              {mobilePanel === "graph" && (
                <div className="flex-1 h-full relative">
                  {renderFlowCanvas()}
                </div>
              )}
              {mobilePanel === "details" && showDetailsPanel && (
                <div className="flex-1 h-full">
                  <DetailsPanel node={selectedNode} owner={parsed!.owner} repo={parsed!.repo} repoFiles={repoFiles} onClose={() => { setSelectedNode(null); setMobilePanel("graph"); }} cachedContent={fileContents[selectedNode!.id] || undefined} aiAnalysis={aiAnalysis} />
                </div>
              )}
            </>
          ) : (
            /* Desktop layout with floating details panel */
            <div className="flex-1 relative">
              {renderFlowCanvas()}

              {/* Floating glass details panel */}
              <AnimatePresence>
                {showDetailsPanel && (
                  <motion.div
                    initial={{ x: 40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 40, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.8 }}
                    className="absolute right-3 top-3 bottom-3 z-20 overflow-hidden"
                    style={{
                      width: selectedFileCategory === "markdown" ? "min(620px, 52%)" : "min(500px, 44%)",
                      background: "hsl(var(--card) / 0.75)",
                      backdropFilter: "blur(24px)",
                      WebkitBackdropFilter: "blur(24px)",
                      border: "1px solid hsl(var(--border) / 0.35)",
                      borderRadius: "1.25rem",
                      boxShadow: "0 8px 40px -12px hsl(var(--foreground) / 0.12), 0 0 0 1px hsl(var(--border) / 0.08)",
                    }}
                  >
                    <DetailsPanel node={selectedNode} owner={parsed!.owner} repo={parsed!.repo} repoFiles={repoFiles} onClose={() => setSelectedNode(null)} cachedContent={fileContents[selectedNode!.id] || undefined} aiAnalysis={aiAnalysis} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function Workspace() {
  return <ReactFlowProvider><WorkspaceInner /></ReactFlowProvider>;
}
