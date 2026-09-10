import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiHeaders, resolveAi, pickModel } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOL = {
  type: "function",
  function: {
    name: "return_learning_path",
    description: "Return an ordered learning path through the repository for a developer onboarding.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string", description: "2-3 sentence framing of why this order makes sense." },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              order: { type: "number" },
              title: { type: "string" },
              file: { type: "string", description: "Exact repository path to read in this step." },
              why: { type: "string", description: "Why this step belongs at this position." },
              focus: { type: "array", items: { type: "string" }, description: "Specific concepts or symbols to look for inside the file." },
              estimatedMinutes: { type: "number" },
            },
            required: ["order", "title", "file", "why", "focus", "estimatedMinutes"],
            additionalProperties: false,
          },
        },
        followups: { type: "array", items: { type: "string" }, description: "Questions or exercises to attempt after the path." },
      },
      required: ["title", "summary", "steps", "followups"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const ai = resolveAi(body);
    if (!ai.apiKey) return json({ error: "No AI API key configured" }, 500);

    const filePaths: string[] = Array.isArray(body.filePaths) ? body.filePaths.filter((p: any) => typeof p === "string").slice(0, 600) : [];
    const focusPath: string = typeof body.focusPath === "string" ? body.focusPath : "";
    const repoName: string = String(body.repoName || "Repository");
    const summaries: { path: string; role?: string; purpose?: string }[] = Array.isArray(body.summaries) ? body.summaries.slice(0, 200) : [];

    if (filePaths.length === 0) return json({ error: "No files provided" }, 400);

    const systemPrompt = `You design a step-by-step learning path through a software repository for a developer who has never seen it.
Rules:
- Order steps so each new file builds on the previous one (entry points -> routing -> core modules -> data layer -> tests).
- Each step references an EXACT path from the provided list.
- 6 to 12 steps. Each step has a clear "why" and 2-5 focus items.
- No emojis. No em dashes. Use the return_learning_path tool only.`;

    const userPrompt = `Repository: ${repoName}
${focusPath ? `User is currently looking at: ${focusPath}\nBias the path toward understanding this file.` : ""}

Available files:
${filePaths.slice(0, 250).map((p) => `- ${p}`).join("\n")}

${summaries.length ? `Known file roles:\n${summaries.map((s) => `- ${s.path}: ${s.role || ""} ${s.purpose || ""}`.trim()).join("\n")}` : ""}`;

    const response = await fetch(`${ai.baseUrl}/chat/completions`, {
      method: "POST",
      headers: aiHeaders(ai),
      body: JSON.stringify({
        model: pickModel(body, ai.defaultModel),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "return_learning_path" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Rate limited. Try again shortly." }, 429);
      if (response.status === 402) return json({ error: "AI credits exhausted." }, 402);
      const t = await response.text();
      console.error("learning-path gateway error", response.status, t);
      return json({ error: `Gateway HTTP ${response.status}` }, 500);
    }

    const data = await response.json();
    const msg = data?.choices?.[0]?.message || {};
    const args = msg.tool_calls?.[0]?.function?.arguments;
    let parsed: any = null;
    try { parsed = typeof args === "string" ? JSON.parse(args) : args; } catch {}

    // Validate against the supplied path list
    const pathSet = new Set(filePaths);
    const steps = Array.isArray(parsed?.steps) ? parsed.steps : [];
    const cleanSteps = steps
      .filter((s: any) => s && typeof s.file === "string" && pathSet.has(s.file))
      .slice(0, 12)
      .map((s: any, i: number) => ({
        order: typeof s.order === "number" ? s.order : i + 1,
        title: String(s.title || `Step ${i + 1}`).slice(0, 120),
        file: String(s.file),
        why: String(s.why || "").slice(0, 600),
        focus: Array.isArray(s.focus) ? s.focus.filter((x: any) => typeof x === "string").slice(0, 6) : [],
        estimatedMinutes: typeof s.estimatedMinutes === "number" ? Math.max(1, Math.min(60, Math.round(s.estimatedMinutes))) : 10,
      }));

    if (cleanSteps.length === 0) {
      // Deterministic fallback: pick obvious entry points
      const order = pickFallbackOrder(filePaths, focusPath);
      return json({
        title: `Learning path for ${repoName}`,
        summary: "AI did not return a structured path. Falling back to a heuristic ordering based on entry points.",
        steps: order.map((p, i) => ({
          order: i + 1,
          title: p.split("/").pop() || p,
          file: p,
          why: "Detected as a likely entry point or core module from the repository file layout.",
          focus: ["Top-level exports", "Imports it depends on", "Public API"],
          estimatedMinutes: 8,
        })),
        followups: ["Run the project locally and trace one full request.", "List every module imported by your starting file."],
      }, 200);
    }

    return json({
      title: String(parsed?.title || `Learning path for ${repoName}`).slice(0, 200),
      summary: String(parsed?.summary || "").slice(0, 1000),
      steps: cleanSteps,
      followups: Array.isArray(parsed?.followups) ? parsed.followups.filter((x: any) => typeof x === "string").slice(0, 6) : [],
    }, 200);
  } catch (e) {
    console.error("learning-path error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function pickFallbackOrder(paths: string[], focusPath: string) {
  const priority = (p: string) => {
    if (/(^|\/)package\.json$/.test(p)) return 0;
    if (/(^|\/)README\.md$/i.test(p)) return 1;
    if (/(^|\/)src\/(main|index)\.(t|j)sx?$/.test(p)) return 2;
    if (/(^|\/)src\/App\.(t|j)sx?$/.test(p)) return 3;
    if (/(^|\/)src\/pages\//.test(p)) return 4;
    if (/(^|\/)src\/components\//.test(p)) return 5;
    if (/(^|\/)src\/lib\//.test(p)) return 6;
    if (/(^|\/)src\//.test(p)) return 7;
    if (/(^|\/)supabase\/functions\//.test(p)) return 8;
    return 9;
  };
  const sorted = [...paths].sort((a, b) => priority(a) - priority(b) || a.localeCompare(b));
  const top = sorted.slice(0, 8);
  if (focusPath && !top.includes(focusPath) && paths.includes(focusPath)) top.splice(Math.min(2, top.length), 0, focusPath);
  return top.slice(0, 8);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
