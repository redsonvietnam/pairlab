import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { useIsDark } from "@/hooks/use-theme";

function initMermaid(isDark: boolean) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: isDark ? "dark" : "neutral",
    fontFamily: "Inter, ui-sans-serif, system-ui",
    themeVariables: { fontSize: "12px" },
    flowchart: { htmlLabels: false, curve: "basis" },
  });
}

export function MermaidDiagram({ chart, className }: { chart: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>("");
  const isDark = useIsDark();

  useEffect(() => {
    let cancelled = false;
    initMermaid(isDark);
    const cleaned = sanitizeMermaid(chart || "")
      .replace(/^```(?:mermaid)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    if (!cleaned) {
      setSvg("");
      setError(null);
      return;
    }
    const id = "mmd-" + Math.random().toString(36).slice(2, 10);
    if (!isRenderableMermaid(cleaned)) {
      setSvg("");
      setError("Unsupported diagram syntax");
      return;
    }
    mermaid
      .render(id, cleaned)
      .then(({ svg }) => {
        if (!cancelled) {
          setSvg(svg);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Failed to render diagram");
      });
    return () => {
      cancelled = true;
    };
  }, [chart, isDark]);

  if (error) {
    return (
      <div className="rounded-lg p-3 text-[10px] font-mono text-muted-foreground border border-border/40 bg-secondary/30">
        Diagram could not be rendered.
      </div>
    );
  }
  if (!svg) return null;
  return (
    <div
      ref={ref}
      className={"mermaid-host overflow-x-auto rounded-lg p-2 [&_svg]:max-w-full [&_svg]:h-auto " + (className || "")}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function sanitizeMermaid(value: string) {
  return value
    .replace(/\u2014/g, " - ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function isRenderableMermaid(value: string) {
  if (!(/^flowchart\s+(TD|LR|TB|RL|BT)/i.test(value) || /^graph\s+(TD|LR|TB|RL|BT)/i.test(value))) return false;
  if (/```|<script|<style|\bclassDef\b|\bclick\b/i.test(value)) return false;
  return value.split("\n").length <= 80;
}