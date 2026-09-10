import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiHeaders, resolveAi, pickModel } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Severity = "critical" | "high" | "medium" | "low";
type Complexity = "low" | "medium" | "high";

type InputFile = { path: string; content: string; language?: string };

type DebugInfo = {
  status: "valid" | "partial" | "fallback";
  mode: "tool_call" | "content_json" | "fallback";
  validationErrors: string[];
  parsingErrors: string[];
  expectedFiles: string[];
  rawRequest: string;
  rawToolCall: string;
  rawResponse: string;
  normalizedResponse: string;
  schemaExample: string;
};

const severityValues: Severity[] = ["critical", "high", "medium", "low"];
const complexityValues: Complexity[] = ["low", "medium", "high"];

const schemaExample = JSON.stringify({
  repoSummary: {
    description: "React repository explorer with graph visualization, README generation, and security inspection.",
    architecture: "Client-side workspace parses repository files, builds dependency graph data, and requests backend AI analysis for validated overlays.",
    techStack: ["React", "TypeScript", "Vite", "Tailwind CSS", "Cloud Functions"],
    overallScore: 82,
    securityScore: 76,
    strengths: ["Clear file-level analysis pipeline", "Fallback validation keeps UI renderable"],
    weaknesses: ["Large repos need batched context windows"],
    attackSurface: ["Repository URL input", "AI function payload", "Markdown and Mermaid rendering"],
    riskBreakdown: { critical: 0, high: 1, medium: 2, low: 3 },
    architectureDiagram: "flowchart TD\nclient[Client app] --> fn[analyze repo function]\nfn --> ai[AI model]\nfn --> overlay[Validated overlay]",
    dataFlowDiagram: "flowchart LR\nrepo[Repository files] --> parser[Parser]\nparser --> validator[Validator]\nvalidator --> ui[Analysis UI]",
    securityFindings: [{ severity: "high", category: "Input Validation", title: "Untrusted content rendering", description: "Repository content is untrusted and must be sanitized before display.", recommendation: "Keep raw HTML disabled and validate diagram syntax before rendering.", file: "src/components/ReadmeView.tsx", cwe: "CWE-79" }],
  },
  fileAnalyses: {
    "src/App.tsx": {
      purpose: "Routes the app shell.", quality: 84, role: "Frontend entry point", complexity: "low", keyFunctions: ["App"],
      exports: [{ name: "App", kind: "component", description: "Root component" }],
      dependencies: [{ name: "react-router-dom", kind: "external", purpose: "Routing" }], inboundDeps: ["src/main.tsx"], outboundDeps: [],
      metrics: { security: 80, performance: 78, maintainability: 86, readability: 88, testability: 72, documentation: 60 },
      linesAnalyzed: 42, networkCalls: [], dataFlow: [{ step: 1, action: "Route is matched", data: "URL path" }],
      flowchart: "flowchart TD\nstart[Load app] --> route[Match route]\nroute --> page[Render page]", securityIssues: [],
      improvements: [{ type: "best-practice", title: "Add route smoke tests", description: "Cover route rendering." }],
    },
  },
}, null, 2);

