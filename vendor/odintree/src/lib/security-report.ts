import jsPDF from "jspdf";
import type { AIRepoSummary } from "./ai-analysis";

function safe(s: string | undefined | null): string {
  return (s || "").replace(/\u2014/g, " - ");
}

export function buildSecurityMarkdown(summary: AIRepoSummary, repoName: string): string {
  const date = new Date().toISOString().split("T")[0];
  const findings = [...(summary.securityFindings || [])].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  const criticalHigh = findings.filter((f) => f.severity === "critical" || f.severity === "high").length;
  const lines: string[] = [];
  lines.push(`# Security Inspection Report`);
  lines.push(``);
  lines.push(`**Repository:** ${repoName}`);
  lines.push(`**Generated:** ${date}`);
  if (typeof summary.overallScore === "number") lines.push(`**Quality Score:** ${summary.overallScore}/100`);
  if (typeof summary.securityScore === "number") lines.push(`**Security Score:** ${summary.securityScore}/100`);
  lines.push(``);

  lines.push(``);
  lines.push(`## Executive Summary`);
  lines.push(``);
  lines.push(safe(summary.description || "Repository security inspection completed."));
  lines.push(``);
  lines.push(`**Immediate priority:** ${criticalHigh > 0 ? `Resolve ${criticalHigh} critical or high severity finding${criticalHigh === 1 ? "" : "s"}.` : "No critical or high severity findings were reported."}`);
  lines.push(``);

  lines.push(`## Scorecard`);
  lines.push(``);
  lines.push(`| Area | Score | Interpretation |`);
  lines.push(`|------|-------|----------------|`);
  lines.push(`| Overall quality | ${typeof summary.overallScore === "number" ? `${summary.overallScore}/100` : "Not scored"} | ${scoreLabel(summary.overallScore)} |`);
  lines.push(`| Security posture | ${typeof summary.securityScore === "number" ? `${summary.securityScore}/100` : "Not scored"} | ${scoreLabel(summary.securityScore)} |`);
  lines.push(`| Finding volume | ${findings.length} | ${findings.length ? "Review required" : "No findings reported"} |`);
  lines.push(``);

  if (summary.architecture) {
    lines.push(`## Architecture and Trust Boundaries`);
    lines.push(``);
    lines.push(safe(summary.architecture));
    lines.push(``);
  }

  if (summary.techStack?.length) {
    lines.push(`## Technology Inventory`);
    lines.push(``);
    lines.push(`| Technology | Security review note |`);
    lines.push(`|------------|----------------------|`);
    summary.techStack.forEach((tech) => lines.push(`| ${safe(tech)} | Confirm version support, secure configuration, and dependency patch status. |`));
    lines.push(``);
  }

  if (summary.riskBreakdown) {
    lines.push(`## Risk Breakdown`);
    lines.push(``);
    lines.push(`| Severity | Count |`);
    lines.push(`|----------|-------|`);
    lines.push(`| Critical | ${summary.riskBreakdown.critical || 0} |`);
    lines.push(`| High     | ${summary.riskBreakdown.high || 0} |`);
    lines.push(`| Medium   | ${summary.riskBreakdown.medium || 0} |`);
    lines.push(`| Low      | ${summary.riskBreakdown.low || 0} |`);
    lines.push(``);
  }

  if (summary.attackSurface?.length) {
    lines.push(`## Attack Surface`);
    lines.push(``);
    summary.attackSurface.forEach((s) => lines.push(`- ${safe(s)}`));
    lines.push(``);
  }

  if (findings.length) {
    lines.push(`## Prioritized Findings (${findings.length})`);
    lines.push(``);
    findings.forEach((f, i) => {
      lines.push(`### ${i + 1}. [${f.severity.toUpperCase()}] ${safe(f.title)}`);
      lines.push(``);
      if (f.category) lines.push(`**Category:** ${safe(f.category)}  `);
      if (f.file) lines.push(`**File:** \`${safe(f.file)}\`  `);
      if (f.cwe) lines.push(`**CWE:** ${safe(f.cwe)}  `);
      lines.push(``);
      lines.push(`**Impact**`);
      lines.push(``);
      lines.push(safe(f.description));
      lines.push(``);
      if (f.recommendation) {
        lines.push(`**Recommended Fix**`);
        lines.push(``);
        lines.push(safe(f.recommendation));
        lines.push(``);
      }
      lines.push(`**Verification**`);
      lines.push(``);
      lines.push(`Re-run repository analysis after the fix and confirm this finding no longer appears. Add or update tests around the affected data path where possible.`);
      lines.push(``);
    });
  } else {
    lines.push(`## Security Findings`);
    lines.push(``);
    lines.push(`No security findings reported.`);
    lines.push(``);
  }

  if (summary.strengths?.length) {
    lines.push(`## Strengths`);
    lines.push(``);
    summary.strengths.forEach((s) => lines.push(`- ${safe(s)}`));
    lines.push(``);
  }
  if (summary.weaknesses?.length) {
    lines.push(`## Weaknesses`);
    lines.push(``);
    summary.weaknesses.forEach((w) => lines.push(`- ${safe(w)}`));
    lines.push(``);
  }

  lines.push(`## Remediation Plan`);
  lines.push(``);
  lines.push(`1. Fix critical and high severity findings first.`);
  lines.push(`2. Add regression tests for every changed security-sensitive path.`);
  lines.push(`3. Re-run the repository analysis and compare finding counts.`);
  lines.push(`4. Review dependency and configuration changes before release.`);
  lines.push(``);

  return lines.join("\n");
}

