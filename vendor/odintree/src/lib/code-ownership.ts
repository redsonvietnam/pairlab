// Code ownership analysis from GitHub contributors and commit history.

export interface Contributor {
  login: string;
  contributions: number;
  avatar?: string;
}

export interface FileOwnership {
  path: string;
  primaryAuthor: string;
  primaryShare: number; // 0..1
  totalCommits: number;
  lastCommit?: string;
  authors: Record<string, number>;
}

export interface FolderOwnership {
  folder: string;
  primaryAuthor: string;
  primaryShare: number;
  files: number;
  concentrated: boolean;
}

export interface OwnershipReport {
  contributors: Contributor[];
  files: FileOwnership[];
  folders: FolderOwnership[];
  orphaned: FileOwnership[];
  risky: FolderOwnership[];
}

async function gh(url: string): Promise<any> {
  try {
    const res = await fetch("/api/github-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (res.ok) return (await res.json()).data;
  } catch {}
  try {
    const direct = await fetch(url);
    if (direct.ok) return direct.json();
  } catch {}
  return null;
}

export async function fetchContributors(owner: string, repo: string): Promise<Contributor[]> {
  const data = await gh(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=50`);
  if (!Array.isArray(data)) return [];
  return data.map((c: any) => ({
    login: c.login || "unknown",
    contributions: c.contributions || 0,
    avatar: c.avatar_url,
  }));
}

export async function analyzeOwnership(
  owner: string,
  repo: string,
  filePaths: string[],
  options: { maxFiles?: number; onProgress?: (done: number, total: number) => void } = {}
): Promise<OwnershipReport> {
  const max = options.maxFiles ?? 60;
  const sample = filePaths.slice(0, max);
  const contributors = await fetchContributors(owner, repo);
  const files: FileOwnership[] = [];
  let done = 0;
  // Limit concurrency
  const queue = [...sample];
  const workers = 4;
  await Promise.all(
    Array.from({ length: workers }).map(async () => {
      while (queue.length > 0) {
        const path = queue.shift();
        if (!path) break;
        const commits = await gh(`https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}&per_page=30`);
        if (Array.isArray(commits) && commits.length > 0) {
          const authors: Record<string, number> = {};
          let lastCommit = "";
          for (const c of commits) {
            const name = c.author?.login || c.commit?.author?.name || "unknown";
            authors[name] = (authors[name] || 0) + 1;
            const d = c.commit?.author?.date;
            if (d && (!lastCommit || d > lastCommit)) lastCommit = d;
          }
          const sorted = Object.entries(authors).sort((a, b) => b[1] - a[1]);
          const total = commits.length;
          files.push({
            path,
            primaryAuthor: sorted[0][0],
            primaryShare: sorted[0][1] / total,
            totalCommits: total,
            lastCommit,
            authors,
          });
        }
        done++;
        options.onProgress?.(done, sample.length);
      }
    })
  );

  // Folder rollup
  const folderMap = new Map<string, FileOwnership[]>();
  for (const f of files) {
    const folder = f.path.split("/").slice(0, 2).join("/") || "/";
    if (!folderMap.has(folder)) folderMap.set(folder, []);
    folderMap.get(folder)!.push(f);
  }
  const folders: FolderOwnership[] = [];
  for (const [folder, list] of folderMap) {
    const authorTotals: Record<string, number> = {};
    for (const f of list) for (const [a, n] of Object.entries(f.authors)) authorTotals[a] = (authorTotals[a] || 0) + n;
    const total = Object.values(authorTotals).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(authorTotals).sort((a, b) => b[1] - a[1]);
    const primary = sorted[0];
    const share = total > 0 ? primary[1] / total : 0;
    folders.push({
      folder,
      primaryAuthor: primary[0],
      primaryShare: share,
      files: list.length,
      concentrated: share > 0.9 && list.length > 1,
    });
  }

  const twelveMonthsAgo = Date.now() - 1000 * 60 * 60 * 24 * 365;
  const orphaned = files.filter((f) => f.lastCommit && new Date(f.lastCommit).getTime() < twelveMonthsAgo);
  const risky = folders.filter((f) => f.concentrated);

  return { contributors, files, folders, orphaned, risky };
}