const analysisTool = {
  type: "function",
  function: {
    name: "return_repo_analysis",
    description: "Return a complete repository security and code analysis using the required schema.",
    parameters: {
      type: "object",
      properties: {
        repoSummary: {
          type: "object",
          properties: {
            description: { type: "string" },
            architecture: { type: "string" },
            techStack: { type: "array", items: { type: "string" } },
            overallScore: { type: "number" },
            securityScore: { type: "number" },
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: { type: "array", items: { type: "string" } },
            attackSurface: { type: "array", items: { type: "string" } },
            riskBreakdown: {
              type: "object",
              properties: {
                critical: { type: "number" },
                high: { type: "number" },
                medium: { type: "number" },
                low: { type: "number" },
              },
              required: ["critical", "high", "medium", "low"],
              additionalProperties: false,
            },
            architectureDiagram: { type: "string" },
            dataFlowDiagram: { type: "string" },
            securityFindings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  severity: { type: "string", enum: severityValues },
                  category: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  recommendation: { type: "string" },
                  file: { type: "string" },
                  cwe: { type: "string" },
                },
                required: ["severity", "category", "title", "description", "recommendation"],
                additionalProperties: false,
              },
            },
            deepDive: { type: "string", description: "Long-form Markdown explanation: what the project is, who it is for, the full mental model, how each major piece works together, and a clear `## Summary` table at the end. Aim for 500-1200 words. Use ## subheadings, bullet lists, and tables. No emojis or em dashes." },
            componentBreakdown: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  path: { type: "string" },
                  role: { type: "string" },
                  description: { type: "string" },
                  technologies: { type: "array", items: { type: "string" } },
                },
                required: ["name", "role", "description"],
                additionalProperties: false,
              },
            },
            executionFlow: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step: { type: "number" },
                  title: { type: "string" },
                  detail: { type: "string" },
                  files: { type: "array", items: { type: "string" } },
                },
                required: ["step", "title", "detail"],
                additionalProperties: false,
              },
            },
            keyAlgorithms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  where: { type: "string" },
                  explanation: { type: "string" },
                },
                required: ["name", "explanation"],
                additionalProperties: false,
              },
            },
            languageBreakdown: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  language: { type: "string" },
                  share: { type: "string" },
                  purpose: { type: "string" },
                },
                required: ["language", "share", "purpose"],
                additionalProperties: false,
              },
            },
            glossary: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  term: { type: "string" },
                  definition: { type: "string" },
                },
                required: ["term", "definition"],
                additionalProperties: false,
              },
            },
          },
          required: ["description", "architecture", "techStack", "overallScore", "securityScore", "strengths", "weaknesses", "attackSurface", "riskBreakdown", "architectureDiagram", "dataFlowDiagram", "securityFindings"],
          additionalProperties: false,
        },
        fileAnalyses: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              purpose: { type: "string" },
              quality: { type: "number" },
              role: { type: "string" },
              complexity: { type: "string", enum: complexityValues },
              keyFunctions: { type: "array", items: { type: "string" } },
              exports: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    kind: { type: "string", enum: ["function", "component", "class", "type", "constant"] },
                    description: { type: "string" },
                  },
                  required: ["name", "kind", "description"],
                  additionalProperties: false,
                },
              },
              dependencies: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    kind: { type: "string", enum: ["internal", "external"] },
                    purpose: { type: "string" },
                  },
                  required: ["name", "kind", "purpose"],
                  additionalProperties: false,
                },
              },
              inboundDeps: { type: "array", items: { type: "string" } },
              outboundDeps: { type: "array", items: { type: "string" } },
              metrics: {
                type: "object",
                properties: {
                  security: { type: "number" },
                  performance: { type: "number" },
                  maintainability: { type: "number" },
                  readability: { type: "number" },
                  testability: { type: "number" },
                  documentation: { type: "number" },
                },
                required: ["security", "performance", "maintainability", "readability", "testability", "documentation"],
                additionalProperties: false,
              },
              linesAnalyzed: { type: "number" },
              networkCalls: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    method: { type: "string" },
                    endpoint: { type: "string" },
                    purpose: { type: "string" },
                    auth: { type: "string" },
                  },
                  required: ["method", "endpoint", "purpose", "auth"],
                  additionalProperties: false,
                },
              },
              dataFlow: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    step: { type: "number" },
                    action: { type: "string" },
                    data: { type: "string" },
                  },
                  required: ["step", "action", "data"],
                  additionalProperties: false,
                },
              },
              flowchart: { type: "string" },
              securityIssues: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    severity: { type: "string", enum: severityValues },
                    title: { type: "string" },
                    description: { type: "string" },
                    suggestion: { type: "string" },
                    cwe: { type: "string" },
                    line: { type: "number" },
                  },
                  required: ["severity", "title", "description", "suggestion", "cwe", "line"],
                  additionalProperties: false,
                },
              },
              improvements: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["performance", "maintainability", "architecture", "best-practice"] },
                    title: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["type", "title", "description"],
                  additionalProperties: false,
                },
              },
            },
            required: ["purpose", "quality", "role", "complexity"],
            additionalProperties: false,
          },
        },
      },
      required: ["repoSummary", "fileAnalyses"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const ai = resolveAi(body);
    if (!ai.apiKey) return json({ error: "No AI API key configured. Add one in Settings or set AI_GATEWAY_KEY on the server." }, 500);

    const files = sanitizeInputFiles(body.files);
    const repoName = cleanText(String(body.repoName || "repository"));

    if (files.length === 0) return json({ error: "No files provided" }, 400);

    const MAX_CHARS = 180000;
    const PER_FILE_CHARS = 4500;
    let totalChars = 0;
    const includedFiles: InputFile[] = [];
    const sourceBlocks: string[] = [];

    for (const f of files) {
      const snippet = f.content.slice(0, PER_FILE_CHARS);
      const entry = `### ${f.path} (${f.language || "unknown"})\n\`\`\`\n${snippet}\n\`\`\`\n`;
      if (totalChars + entry.length > MAX_CHARS) break;
      includedFiles.push(f);
      sourceBlocks.push(entry);
      totalChars += entry.length;
    }

    if (includedFiles.length === 0) return json({ error: "No readable files provided" }, 400);

    const paths = includedFiles.map((f) => f.path);
    const systemPrompt = `You are a principal staff engineer, security auditor, and technical writer producing a senior deep code-review of an entire repository. Use the return_repo_analysis tool only.

Your output must read like a senior engineer who actually read every file and now explains the project end-to-end, not a generic AI summary.

Depth requirements (critical):
- repoSummary.deepDive must be 500-1200 words of Markdown. Explain what the project is, who uses it, the mental model, the data model, how the major pieces interact, the algorithms or techniques used, and a final "## Summary" table of stage -> method -> what is grouped/produced. Use ## subheadings, bullet lists, and tables. Reference exact file paths in backticks. No emojis. No em dashes.
- componentBreakdown must list every major module/folder/service/agent with name, path (when applicable), one-line role, and a multi-sentence description of what it does and how.
- executionFlow must walk the request/data path step by step from input to output, naming the exact files involved per step.
- keyAlgorithms must explain each notable algorithm, model, or technique in concrete detail.
- languageBreakdown must list each language used with an approximate share and what it is used for.
- glossary must define non-obvious domain terms a new contributor would hit.

Security requirements:
- Inspect every supplied file for concrete risks: hardcoded secrets, injection, XSS, SSRF, CSRF, unsafe eval, auth gaps, insecure CORS, weak cryptography, path traversal, open redirects, sensitive logging, dependency risk, missing validation.
- Findings must reference real evidence in the supplied source. Do not invent vulnerabilities.

Hard rules:
- Every supplied file path must be present in fileAnalyses, using the exact path string.
- Populate every array. Use empty arrays when nothing applies.
- Mermaid values must be raw flowchart source (start with "flowchart TD" or "flowchart LR"), not fenced code, and must use only ASCII.
- No emojis, no decorative symbols, no em dashes anywhere.
- Prefer specific, file-grounded sentences over generic platitudes.`;

    const userPrompt = `Repository: ${repoName}
Files that must be analyzed:
${paths.map((p) => `- ${p}`).join("\n")}

Source code:
${sourceBlocks.join("\n")}`;

    const requestPayload = {
      model: pickModel(body, ai.defaultModel),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [analysisTool],
      tool_choice: { type: "function", function: { name: "return_repo_analysis" } },
    };

    const response = await fetch(`${ai.baseUrl}/chat/completions`, {
      method: "POST",
      headers: aiHeaders(ai),
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Rate limited. Please try again in a moment." }, 429);
      if (response.status === 402) return json({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }, 402);
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      const fallback = normalizeAnalysis(null, includedFiles, {
        status: "fallback",
        mode: "fallback",
        validationErrors: ["AI gateway returned an error. Showing deterministic fallback analysis."],
        parsingErrors: [`Gateway HTTP ${response.status}`],
        expectedFiles: paths,
        rawRequest: safeJsonForDebug(requestPayload),
        rawToolCall: "",
        rawResponse: t.slice(0, 60000),
        normalizedResponse: "",
        schemaExample,
      });
      return json(fallback, 200);
    }

    const aiData = await response.json();
    const extracted = extractStructuredAnalysis(aiData);
    const normalized = normalizeAnalysis(extracted.value, includedFiles, {
      status: extracted.value ? "valid" : "fallback",
      mode: extracted.mode,
      validationErrors: [],
      parsingErrors: extracted.errors,
      expectedFiles: paths,
      rawRequest: safeJsonForDebug(requestPayload),
      rawToolCall: extracted.toolCallRaw.slice(0, 60000),
      rawResponse: extracted.raw.slice(0, 60000),
      normalizedResponse: "",
      schemaExample,
    });

    return json(normalized, 200);
  } catch (e) {
    console.error("analyze-repo error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeInputFiles(value: unknown): InputFile[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((f) => ({
      path: cleanPath(String(f?.path || "")),
      content: typeof f?.content === "string" ? f.content : "",
      language: typeof f?.language === "string" ? cleanText(f.language) : undefined,
    }))
    .filter((f) => f.path && f.content);
}

