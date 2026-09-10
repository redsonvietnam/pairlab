// Dependency risk analyzer. Parses manifests and queries npm registry + OSV.

export interface DepEntry {
  name: string;
  version: string;
  ecosystem: "npm" | "pypi" | "cargo" | "go" | "gem";
  dev?: boolean;
}

export interface DepRiskRow extends DepEntry {
  latest?: string;
  isOutdated?: boolean;
  lastPublished?: string;
  abandoned?: boolean;
  vulnerabilities?: { id: string; summary?: string; severity?: string }[];
  riskScore: number; // 0-100
  notes: string[];
}

export interface DepRiskReport {
  rows: DepRiskRow[];
  totals: {
    total: number;
    outdated: number;
    vulnerable: number;
    abandoned: number;
    highRisk: number;
  };
  ecosystems: string[];
}

export function extractDependencies(files: { path: string; content: string }[]): DepEntry[] {
  const out: DepEntry[] = [];
  for (const f of files) {
    if (/(^|\/)package\.json$/.test(f.path)) {
      try {
        const pkg = JSON.parse(f.content);
        for (const [name, v] of Object.entries(pkg.dependencies || {})) {
          out.push({ name, version: cleanVersion(String(v)), ecosystem: "npm", dev: false });
        }
        for (const [name, v] of Object.entries(pkg.devDependencies || {})) {
          out.push({ name, version: cleanVersion(String(v)), ecosystem: "npm", dev: true });
        }
      } catch {}
    } else if (/(^|\/)requirements\.txt$/.test(f.path)) {
      for (const line of f.content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const m = trimmed.match(/^([A-Za-z0-9_.\-]+)\s*([<>=!~]+)?\s*([0-9A-Za-z.\-]+)?/);
        if (m) out.push({ name: m[1], version: m[3] || "latest", ecosystem: "pypi" });
      }
    } else if (/(^|\/)Cargo\.toml$/.test(f.path)) {
      const block = f.content.match(/\[dependencies\]([\s\S]*?)(\n\[|$)/);
      if (block) {
        for (const line of block[1].split(/\r?\n/)) {
          const m = line.match(/^([A-Za-z0-9_\-]+)\s*=\s*"([^"]+)"/);
          if (m) out.push({ name: m[1], version: m[2], ecosystem: "cargo" });
        }
      }
    } else if (/(^|\/)go\.mod$/.test(f.path)) {
      const requireBlock = f.content.match(/require\s*\(([\s\S]*?)\)/);
      const lines = requireBlock ? requireBlock[1].split(/\r?\n/) : f.content.split(/\r?\n/);
      for (const l of lines) {
        const m = l.trim().match(/^([\w./\-]+)\s+v?([\w.\-]+)/);
        if (m && m[1] !== "require") out.push({ name: m[1], version: m[2], ecosystem: "go" });
      }
    } else if (/(^|\/)Gemfile$/.test(f.path)) {
      for (const line of f.content.split(/\r?\n/)) {
        const m = line.match(/gem\s+["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?/);
        if (m) out.push({ name: m[1], version: m[2] || "latest", ecosystem: "gem" });
      }
    }
  }
  // Dedupe by name+ecosystem
  const seen = new Set<string>();
  return out.filter((d) => {
    const k = `${d.ecosystem}:${d.name}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function cleanVersion(v: string): string {
  return v.replace(/^[\^~>=<\s]+/, "").trim() || "latest";
}

async function fetchNpm(name: string): Promise<{ latest?: string; lastPublished?: string } | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const latest = data["dist-tags"]?.latest;
    const lastPublished = latest ? data.time?.[latest] : data.time?.modified;
    return { latest, lastPublished };
  } catch {
    return null;
  }
}

async function fetchPypi(name: string): Promise<{ latest?: string; lastPublished?: string } | null> {
  try {
    const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
    if (!res.ok) return null;
    const data = await res.json();
    const latest = data.info?.version;
    const releases = data.releases?.[latest] || [];
    const lastPublished = releases[0]?.upload_time;
    return { latest, lastPublished };
  } catch {
    return null;
  }
}

async function osvQueryBatch(deps: DepEntry[]): Promise<Record<string, any[]>> {
  try {
    const queries = deps.map((d) => ({
      package: { name: d.name, ecosystem: ecosystemToOSV(d.ecosystem) },
      version: d.version === "latest" ? undefined : d.version,
    }));
    const res = await fetch("https://api.osv.dev/v1/querybatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ queries }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    const out: Record<string, any[]> = {};
    (data.results || []).forEach((r: any, i: number) => {
      const key = `${deps[i].ecosystem}:${deps[i].name}`;
      out[key] = r.vulns || [];
    });
    return out;
  } catch {
    return {};
  }
}

function ecosystemToOSV(e: DepEntry["ecosystem"]): string {
  switch (e) {
    case "npm": return "npm";
    case "pypi": return "PyPI";
    case "cargo": return "crates.io";
    case "go": return "Go";
    case "gem": return "RubyGems";
  }
}

function isOutdated(current: string, latest?: string): boolean {
  if (!latest || current === "latest") return false;
  const a = current.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const b = latest.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (y > x) return true;
    if (y < x) return false;
  }
  return false;
}

function monthsSince(iso?: string): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return 0;
  return (Date.now() - t) / (1000 * 60 * 60 * 24 * 30);
}

function scoreRow(row: Partial<DepRiskRow>): { score: number; notes: string[] } {
  let score = 0;
  const notes: string[] = [];
  const vulns = row.vulnerabilities || [];
  if (vulns.length > 0) {
    score += Math.min(60, vulns.length * 25);
    notes.push(`${vulns.length} known vulnerabilit${vulns.length === 1 ? "y" : "ies"}`);
  }
  if (row.isOutdated) {
    score += 20;
    notes.push(`outdated, latest is ${row.latest}`);
  }
  if (row.abandoned) {
    score += 20;
    notes.push("no release in 18+ months");
  }
  return { score: Math.min(100, score), notes };
}

export async function analyzeDependencies(deps: DepEntry[], onProgress?: (done: number, total: number) => void): Promise<DepRiskReport> {
  // Cap to a sane number to avoid hammering registries.
  const list = deps.slice(0, 80);
  const osv = await osvQueryBatch(list);
  const rows: DepRiskRow[] = [];
  let done = 0;
  for (const d of list) {
    let extra: { latest?: string; lastPublished?: string } | null = null;
    if (d.ecosystem === "npm") extra = await fetchNpm(d.name);
    else if (d.ecosystem === "pypi") extra = await fetchPypi(d.name);
    const vulns = (osv[`${d.ecosystem}:${d.name}`] || []).map((v: any) => ({
      id: v.id,
      summary: v.summary || v.details?.slice(0, 200),
      severity: v.database_specific?.severity || v.severity?.[0]?.score,
    }));
    const partial: Partial<DepRiskRow> = {
      ...d,
      latest: extra?.latest,
      lastPublished: extra?.lastPublished,
      isOutdated: isOutdated(d.version, extra?.latest),
      abandoned: monthsSince(extra?.lastPublished) > 18,
      vulnerabilities: vulns,
    };
    const { score, notes } = scoreRow(partial);
    rows.push({ ...(partial as DepRiskRow), riskScore: score, notes });
    done++;
    onProgress?.(done, list.length);
  }
  rows.sort((a, b) => b.riskScore - a.riskScore);
  const totals = {
    total: rows.length,
    outdated: rows.filter((r) => r.isOutdated).length,
    vulnerable: rows.filter((r) => (r.vulnerabilities?.length || 0) > 0).length,
    abandoned: rows.filter((r) => r.abandoned).length,
    highRisk: rows.filter((r) => r.riskScore >= 50).length,
  };
  const ecosystems = Array.from(new Set(rows.map((r) => r.ecosystem)));
  return { rows, totals, ecosystems };
}
