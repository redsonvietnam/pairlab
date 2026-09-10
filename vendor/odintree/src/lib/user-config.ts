// User-supplied configuration stored in localStorage.
// Lets a forked deployment work without the original keys: a user can paste
// their own GitHub token and AI provider key and have the app prefer them
// over the bundled defaults.

export interface UserConfig {
  githubToken: string;
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
}

const KEY = "odin.user.config.v1";

export const DEFAULT_AI_BASE = "https://ai.gateway.lovable.dev/v1";
export const DEFAULT_AI_MODEL = "google/gemini-3.6-flash";

export function getUserConfig(): UserConfig {
  if (typeof window === "undefined") return blank();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw);
    return {
      githubToken: typeof parsed.githubToken === "string" ? parsed.githubToken : "",
      aiBaseUrl: typeof parsed.aiBaseUrl === "string" ? parsed.aiBaseUrl : "",
      aiApiKey: typeof parsed.aiApiKey === "string" ? parsed.aiApiKey : "",
      aiModel: typeof parsed.aiModel === "string" ? parsed.aiModel : "",
    };
  } catch {
    return blank();
  }
}

export function setUserConfig(next: UserConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export function clearUserConfig() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

function blank(): UserConfig {
  return { githubToken: "", aiBaseUrl: "", aiApiKey: "", aiModel: "" };
}

/** Body fields to pass to edge functions so they prefer the user key. */
export function aiOverridePayload(cfg: UserConfig = getUserConfig()) {
  return {
    userApiKey: cfg.aiApiKey || undefined,
    userApiBase: cfg.aiBaseUrl || undefined,
    userModel: cfg.aiModel || undefined,
  };
}