function extractStructuredAnalysis(aiData: any): { value: any | null; raw: string; toolCallRaw: string; mode: DebugInfo["mode"]; errors: string[] } {
  const errors: string[] = [];
  const message = aiData?.choices?.[0]?.message || {};
  const toolCall = message.tool_calls?.[0] || message.toolCalls?.[0];
  const args = toolCall?.function?.arguments || toolCall?.function?.arguments_json || toolCall?.args;

  if (args) {
    const raw = typeof args === "string" ? args : JSON.stringify(args);
    const toolCallRaw = safeJsonForDebug(toolCall);
    try {
      return { value: typeof args === "string" ? JSON.parse(args) : args, raw, toolCallRaw, mode: "tool_call", errors };
    } catch (e) {
      errors.push(`Tool call arguments were malformed: ${(e as Error).message}`);
      const repaired = robustJsonParse(raw);
      if (repaired) return { value: repaired, raw, toolCallRaw, mode: "tool_call", errors };
      return { value: null, raw, toolCallRaw, mode: "tool_call", errors };
    }
  }

  const content = String(message.content || "");
  if (!content.trim()) {
    errors.push("AI response did not include tool arguments or text content.");
    return { value: null, raw: JSON.stringify(aiData).slice(0, 60000), toolCallRaw: "", mode: "fallback", errors };
  }

  const parsed = robustJsonParse(content);
  if (!parsed) errors.push("AI text response could not be parsed as JSON.");
  return { value: parsed, raw: content, toolCallRaw: "", mode: "content_json", errors };
}

