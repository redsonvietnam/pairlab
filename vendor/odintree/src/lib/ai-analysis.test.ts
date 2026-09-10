import { describe, expect, it } from "vitest";
import { renderVerification, validateRepoAnalysis } from "./ai-analysis";

const files = [
  { path: "src/App.tsx", content: "export function App() { return <main />; }", language: "TypeScript" },
  { path: "src/api.ts", content: "export async function load() { return fetch('/api/data'); }", language: "TypeScript" },
];

describe("AI repo analysis validation", () => {
  it("creates renderable partial results when AI JSON is malformed or incomplete", () => {
    const result = validateRepoAnalysis({ repoSummary: { description: "Only a summary" }, fileAnalyses: null }, files);

    expect(result.debug?.status).toBe("partial");
    expect(Object.keys(result.fileAnalyses)).toEqual(["src/App.tsx", "src/api.ts"]);
    expect(result.repoSummary.riskBreakdown).toEqual({ critical: 0, high: 0, medium: 0, low: 0 });
    expect(result.fileAnalyses["src/App.tsx"].securityIssues).toEqual([]);
    expect(renderVerification(result).ready).toBe(true);
  });

  it("keeps partial security findings while normalizing missing fields", () => {
    const result = validateRepoAnalysis({
      repoSummary: {
        securityFindings: [{ severity: "critical", title: "Secret exposure", file: "src/api.ts" }],
        architectureDiagram: "textmermaid version 11.14.0",
      },
      fileAnalyses: {
        "src/api.ts": {
          securityIssues: [{ severity: "high", title: "Unsafe call", description: "Missing validation" }],
          flowchart: "```mermaid\ntextmermaid version 11.14.0\n```",
        },
      },
      debug: { validationErrors: ["synthetic malformed payload"] },
    }, files);

    expect(result.debug?.status).toBe("partial");
    expect(result.repoSummary.securityFindings.some((f) => f.severity === "critical")).toBe(true);
    expect(result.repoSummary.securityFindings.some((f) => f.severity === "high" && f.file === "src/api.ts")).toBe(true);
    expect(result.repoSummary.architectureDiagram).toMatch(/^flowchart\s+/);
    expect(result.fileAnalyses["src/api.ts"].flowchart).toMatch(/^flowchart\s+/);
    expect(renderVerification(result).ready).toBe(true);
  });
});