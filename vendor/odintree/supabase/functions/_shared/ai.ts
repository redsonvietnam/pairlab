// Shared AI configuration for edge functions.
// Custom user/provider keys remain supported, while remixed deployments use
// the project-scoped Lovable AI key automatically when no override is sent.

export interface AIOverride {
  userApiKey?: string;
  userApiBase?: string;
  userModel?: string;
}

export interface ResolvedAI {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  usesLovableGateway: boolean;
}

const LOVABLE_AI_BASE = "https://ai.gateway.lovable.dev/v1";

export function resolveAi(body: AIOverride = {}): ResolvedAI {
  const userApiKey = typeof body.userApiKey === "string" ? body.userApiKey.trim() : "";
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")?.trim() || "";
  const legacyApiKey =
    Deno.env.get("AI_GATEWAY_KEY")?.trim() ||
    Deno.env.get("OPENAI_API_KEY")?.trim() ||
    "";
  const baseUrl =
    (typeof body.userApiBase === "string" && body.userApiBase.trim()) ||
    Deno.env.get("AI_GATEWAY_URL")?.trim() ||
    LOVABLE_AI_BASE;
  const usesLovableGateway = !userApiKey && baseUrl.replace(/\/+$/, "") === LOVABLE_AI_BASE && Boolean(lovableApiKey);
  const apiKey = userApiKey || (usesLovableGateway ? lovableApiKey : legacyApiKey);
  const defaultModel = Deno.env.get("AI_DEFAULT_MODEL")?.trim() || "google/gemini-3.6-flash";

  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, ""), defaultModel, usesLovableGateway };
}

export function aiHeaders(ai: ResolvedAI): Record<string, string> {
  return ai.usesLovableGateway
    ? {
        "Lovable-API-Key": ai.apiKey,
        "X-Lovable-AIG-SDK": "fetch",
        "Content-Type": "application/json",
      }
    : {
        Authorization: `Bearer ${ai.apiKey}`,
        "Content-Type": "application/json",
      };
}

export function pickModel(body: AIOverride, fallback: string) {
  return (typeof body.userModel === "string" && body.userModel.trim()) || fallback;
}
