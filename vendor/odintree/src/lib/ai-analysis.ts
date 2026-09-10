// AI Analysis client using backend edge functions

export type Severity = "critical" | "high" | "medium" | "low";
export type AnalysisStatus = "valid" | "partial" | "fallback";

export interface AIFileAnalysis {
  purpose: string;
  quality: number;
  role: string;
  securityIssues: {
    severity: Severity;
    title: string;
    description: string;
    suggestion?: string;
    cwe?: string;
    line?: number;
  }[];
  improvements: {
    type: "performance" | "maintainability" | "architecture" | "best-practice";
    title: string;
    description: string;
  }[];
  keyFunctions: string[];
  complexity: "low" | "medium" | "high";
  flowchart?: string;
  dataFlow?: { step: number; action: string; data: string }[];
  networkCalls?: { method: string; endpoint: string; purpose: string; auth?: string }[];
  dependencies?: { name: string; kind: "internal" | "external"; purpose: string }[];
  exports?: { name: string; kind: "function" | "component" | "class" | "type" | "constant"; description: string }[];
  inboundDeps?: string[];
  outboundDeps?: string[];
  metrics?: {
    security: number;
    performance: number;
    maintainability: number;
    readability: number;
    testability: number;
    documentation: number;
  };
  linesAnalyzed?: number;
}

export interface AISecurityFinding {
  severity: Severity;
  title: string;
  description: string;
  file?: string;
  cwe?: string;
  recommendation?: string;
  category?: string;
}

export interface AIRepoSummary {
  description: string;
  architecture: string;
  techStack: string[];
  overallScore: number;
  securityScore?: number;
  strengths: string[];
  weaknesses: string[];
  securityFindings: AISecurityFinding[];
  architectureDiagram?: string;
  dataFlowDiagram?: string;
  riskBreakdown?: { critical: number; high: number; medium: number; low: number };
  attackSurface?: string[];
  /** Long-form deep-dive narrative in Markdown. Multi-section, multi-paragraph. */
  deepDive?: string;
  /** Module / component breakdown: what each major piece is and what it does. */
  componentBreakdown?: { name: string; path?: string; role: string; description: string; technologies?: string[] }[];
  /** End-to-end execution flow as ordered narrative steps. */
  executionFlow?: { step: number; title: string; detail: string; files?: string[] }[];
  /** Key algorithms / techniques with detailed explanations. */
  keyAlgorithms?: { name: string; where?: string; explanation: string }[];
  /** Per-language / per-area breakdown. */
  languageBreakdown?: { language: string; share: string; purpose: string }[];
  /** Glossary of domain terms used in the project. */
  glossary?: { term: string; definition: string }[];
}

export interface AIAnalysisDebug {
  status: AnalysisStatus;
  mode?: "tool_call" | "content_json" | "fallback";
  validationErrors: string[];
  parsingErrors: string[];
  expectedFiles: string[];
  rawRequest?: string;
  rawToolCall?: string;
  rawResponse?: string;
  normalizedResponse?: string;
  schemaExample?: string;
}

export interface AIRepoAnalysis {
  repoSummary: AIRepoSummary;
  fileAnalyses: Record<string, AIFileAnalysis>;
  debug?: AIAnalysisDebug;
  error?: string;
}

export interface ReadmeGenerationResult {
  markdown: string;
  partial?: boolean;
  validationErrors?: string[];
  rawResponse?: string;
  error?: string;
}

export interface AIInsight {
  type: "vulnerability" | "improvement" | "info";
  severity: Severity | "info";
  title: string;
  description: string;
  line?: number;
  suggestion?: string;
}

export interface AIAnalysisResponse {
  insights: AIInsight[];
  summary: string;
  score: number;
  error?: string;
}

export interface AIAnalysisRequest {
  code: string;
  filename: string;
  language: string;
  analysisType: "security" | "quality" | "full";
}

const emptySummary: AIRepoSummary = {
  description: "Analysis could not be completed.",
  architecture: "Repository architecture is unavailable until analysis succeeds.",
  techStack: [],
  overallScore: -1,
  securityScore: -1,
  strengths: [],
  weaknesses: ["AI analysis did not return a complete validated result."],
  securityFindings: [],
  riskBreakdown: { critical: 0, high: 0, medium: 0, low: 0 },
  attackSurface: [],
};

const severities: Severity[] = ["critical", "high", "medium", "low"];

