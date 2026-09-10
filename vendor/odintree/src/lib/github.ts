import { getCached, setCache } from "./github-cache";
import { getUserConfig } from "./user-config";

export interface RepoFile {
  path: string;
  name: string;
  type: "file" | "dir";
  size?: number;
  sha: string;
  url: string;
  language?: string;
  content?: string;
}

export interface RepoInfo {
  owner: string;
  repo: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  defaultBranch: string;
}

/**
 * Accepts many formats:
 *  - github.com/owner/repo                       (with or without https://, www., trailing /)
 *  - https://github.com/owner/repo/tree/branch   (extra path segments ignored)
 *  - git@github.com:owner/repo.git               (SSH clone url)
 *  - owner/repo                                  (short form)
 *  - github:owner/repo
 *  - Whitespace, quotes, surrounding markdown ignored.
 */
export function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  if (!input) return null;
  let s = String(input).trim().replace(/^["'<(\[]+|["'>)\]]+$/g, "");
  // strip leading "github:" shorthand
  s = s.replace(/^github:/i, "");
  // SSH form -> https-ish
  const ssh = s.match(/^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i);
  if (ssh) return { owner: ssh[1], repo: ssh[2].replace(/\.git$/i, "") };
  // Full URL form (any scheme, www, etc.)
  const url = s.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s?#]+)\/([^/\s?#]+)/i);
  if (url) return { owner: url[1], repo: url[2].replace(/\.git$/i, "") };
  // Short owner/repo form
  const short = s.match(/^([A-Za-z0-9](?:[A-Za-z0-9-]{0,38})?)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/);
  if (short) return { owner: short[1], repo: short[2].replace(/\.git$/i, "") };
  return null;
}

// Maximum file count before we consider a repo too large
const MAX_REPO_FILES = 4000;

// Use the Vercel serverless proxy to avoid exposing tokens
async function proxyGitHubRequest(apiUrl: string): Promise<any> {
  const userToken = getUserConfig().githubToken || undefined;
  try {
    const res = await fetch("/api/github-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: apiUrl, userToken }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const status = res.status;
      if (status === 403) {
        throw new Error("GitHub API rate limit exceeded. Please try again in a minute.");
      }
      if (status === 404) {
        throw new Error("Repository not found. Please check the URL and try again.");
      }
      throw new Error(errData.error || `GitHub API error (HTTP ${status})`);
    }

    const json = await res.json();
    return json.data;
  } catch (err: any) {
    // If proxy is unavailable (local dev), fall back to direct unauthenticated calls
    if (err?.message?.includes("Failed to fetch") || err?.message?.includes("NetworkError")) {
      return fallbackDirectFetch(apiUrl, userToken);
    }
    throw err;
  }
}

// Fallback for local dev without the Vercel proxy
async function fallbackDirectFetch(apiUrl: string, userToken?: string): Promise<any> {
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  if (userToken) headers.Authorization = `Bearer ${userToken}`;
  const res = await fetch(apiUrl, { headers });
  if (!res.ok) {
    const status = res.status;
    if (status === 403) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      if (remaining === "0") {
        throw new Error("GitHub API rate limit exceeded. Please wait a minute and try again.");
      }
      throw new Error("Access forbidden. The repository may be private.");
    }
    if (status === 404) {
      throw new Error("Repository not found. Please check the URL and try again.");
    }
    throw new Error(`GitHub API error (HTTP ${status}).`);
  }
  return res.json();
}

export async function fetchRepoInfo(owner: string, repo: string): Promise<RepoInfo> {
  const cacheKey = `info_${owner}_${repo}`;
  const cached = getCached<RepoInfo>(cacheKey);
  if (cached) return cached;

  const data = await proxyGitHubRequest(`https://api.github.com/repos/${owner}/${repo}`);
  const info: RepoInfo = {
    owner,
    repo,
    description: data.description || "No description",
    language: data.language || "Unknown",
    stars: data.stargazers_count,
    forks: data.forks_count,
    defaultBranch: data.default_branch,
  };
  setCache(cacheKey, info);
  return info;
}

export async function fetchRepoTree(owner: string, repo: string, branch: string): Promise<RepoFile[]> {
  const cacheKey = `tree_${owner}_${repo}_${branch}`;
  const cached = getCached<RepoFile[]>(cacheKey);
  if (cached) return cached;

  const data = await proxyGitHubRequest(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  );

  if (data.truncated) {
    console.warn("GitHub tree was truncated. Some files may be missing.");
  }

  const files = (data.tree || [])
    .filter((item: any) => item.type === "blob" || item.type === "tree")
    .map((item: any) => ({
      path: item.path,
      name: item.path.split("/").pop() || item.path,
      type: item.type === "tree" ? "dir" : "file",
      size: item.size,
      sha: item.sha,
      url: item.url || "",
      language: getLanguage(item.path),
    }));

  // Check if repo is too large
  if (files.length > MAX_REPO_FILES) {
    throw new Error(
      `This repository contains ${files.length.toLocaleString()} files, which is too large to visualize effectively. Please try a smaller repository (under ${MAX_REPO_FILES.toLocaleString()} files).`
    );
  }

  setCache(cacheKey, files);
  return files;
}

export async function fetchFileContent(owner: string, repo: string, path: string): Promise<string> {
  const cacheKey = `content_${owner}_${repo}_${path}`;
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  try {
    const data = await proxyGitHubRequest(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    );
    if (data.encoding === "base64" && data.content) {
      try {
        const content = atob(data.content.replace(/\n/g, ""));
        setCache(cacheKey, content);
        return content;
      } catch {
        return "// Binary or encoded content";
      }
    }
    const content = data.content || "// No content";
    setCache(cacheKey, content);
    return content;
  } catch {
    return "// Failed to load content";
  }
}

function getLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript",
    ts: "TypeScript", tsx: "TypeScript",
    py: "Python", pyw: "Python",
    java: "Java",
    rb: "Ruby", go: "Go", rs: "Rust",
    css: "CSS", scss: "SCSS", less: "LESS",
    html: "HTML", htm: "HTML",
    json: "JSON", yaml: "YAML", yml: "YAML",
    md: "Markdown", mdx: "Markdown",
    sh: "Shell", bash: "Shell",
    sql: "SQL",
    c: "C", cpp: "C++", h: "C", hpp: "C++",
    png: "Other", jpg: "Other", jpeg: "Other", gif: "Other",
    svg: "Other", webp: "Other", ico: "Other",
    mp4: "Other", webm: "Other", mov: "Other",
    lock: "Other", lockb: "Other",
    toml: "Other", env: "Other", gitignore: "Other",
  };
  return map[ext || ""] || "Other";
}
