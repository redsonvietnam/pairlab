import { fetchFileContent, type RepoFile } from "./github";
import { getCached, setCache } from "./github-cache";

const MANIFEST_PATTERN = /(^|\/)(package\.json|package-lock\.json|npm-shrinkwrap\.json)$/;
const LOCKFILE_PATTERN = /(^|\/)(package-lock\.json|npm-shrinkwrap\.json)$/;
const MAX_SCANNED_PACKAGES = 600;

type Severity = "critical" | "high" | "medium" | "low" | "info";

interface ParsedDependency {
  name: string;
  version: string;
  manifestPath: string;
}

export interface RepoDependencyAdvisory {
  id: string;
  packageName: string;
  version: string;
  manifestPath?: string;
  summary: string;
  details?: string;
  severity: Severity;
  aliases: string[];
  published?: string;
  modified?: string;
  fixedVersion?: string;
  referenceUrl?: string;
}

export interface RepoDependencyScanResult {
  source: "OSV.dev";
  manifestPaths: string[];
  scannedDependencies: number;
  packagesWithIssues: number;
  advisories: RepoDependencyAdvisory[];
  truncated: boolean;
  error?: string;
}

function normalizeVersion(spec: string): string | null {
  const trimmed = spec.trim();
  if (!trimmed || /^(workspace:|file:|link:|git\+|https?:|github:)/i.test(trimmed)) return null;

  const aliasMatch = trimmed.match(/^npm:[^@]+@(.+)$/);
  const candidate = aliasMatch ? aliasMatch[1] : trimmed;

  if (/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(candidate)) {
    return candidate;
  }

  const versionMatch = candidate.match(/(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/);
  return versionMatch ? versionMatch[1] : null;
}

function dedupeDependencies(entries: ParsedDependency[]): ParsedDependency[] {
  const seen = new Map<string, ParsedDependency>();
  for (const entry of entries) {
    const key = `${entry.name}@${entry.version}:${entry.manifestPath}`;
    if (!seen.has(key)) {
      seen.set(key, entry);
    }
  }
  return Array.from(seen.values());
}

function getDirectory(path: string): string {
  return path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
}

function extractManifestPaths(files: RepoFile[]): string[] {
  const filePaths = files
    .filter((file) => file.type === "file" && MANIFEST_PATTERN.test(file.path))
    .map((file) => file.path)
    .sort();

  const lockPaths = filePaths.filter((path) => LOCKFILE_PATTERN.test(path));
  const lockedDirectories = new Set(lockPaths.map(getDirectory));
  const packageJsonPaths = filePaths.filter((path) => path.endsWith("package.json") && !lockedDirectories.has(getDirectory(path)));

  return [...lockPaths, ...packageJsonPaths];
}

function parsePackageJson(content: string, manifestPath: string): ParsedDependency[] {
  try {
    const pkg = JSON.parse(content);
    const dependencySections = [
      pkg?.dependencies,
      pkg?.devDependencies,
      pkg?.optionalDependencies,
      pkg?.peerDependencies,
    ];

    const entries: ParsedDependency[] = [];

    dependencySections.forEach((section) => {
      if (!section || typeof section !== "object") return;
      Object.entries(section).forEach(([name, versionSpec]) => {
        if (typeof versionSpec !== "string") return;
        const version = normalizeVersion(versionSpec);
        if (!version) return;
        entries.push({ name, version, manifestPath });
      });
    });

    return dedupeDependencies(entries);
  } catch {
    return [];
  }
}

function extractPackageNameFromLockPath(lockPath: string): string | null {
  const marker = "node_modules/";
  const markerIndex = lockPath.lastIndexOf(marker);
  if (markerIndex === -1) return null;
  return lockPath.slice(markerIndex + marker.length);
}

function walkLegacyLockDependencies(dependencies: Record<string, any>, manifestPath: string, entries: ParsedDependency[]) {
  Object.entries(dependencies).forEach(([name, metadata]) => {
    if (!metadata || typeof metadata !== "object") return;
    if (typeof metadata.version === "string") {
      entries.push({ name, version: metadata.version, manifestPath });
    }
    if (metadata.dependencies && typeof metadata.dependencies === "object") {
      walkLegacyLockDependencies(metadata.dependencies, manifestPath, entries);
    }
  });
}

function parsePackageLock(content: string, manifestPath: string): ParsedDependency[] {
  try {
    const lock = JSON.parse(content);
    const entries: ParsedDependency[] = [];

    if (lock?.packages && typeof lock.packages === "object") {
      Object.entries(lock.packages).forEach(([lockPath, metadata]) => {
        if (!lockPath || lockPath === "" || !metadata || typeof metadata !== "object") return;
        if (typeof (metadata as any).version !== "string") return;

        const name = typeof (metadata as any).name === "string" && (metadata as any).name.trim()
          ? (metadata as any).name.trim()
          : extractPackageNameFromLockPath(lockPath);

        if (!name) return;

        entries.push({
          name,
          version: String((metadata as any).version),
          manifestPath,
        });
      });
    }

    if (entries.length > 0) {
      return dedupeDependencies(entries);
    }

    if (lock?.dependencies && typeof lock.dependencies === "object") {
      walkLegacyLockDependencies(lock.dependencies, manifestPath, entries);
    }

    return dedupeDependencies(entries);
  } catch {
    return [];
  }
}

export function repoHasNpmManifests(files: RepoFile[]): boolean {
  return files.some((file) => file.type === "file" && MANIFEST_PATTERN.test(file.path));
}

export async function scanRepoDependencies(owner: string, repo: string, repoFiles: RepoFile[]): Promise<RepoDependencyScanResult> {
  const cacheKey = `osv_scan_${owner}_${repo}`;
  const cached = getCached<RepoDependencyScanResult>(cacheKey);
  if (cached) return cached;

  const manifestPaths = extractManifestPaths(repoFiles);
  if (!manifestPaths.length) {
    return {
      source: "OSV.dev",
      manifestPaths: [],
      scannedDependencies: 0,
      packagesWithIssues: 0,
      advisories: [],
      truncated: false,
    };
  }

  const manifestContents = await Promise.all(
    manifestPaths.map(async (manifestPath) => ({
      manifestPath,
      content: await fetchFileContent(owner, repo, manifestPath),
    }))
  );

  const dependencies = dedupeDependencies(
    manifestContents.flatMap(({ manifestPath, content }) => (
      LOCKFILE_PATTERN.test(manifestPath)
        ? parsePackageLock(content, manifestPath)
        : parsePackageJson(content, manifestPath)
    ))
  );

  const truncated = dependencies.length > MAX_SCANNED_PACKAGES;
  const packages = dependencies.slice(0, MAX_SCANNED_PACKAGES);

  if (!packages.length) {
    const emptyResult: RepoDependencyScanResult = {
      source: "OSV.dev",
      manifestPaths,
      scannedDependencies: 0,
      packagesWithIssues: 0,
      advisories: [],
      truncated: false,
    };
    setCache(cacheKey, emptyResult);
    return emptyResult;
  }

  try {
    const response = await fetch("/api/osv-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packages }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || `Dependency scan failed (HTTP ${response.status})`);
    }

    const result: RepoDependencyScanResult = {
      source: "OSV.dev",
      manifestPaths,
      scannedDependencies: Number(payload?.scannedPackages || packages.length),
      packagesWithIssues: Number(payload?.packagesWithIssues || 0),
      advisories: Array.isArray(payload?.advisories) ? payload.advisories : [],
      truncated,
    };

    setCache(cacheKey, result);
    return result;
  } catch (error: any) {
    return {
      source: "OSV.dev",
      manifestPaths,
      scannedDependencies: packages.length,
      packagesWithIssues: 0,
      advisories: [],
      truncated,
      error: error?.message || "Failed to scan repository dependencies",
    };
  }
}