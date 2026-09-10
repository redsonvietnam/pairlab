export interface FileAnalysis {
  loc: number;
  codeLoc: number;
  blankLines: number;
  commentLines: number;
  complexity: number;
  maintainability: number;
  dependencies: string[];
  exports: string[];
  vulnerabilities: Vulnerability[];
}

export interface Vulnerability {
  type: "secret" | "unsafe" | "deprecated" | "injection";
  severity: "low" | "medium" | "high" | "critical";
  line: number;
  message: string;
  snippet: string;
}

function countComments(lines: string[], language: string): number {
  let count = 0;
  let inBlock = false;
  const isJSLike = ["JavaScript", "TypeScript", "Java", "Go", "Rust", "C", "C++", "CSS", "SCSS"].includes(language);
  const isPython = language === "Python";

  for (const line of lines) {
    const trimmed = line.trim();
    if (isJSLike) {
      if (inBlock) { count++; if (trimmed.includes("*/")) inBlock = false; continue; }
      if (trimmed.startsWith("//")) { count++; continue; }
      if (trimmed.startsWith("/*")) { count++; inBlock = true; if (trimmed.includes("*/")) inBlock = false; continue; }
    }
    if (isPython && trimmed.startsWith("#")) { count++; }
    if (language === "Shell" && trimmed.startsWith("#")) { count++; }
    if (language === "Ruby" && trimmed.startsWith("#")) { count++; }
  }
  return count;
}

function estimateComplexity(content: string, language: string): number {
  const patterns = [
    /\bif\b/g, /\belse\s+if\b/g, /\belif\b/g, /\bfor\b/g, /\bwhile\b/g,
    /\bswitch\b/g, /\bcase\b/g, /\bcatch\b/g, /\b\?\s*.*:/g, /&&/g, /\|\|/g,
    /\btry\b/g, /\.map\(/g, /\.filter\(/g, /\.reduce\(/g,
  ];
  let complexity = 1;
  for (const p of patterns) {
    const matches = content.match(p);
    if (matches) complexity += matches.length;
  }
  return complexity;
}

function detectVulnerabilities(lines: string[]): Vulnerability[] {
  const vulns: Vulnerability[] = [];
  const secretPatterns = [
    { regex: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][^"']{8,}["']/i, msg: "Possible hardcoded API key" },
    { regex: /(?:secret|password|passwd|pwd)\s*[:=]\s*["'][^"']+["']/i, msg: "Possible hardcoded secret or password" },
    { regex: /(?:token)\s*[:=]\s*["'][^"']{8,}["']/i, msg: "Possible hardcoded token" },
    { regex: /(?:AKIA[0-9A-Z]{16})/i, msg: "AWS access key detected" },
    { regex: /(?:sk-[a-zA-Z0-9]{20,})/i, msg: "Possible OpenAI/Stripe secret key" },
    { regex: /(?:ghp_[a-zA-Z0-9]{36})/i, msg: "GitHub personal access token detected" },
  ];
  const unsafePatterns = [
    { regex: /\beval\s*\(/g, msg: "Use of eval() is unsafe" },
    { regex: /dangerouslySetInnerHTML/g, msg: "dangerouslySetInnerHTML can lead to XSS" },
    { regex: /innerHTML\s*=/g, msg: "Direct innerHTML assignment can lead to XSS" },
    { regex: /document\.write/g, msg: "document.write is considered unsafe" },
    { regex: /new\s+Function\s*\(/g, msg: "Dynamic Function constructor is unsafe" },
    { regex: /exec\s*\(\s*["'`]/g, msg: "Possible command injection via exec()" },
    { regex: /\bhttp:\/\//g, msg: "Insecure HTTP URL (use HTTPS)" },
  ];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("*")) return;

    for (const p of secretPatterns) {
      if (p.regex.test(line)) {
        vulns.push({ type: "secret", severity: "critical", line: i + 1, message: p.msg, snippet: line.trim().slice(0, 80) });
      }
    }
    for (const p of unsafePatterns) {
      if (p.regex.test(line)) {
        vulns.push({ type: "unsafe", severity: line.includes("eval") ? "high" : "medium", line: i + 1, message: p.msg, snippet: line.trim().slice(0, 80) });
      }
    }
  });

  return vulns;
}

function extractDependencies(content: string): string[] {
  const deps: string[] = [];
  const importRegex = /(?:import\s+.*?from\s+["']([^"']+)["']|require\s*\(\s*["']([^"']+)["']\s*\))/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    deps.push(match[1] || match[2]);
  }
  return [...new Set(deps)];
}

function extractExports(content: string): string[] {
  const exports: string[] = [];
  const patterns = [
    /export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g,
    /export\s+\{([^}]+)\}/g,
    /module\.exports\s*=\s*(\w+)/g,
  ];
  for (const p of patterns) {
    let match;
    while ((match = p.exec(content)) !== null) {
      if (match[1]) {
        match[1].split(",").forEach((e) => {
          const name = e.trim().split(/\s+as\s+/).pop()?.trim();
          if (name) exports.push(name);
        });
      }
    }
  }
  return [...new Set(exports)];
}

export function analyzeFile(content: string, language: string): FileAnalysis {
  const lines = content.split("\n");
  const loc = lines.length;
  const blankLines = lines.filter((l) => l.trim() === "").length;
  const commentLines = countComments(lines, language);
  const codeLoc = loc - blankLines - commentLines;
  const complexity = estimateComplexity(content, language);

  // Simplified Maintainability Index (0-100 scale, higher is better)
  const avgLoc = Math.max(codeLoc, 1);
  const vol = avgLoc * Math.log2(Math.max(complexity, 1));
  const mi = Math.max(0, Math.min(100, 171 - 5.2 * Math.log(vol) - 0.23 * complexity - 16.2 * Math.log(avgLoc)));
  const maintainability = Math.round(mi);

  const dependencies = extractDependencies(content);
  const exports = extractExports(content);
  const vulnerabilities = detectVulnerabilities(lines);

  return { loc, codeLoc, blankLines, commentLines, complexity, maintainability, dependencies, exports, vulnerabilities };
}

export function getComplexityColor(complexity: number): string {
  if (complexity <= 5) return "hsl(var(--node-green))";
  if (complexity <= 10) return "hsl(var(--node-yellow))";
  if (complexity <= 20) return "hsl(var(--node-orange))";
  return "hsl(var(--node-red))";
}

export function getMaintainabilityLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: "Good", color: "hsl(var(--node-green))" };
  if (score >= 40) return { label: "Moderate", color: "hsl(var(--node-yellow))" };
  return { label: "Poor", color: "hsl(var(--node-red))" };
}