export const AI_ANALYSIS_SCHEMA_EXAMPLE = JSON.stringify({
  repoSummary: {
    description: "React and edge function application that visualizes repository structure and audits code.",
    architecture: "A Vite client fetches repository files, builds a graph, calls backend AI functions, then renders validated overlays.",
    techStack: ["React", "TypeScript", "Vite", "Tailwind CSS", "Edge Functions"],
    overallScore: 82,
    securityScore: 76,
    strengths: ["Clear component boundaries", "Validated backend AI output"],
    weaknesses: ["Large repositories may need scoped analysis batches"],
    attackSurface: ["Repository URL input", "Backend AI function payload", "Rendered Markdown and Mermaid diagrams"],
    riskBreakdown: { critical: 0, high: 1, medium: 2, low: 3 },
    architectureDiagram: "flowchart TD\nclient[Client app] --> fn[analyze-repo function]\nfn --> ai[AI gateway]\nfn --> overlay[Validated overlay]",
    dataFlowDiagram: "flowchart LR\nrepo[Repo files] --> parser[Parser]\nparser --> validator[Schema validator]\nvalidator --> ui[Analysis UI]",
    securityFindings: [{
      severity: "high",
      category: "Input Validation",
      title: "Untrusted Markdown requires strict rendering controls",
      description: "Markdown content from repositories must be sanitized before rendering to prevent unsafe HTML paths.",
      recommendation: "Keep raw HTML disabled and strip unsupported embedded media.",
      file: "src/components/ReadmeView.tsx",
      cwe: "CWE-79",
    }],
  },
  fileAnalyses: {
    "src/App.tsx": {
      purpose: "Routes the application shell and page views.",
      quality: 84,
      role: "Frontend routing entry point",
      complexity: "low",
      keyFunctions: ["App"],
      exports: [{ name: "App", kind: "component", description: "Application root component" }],
      dependencies: [{ name: "react-router-dom", kind: "external", purpose: "Client routing" }],
      inboundDeps: ["src/main.tsx"],
      outboundDeps: [],
      metrics: { security: 80, performance: 78, maintainability: 86, readability: 88, testability: 72, documentation: 60 },
      linesAnalyzed: 42,
      networkCalls: [],
      dataFlow: [{ step: 1, action: "Route is matched", data: "URL path" }],
      flowchart: "flowchart TD\nstart[Load app] --> route[Match route]\nroute --> page[Render page]",
      securityIssues: [],
      improvements: [{ type: "best-practice", title: "Add route smoke tests", description: "Cover primary route rendering in Vitest." }],
    },
  },
}, null, 2);

