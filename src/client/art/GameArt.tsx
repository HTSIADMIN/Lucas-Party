// Key art for game cards and the TV title splash (320×200). Live games get a
// composed scene with the Party Crew; roadmap games get a bold glyph.

import { useId, type ReactElement, type ReactNode } from "react";
import { getGameMeta } from "@party/shared";
import { Character } from "./Character";
import { INK } from "./Face";
import { ART } from "./manifest";

const STROKE = { stroke: INK, strokeWidth: 5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** Mixes a hex colour toward ink (SVG attributes can't use CSS color-mix reliably). */
function darken(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const [ir, ig, ib] = [0x1b, 0x10, 0x33];
  const mixc = (c: number, i: number) => Math.round(c + (i - c) * amount).toString(16).padStart(2, "0");
  return `#${mixc(r, ir)}${mixc(g, ig)}${mixc(b, ib)}`;
}

function Frame({ accent, children, pattern = "dots" }: { accent: string; children: ReactNode; pattern?: "dots" | "stripes" | "rays" }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 320 200" className="game-art" role="presentation" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={accent} />
          <stop offset="1" stopColor={darken(accent, 0.45)} />
        </linearGradient>
        <pattern id={`${id}-dots`} width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="2.4" fill="#fff" opacity="0.18" />
        </pattern>
        <pattern id={`${id}-stripes`} width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
          <rect width="11" height="22" fill="#fff" opacity="0.1" />
        </pattern>
      </defs>
      <rect width="320" height="200" fill={`url(#${id}-bg)`} />
      {pattern === "rays" ? (
        <g opacity="0.16" fill="#fff">
          {Array.from({ length: 12 }, (_, i) => (
            <polygon key={i} points="160,100 150,-200 170,-200" transform={`rotate(${i * 30} 160 100)`} />
          ))}
        </g>
      ) : (
        <rect width="320" height="200" fill={`url(#${id}-${pattern})`} />
      )}
      {children}
    </svg>
  );
}

function PunchlineArt({ accent }: { accent: string }) {
  return (
    <Frame accent={accent} pattern="rays">
      <g>
        <path d="M160 196 L160 112" {...STROKE} fill="none" />
        <path d="M138 196 H182" {...STROKE} fill="none" />
        <rect x="144" y="66" width="32" height="50" rx="16" fill="#E9E3F7" {...STROKE} />
        <path d="M150 82 H170 M150 92 H170 M150 102 H170" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      </g>
      <Character id="blip" mood="cheeky" size={118} x={16} y={74} motion="none" />
      <Character id="sunny" mood="happy" size={118} x={186} y={74} motion="none" />
      <g transform="translate(52 22) rotate(-8)">
        <rect x="0" y="0" width="74" height="40" rx="14" fill="#fff" {...STROKE} />
        <text x="37" y="29" textAnchor="middle" fontFamily="Lilita One, sans-serif" fontSize="25" fill={INK}>HA!</text>
      </g>
      <g transform="translate(206 18) rotate(7)">
        <rect x="0" y="0" width="62" height="40" rx="14" fill="#FFC93C" {...STROKE} />
        <text x="31" y="29" textAnchor="middle" fontFamily="Lilita One, sans-serif" fontSize="25" fill={INK}>?!</text>
      </g>
    </Frame>
  );
}

function RocketArt({ accent }: { accent: string }) {
  return (
    <Frame accent={accent} pattern="dots">
      <path d="M14 186 C120 180 190 140 236 62" fill="none" stroke="#fff" strokeWidth="6" strokeDasharray="2 14" strokeLinecap="round" />
      <g transform="translate(236 64) rotate(40)">
        <path d="M-10 34 L0 62 L10 34 Z" fill="#FFC93C" stroke={INK} strokeWidth="4" strokeLinejoin="round" className="art-flame" />
        <path d="M-14 22 L-26 38 L-12 36 Z M14 22 L26 38 L12 36 Z" fill="#FF4D5E" {...STROKE} strokeWidth={4} />
        <path d="M0 -40 C16 -24 18 10 12 36 L-12 36 C-18 10 -16 -24 0 -40 Z" fill="#FFF6E3" {...STROKE} strokeWidth={4.5} />
        <path d="M0 -40 C8 -32 12 -24 13 -16 L-13 -16 C-12 -24 -8 -32 0 -40 Z" fill="#FF4D5E" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <circle cx="0" cy="4" r="8" fill="#5FEFE4" stroke={INK} strokeWidth="4" />
      </g>
      <g transform="translate(70 36)">
        <path d="M-34 0 C-34 -26 34 -26 34 0 Z" fill="#FF6FCB" {...STROKE} strokeWidth={4} />
        <path d="M-34 0 L-6 34 M34 0 L6 34 M0 0 L0 30" stroke={INK} strokeWidth="2.5" />
      </g>
      <Character id="puff" mood="happy" size={46} x={47} y={58} motion="none" />
      <text x="26" y="150" fontFamily="Lilita One, sans-serif" fontSize="48" fill="#fff" stroke={INK} strokeWidth="6" paintOrder="stroke">2.4×</text>
    </Frame>
  );
}

function OddArt({ accent }: { accent: string }) {
  return (
    <Frame accent={accent} pattern="stripes">
      {[0, 1, 2, 3].map((i) => (
        <Character key={i} id="wisp" mood={i === 2 ? "cheeky" : "think"} size={84} x={12 + i * 76} y={58 + (i % 2) * 14} motion="none" />
      ))}
      <g transform="translate(206 72)">
        <circle cx="0" cy="18" r="11" fill="none" stroke={INK} strokeWidth="4" />
        <circle cx="26" cy="18" r="11" fill="none" stroke={INK} strokeWidth="4" />
        <path d="M11 18 H15" stroke={INK} strokeWidth="4" />
        <path d="M13 22 C8 38 18 40 22 34" fill="#FFB38A" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M2 42 C8 36 18 36 24 42" stroke={INK} strokeWidth="6" strokeLinecap="round" fill="none" />
      </g>
      <g transform="translate(262 34) rotate(20)">
        <circle cx="0" cy="0" r="22" fill="#BFFBF7" fillOpacity="0.6" {...STROKE} strokeWidth={6} />
        <path d="M16 16 L36 36" stroke={INK} strokeWidth="10" strokeLinecap="round" />
      </g>
    </Frame>
  );
}

/** Simple bold glyphs for roadmap games, drawn in a 120×120 box. */
const GLYPHS: Record<string, ReactElement> = {
  greatminds: (
    <>
      <circle cx="38" cy="78" r="22" fill="#fff" {...STROKE} />
      <circle cx="82" cy="78" r="22" fill="#fff" {...STROKE} />
      <path d="M40 38 C34 20 58 12 64 24 C74 12 98 22 88 38 Z" fill="#FFC93C" {...STROKE} />
      <circle cx="32" cy="50" r="5" fill="#FFC93C" {...STROKE} strokeWidth={3} />
      <circle cx="88" cy="50" r="5" fill="#FFC93C" {...STROKE} strokeWidth={3} />
    </>
  ),
  mostlikely: (
    <>
      <circle cx="26" cy="74" r="16" fill="#fff" {...STROKE} />
      <circle cx="60" cy="84" r="16" fill="#FFC93C" {...STROKE} />
      <circle cx="94" cy="74" r="16" fill="#fff" {...STROKE} />
      <path d="M60 18 L60 52 M48 42 L60 54 L72 42" fill="none" {...STROKE} strokeWidth={7} />
    </>
  ),
  dial: (
    <>
      <path d="M14 84 A46 46 0 0 1 106 84 Z" fill="#fff" {...STROKE} />
      <path d="M30 84 A30 30 0 0 1 44 58" fill="none" stroke="#FF4D5E" strokeWidth="10" />
      <path d="M48 56 A30 30 0 0 1 72 56" fill="none" stroke="#FFC93C" strokeWidth="10" />
      <path d="M76 58 A30 30 0 0 1 90 84" fill="none" stroke="#2FDB9A" strokeWidth="10" />
      <path d="M60 84 L82 44" {...STROKE} strokeWidth={6} />
      <circle cx="60" cy="84" r="7" fill={INK} />
    </>
  ),
  spygrid: (
    <>
      {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => (
        <rect key={`${r}${c}`} x={16 + c * 30} y={16 + r * 30} width="24" height="24" rx="5" fill={(r + c) % 3 === 0 ? "#FF4D5E" : (r * c) % 2 ? "#4F7BFF" : "#fff"} {...STROKE} strokeWidth={3.5} />
      )))}
      <circle cx="84" cy="80" r="20" fill="#BFFBF7" fillOpacity="0.7" {...STROKE} />
      <path d="M98 94 L112 108" stroke={INK} strokeWidth="9" strokeLinecap="round" />
    </>
  ),
  liarsdice: (
    <>
      <rect x="12" y="38" width="52" height="52" rx="12" fill="#fff" {...STROKE} transform="rotate(-12 38 64)" />
      <rect x="58" y="30" width="52" height="52" rx="12" fill="#FFC93C" {...STROKE} transform="rotate(10 84 56)" />
      {[[30, 54], [46, 70], [38, 62]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" fill={INK} />)}
      {[[72, 44], [96, 44], [72, 68], [96, 68]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" fill={INK} transform="rotate(10 84 56)" />)}
    </>
  ),
  holdem: (
    <>
      <rect x="18" y="22" width="52" height="74" rx="9" fill="#fff" {...STROKE} transform="rotate(-10 44 59)" />
      <rect x="52" y="20" width="52" height="74" rx="9" fill="#fff" {...STROKE} transform="rotate(10 78 57)" />
      <text x="30" y="56" fontFamily="Lilita One, sans-serif" fontSize="22" fill={INK} transform="rotate(-10 44 59)">A</text>
      <text x="64" y="52" fontFamily="Lilita One, sans-serif" fontSize="22" fill="#FF4D5E" transform="rotate(10 78 57)">K</text>
      <path d="M80 68 C74 62 70 72 80 80 C90 72 86 62 80 68 Z" fill="#FF4D5E" transform="rotate(10 78 57)" />
    </>
  ),
  blackjack: (
    <>
      <rect x="30" y="18" width="60" height="84" rx="10" fill="#fff" {...STROKE} />
      <text x="60" y="74" textAnchor="middle" fontFamily="Lilita One, sans-serif" fontSize="38" fill={INK}>21</text>
      <circle cx="98" cy="92" r="16" fill="#FF4D5E" {...STROKE} />
      <circle cx="98" cy="92" r="7" fill="#fff" stroke={INK} strokeWidth="3" />
    </>
  ),
  fibfactory: (
    <>
      <rect x="14" y="30" width="92" height="60" rx="10" fill="#fff" {...STROKE} />
      <path d="M22 66 L38 66 L46 44 L56 84 L66 52 L74 72 L82 62 L98 62" fill="none" stroke="#FF4D5E" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="60" cy="104" r="7" fill="#FFC93C" {...STROKE} strokeWidth={3.5} />
    </>
  ),
  doodlefraud: (
    <>
      <path d="M16 92 C30 60 44 96 58 64 C70 40 84 76 100 50" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <g transform="rotate(40 74 46)">
        <rect x="64" y="6" width="20" height="62" rx="4" fill="#FFC93C" {...STROKE} />
        <path d="M64 68 L74 88 L84 68 Z" fill="#FFF6E3" {...STROKE} />
      </g>
    </>
  ),
  scribblechain: (
    <>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={10 + i * 34} y={44} width="36" height="28" rx="14" fill="none" {...STROKE} strokeWidth={7} stroke={i === 1 ? "#FFC93C" : "#fff"} />
      ))}
      {[0, 1, 2].map((i) => (
        <rect key={`o${i}`} x={10 + i * 34} y={44} width="36" height="28" rx="14" fill="none" stroke={INK} strokeWidth="2.5" />
      ))}
    </>
  ),
  oneclue: (
    <>
      <path d="M60 14 C30 14 22 50 40 66 C46 72 46 78 46 84 L74 84 C74 78 74 72 80 66 C98 50 90 14 60 14 Z" fill="#FFE58A" {...STROKE} />
      <rect x="46" y="84" width="28" height="18" rx="5" fill="#fff" {...STROKE} />
      <path d="M52 50 L60 60 L68 50" fill="none" stroke={INK} strokeWidth="3.5" />
    </>
  ),
  shadespotter: (
    <>
      {["#FF5A5F", "#FF9A3C", "#FFD23F", "#45D483", "#2ED3D3", "#4F7BFF", "#A46BFF", "#FF6FCB", "#fff"].map((c, i) => (
        <rect key={c} x={16 + (i % 3) * 30} y={16 + Math.floor(i / 3) * 30} width="26" height="26" rx="6" fill={c} stroke={INK} strokeWidth="3.5" />
      ))}
      <rect x="40" y="40" width="38" height="38" rx="10" fill="none" stroke="#fff" strokeWidth="5" />
    </>
  ),
  wordbomb: (
    <>
      <circle cx="54" cy="70" r="38" fill={INK} stroke={INK} strokeWidth="4" />
      <path d="M80 40 C88 28 98 26 104 18" fill="none" stroke="#C99A5B" strokeWidth="6" strokeLinecap="round" />
      <path d="M104 8 L106 18 L116 20 L106 22 L104 32 L102 22 L92 20 L102 18 Z" fill="#FFC93C" stroke={INK} strokeWidth="2.5" className="art-spark" />
      <text x="54" y="80" textAnchor="middle" fontFamily="Lilita One, sans-serif" fontSize="26" fill="#fff">ING</text>
    </>
  ),
  fullmoon: (
    <>
      <circle cx="60" cy="64" r="40" fill="#FFF1C9" {...STROKE} />
      <path d="M30 34 L36 12 L50 28 Z M90 34 L84 12 L70 28 Z" fill="#7C45E0" {...STROKE} strokeWidth={4} />
      <circle cx="46" cy="56" r="6" fill="#F2D9A2" />
      <circle cx="72" cy="78" r="9" fill="#F2D9A2" />
    </>
  ),
  mashbash: (
    <>
      <ellipse cx="60" cy="84" rx="44" ry="16" fill="#33235E" {...STROKE} />
      <path d="M24 72 C24 50 96 50 96 72 L96 82 C96 90 24 90 24 82 Z" fill="#FF4D5E" {...STROKE} />
      <ellipse cx="60" cy="70" rx="36" ry="12" fill="#FF8C92" stroke={INK} strokeWidth="3" />
      <path d="M22 36 L32 46 M60 22 L60 38 M98 36 L88 46" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
    </>
  ),
  bombsquad: (
    <>
      <rect x="16" y="40" width="88" height="56" rx="10" fill="#33235E" {...STROKE} />
      <rect x="28" y="50" width="38" height="20" rx="4" fill="#2FDB9A" stroke={INK} strokeWidth="3" />
      <text x="47" y="66" textAnchor="middle" fontFamily="Lilita One, sans-serif" fontSize="15" fill={INK}>0:42</text>
      <path d="M76 52 C84 64 70 76 82 88 M86 50 C96 62 84 74 94 86" fill="none" strokeWidth="5" strokeLinecap="round" stroke="#FF4D5E" />
      <path d="M84 50 C92 62 80 74 90 86" fill="none" strokeWidth="5" strokeLinecap="round" stroke="#4F7BFF" />
    </>
  ),
};

export function GameArt({ id }: { id: string }) {
  const meta = getGameMeta(id);
  const accent = meta?.accent ?? "#FF4FA3";
  const image = ART.games[id];
  if (image) return <img src={image} alt="" className="game-art game-art-image" loading="lazy" />;
  if (id === "punchline") return <PunchlineArt accent={accent} />;
  if (id === "rocket") return <RocketArt accent={accent} />;
  if (id === "oddoneout") return <OddArt accent={accent} />;
  return (
    <Frame accent={accent} pattern={id.length % 2 ? "dots" : "stripes"}>
      <g transform="translate(100 40)">
        <g transform="scale(1)">{GLYPHS[id] ?? <circle cx="60" cy="60" r="40" fill="#fff" {...STROKE} />}</g>
      </g>
    </Frame>
  );
}