function normalizeAnalysis(input: any, files: InputFile[], debug: DebugInfo) {
  const validationErrors = [...debug.validationErrors];
  const paths = files.map((f) => f.path);
  const pathSet = new Set(paths);
  const fileMap = new Map(files.map((f) => [f.path, f]));
  const source = input && typeof input === "object" ? input : {};
  const summary = source.repoSummary && typeof source.repoSummary === "object" ? source.repoSummary : {};
  if (!source.repoSummary) validationErrors.push("repoSummary was missing. Fallback summary was generated.");
  if (!source.fileAnalyses || typeof source.fileAnalyses !== "object") validationErrors.push("fileAnalyses was missing or malformed. Per-file fallback analyses were generated.");

  const fileAnalyses: Record<string, any> = {};
  for (const path of paths) {
    const raw = source.fileAnalyses?.[path];
    if (!raw || typeof raw !== "object") validationErrors.push(`Missing file analysis for ${path}.`);
    fileAnalyses[path] = normalizeFileAnalysis(raw || {}, fileMap.get(path)!, pathSet, validationErrors);
  }

  recomputeDependencyLinks(fileAnalyses, paths);

  const securityFindings = normalizeSecurityFindings(summary.securityFindings, pathSet, validationErrors);
  const perFileFindings = Object.entries(fileAnalyses).flatMap(([file, analysis]: [string, any]) =>
    analysis.securityIssues.map((issue: any) => ({
      severity: issue.severity,
      category: issue.cwe ? "Code Security" : "Security",
      title: issue.title,
      description: issue.description,
      recommendation: issue.suggestion,
      file,
      cwe: issue.cwe,
    }))
  );
  const mergedFindings = dedupeFindings([...securityFindings, ...perFileFindings]);
  const riskBreakdown = countRisks(mergedFindings);

  const normalized = {
    repoSummary: {
      description: textOr(summary.description, `Security inspection for ${paths.length} files in this repository.`),
      architecture: textOr(summary.architecture, "Repository architecture was partially inferred from file paths, imports, and detected source code structure."),
      techStack: stringArray(summary.techStack).slice(0, 12),
      overallScore: numberInRange(summary.overallScore, scoreAverage(fileAnalyses, "quality"), 0, 100),
      securityScore: numberInRange(summary.securityScore, scoreAverage(fileAnalyses, "security"), 0, 100),
      strengths: stringArray(summary.strengths).slice(0, 6),
      weaknesses: stringArray(summary.weaknesses).slice(0, 6),
      attackSurface: stringArray(summary.attackSurface).slice(0, 12),
      riskBreakdown,
      architectureDiagram: normalizeMermaid(summary.architectureDiagram, "flowchart LR\nrepo[Repository] --> files[Source files]\nfiles --> analysis[Security analysis]"),
      dataFlowDiagram: normalizeMermaid(summary.dataFlowDiagram, "flowchart TD\ninput[Repository source] --> scan[Static inspection]\nscan --> report[Security report]"),
      securityFindings: mergedFindings,
      deepDive: typeof summary.deepDive === "string" ? cleanText(summary.deepDive) : "",
      componentBreakdown: Array.isArray(summary.componentBreakdown) ? summary.componentBreakdown.slice(0, 30).map((c: any) => ({
        name: textOr(c?.name, "Component"),
        path: typeof c?.path === "string" ? cleanText(c.path) : "",
        role: textOr(c?.role, "Module"),
        description: textOr(c?.description, ""),
        technologies: stringArray(c?.technologies).slice(0, 8),
      })) : [],
      executionFlow: Array.isArray(summary.executionFlow) ? summary.executionFlow.slice(0, 24).map((s: any, i: number) => ({
        step: numberInRange(s?.step, i + 1, 1, 100),
        title: textOr(s?.title, `Step ${i + 1}`),
        detail: textOr(s?.detail, ""),
        files: stringArray(s?.files).filter((p: string) => pathSet.has(p)).slice(0, 8),
      })) : [],
      keyAlgorithms: Array.isArray(summary.keyAlgorithms) ? summary.keyAlgorithms.slice(0, 20).map((a: any) => ({
        name: textOr(a?.name, "Algorithm"),
        where: typeof a?.where === "string" ? cleanText(a.where) : "",
        explanation: textOr(a?.explanation, ""),
      })) : [],
      languageBreakdown: Array.isArray(summary.languageBreakdown) ? summary.languageBreakdown.slice(0, 12).map((l: any) => ({
        language: textOr(l?.language, "Unknown"),
        share: textOr(l?.share, ""),
        purpose: textOr(l?.purpose, ""),
      })) : [],
      glossary: Array.isArray(summary.glossary) ? summary.glossary.slice(0, 30).map((g: any) => ({
        term: textOr(g?.term, ""),
        definition: textOr(g?.definition, ""),
      })).filter((g: any) => g.term && g.definition) : [],
    },
    fileAnalyses,
    debug: {
      ...debug,
      status: validationErrors.length ? (debug.status === "fallback" ? "fallback" : "partial") : "valid",
      validationErrors: validationErrors.slice(0, 200),
      expectedFiles: paths,
    },
  };

  normalized.debug.normalizedResponse = safeJsonForDebug({ repoSummary: normalized.repoSummary, fileAnalyses: normalized.fileAnalyses });
  normalized.debug.schemaExample = schemaExample;

  return stripForbidden(normalized);
}

