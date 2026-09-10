import { useMemo } from "react";
import type { HeatmapCell } from "@/lib/commit-timeline";

interface Props {
  cells: HeatmapCell[];
}

export function CommitHeatmap({ cells }: Props) {
  const { weeks, max } = useMemo(() => {
    const max = Math.max(1, ...cells.map((c) => c.count));
    const weeks: HeatmapCell[][] = [];
    for (const c of cells) {
      if (!weeks[c.week]) weeks[c.week] = [];
      weeks[c.week][c.weekday] = c;
    }
    return { weeks, max };
  }, [cells]);

  if (cells.length === 0) return <div className="text-xs text-muted-foreground">No commit data yet.</div>;

  const cellSize = 11;
  const gap = 2;
  const width = weeks.length * (cellSize + gap);
  const height = 7 * (cellSize + gap);

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="block">
        {weeks.map((week, wi) =>
          (week || []).map((cell, di) => {
            if (!cell) return null;
            const intensity = cell.count / max;
            const opacity = cell.count === 0 ? 0.08 : 0.2 + intensity * 0.8;
            return (
              <rect
                key={`${wi}-${di}`}
                x={wi * (cellSize + gap)}
                y={di * (cellSize + gap)}
                width={cellSize}
                height={cellSize}
                rx={2}
                fill="hsl(var(--foreground))"
                opacity={opacity}
              >
                <title>{cell.date}: {cell.count} commit{cell.count === 1 ? "" : "s"}</title>
              </rect>
            );
          })
        )}
      </svg>
    </div>
  );
}
