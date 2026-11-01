// Liar's Dice pieces: a chunky sticker die and the leather cup that hides
// them. Ones carry a star instead of a pip — they're wild. All colours come
// from liarsdice.css so the tones (match / wild / dim…) stay token-driven.

import type { CSSProperties } from "react";

/** Pip centres on the 100×100 die. */
const PIPS: Record<number, [number, number][]> = {
  2: [[30, 30], [70, 70]],
  3: [[29, 29], [50, 50], [71, 71]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[29, 29], [71, 29], [50, 50], [29, 71], [71, 71]],
  6: [[30, 27], [70, 27], [30, 50], [70, 50], [30, 73], [70, 73]],
};

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 10; k++) {
    const a = ((-90 + k * 36) * Math.PI) / 180;
    const r = k % 2 === 0 ? outer : inner;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}
const STAR = starPoints(50, 53, 31, 14);

/** plain/match/wild/dim show the face; hidden is face-down; empty is a lost-die slot. */
export type DieTone = "plain" | "match" | "wild" | "dim" | "hidden" | "empty";

interface DieProps {
  /** 1–6. Ignored for hidden and empty dice. */
  value: number | null;
  size?: number | string;
  tone?: DieTone;
  className?: string;
  style?: CSSProperties;
}

export function Die({ value, size = "1em", tone = "plain", className, style }: DieProps) {
  const face = value !== null && Number.isInteger(value) && value >= 1 && value <= 6 ? value : null;
  const t: DieTone = face === null && tone !== "empty" ? "hidden" : tone;
  /** The face to draw, if this die is face-up. */
  const shown = t === "hidden" || t === "empty" ? null : face;
  const label = t === "empty" ? "Lost die" : shown === null ? "Hidden die" : shown === 1 ? "One (wild)" : `${shown}`;
  return (
    <svg className={`ld-die is-${t} ${className ?? ""}`} viewBox="0 0 100 100" width={size} height={size} style={style} role="img" aria-label={label}>
      <rect className="ld-die-body" x="6" y="6" width="88" height="88" rx="22" />
      {t !== "empty" && <path className="ld-die-shade" d="M22 85 H70 Q85 85 85 70 V24" />}
      {t === "hidden" && (
        <text className="ld-die-mark" x="50" y="70" textAnchor="middle">
          ?
        </text>
      )}
      {shown === 1 && <polygon className="ld-die-star" points={STAR} />}
      {shown !== null && shown > 1 && PIPS[shown]!.map(([x, y], i) => <circle key={i} className="ld-die-pip" cx={x} cy={y} r="9.5" />)}
    </svg>
  );
}

/** An upturned dice cup, for the rolling beat. */
export function Cup({ size = "1em", className }: { size?: number | string; className?: string }) {
  return (
    <svg className={`ld-cup ${className ?? ""}`} viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="Dice cup">
      <path className="ld-cup-body" d="M29 8 H71 Q76 8 77 13 L88 86 H12 L23 13 Q24 8 29 8 Z" />
      <path className="ld-cup-trim" d="M21 32 H79 M17 60 H83" />
      <rect className="ld-cup-rim" x="5" y="80" width="90" height="14" rx="7" />
    </svg>
  );
}
