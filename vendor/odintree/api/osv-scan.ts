interface PackageQuery {
  name: string;
  version: string;
  manifestPath?: string;
}

type Severity = "critical" | "high" | "medium" | "low" | "info";

const BATCH_SIZE = 100;
const MAX_PACKAGES = 600;

function isPackageQuery(value: unknown): value is PackageQuery {
  if (!value || typeof value !== "object") return false;
  const query = value as PackageQuery;
  return typeof query.name === "string" && typeof query.version === "string";
}

function normalizeQueries(input: unknown): PackageQuery[] {
  if (!Array.isArray(input)) return [];

  const seen = new Map<string, PackageQuery>();
  for (const item of input) {
    if (!isPackageQuery(item)) continue;
    const name = item.name.trim();
    const version = item.version.trim();
    const manifestPath = item.manifestPath?.trim();
    if (!name || !version) continue;
    const key = `${name}@${version}:${manifestPath || ""}`;
    if (!seen.has(key)) {
      seen.set(key, { name, version, manifestPath });
    }
  }

  return Array.from(seen.values()).slice(0, MAX_PACKAGES);
}

function severityFromNumericScore(score: number): Severity {
  if (score >= 9) return "critical";
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  if (score > 0) return "low";
  return "info";
}

function mapSeverity(vuln: any): Severity {
  const explicitSeverity = [
    vuln?.database_specific?.severity,
    vuln?.database_specific?.github_reviewed_severity,
    vuln?.ecosystem_specific?.severity,
  ].find((value) => typeof value === "string");

  if (typeof explicitSeverity === "string") {
    const normalized = explicitSeverity.toUpperCase();
    if (normalized.includes("CRITICAL")) return "critical";
    if (normalized.includes("HIGH")) return "high";
    if (normalized.includes("MEDIUM") || normalized.includes("MODERATE")) return "medium";
    if (normalized.includes("LOW")) return "low";
  }

  const scoreCandidates = [
    vuln?.database_specific?.cvss?.score,
    vuln?.severity?.[0]?.score,
  ];

  for (const candidate of scoreCandidates) {
    const parsed = typeof candidate === "number" ? candidate : Number.parseFloat(String(candidate));
    if (!Number.isNaN(parsed)) {
      return severityFromNumericScore(parsed);
    }
  }

  return "info";
}

function extractFixedVersion(vuln: any): string | undefined {
  const fixedVersions: string[] = [];
  for (const affected of vuln?.affected || []) {
    for (const range of affected?.ranges || []) {
      for (const event of range?.events || []) {
        if (typeof event?.fixed === "string") {
          fixedVersions.push(event.fixed);
        }
      }
    }
  }
  return fixedVersions[0];
}

function getReferenceUrl(vuln: any): string {
  const reference = (vuln?.references || []).find((entry: any) => typeof entry?.url === "string");
  return reference?.url || `https://osv.dev/vulnerability/${encodeURIComponent(vuln.id)}`;
}

function severityRank(severity: Severity): number {
  switch (severity) {
    case "critical": return 4;
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    default: return 0;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const packages = normalizeQueries(req.body?.packages);
  if (!packages.length) {
    return res.status(400).json({ error: "No npm packages provided for scanning" });
  }

  try {
    const advisories: Array<{
      id: string;
      packageName: string;
      version: string;
      manifestPath?: string;
      summary: string;
      details: string;
      severity: Severity;
      aliases: string[];
      published?: string;
      modified?: string;
      fixedVersion?: string;
      referenceUrl: string;
    }> = [];

    for (let index = 0; index < packages.length; index += BATCH_SIZE) {
      const batch = packages.slice(index, index + BATCH_SIZE);
      const osvRes = await fetch("https://api.osv.dev/v1/querybatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries: batch.map((pkg) => ({
            package: { name: pkg.name, ecosystem: "npm" },
            version: pkg.version,
          })),
        }),
      });

      if (!osvRes.ok) {
        const errorText = await osvRes.text();
        console.error("OSV.dev API error:", osvRes.status, errorText);
        return res.status(osvRes.status === 429 ? 429 : 502).json({
          error: `OSV.dev query failed (${osvRes.status}). Please try again shortly.`,
        });
      }

      const osvData = await osvRes.json();
      const results = Array.isArray(osvData?.results) ? osvData.results : [];

      results.forEach((result: any, resultIndex: number) => {
        const pkg = batch[resultIndex];
        const vulns = Array.isArray(result?.vulns) ? result.vulns : [];

        vulns.forEach((vuln: any) => {
          advisories.push({
            id: String(vuln?.id || "OSV"),
            packageName: pkg.name,
            version: pkg.version,
            manifestPath: pkg.manifestPath,
            summary: String(vuln?.summary || vuln?.details?.split("\n")?.[0] || "Known vulnerability advisory"),
            details: String(vuln?.details || "").slice(0, 600),
            severity: mapSeverity(vuln),
            aliases: Array.isArray(vuln?.aliases) ? vuln.aliases.filter((alias: unknown) => typeof alias === "string") : [],
            published: typeof vuln?.published === "string" ? vuln.published : undefined,
            modified: typeof vuln?.modified === "string" ? vuln.modified : undefined,
            fixedVersion: extractFixedVersion(vuln),
            referenceUrl: getReferenceUrl(vuln),
          });
        });
      });
    }

    advisories.sort((left, right) => {
      const severityOrder = severityRank(right.severity) - severityRank(left.severity);
      if (severityOrder !== 0) return severityOrder;
      const packageOrder = left.packageName.localeCompare(right.packageName);
      if (packageOrder !== 0) return packageOrder;
      return left.id.localeCompare(right.id);
    });

    const packagesWithIssues = new Set(advisories.map((advisory) => `${advisory.packageName}@${advisory.version}:${advisory.manifestPath || ""}`)).size;

    return res.status(200).json({
      advisories,
      packagesWithIssues,
      scannedPackages: packages.length,
    });
  } catch (error: any) {
    console.error("OSV scan error:", error);
    return res.status(500).json({ error: error?.message || "Internal server error" });
  }
}