export async function fetchRepoAIAnalysis(
  files: { path: string; content: string; language?: string }[],
  repoName: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<AIRepoAnalysis> {
  try {
    // Inline import to avoid a hard dep cycle with localStorage in SSR.
    const { aiOverridePayload } = await import("./user-config");
    const res = await fetch(`${supabaseUrl}/functions/v1/analyze-repo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
      body: JSON.stringify({ files, repoName, ...aiOverridePayload() }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      let msg = data.error || `Analysis failed (HTTP ${res.status})`;
      if (res.status === 402 || /credit/i.test(msg)) {
        msg = "AI credits exhausted. Open Settings and paste your own AI API key (Gemini, OpenAI, or any OpenAI-compatible provider) to keep using analysis.";
      } else if (res.status === 429) {
        msg = "AI rate limit reached. Wait a moment and retry, or add your own AI key in Settings.";
      } else if (res.status === 401 || res.status === 403) {
        msg = "AI provider rejected the key. Check your AI API Key in Settings.";
      }
      return failedAnalysis(msg, files.map((f) => f.path));
    }

    const data = await res.json();
    if (data.error) return failedAnalysis(data.error, files.map((f) => f.path));
    return validateRepoAnalysis(data, files);
  } catch (err: any) {
    return failedAnalysis(err?.message || "Network error", files.map((f) => f.path));
  }
}

function failedAnalysis(error: string, expectedFiles: string[]): AIRepoAnalysis {
  return {
    repoSummary: emptySummary,
    fileAnalyses: {},
    error,
    debug: {
      status: "fallback",
      mode: "fallback",
      validationErrors: [error],
      parsingErrors: [],
      expectedFiles,
      schemaExample: AI_ANALYSIS_SCHEMA_EXAMPLE,
    },
  };
}

export function validateRepoAnalysis(data: any, files: { path: string; content: string; language?: string }[]): AIRepoAnalysis {
  const validationErrors: string[] = [];
  const expectedFiles = files.map((f) => f.path);
  const pathSet = new Set(expectedFiles);
  const rawDebug = data?.debug || {};
  const summary = data?.repoSummary || {};
  const fileAnalyses: Record<string, AIFileAnalysis> = {};

  for (const file of files) {
    const raw = data?.fileAnalyses?.[file.path];
    if (!raw) validationErrors.push(`Missing file analysis for ${file.path}`);
    fileAnalyses[file.path] = normalizeFileAnalysis(raw || {}, file, pathSet);
  }

  syncInboundLinks(fileAnalyses, expectedFiles);
  const securityFindings = normalizeSecurityFindings(summary.securityFindings, pathSet);
  const perFileFindings = Object.entries(fileAnalyses).flatMap(([file, analysis]) =>
    analysis.securityIssues.map((issue) => ({
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
      recommendation: issue.suggestion,
      cwe: issue.cwe,
      file,
      category: issue.cwe ? "Code Security" : "Security",
    }))
  );
  const mergedFindings = dedupeFindings([...securityFindings, ...perFileFindings]);
  const riskBreakdown = countRisks(mergedFindings);

  const normalized: AIRepoAnalysis = {
    repoSummary: {
      description: textOr(summary.description, `Security inspection completed for ${expectedFiles.length} repository files.`),
      architecture: textOr(summary.architecture, "Architecture was inferred from repository files and import relationships."),
      techStack: stringArray(summary.techStack),
      overallScore: num(summary.overallScore, average(fileAnalyses, "quality")),
      securityScore: num(summary.securityScore, average(fileAnalyses, "security")),
      strengths: stringArray(summary.strengths),
      weaknesses: stringArray(summary.weaknesses),
      attackSurface: stringArray(summary.attackSurface),
      riskBreakdown,
      architectureDiagram: mermaidOr(summary.architectureDiagram, "flowchart LR\nrepo[Repository] --> files[Files]\nfiles --> audit[Security audit]"),
      dataFlowDiagram: mermaidOr(summary.dataFlowDiagram, "flowchart TD\nsource[Repository source] --> parser[Parser]\nparser --> analysis[Analysis overlay]"),
      securityFindings: mergedFindings,
      deepDive: typeof summary.deepDive === "string" ? clean(summary.deepDive) : undefined,
      componentBreakdown: Array.isArray(summary.componentBreakdown) ? summary.componentBreakdown.map((c: any) => ({
        name: textOr(c?.name, "Component"),
        path: typeof c?.path === "string" ? clean(c.path) : undefined,
        role: textOr(c?.role, "Module"),
        description: textOr(c?.description, ""),
        technologies: stringArray(c?.technologies),
      })).slice(0, 30) : undefined,
      executionFlow: Array.isArray(summary.executionFlow) ? summary.executionFlow.map((s: any, i: number) => ({
        step: num(s?.step, i + 1, 1, 100),
        title: textOr(s?.title, `Step ${i + 1}`),
        detail: textOr(s?.detail, ""),
        files: pathArray(s?.files, pathSet),
      })).slice(0, 24) : undefined,
      keyAlgorithms: Array.isArray(summary.keyAlgorithms) ? summary.keyAlgorithms.map((a: any) => ({
        name: textOr(a?.name, "Algorithm"),
        where: typeof a?.where === "string" ? clean(a.where) : undefined,
        explanation: textOr(a?.explanation, ""),
      })).slice(0, 20) : undefined,
      languageBreakdown: Array.isArray(summary.languageBreakdown) ? summary.languageBreakdown.map((l: any) => ({
        language: textOr(l?.language, "Unknown"),
        share: textOr(l?.share, ""),
        purpose: textOr(l?.purpose, ""),
      })).slice(0, 12) : undefined,
      glossary: Array.isArray(summary.glossary) ? summary.glossary.map((g: any) => ({
        term: textOr(g?.term, ""),
        definition: textOr(g?.definition, ""),
      })).filter((g: any) => g.term && g.definition).slice(0, 30) : undefined,
    },
    fileAnalyses,
    debug: {
      status: rawDebug.status === "fallback" ? "fallback" : validationErrors.length || rawDebug.status === "partial" ? "partial" : "valid",
      mode: rawDebug.mode || "tool_call",
      validationErrors: [...stringArray(rawDebug.validationErrors), ...validationErrors],
      parsingErrors: stringArray(rawDebug.parsingErrors),
      expectedFiles: stringArray(rawDebug.expectedFiles).length ? stringArray(rawDebug.expectedFiles) : expectedFiles,
      rawRequest: typeof rawDebug.rawRequest === "string" ? rawDebug.rawRequest : undefined,
      rawToolCall: typeof rawDebug.rawToolCall === "string" ? rawDebug.rawToolCall : undefined,
      rawResponse: typeof rawDebug.rawResponse === "string" ? rawDebug.rawResponse : undefined,
      normalizedResponse: typeof rawDebug.normalizedResponse === "string" ? rawDebug.normalizedResponse : undefined,
      schemaExample: typeof rawDebug.schemaExample === "string" ? rawDebug.schemaExample : AI_ANALYSIS_SCHEMA_EXAMPLE,
    },
  };

  if (!renderVerification(normalized).ready) {
    const verification = renderVerification(normalized);
    normalized.debug = {
      ...normalized.debug!,
      status: "partial",
      validationErrors: [...normalized.debug!.validationErrors, ...verification.errors],
    };
  }

  return stripForbidden(normalized);
}

export function renderVerification(analysis: AIRepoAnalysis): { ready: boolean; errors: string[] } {
  const errors: string[] = [];
  const expectedFiles = analysis.debug?.expectedFiles || Object.keys(analysis.fileAnalyses || {});
  const summary = analysis.repoSummary;
  if (!summary?.description) errors.push("Summary description is missing.");
  if (!summary?.architecture) errors.push("Architecture section is missing.");
  if (!summary?.riskBreakdown) errors.push("Risk breakdown is missing.");
  if (!summary?.architectureDiagram) errors.push("Architecture diagram is missing.");
  if (!summary?.dataFlowDiagram) errors.push("Data flow diagram is missing.");
  if (!Array.isArray(summary?.securityFindings)) errors.push("Security findings are malformed.");

  for (const path of expectedFiles) {
    const file = analysis.fileAnalyses?.[path];
    if (!file) {
      errors.push(`File analysis missing for ${path}`);
      continue;
    }
    if (!file.purpose || !file.role) errors.push(`Core file fields missing for ${path}`);
    if (!Array.isArray(file.securityIssues)) errors.push(`Security issues malformed for ${path}`);
    if (!file.metrics) errors.push(`Quality metrics missing for ${path}`);
    if (!file.flowchart) errors.push(`Flowchart missing for ${path}`);
  }

  return { ready: errors.length === 0, errors };
}

/**
 * Re-run the same client-side validation pipeline against an arbitrary raw JSON string
 * (e.g. an edited tool-call payload from the debug drawer). Lets users see exactly how
 * the normalizer + fallback layer would treat a different AI response.
 */
export function revalidateRawAnalysis(rawJson: string, files: { path: string; content: string; language?: string }[]): { ok: boolean; analysis?: AIRepoAnalysis; parseError?: string } {
  const trimmed = (rawJson || "").trim();
  if (!trimmed) return { ok: false, parseError: "Empty payload" };
  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e: any) {
    return { ok: false, parseError: `JSON parse failed: ${e?.message || "unknown"}` };
  }
  // Allow either { repoSummary, fileAnalyses } or the wrapper { value: { ... } }
  const root = parsed?.repoSummary ? parsed : parsed?.value?.repoSummary ? parsed.value : parsed;
  const analysis = validateRepoAnalysis(root, files);
  return { ok: true, analysis };
}

function normalizeFileAnalysis(raw: any, file: { path: string; content: string; language?: string }, pathSet: Set<string>): AIFileAnalysis {
  const lineCount = file.content.split("\n").length;
  const securityIssues = normalizeSecurityIssues(raw.securityIssues);
  return {
    purpose: textOr(raw.purpose, `${file.path} is a ${file.language || "source"} file included in the repository inspection.`),
    quality: num(raw.quality, securityIssues.length ? 62 : 78),
    role: textOr(raw.role, inferRole(file.path)),
    complexity: raw.complexity === "high" || raw.complexity === "medium" || raw.complexity === "low" ? raw.complexity : inferComplexity(file.content),
    keyFunctions: stringArray(raw.keyFunctions),
    exports: Array.isArray(raw.exports) ? raw.exports.map((item: any) => ({ name: textOr(item?.name, "export"), kind: validExportKind(item?.kind), description: textOr(item?.description, "Detected export") })) : [],
    dependencies: Array.isArray(raw.dependencies) ? raw.dependencies.map((item: any) => ({ name: textOr(item?.name, "dependency"), kind: item?.kind === "internal" ? "internal" : "external", purpose: textOr(item?.purpose, "Referenced by this file") })) : [],
    inboundDeps: pathArray(raw.inboundDeps, pathSet),
    outboundDeps: pathArray(raw.outboundDeps, pathSet),
    metrics: {
      security: num(raw.metrics?.security, Math.max(25, 88 - securityIssues.length * 18)),
      performance: num(raw.metrics?.performance, 72),
      maintainability: num(raw.metrics?.maintainability, 72),
      readability: num(raw.metrics?.readability, 74),
      testability: num(raw.metrics?.testability, 60),
      documentation: num(raw.metrics?.documentation, 55),
    },
    linesAnalyzed: num(raw.linesAnalyzed, lineCount, 0, 1000000),
    networkCalls: Array.isArray(raw.networkCalls) ? raw.networkCalls.map((item: any) => ({ method: textOr(item?.method, "UNKNOWN").toUpperCase(), endpoint: textOr(item?.endpoint, "unknown endpoint"), purpose: textOr(item?.purpose, "Network or backend call detected"), auth: textOr(item?.auth, "unknown") })) : [],
    dataFlow: Array.isArray(raw.dataFlow) && raw.dataFlow.length ? raw.dataFlow.map((item: any, i: number) => ({ step: num(item?.step, i + 1, 1, 1000), action: textOr(item?.action, "Analysis step"), data: textOr(item?.data, "source data") })) : [
      { step: 1, action: "Source code is loaded for inspection", data: file.path },
      { step: 2, action: "Security and structure checks are applied", data: "static analysis" },
    ],
    flowchart: mermaidOr(raw.flowchart, `flowchart TD\nstart[Open file] --> inspect[Inspect code]\ninspect --> report[Render results]`),
    securityIssues,
    improvements: Array.isArray(raw.improvements) ? raw.improvements.map((item: any) => ({ type: validImprovementType(item?.type), title: textOr(item?.title, "Improvement opportunity"), description: textOr(item?.description, "Review this area for hardening and maintainability.") })) : [],
  };
}

function normalizeSecurityIssues(value: any): AIFileAnalysis["securityIssues"] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    severity: severities.includes(item?.severity) ? item.severity : "low",
    title: textOr(item?.title, "Security review item"),
    description: textOr(item?.description, "This security item was incomplete and should be reviewed manually."),
    suggestion: typeof item?.suggestion === "string" ? clean(item.suggestion) : "Review the surrounding code and add defensive checks where needed.",
    cwe: typeof item?.cwe === "string" ? clean(item.cwe) : "",
    line: typeof item?.line === "number" ? Math.max(0, Math.round(item.line)) : 0,
  }));
}

function normalizeSecurityFindings(value: any, pathSet: Set<string>): AISecurityFinding[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    severity: severities.includes(item?.severity) ? item.severity : "low",
    title: textOr(item?.title, "Security finding"),
    description: textOr(item?.description, "This finding was incomplete and should be reviewed manually."),
    recommendation: typeof item?.recommendation === "string" ? clean(item.recommendation) : "Review this area manually and add defensive controls as needed.",
    category: typeof item?.category === "string" ? clean(item.category) : "Security",
    file: typeof item?.file === "string" && pathSet.has(item.file) ? item.file : undefined,
    cwe: typeof item?.cwe === "string" ? clean(item.cwe) : undefined,
  }));
}

function syncInboundLinks(fileAnalyses: Record<string, AIFileAnalysis>, paths: string[]) {
  for (const path of paths) fileAnalyses[path].inboundDeps = [];
  for (const [path, analysis] of Object.entries(fileAnalyses)) {
    for (const dep of analysis.outboundDeps || []) {
      if (fileAnalyses[dep] && !fileAnalyses[dep].inboundDeps?.includes(path)) fileAnalyses[dep].inboundDeps!.push(path);
    }
  }
}

function pathArray(value: any, pathSet: Set<string>) {
  return Array.isArray(value) ? Array.from(new Set(value.filter((p) => typeof p === "string" && pathSet.has(p)))) : [];
}

function countRisks(findings: AISecurityFinding[]) {
  return findings.reduce((acc, finding) => {
    acc[finding.severity] += 1;
    return acc;
  }, { critical: 0, high: 0, medium: 0, low: 0 });
}

function dedupeFindings(findings: AISecurityFinding[]) {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.severity}|${f.file || "repo"}|${f.title}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function average(fileAnalyses: Record<string, AIFileAnalysis>, key: "quality" | "security") {
  const values = Object.values(fileAnalyses).map((f) => key === "quality" ? f.quality : f.metrics?.security).filter((n): n is number => typeof n === "number");
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 70;
}

function validExportKind(value: any): "function" | "component" | "class" | "type" | "constant" {
  return ["function", "component", "class", "type", "constant"].includes(value) ? value : "constant";
}

function validImprovementType(value: any): "performance" | "maintainability" | "architecture" | "best-practice" {
  return ["performance", "maintainability", "architecture", "best-practice"].includes(value) ? value : "best-practice";
}

function inferRole(path: string) {
  if (/route|api|function|handler/i.test(path)) return "HTTP or backend entry point";
  if (/component|page|view|tsx$/i.test(path)) return "user interface module";
  if (/config|vite|tailwind|eslint|package/i.test(path)) return "configuration module";
  if (/test|spec/i.test(path)) return "test module";
  return "source module";
}

function inferComplexity(content: string): "low" | "medium" | "high" {
  const branches = (content.match(/\b(if|for|while|switch|catch|case)\b/g) || []).length;
  if (branches > 25 || content.length > 12000) return "high";
  if (branches > 8 || content.length > 4000) return "medium";
  return "low";
}

function mermaidOr(value: unknown, fallback: string) {
  const text = typeof value === "string" ? clean(value.replace(/^```(?:mermaid)?\s*/i, "").replace(/```\s*$/i, "")) : "";
  return isSafeMermaid(text) ? text : fallback;
}

function isSafeMermaid(text: string) {
  if (!(/^flowchart\s+(TD|LR|TB|RL|BT)/i.test(text) || /^graph\s+(TD|LR|TB|RL|BT)/i.test(text))) return false;
  if (/```|<script|<style|\bclassDef\b|\bclick\b/i.test(text)) return false;
  if (/[^\x09\x0A\x0D\x20-\x7E]/.test(text)) return false;
  return text.split("\n").length <= 80;
}

function textOr(value: unknown, fallback: string) {
  return clean(typeof value === "string" && value.trim() ? value : fallback);
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.trim()).map(clean) : [];
}

function num(value: unknown, fallback: number, min = 0, max = 100) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function clean(value: string) {
  return value.replace(/\u2014/g, " - ").replace(/[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}\u2728]/gu, "").trim();
}

