// Telly — the TV-headed host of Lucas Games. Shows up on the TV between
// rounds, on empty states, and in the front-page hero.

import { useId } from "react";
import { Face, INK, type Mood } from "./Face";

export type TellyPose = "wave" | "cheer" | "idle";

interface TellyProps {
  mood?: Mood;
  pose?: TellyPose;
  size?: number;
  className?: string;
}

const BODY = "#FFC93C";
const BODY_SHADE = "#E3A714";
const PINK = "#FF4FA3";
const GLOVE = { fill: "#fff", stroke: INK, strokeWidth: 3.5 };
const ARM = { fill: "none", stroke: INK, strokeWidth: 6, strokeLinecap: "round" as const };

export function Telly({ mood = "happy", pose = "wave", size = 160, className }: TellyProps) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 170 196" width={size} height={(size * 196) / 170} className={`telly ${className ?? ""}`} role="img" aria-label="Telly, your host" overflow="visible">
      <defs>
        <linearGradient id={`${id}-screen`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#7DF7EE" />
          <stop offset="1" stopColor="#25B3D4" />
        </linearGradient>
      </defs>
      <ellipse cx={85} cy={188} rx={50} ry={6} fill={INK} opacity={0.22} className="telly-shadow" />
      <g className="telly-body">
        {/* legs + shoes */}
        <path d="M64 146 L62 170" stroke={INK} strokeWidth={9} strokeLinecap="round" />
        <path d="M106 146 L108 170" stroke={INK} strokeWidth={9} strokeLinecap="round" />
        <ellipse cx={57} cy={175} rx={16} ry={8} fill="#33235E" stroke={INK} strokeWidth={3.5} />
        <ellipse cx={113} cy={175} rx={16} ry={8} fill="#33235E" stroke={INK} strokeWidth={3.5} />

        {/* left arm */}
        {pose === "cheer" ? (
          <g>
            <path d="M24 100 C10 92 6 76 10 60" {...ARM} />
            <circle cx={11} cy={55} r={10} {...GLOVE} />
          </g>
        ) : (
          <g>
            <path d="M24 102 C12 108 9 120 13 130" {...ARM} />
            <circle cx={14} cy={134} r={9.5} {...GLOVE} />
          </g>
        )}
        {/* right arm */}
        {pose === "idle" ? (
          <g>
            <path d="M146 102 C158 108 161 120 157 130" {...ARM} />
            <circle cx={156} cy={134} r={9.5} {...GLOVE} />
          </g>
        ) : (
          <g className={pose === "wave" ? "telly-wave" : undefined}>
            <path d="M146 100 C160 92 164 76 160 60" {...ARM} />
            <circle cx={159} cy={55} r={10} {...GLOVE} />
            <circle cx={150} cy={60} r={4} {...GLOVE} strokeWidth={3} />
          </g>
        )}

        {/* antennas */}
        <path d="M70 44 L50 13" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <path d="M100 44 L121 9" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <circle cx={49} cy={11} r={7} fill={PINK} stroke={INK} strokeWidth={3.5} className="telly-bulb" />
        <circle cx={122} cy={7.5} r={7} fill="#5FEFE4" stroke={INK} strokeWidth={3.5} className="telly-bulb telly-bulb-b" />

        {/* cabinet */}
        <rect x={20} y={40} width={130} height={108} rx={28} fill={BODY} stroke={INK} strokeWidth={5} />
        <path d="M32 66 C32 56 38 50 48 50" fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={5} strokeLinecap="round" />
        <path d="M142 104 C142 126 133 138 116 140" fill="none" stroke={BODY_SHADE} strokeWidth={7} strokeLinecap="round" />

        {/* screen */}
        <rect x={31} y={52} width={92} height={82} rx={20} fill="#33235E" stroke={INK} strokeWidth={4} />
        <rect x={38} y={59} width={78} height={68} rx={15} fill={`url(#${id}-screen)`} />
        <g opacity={0.12} stroke={INK} strokeWidth={1.5}>
          {[66, 73, 80, 87, 94, 101, 108, 115, 122].map((y) => (
            <path key={y} d={`M40 ${y} H114`} />
          ))}
        </g>
        <path d="M46 70 C48 65 53 64 60 64" fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={4} strokeLinecap="round" />
        <Face x={77} y={90} mood={mood} ink="#0E2F45" glint="#BFFBF7" scale={1.18} />

        {/* knobs + speaker */}
        <circle cx={136} cy={72} r={7} fill={BODY_SHADE} stroke={INK} strokeWidth={3.5} />
        <path d="M136 72 L140 67" stroke={INK} strokeWidth={3} strokeLinecap="round" />
        <circle cx={136} cy={96} r={7} fill={BODY_SHADE} stroke={INK} strokeWidth={3.5} />
        <path d="M136 96 L132 91" stroke={INK} strokeWidth={3} strokeLinecap="round" />
        <path d="M128 114 H143 M128 120 H143 M128 126 H143" stroke={INK} strokeWidth={3} strokeLinecap="round" />

        {/* bow tie */}
        <path d="M85 148 L66 138 L66 158 Z" fill={PINK} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
        <path d="M85 148 L104 138 L104 158 Z" fill={PINK} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
        <circle cx={85} cy={148} r={5.5} fill="#D62A80" stroke={INK} strokeWidth={3.5} />
      </g>
    </svg>
  );
}
