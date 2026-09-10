// Commit timeline + heatmap data helpers. Pure functions, no React.

export interface RawCommit {
  sha: string;
  message: string;
  author: string;
  date: string; // ISO
  additions?: number;
  deletions?: number;
  files?: { filename: string; additions: number; deletions: number; changes: number }[];
}

export interface MonthBucket {
  key: string; // YYYY-MM
  label: string; // e.g. "Jan 2025"
  count: number;
  authors: { name: string; count: number }[];
  theme: string;
  topCommit?: RawCommit;
}

export interface HeatmapCell {
  date: string; // YYYY-MM-DD
  weekday: number; // 0 sun .. 6 sat
  week: number; // week offset from start
  count: number;
}

export interface Milestone {
  name: string;
  date: string;
  body?: string;
  url?: string;
  kind: "release" | "tag";
}

export interface BiggestRewrite {
  sha: string;
  message: string;
  author: string;
  date: string;
  churn: number;
  files: number;
}

const MONTH_LABEL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function bucketByMonth(commits: RawCommit[]): MonthBucket[] {
  const map = new Map<string, RawCommit[]>();
  for (const c of commits) {
    const d = new Date(c.date);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  const buckets: MonthBucket[] = [];
  for (const [key, list] of map) {
    const [y, m] = key.split("-").map(Number);
    const authorMap = new Map<string, number>();
    for (const c of list) authorMap.set(c.author, (authorMap.get(c.author) || 0) + 1);
    const authors = Array.from(authorMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    buckets.push({
      key,
      label: `${MONTH_LABEL[m - 1]} ${y}`,
      count: list.length,
      authors,
      theme: inferTheme(list),
      topCommit: list.sort((a, b) => (b.additions || 0) + (b.deletions || 0) - ((a.additions || 0) + (a.deletions || 0)))[0],
    });
  }
  return buckets.sort((a, b) => a.key.localeCompare(b.key));
}

const THEME_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(init|initial|scaffold|bootstrap|setup)\b/i, label: "initial setup" },
  { pattern: /\b(auth|login|signup|signin|jwt|oauth|sso)\b/i, label: "auth work" },
  { pattern: /\b(ui|design|style|css|tailwind|redesign|theme)\b/i, label: "UI work" },
  { pattern: /\b(fix|bug|hotfix|patch)\b/i, label: "bugfix sprint" },
  { pattern: /\b(refactor|cleanup|rewrite|restructure)\b/i, label: "refactor" },
  { pattern: /\b(test|spec|e2e|playwright|vitest|jest)\b/i, label: "tests" },
  { pattern: /\b(perf|optimi[sz]e|speed|cache)\b/i, label: "performance" },
  { pattern: /\b(docs?|readme|comment)\b/i, label: "docs" },
  { pattern: /\b(feat|feature|add)\b/i, label: "feature work" },
  { pattern: /\b(deps?|dependenc|upgrade|bump)\b/i, label: "dependency upkeep" },
];

function inferTheme(commits: RawCommit[]): string {
  const tally = new Map<string, number>();
  for (const c of commits) {
    for (const t of THEME_PATTERNS) {
      if (t.pattern.test(c.message)) tally.set(t.label, (tally.get(t.label) || 0) + 1);
    }
  }
  if (tally.size === 0) return "mixed work";
  return Array.from(tally.entries()).sort((a, b) => b[1] - a[1])[0][0];
}

export function buildHeatmap(commits: RawCommit[]): HeatmapCell[] {
  const map = new Map<string, number>();
  for (const c of commits) {
    const d = new Date(c.date);
    if (isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10);
    map.set(key, (map.get(key) || 0) + 1);
  }
  if (map.size === 0) return [];
  const sorted = Array.from(map.keys()).sort();
  const start = new Date(sorted[0] + "T00:00:00Z");
  const end = new Date(sorted[sorted.length - 1] + "T00:00:00Z");
  const cells: HeatmapCell[] = [];
  const cur = new Date(start);
  // Align to Sunday
  cur.setUTCDate(cur.getUTCDate() - cur.getUTCDay());
  let week = 0;
  while (cur <= end) {
    for (let d = 0; d < 7; d++) {
      const key = cur.toISOString().slice(0, 10);
      cells.push({ date: key, weekday: d, week, count: map.get(key) || 0 });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    week++;
  }
  return cells;
}

export function detectBiggestRewrites(commits: RawCommit[], topN = 5): BiggestRewrite[] {
  return commits
    .map((c) => ({
      sha: c.sha,
      message: c.message.split("\n")[0],
      author: c.author,
      date: c.date,
      churn: (c.additions || 0) + (c.deletions || 0),
      files: c.files?.length || 0,
    }))
    .filter((c) => c.churn > 0)
    .sort((a, b) => b.churn - a.churn)
    .slice(0, topN);
}

// GitHub API loaders ---------------------------------------------------------

async function gh(url: string): Promise<any> {
  const res = await fetch("/api/github-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    // fallback to direct
    const direct = await fetch(url);
    if (!direct.ok) throw new Error(`GitHub ${direct.status}`);
    return direct.json();
  }
  const json = await res.json();
  return json.data;
}

export async function fetchCommits(owner: string, repo: string, max = 100): Promise<RawCommit[]> {
  const pages = Math.min(4, Math.ceil(max / 100));
  const out: RawCommit[] = [];
  for (let p = 1; p <= pages; p++) {
    const data: any[] = await gh(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=100&page=${p}`).catch(() => []);
    if (!Array.isArray(data) || data.length === 0) break;
    for (const c of data) {
      out.push({
        sha: c.sha,
        message: c.commit?.message || "",
        author: c.commit?.author?.name || c.author?.login || "unknown",
        date: c.commit?.author?.date || c.commit?.committer?.date || "",
      });
    }
    if (out.length >= max) break;
  }
  return out.slice(0, max);
}

export async function enrichCommitsWithChurn(owner: string, repo: string, commits: RawCommit[], topN = 20): Promise<RawCommit[]> {
  // Only enrich the first topN by default to avoid hammering the API
  const enriched = await Promise.all(
    commits.slice(0, topN).map(async (c) => {
      try {
        const data: any = await gh(`https://api.github.com/repos/${owner}/${repo}/commits/${c.sha}`);
        return {
          ...c,
          additions: data.stats?.additions || 0,
          deletions: data.stats?.deletions || 0,
          files: (data.files || []).slice(0, 50).map((f: any) => ({
            filename: f.filename,
            additions: f.additions || 0,
            deletions: f.deletions || 0,
            changes: f.changes || 0,
          })),
        };
      } catch {
        return c;
      }
    })
  );
  return [...enriched, ...commits.slice(topN)];
}

export async function fetchMilestones(owner: string, repo: string): Promise<Milestone[]> {
  const out: Milestone[] = [];
  const releases: any[] = await gh(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=30`).catch(() => []);
  if (Array.isArray(releases)) {
    for (const r of releases) {
      out.push({
        name: r.name || r.tag_name || "release",
        date: r.published_at || r.created_at || "",
        body: r.body || "",
        url: r.html_url,
        kind: "release",
      });
    }
  }
  if (out.length === 0) {
    const tags: any[] = await gh(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=20`).catch(() => []);
    if (Array.isArray(tags)) {
      for (const t of tags) {
        out.push({ name: t.name, date: "", kind: "tag", url: t.commit?.url });
      }
    }
  }
  return out;
}