function normalizeFileAnalysis(raw: any, file: InputFile, pathSet: Set<string>, errors: string[]) {
  const lines = file.content.split("\n").length;
  const fallbackPurpose = `${file.path} is a ${file.language || "source"} file with ${lines} lines included in the inspection.`;
  const securityIssues = normalizeSecurityIssues(raw.securityIssues, errors);
  const outboundDeps = normalizeDependencyPaths(raw.outboundDeps, pathSet);

  return {
    purpose: textOr(raw.purpose, fallbackPurpose),
    quality: numberInRange(raw.quality, securityIssues.length ? 62 : 78, 0, 100),
    role: textOr(raw.role, inferRole(file.path)),
    complexity: complexityValues.includes(raw.complexity) ? raw.complexity : inferComplexity(file.content),
    keyFunctions: stringArray(raw.keyFunctions).slice(0, 10),
    exports: normalizeExports(raw.exports),
    dependencies: normalizeDependencies(raw.dependencies),
    inboundDeps: normalizeDependencyPaths(raw.inboundDeps, pathSet),
    outboundDeps,
    metrics: normalizeMetrics(raw.metrics, securityIssues.length),
    linesAnalyzed: numberInRange(raw.linesAnalyzed, lines, 0, 1000000),
    networkCalls: normalizeNetworkCalls(raw.networkCalls),
    dataFlow: normalizeDataFlow(raw.dataFlow, file.path),
    flowchart: normalizeMermaid(raw.flowchart, `flowchart TD\nstart[Open ${safeMermaidLabel(file.path)}] --> inspect[Inspect code]\ninspect --> result[Security results]`),
    securityIssues,
    improvements: normalizeImprovements(raw.improvements),
  };
}

