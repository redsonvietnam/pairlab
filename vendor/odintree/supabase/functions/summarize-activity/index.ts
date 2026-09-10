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
    name: "return_activity_summary",
    description: "Return a digest, changelog, and readme snippet for the supplied commits.",
    parameters: {
      type: "object",
      properties: {
        digest: { type: "array", items: { type: "string" } },
        changelog: { type: "string", description: "Keep a Changelog formatted markdown" },
        readmeSnippet: { type: "string" },
        highlights: { type: "array", items: { type: "string" } },
      },
      required: ["digest", "changelog", "readmeSnippet", "highlights"],
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
    const commits = Array.isArray(body.commits) ? body.commits : [];
    const repoName = String(body.repoName || "Repository");
    const windowDays = Number(body.windowDays || 7);
    if (commits.length === 0) return json({ error: "No commits provided" }, 400);

    const trimmed = commits.slice(0, 200).map((c: any) => ({
      sha: String(c.sha || "").slice(0, 12),
      message: String(c.message || "").split("\n")[0].slice(0, 200),
      author: String(c.author || "unknown"),
      date: String(c.date || ""),
    }));

    const systemPrompt = `You write concise developer activity reports. Use the return_activity_summary tool only.
Rules:
- No emojis, no em dashes.
- digest: 4 to 8 bullet points describing what changed and why, grouped by theme.
- changelog: Keep a Changelog formatted markdown with sections Added, Changed, Fixed, Removed when applicable.
- readmeSnippet: a single paragraph (3 to 5 sentences) suitable for a "Recent activity" section in a README.
- highlights: up to 5 short phrases naming the most important items.
- Base everything on the supplied commit messages. Do not invent features that are not mentioned.`;

    const userPrompt = `Repository: ${repoName}
Window: last ${windowDays} days
Commits (${trimmed.length}):
${trimmed.map((c: any) => `- ${c.date.slice(0, 10)} ${c.author}: ${c.message}`).join("\n")}`;

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
        tool_choice: { type: "function", function: { name: "return_activity_summary" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Rate limited. Try again shortly." }, 429);
      if (response.status === 402) return json({ error: "AI credits exhausted." }, 402);
      const t = await response.text();
      console.error("activity gateway error", response.status, t);
      return json({ error: `Gateway HTTP ${response.status}` }, 500);
    }

    const data = await response.json();
    const msg = data?.choices?.[0]?.message || {};
    const args = msg.tool_calls?.[0]?.function?.arguments;
    let parsed: any = null;
    if (args) {
      try { parsed = typeof args === "string" ? JSON.parse(args) : args; } catch {}
    }
    if (!parsed) {
      parsed = {
        digest: trimmed.slice(0, 8).map((c: any) => `${c.author}: ${c.message}`),
        changelog: `## Recent changes\n\n${trimmed.slice(0, 10).map((c: any) => `- ${c.message}`).join("\n")}`,
        readmeSnippet: `Recent activity covers ${trimmed.length} commits from ${new Set(trimmed.map((c: any) => c.author)).size} contributors over the last ${windowDays} days.`,
        highlights: trimmed.slice(0, 5).map((c: any) => c.message),
      };
    }
    return json(parsed, 200);
  } catch (e) {
    console.error("summarize-activity error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
