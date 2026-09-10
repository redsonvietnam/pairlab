import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiHeaders, resolveAi, pickModel } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const README_TOOL = {
  type: "function",
  function: {
    name: "return_readme",
    description: "Return a complete README markdown document and validation metadata.",
    parameters: {
      type: "object",
      properties: {
        markdown: { type: "string" },
        sections: { type: "array", items: { type: "string" } },
        detectedStack: { type: "array", items: { type: "string" } },
        omittedSections: { type: "array", items: { type: "string" } },
      },
      required: ["markdown", "sections", "detectedStack", "omittedSections"],
      additionalProperties: false,
    },
  },
};

const TEMPLATE_GUIDE = `Follow this structure. Adapt content to the analysed project, but keep the section order and tone.

# <ProjectName> <one-line tagline using shields.io badges only when relevant>

<2 to 4 sentence high-level description of what the project actually does, who it is for, and what value it provides. Do not invent features.>

## Preview

[![Open <ProjectName>](https://img.shields.io/badge/Open-<ProjectName>%20Live%20Site-000000?style=for-the-badge)](<live-url-or-repo-url>)

## What <ProjectName> Does

- bullet
- bullet
- bullet

## Key Features

### <Feature group 1>

<paragraph plus bullets or tables when useful>

### <Feature group 2>

<paragraph plus bullets>

## Architecture

\`\`\`
<ASCII architecture diagram of detected modules and data flow>
\`\`\`

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| ... | ... | ... |

## Data Sources and APIs

<tables grouped by category if relevant>

## Edge Functions

<table of detected functions with method, input, output, external calls. Include only if the project actually has them.>

## Project Structure

\`\`\`
<tree of the most important folders and files with one-line comments>
\`\`\`

## Configuration

| Secret | Purpose |
|--------|---------|
| ... | ... |

## Installation

\`\`\`bash
git clone <repo-url>
cd <repo>
npm install
npm run dev
\`\`\`

## Environment Variables

\`\`\`env
KEY=
\`\`\`

## License

<MIT or detected license>`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const ai = resolveAi(body);
    if (!ai.apiKey) return json({ error: "No AI API key configured" }, 500);

    const files = sanitizeFiles(body.files);
    const repoName = cleanText(String(body.repoName || "Repository"));
    const repoUrl = cleanText(String(body.repoUrl || ""));
    const suppliedReadme = typeof body.existingReadme === "string" ? cleanMarkdown(body.existingReadme).slice(0, 30000) : "";
    const detectedReadme = suppliedReadme || cleanMarkdown(files.find((f) => /(^|\/)readme\.md$/i.test(f.path))?.content || "").slice(0, 30000);

    if (files.length === 0) return json({ error: "No files provided" }, 400);

    const MAX_CHARS = 140000;
    const PER_FILE_CHARS = 3500;
    let total = 0;
    const sourceBlocks: string[] = [];
    const includedPaths: string[] = [];

    for (const f of files) {
      const entry = `### ${f.path}\n\`\`\`\n${f.content.slice(0, PER_FILE_CHARS)}\n\`\`\`\n`;
      if (total + entry.length > MAX_CHARS) break;
      sourceBlocks.push(entry);
      includedPaths.push(f.path);
      total += entry.length;
    }

    const systemPrompt = `You write production-grade README.md files for software projects. Use the return_readme tool only.

Refine vs rewrite logic (apply this first):
1. If an existing README is provided AND it is accurate, specific to this codebase, and reasonably complete, REFINE it: keep its true content and voice, then improve structure, clarity, tables, setup details, badges, and architecture using only the repo files as evidence. Add missing sections from the template. Do not invent facts.
2. If the existing README is thin, stale, generic, AI-generated boilerplate, mostly placeholder, contradicts the source, or shorter than ~200 useful words, REWRITE it completely from the repository files. Mention the project's real purpose, modules, and stack as evidenced by the source.
3. If no existing README is present, generate a clean high-quality README from the repository files following the template.

Hard rules:
- Never use emojis, decorative symbols, or em dashes.
- Never reference or embed project preview images. Shields.io badges are allowed.
- Use only shields.io badges that match the actual detected stack.
- Follow the provided template structure precisely.
- Base every claim on visible source content. If unsure, omit or say "not configured".
- Return complete markdown in the markdown field.
- The final README must read like a normal well-maintained GitHub README, not an AI report.

Template:
${TEMPLATE_GUIDE}`;

    const userPrompt = `Repository: ${repoName}
Repo URL: ${repoUrl || "unknown"}
Existing README, if present:
${detectedReadme || "No existing README was detected."}

Included source files:
${includedPaths.map((p) => `- ${p}`).join("\n")}

Source files:
${sourceBlocks.join("\n")}`;

    const response = await fetch(`${ai.baseUrl}/chat/completions`, {
      method: "POST",
      headers: aiHeaders(ai),
      body: JSON.stringify({
        model: pickModel(body, ai.defaultModel),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [README_TOOL],
        tool_choice: { type: "function", function: { name: "return_readme" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Rate limited. Try again shortly." }, 429);
      if (response.status === 402) return json({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }, 402);
      const t = await response.text();
      console.error("README gateway error", response.status, t);
      const fallback = buildFallbackReadme(repoName, repoUrl, files, [`Gateway HTTP ${response.status}`]);
      return json(fallback, 200);
    }

    const data = await response.json();
    const extracted = extractReadme(data);
    const normalized = normalizeReadme(extracted.value, repoName, repoUrl, files, extracted.raw, extracted.errors);
    return json(normalized, 200);
  } catch (e) {
    console.error("generate-readme error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeFiles(value: unknown): { path: string; content: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((f) => ({
      path: cleanPath(String(f?.path || "")),
      content: typeof f?.content === "string" ? f.content : "",
    }))
    .filter((f) => f.path && f.content);
}

function extractReadme(data: any): { value: any | null; raw: string; errors: string[] } {
  const errors: string[] = [];
  const msg = data?.choices?.[0]?.message || {};
  const args = msg.tool_calls?.[0]?.function?.arguments || msg.toolCalls?.[0]?.function?.arguments || msg.tool_calls?.[0]?.args;
  if (args) {
    const raw = typeof args === "string" ? args : JSON.stringify(args);
    try {
      return { value: typeof args === "string" ? JSON.parse(args) : args, raw, errors };
    } catch (e) {
      errors.push(`Tool arguments were malformed: ${(e as Error).message}`);
      const parsed = robustJsonParse(raw);
      return { value: parsed, raw, errors };
    }
  }
  const content = String(msg.content || "");
  if (!content.trim()) {
    errors.push("AI returned no README content.");
    return { value: null, raw: JSON.stringify(data).slice(0, 50000), errors };
  }
  const parsed = robustJsonParse(content);
  if (parsed) return { value: parsed, raw: content, errors };
  return { value: { markdown: content, sections: [], detectedStack: [], omittedSections: [] }, raw: content, errors };
}

function normalizeReadme(value: any, repoName: string, repoUrl: string, files: { path: string; content: string }[], raw: string, errors: string[]) {
  const validationErrors = [...errors];
  let markdown = typeof value?.markdown === "string" ? value.markdown : "";
  if (!markdown.trim()) {
    validationErrors.push("README markdown was missing. A fallback README was generated from repository files.");
    return buildFallbackReadme(repoName, repoUrl, files, validationErrors, raw);
  }

  markdown = cleanMarkdown(markdown);
  const required = ["# ", "## Preview", "## What ", "## Key Features", "## Architecture", "## Tech Stack", "## Project Structure", "## Installation", "## Environment Variables", "## License"];
  const missing = required.filter((section) => !markdown.includes(section));
  if (missing.length) validationErrors.push(`README is missing expected sections: ${missing.join(", ")}.`);
  if (markdown.length < 700) validationErrors.push("README is shorter than expected for the selected template.");

  if (validationErrors.length) {
    const fallback = buildFallbackReadme(repoName, repoUrl, files, validationErrors, raw);
    if (markdown.length > fallback.markdown.length * 0.65) {
      return {
        markdown,
        partial: true,
        validationErrors,
        rawResponse: raw.slice(0, 50000),
        sections: Array.isArray(value?.sections) ? value.sections : [],
        detectedStack: Array.isArray(value?.detectedStack) ? value.detectedStack : [],
      };
    }
    return fallback;
  }

  return {
    markdown,
    partial: false,
    validationErrors: [],
    rawResponse: raw.slice(0, 50000),
    sections: Array.isArray(value?.sections) ? value.sections : [],
    detectedStack: Array.isArray(value?.detectedStack) ? value.detectedStack : [],
  };
}

function buildFallbackReadme(repoName: string, repoUrl: string, files: { path: string; content: string }[], validationErrors: string[], raw = "") {
  const stack = detectStack(files);
  const projectName = repoName.split("/").pop() || repoName || "Repository";
  const important = files.slice(0, 24).map((f) => `├── ${f.path}  # ${describeFile(f.path)}`).join("\n");
  const hasFunctions = files.some((f) => f.path.startsWith("supabase/functions/"));
  const envKeys = Array.from(new Set(files.flatMap((f) => Array.from(f.content.matchAll(/(?:import\.meta\.env\.|Deno\.env\.get\(["'])([A-Z0-9_]+)/g)).map((m) => m[1])))).slice(0, 20);

  const markdown = cleanMarkdown(`# ${projectName}

${projectName} is a software project generated from the parsed repository contents. This README was generated with fallback validation because the AI response was incomplete or malformed, so each section is based only on detected files and source patterns.

## Preview

[![Open ${projectName}](https://img.shields.io/badge/Open-${encodeURIComponent(projectName)}%20Repository-000000?style=for-the-badge)](${repoUrl || "#"})

## What ${projectName} Does

- Provides the code and configuration found in the parsed repository.
- Uses ${stack.length ? stack.join(", ") : "the technologies detected from source files"}.
- Includes source modules, configuration, and project structure that can be inspected and extended.

## Key Features

### Detected Source Structure

The repository includes ${files.length} parsed files. The most important files are listed in the project structure section so contributors can quickly find entry points and configuration.

### Validated README Output

This README is rendered from a strict schema. When the AI output is malformed, Odin keeps a partial or fallback README visible instead of leaving the overlay blank.

## Architecture

\`\`\`
User
  -> Repository source files
  -> Static parser and AI README generator
  -> Validated README markdown
  -> Preview and source views
\`\`\`

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
${stack.length ? stack.map((s) => `| Detected | ${s} | Used by files in this repository |`).join("\n") : "| Source | Detected project files | Application implementation |"}

## Data Sources and APIs

| Source | Purpose |
|--------|---------|
| Repository files | README generation and project inspection |

${hasFunctions ? `## Edge Functions

| Function | Purpose |
|----------|---------|
${files.filter((f) => f.path.startsWith("supabase/functions/")).slice(0, 12).map((f) => `| ${f.path} | Backend function source |`).join("\n")}
` : "## Edge Functions\n\nNo backend functions were detected in the parsed files.\n"}

## Project Structure

\`\`\`
${important || "Repository files were parsed but no structure could be summarized."}
\`\`\`

## Configuration

| Secret | Purpose |
|--------|---------|
${envKeys.length ? envKeys.map((k) => `| ${k} | Referenced by source code |`).join("\n") : "| Not detected | No environment variables were detected in parsed files |"}

## Installation

\`\`\`bash
git clone ${repoUrl || "<repo-url>"}
cd ${projectName}
npm install
npm run dev
\`\`\`

## Environment Variables

\`\`\`env
${envKeys.length ? envKeys.map((k) => `${k}=`).join("\n") : "# Add required variables here"}
\`\`\`

## License

MIT License
`);

  return {
    markdown,
    partial: true,
    validationErrors,
    rawResponse: raw.slice(0, 50000),
    sections: ["Preview", "What it does", "Key features", "Architecture", "Tech stack", "Project structure", "Configuration", "Installation", "License"],
    detectedStack: stack,
  };
}

function detectStack(files: { path: string; content: string }[]) {
  const stack = new Set<string>();
  for (const f of files) {
    if (/package\.json$/.test(f.path)) {
      if (/"react"/.test(f.content)) stack.add("React");
      if (/"vite"/.test(f.content)) stack.add("Vite");
      if (/"typescript"/.test(f.content)) stack.add("TypeScript");
      if (/"tailwindcss"/.test(f.content)) stack.add("Tailwind CSS");
    }
    if (/\.tsx?$/.test(f.path)) stack.add("TypeScript");
    if (/supabase\//.test(f.path)) stack.add("Cloud Functions");
    if (/\.py$/.test(f.path)) stack.add("Python");
    if (/\.go$/.test(f.path)) stack.add("Go");
  }
  return Array.from(stack).slice(0, 12);
}

function describeFile(path: string) {
  if (/package\.json$/.test(path)) return "dependency and script manifest";
  if (/vite\.config/.test(path)) return "Vite configuration";
  if (/tailwind\.config/.test(path)) return "design token configuration";
  if (/supabase\/functions/.test(path)) return "backend function";
  if (/src\/pages/.test(path)) return "application page";
  if (/src\/components/.test(path)) return "user interface component";
  if (/README/i.test(path)) return "project documentation";
  return "project file";
}

function cleanMarkdown(value: string) {
  return cleanText(value)
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/!\[[^\]]*\]\((?!https?:\/\/(?:img\.)?shields\.io)[^)]+\)/g, "")
    .trim();
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

function robustJsonParse(raw: string): any | null {
  let text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(text); } catch {}
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0, end = -1, inStr = false, esc = false;
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
  if (end === -1) return null;
  try { return JSON.parse(text.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1")); } catch { return null; }
}
