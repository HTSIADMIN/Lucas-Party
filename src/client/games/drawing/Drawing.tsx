// Renders a phone drawing as SVG. With `animate`, strokes draw themselves in
// order — a little replay when a drawing first lands on the TV.

import { DRAW_COLORS, DRAW_SIZE, DRAW_WIDTHS, type DrawStroke } from "@party/shared";
import "./drawing.css";

function pathOf(points: number[]): string {
  if (points.length === 2) return `M${points[0]} ${points[1]} l0.1 0`;
  let d = `M${points[0]} ${points[1]}`;
  for (let i = 2; i < points.length; i += 2) d += ` L${points[i]} ${points[i + 1]}`;
  return d;
}

export function Drawing({ strokes, animate = false, className = "", label = "A drawing" }: { strokes: readonly DrawStroke[]; animate?: boolean; className?: string; label?: string }) {
  const step = Math.min(120, 2400 / Math.max(1, strokes.length));
  return (
    <svg className={`drawing ${className}`} viewBox={`0 0 ${DRAW_SIZE} ${DRAW_SIZE}`} role="img" aria-label={label}>
      <rect width={DRAW_SIZE} height={DRAW_SIZE} fill="#fff" />
      {strokes.map((s, i) => (
        <path
          key={i}
          d={pathOf(s.p)}
          fill="none"
          stroke={DRAW_COLORS[s.c] ?? DRAW_COLORS[0]}
          strokeWidth={DRAW_WIDTHS[s.w] ?? DRAW_WIDTHS[0]}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={animate ? 1 : undefined}
          className={animate ? "drawing-stroke is-animated" : "drawing-stroke"}
          style={animate ? { animationDelay: `${i * step}ms` } : undefined}
        />
      ))}
    </svg>
  );
}
