// The Party Crew: eight characters, one per seat. Each has its own silhouette
// so players are identifiable by shape as well as colour. Hand-built SVG on a
// 120×120 grid: ink outline (4.5), one gloss stroke, one shade stroke.

import type { CSSProperties } from "react";
import { CHARACTERS, CHARACTER_IDS, type CharacterId, type CharacterInfo } from "@party/shared";
import { Face, INK, type Mood } from "./Face";

const SW = 4.5;
const GLOSS = { fill: "none", stroke: "#fff", strokeOpacity: 0.55, strokeWidth: 5, strokeLinecap: "round" as const };

function shade(c: CharacterInfo) {
  return { fill: "none", stroke: c.shade, strokeOpacity: 0.75, strokeWidth: 6, strokeLinecap: "round" as const };
}

function Feet({ c, y = 100, spread = 15 }: { c: CharacterInfo; y?: number; spread?: number }) {
  return (
    <>
      <ellipse cx={60 - spread} cy={y} rx={10} ry={6.5} fill={c.shade} stroke={INK} strokeWidth={4} />
      <ellipse cx={60 + spread} cy={y} rx={10} ry={6.5} fill={c.shade} stroke={INK} strokeWidth={4} />
    </>
  );
}

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 10; k++) {
    const a = ((-90 + k * 36) * Math.PI) / 180;
    const r = k % 2 === 0 ? outer : inner;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}
const STAR = starPoints(60, 64, 40, 22);

/** Face anchor per character: [x, y, scale]. */
const FACE: Record<CharacterId, [number, number, number]> = {
  blip: [60, 63, 1],
  tango: [60, 76, 1],
  sunny: [60, 66, 0.92],
  sprout: [60, 68, 1],
  splash: [60, 76, 1],
  boxy: [60, 62, 0.92],
  wisp: [60, 57, 1],
  puff: [60, 71, 1],
};