function normalizeSecurityIssues(value: any, errors: string[]) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((issue, index) => {
    if (!issue || typeof issue !== "object") errors.push(`Malformed security issue at index ${index}.`);
    return {
      severity: severityValues.includes(issue?.severity) ? issue.severity : "low",
      title: textOr(issue?.title, "Security review item"),
      description: textOr(issue?.description, "The AI returned an incomplete security item. Review this file manually."),
      suggestion: textOr(issue?.suggestion, "Review the related code path and add explicit validation or access control where needed."),
      cwe: typeof issue?.cwe === "string" ? cleanText(issue.cwe) : "",
      line: numberInRange(issue?.line, 0, 0, 1000000),
    };
  });
}

function normalizeSecurityFindings(value: any, pathSet: Set<string>, errors: string[]) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 60).map((finding, index) => {
    if (!finding || typeof finding !== "object") errors.push(`Malformed repo security finding at index ${index}.`);
    const file = typeof finding?.file === "string" && pathSet.has(finding.file) ? finding.file : undefined;
    return {
      severity: severityValues.includes(finding?.severity) ? finding.severity : "low",
      category: textOr(finding?.category, "Security"),
      title: textOr(finding?.title, "Security finding"),
      description: textOr(finding?.description, "The AI returned an incomplete finding. Review the referenced area manually."),
      recommendation: textOr(finding?.recommendation, "Validate this area manually and add defensive controls as needed."),
      ...(file ? { file } : {}),
      ...(typeof finding?.cwe === "string" ? { cwe: cleanText(finding.cwe) } : {}),
    };
  });
}

function normalizeExports(value: any) {
  if (!Array.isArray(value)) return [];
  const kinds = new Set(["function", "component", "class", "type", "constant"]);
  return value.slice(0, 20).map((item) => ({
    name: textOr(item?.name, "export"),
    kind: kinds.has(item?.kind) ? item.kind : "constant",
    description: textOr(item?.description, "Detected export"),
  }));
}

function normalizeDependencies(value: any) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).map((item) => ({
    name: textOr(item?.name, "dependency"),
    kind: item?.kind === "internal" ? "internal" : "external",
    purpose: textOr(item?.purpose, "Referenced by this file"),
  }));
}

function normalizeNetworkCalls(value: any) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((item) => ({
    method: textOr(item?.method, "UNKNOWN").toUpperCase().slice(0, 12),
    endpoint: textOr(item?.endpoint, "unknown endpoint"),
    purpose: textOr(item?.purpose, "Network or backend call detected"),
    auth: textOr(item?.auth, "unknown"),
  }));
}

function normalizeDataFlow(value: any, path: string) {
  if (!Array.isArray(value) || value.length === 0) {
    return [
      { step: 1, action: "Source code is loaded for inspection", data: path },
      { step: 2, action: "Security and structure checks are applied", data: "static analysis" },
    ];
  }
  return value.slice(0, 12).map((item, index) => ({
    step: numberInRange(item?.step, index + 1, 1, 1000),
    action: textOr(item?.action, "Analysis step"),
    data: textOr(item?.data, "source data"),
  }));
}

function normalizeImprovements(value: any) {
  if (!Array.isArray(value)) return [];
  const types = new Set(["performance", "maintainability", "architecture", "best-practice"]);
  return value.slice(0, 20).map((item) => ({
    type: types.has(item?.type) ? item.type : "best-practice",
    title: textOr(item?.title, "Improvement opportunity"),
    description: textOr(item?.description, "Review this area for maintainability and security hardening."),
  }));
}

function normalizeMetrics(value: any, securityIssueCount: number) {
  const fallbackSecurity = Math.max(25, 88 - securityIssueCount * 18);
  return {
    security: numberInRange(value?.security, fallbackSecurity, 0, 100),
    performance: numberInRange(value?.performance, 72, 0, 100),
    maintainability: numberInRange(value?.maintainability, 72, 0, 100),
    readability: numberInRange(value?.readability, 74, 0, 100),
    testability: numberInRange(value?.testability, 60, 0, 100),
    documentation: numberInRange(value?.documentation, 55, 0, 100),
  };
}