function severityRank(severity: string) {
  return ({ critical: 0, high: 1, medium: 2, low: 3 } as Record<string, number>)[severity] ?? 9;
}

function scoreLabel(score: number | undefined) {
  if (typeof score !== "number" || score < 0) return "Fallback or unavailable";
  if (score >= 85) return "Strong";
  if (score >= 70) return "Good with review items";
  if (score >= 50) return "Needs focused remediation";
  return "High risk";
}

export function downloadMarkdown(summary: AIRepoSummary, repoName: string) {
  const md = buildSecurityMarkdown(summary, repoName);
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${repoName.replace(/[^a-z0-9-_]/gi, "_")}-security-report.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadPdf(summary: AIRepoSummary, repoName: string) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeBlock = (
    text: string,
    opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}
  ) => {
    const size = opts.size ?? 10;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? [20, 20, 20]));
    const lines = doc.splitTextToSize(safe(text), maxW);
    lines.forEach((ln: string) => {
      ensureSpace(size + 4);
      doc.text(ln, margin, y);
      y += size + 4;
    });
    y += opts.gap ?? 4;
  };

  const hr = () => {
    ensureSpace(8);
    doc.setDrawColor(220);
    doc.line(margin, y, pageW - margin, y);
    y += 10;
  };

  // Title
  writeBlock("Security Inspection Report", { size: 20, bold: true, gap: 6 });
  writeBlock(`Repository: ${repoName}`, { size: 10, color: [90, 90, 90] });
  writeBlock(`Generated: ${new Date().toISOString().split("T")[0]}`, { size: 10, color: [90, 90, 90], gap: 6 });

  if (typeof summary.overallScore === "number" || typeof summary.securityScore === "number") {
    const parts = [];
    if (typeof summary.overallScore === "number") parts.push(`Quality ${summary.overallScore}/100`);
    if (typeof summary.securityScore === "number") parts.push(`Security ${summary.securityScore}/100`);
    writeBlock(parts.join("    "), { size: 11, bold: true, gap: 8 });
  }
  hr();

  if (summary.description) {
    writeBlock("Summary", { size: 13, bold: true });
    writeBlock(summary.description, { size: 10, gap: 8 });
  }
  if (summary.architecture) {
    writeBlock("Architecture", { size: 13, bold: true });
    writeBlock(summary.architecture, { size: 10, gap: 8 });
  }

  if (summary.riskBreakdown) {
    writeBlock("Risk Breakdown", { size: 13, bold: true });
    const r = summary.riskBreakdown;
    writeBlock(
      `Critical: ${r.critical || 0}    High: ${r.high || 0}    Medium: ${r.medium || 0}    Low: ${r.low || 0}`,
      { size: 10, gap: 8 }
    );
  }

  if (summary.attackSurface?.length) {
    writeBlock("Attack Surface", { size: 13, bold: true });
    summary.attackSurface.forEach((s) => writeBlock(`- ${s}`, { size: 10 }));
    y += 4;
  }

  if (summary.techStack?.length) {
    writeBlock("Tech Stack", { size: 13, bold: true });
    writeBlock(summary.techStack.join(", "), { size: 10, gap: 8 });
  }

  hr();
  writeBlock(`Security Findings (${summary.securityFindings?.length || 0})`, {
    size: 14,
    bold: true,
    gap: 6,
  });

  if (!summary.securityFindings?.length) {
    writeBlock("No security findings reported.", { size: 10, color: [110, 110, 110] });
  } else {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const colorFor: Record<string, [number, number, number]> = {
      critical: [200, 40, 40],
      high: [210, 110, 30],
      medium: [200, 160, 30],
      low: [120, 120, 120],
    };
    const sorted = [...summary.securityFindings].sort(
      (a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9)
    );
    sorted.forEach((f, i) => {
      ensureSpace(40);
      writeBlock(`${i + 1}. [${f.severity.toUpperCase()}] ${f.title}`, {
        size: 11,
        bold: true,
        color: colorFor[f.severity] || [20, 20, 20],
      });
      const meta = [
        f.category ? `Category: ${f.category}` : "",
        f.file ? `File: ${f.file}` : "",
        f.cwe ? `CWE: ${f.cwe}` : "",
      ]
        .filter(Boolean)
        .join("    ");
      if (meta) writeBlock(meta, { size: 9, color: [110, 110, 110] });
      writeBlock(f.description, { size: 10 });
      if (f.recommendation) {
        writeBlock("Recommendation:", { size: 10, bold: true });
        writeBlock(f.recommendation, { size: 10, gap: 8 });
      } else {
        y += 6;
      }
    });
  }

  if (summary.strengths?.length) {
    hr();
    writeBlock("Strengths", { size: 13, bold: true });
    summary.strengths.forEach((s) => writeBlock(`- ${s}`, { size: 10 }));
  }
  if (summary.weaknesses?.length) {
    y += 4;
    writeBlock("Weaknesses", { size: 13, bold: true });
    summary.weaknesses.forEach((s) => writeBlock(`- ${s}`, { size: 10 }));
  }

  doc.save(`${repoName.replace(/[^a-z0-9-_]/gi, "_")}-security-report.pdf`);
}