function stripForbidden<T>(value: T): T {
  return JSON.parse(clean(JSON.stringify(value)));
}

export async function fetchReadme(
  files: { path: string; content: string }[],
  repoName: string,
  repoUrl: string,
  supabaseUrl: string,
  supabaseKey: string,
  existingReadme?: string
): Promise<ReadmeGenerationResult> {
  try {
    const { aiOverridePayload } = await import("./user-config");
    const res = await fetch(`${supabaseUrl}/functions/v1/generate-readme`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
      body: JSON.stringify({ files, repoName, repoUrl, existingReadme, ...aiOverridePayload() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { markdown: "", error: data.error || `HTTP ${res.status}` };
    }
    const data = await res.json();
    if (data.error) return { markdown: "", error: data.error };
    const markdown = typeof data.markdown === "string" ? clean(data.markdown) : "";
    if (!markdown) return { markdown: "", error: "README generation returned no markdown." };
    return {
      markdown,
      partial: Boolean(data.partial),
      validationErrors: stringArray(data.validationErrors),
      rawResponse: typeof data.rawResponse === "string" ? data.rawResponse : undefined,
    };
  } catch (err: any) {
    return { markdown: "", error: err?.message || "Network error" };
  }
}

export async function fetchAIAnalysis(_request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  return { insights: [], summary: "Use the repository analysis button for AI-powered analysis.", score: -1 };
}

export function getCachedAIAnalysis(filepath: string): AIAnalysisResponse | null {
  try {
    const cached = sessionStorage.getItem("odin_ai_" + filepath);
    if (cached) return JSON.parse(cached);
  } catch {}
  return null;
}

export function setCachedAIAnalysis(filepath: string, result: AIAnalysisResponse): void {
  try {
    sessionStorage.setItem("odin_ai_" + filepath, JSON.stringify(result));
  } catch {}
}