function recomputeDependencyLinks(fileAnalyses: Record<string, any>, paths: string[]) {
  const pathSet = new Set(paths);
  for (const path of paths) {
    fileAnalyses[path].outboundDeps = normalizeDependencyPaths(fileAnalyses[path].outboundDeps, pathSet);
    fileAnalyses[path].inboundDeps = [];
  }
  for (const [path, analysis] of Object.entries(fileAnalyses)) {
    for (const dep of analysis.outboundDeps || []) {
      if (fileAnalyses[dep] && !fileAnalyses[dep].inboundDeps.includes(path)) fileAnalyses[dep].inboundDeps.push(path);
    }
  }
}

function normalizeDependencyPaths(value: any, pathSet: Set<string>) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((p) => typeof p === "string" && pathSet.has(p)))).slice(0, 50);
}

function dedupeFindings(findings: any[]) {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const f of findings) {
    const key = `${f.severity}|${f.file || "repo"}|${f.title}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out.slice(0, 100);
}

function countRisks(findings: any[]) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of findings) {
    if (severityValues.includes(finding.severity)) counts[finding.severity] += 1;
  }
  return counts;
}

function scoreAverage(fileAnalyses: Record<string, any>, metric: "quality" | "security") {
  const values = Object.values(fileAnalyses).map((a: any) => metric === "quality" ? a.quality : a.metrics?.security).filter((n) => typeof n === "number");
  if (!values.length) return 70;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function textOr(value: unknown, fallback: string) {
  return cleanText(typeof value === "string" && value.trim() ? value : fallback);
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.trim()).map(cleanText) : [];
}

function numberInRange(value: unknown, fallback: number, min: number, max: number) {
  let n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  if (max === 100 && n > 0 && n <= 10) n *= 10;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function inferRole(path: string) {
  if (/route|api|function|handler/i.test(path)) return "HTTP or backend entry point";
  if (/component|page|view|tsx$/i.test(path)) return "user interface module";
  if (/config|vite|tailwind|eslint|package/i.test(path)) return "configuration module";
  if (/test|spec/i.test(path)) return "test module";
  return "source module";
}

function inferComplexity(content: string): Complexity {
  const branches = (content.match(/\b(if|for|while|switch|catch|case)\b/g) || []).length;
  if (branches > 25 || content.length > 12000) return "high";
  if (branches > 8 || content.length > 4000) return "medium";
  return "low";
}

function normalizeMermaid(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  const cleaned = cleanText(text.replace(/^```(?:mermaid)?\s*/i, "").replace(/```\s*$/i, ""));
  if (isSafeMermaid(cleaned)) return cleaned;
  return fallback;
}

function isSafeMermaid(text: string) {
  if (!(/^flowchart\s+(TD|LR|TB|RL|BT)/i.test(text) || /^graph\s+(TD|LR|TB|RL|BT)/i.test(text))) return false;
  if (/```|<script|<style|\bclassDef\b|\bclick\b/i.test(text)) return false;
  if (/[^\x09\x0A\x0D\x20-\x7E]/.test(text)) return false;
  return text.split("\n").length <= 80;
}

function safeMermaidLabel(value: string) {
  return cleanText(value).replace(/[|]/g, " ").slice(0, 60);
}

function cleanPath(path: string) {
  return path.replace(/^\/+/, "").replace(/\.\./g, "").slice(0, 500);
}

function cleanText(value: string) {
  return value
    .replace(/\u2014/g, " - ")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}\u{2600}-\u{26FF}\u2728]/gu, "")
    .trim();
}

function stripForbidden<T>(value: T): T {
  return JSON.parse(cleanText(JSON.stringify(value)));
}

function safeJsonForDebug(value: unknown) {
  return cleanText(JSON.stringify(value, null, 2)).slice(0, 60000);
}

function robustJsonParse(raw: string): any | null {
  if (!raw) return null;
  let text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(text); } catch {}
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  let candidate = end === -1 ? text.slice(start) : text.slice(start, end + 1);
  candidate = candidate.replace(/,\s*([}\]])/g, "$1");
  try { return JSON.parse(candidate); } catch { return null; }
}
