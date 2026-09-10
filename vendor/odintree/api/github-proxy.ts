// Vercel Serverless Function: /api/github-proxy
// Forwards GitHub API requests. Prefers a user-supplied token (from the
// browser) over the deployment's GITHUB_TOKEN env var. Falls back to
// unauthenticated requests if neither is set.

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-User-Token");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { url, userToken } = (req.body || {}) as { url?: string; userToken?: string };
    if (!url || typeof url !== "string" || !url.startsWith("https://api.github.com/")) {
      return res.status(400).json({ error: "Invalid GitHub API URL" });
    }

    const headerToken = req.headers["x-user-token"] as string | undefined;
    const envToken = process.env.GITHUB_TOKEN;
    const token = (userToken && userToken.trim()) || (headerToken && headerToken.trim()) || envToken;

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "OdinTree",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const ghRes = await fetch(url, { headers });
    const remaining = ghRes.headers.get("x-ratelimit-remaining");
    const limit = ghRes.headers.get("x-ratelimit-limit");

    if (!ghRes.ok) {
      return res.status(ghRes.status).json({
        error: `GitHub API error (${ghRes.status})${!token ? ". Add a GitHub token in Settings to raise rate limits." : ""}`,
        remaining,
        limit,
      });
    }

    const data = await ghRes.json();
    return res.status(200).json({ data, remaining, limit });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Proxy error" });
  }
}