function Body({ id, c }: { id: CharacterId; c: CharacterInfo }) {
  switch (id) {
    case "blip":
      return (
        <>
          <Feet c={c} />
          <path d="M60 31 C60 23 63 17 69 12.5" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          <circle cx={70.5} cy={11} r={6} fill={c.light} stroke={INK} strokeWidth={3.5} />
          <circle cx={60} cy={64} r={34} fill={c.color} stroke={INK} strokeWidth={SW} />
          <path d="M37 54 A25 25 0 0 1 50 38" {...GLOSS} />
          <path d="M89 72 A30 30 0 0 1 70 93" {...shade(c)} />
        </>
      );
    case "tango":
      return (
        <>
          <Feet c={c} y={101} />
          <path
            d="M60 103 C38 103 24 90 24 72 C24 56 34 46 42 34 C44 42 47 46 51 48 C51 34 59 21 71 12 C69 25 75 34 83 44 C92 55 96 64 96 74 C96 92 82 103 60 103 Z"
            fill={c.color}
            stroke={INK}
            strokeWidth={SW}
            strokeLinejoin="round"
          />
          <path
            d="M60 97 C48 97 40 90 40 80 C40 71 46 65 50 58 C52 65 55 68 60 69 C61 63 65 58 69 56 C73 64 80 70 80 81 C80 91 72 97 60 97 Z"
            fill={c.light}
            opacity={0.6}
          />
          <path d="M33 70 C33 62 36 56 41 50" {...GLOSS} />
        </>
      );
    case "sunny":
      return (
        <>
          <polygon points={STAR} fill={INK} stroke={INK} strokeWidth={21} strokeLinejoin="round" />
          <polygon points={STAR} fill={c.color} stroke={c.color} strokeWidth={12} strokeLinejoin="round" />
          <path d="M40 54 C41 49 44 45 48 43" {...GLOSS} />
          <path d="M86 78 C84 86 79 92 72 95" {...shade(c)} />
        </>
      );
    case "sprout":
      return (
        <>
          <Feet c={c} y={101} />
          <path d="M60 36 L60 21" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          <path d="M60 24 C53 12 40 12 35 18 C42 27 52 28 60 24 Z" fill={c.light} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
          <path d="M60 22 C66 9 82 8 87 15 C81 25 68 27 60 22 Z" fill={c.light} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
          <rect x={24} y={34} width={72} height={68} rx={28} fill={c.color} stroke={INK} strokeWidth={SW} />
          <path d="M34 60 C34 50 39 44 47 42" {...GLOSS} />
          <path d="M87 68 C87 82 82 91 72 95" {...shade(c)} />
        </>
      );
    case "splash":
      return (
        <>
          <Feet c={c} y={102} spread={14} />
          <path d="M60 12 C69 30 94 48 94 72 C94 92 80 105 60 105 C40 105 26 92 26 72 C26 48 51 30 60 12 Z" fill={c.color} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
          <ellipse cx={42} cy={66} rx={4.5} ry={10} transform="rotate(-18 42 66)" fill="#fff" opacity={0.55} />
          <circle cx={49} cy={47} r={2.6} fill="#fff" opacity={0.65} />
          <path d="M88 78 C86 91 77 99 65 101" {...shade(c)} />
        </>
      );
    case "boxy":
      return (
        <>
          <rect x={36} y={94} width={18} height={11} rx={4} fill={c.shade} stroke={INK} strokeWidth={4} />
          <rect x={66} y={94} width={18} height={11} rx={4} fill={c.shade} stroke={INK} strokeWidth={4} />
          <path d="M60 35 L60 21" stroke={INK} strokeWidth={4} strokeLinecap="round" />
          <circle cx={60} cy={17} r={6} fill="#FFC93C" stroke={INK} strokeWidth={3.5} />
          <rect x={13} y={56} width={11} height={18} rx={3.5} fill={c.shade} stroke={INK} strokeWidth={3.5} />
          <rect x={96} y={56} width={11} height={18} rx={3.5} fill={c.shade} stroke={INK} strokeWidth={3.5} />
          <rect x={22} y={34} width={76} height={64} rx={16} fill={c.color} stroke={INK} strokeWidth={SW} />
          <rect x={31} y={43} width={58} height={38} rx={11} fill="#172463" stroke={INK} strokeWidth={3.5} />
          <path d="M37 51 C37 48 39 47 43 47" fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={3} strokeLinecap="round" />
          <circle cx={48} cy={89} r={2.4} fill={c.shade} />
          <circle cx={60} cy={89} r={2.4} fill="#FFC93C" />
          <circle cx={72} cy={89} r={2.4} fill={c.shade} />
        </>
      );
    case "wisp":
      return (
        <>
          <ellipse cx={25} cy={70} rx={6} ry={9.5} transform="rotate(28 25 70)" fill={c.color} stroke={INK} strokeWidth={4} />
          <ellipse cx={95} cy={70} rx={6} ry={9.5} transform="rotate(-28 95 70)" fill={c.color} stroke={INK} strokeWidth={4} />
          <path
            d="M26 66 C26 40 41 22 60 22 C79 22 94 40 94 66 L94 96 C90 104 84 104 80 97 C76 90 70 90 66 97 C63 103 57 103 54 97 C50 90 44 90 40 97 C36 104 30 104 26 96 Z"
            fill={c.color}
            stroke={INK}
            strokeWidth={SW}
            strokeLinejoin="round"
          />
          <path d="M36 54 C37 44 43 36 51 33" {...GLOSS} />
          <path d="M87 72 C87 80 86 86 84 90" {...shade(c)} />
        </>
      );
    case "puff":
      return (
        <>
          <Feet c={c} y={100} spread={13} />
          <path
            d="M32 98 C18 98 11 87 15 77 C6 71 9 55 23 53 C22 40 36 31 48 37 C54 26 74 25 80 37 C93 32 106 43 102 56 C113 62 111 80 99 85 C99 96 87 103 77 99 C70 105 51 105 45 99 C40 101 36 100 32 98 Z"
            fill={c.color}
            stroke={INK}
            strokeWidth={SW}
            strokeLinejoin="round"
          />
          <path d="M28 62 C28 55 32 50 38 49" {...GLOSS} />
          <path d="M94 80 C90 88 84 92 76 93" {...shade(c)} />
        </>
      );
  }
}

export interface CharacterProps {
  id: CharacterId;
  mood?: Mood;
  size?: number | string;
  /** "bob" idles in place; "jump" plays once (change `key` to replay). */
  motion?: "bob" | "jump" | "shake" | "none";
  /** Offsets the idle loop so a row of characters doesn't bob in unison. */
  delay?: number;
  dim?: boolean;
  className?: string;
  title?: string;
  /** Position when nested inside another <svg>. */
  x?: number;
  y?: number;
  style?: CSSProperties;
}

export function Character({ id, mood = "idle", size = 96, motion = "bob", delay, dim, className, title, x, y, style }: CharacterProps) {
  const c = CHARACTERS[id] ?? CHARACTERS.blip;
  const [fx, fy, fs] = FACE[c.id];
  const floaty = c.id === "wisp";
  const classes = ["char", motion !== "none" && `char-${motion}`, floaty && "is-floaty", dim && "is-dim", className].filter(Boolean).join(" ");
  const cssVars = { ...style, ["--char-delay" as string]: `${delay ?? CHARACTER_IDS.indexOf(c.id) * -0.37}s` } as CSSProperties;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} x={x} y={y} className={classes} style={cssVars} role="img" aria-label={title ?? c.name} overflow="visible">
      <ellipse className="char-shadow" cx={60} cy={floaty ? 113 : 109} rx={floaty ? 22 : 30} ry={4.5} fill={INK} opacity={0.2} />
      <g className="char-body">
        <Body id={c.id} c={c} />
        <Face x={fx} y={fy} scale={fs} mood={mood} ink={c.id === "boxy" ? "#9FF6FF" : INK} glint={c.id === "boxy" ? "#172463" : "#fff"} cheeks={c.id !== "boxy"} />
      </g>
    </svg>
  );
}
