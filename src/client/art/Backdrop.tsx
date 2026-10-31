// Full-bleed animated backdrops, one per theme. Pure SVG + CSS transforms (no
// filters/blur) so they stay smooth on a smart-TV browser. Generated art can
// replace any of these later — see docs/design/image-prompts.md.

import { memo, useId, type ReactElement } from "react";
import type { ThemeId } from "@party/shared";
import { ART } from "./manifest";

/** Deterministic scatter so stars don't jump between renders. */
function scatter(count: number, seed: number, w = 1600, h = 900) {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  return Array.from({ length: count }, () => ({ x: rand() * w, y: rand() * h, r: rand(), d: rand() }));
}

const SPARKLE = "M0 -10 L2.8 -2.8 L10 0 L2.8 2.8 L0 10 L-2.8 2.8 L-10 0 L-2.8 -2.8 Z";

function Showtime({ id }: { id: string }) {
  const sparkles = scatter(26, 7);
  return (
    <>
      <defs>
        <radialGradient id={`${id}-sky`} cx="50%" cy="10%" r="95%">
          <stop offset="0" stopColor="#5A2DC2" />
          <stop offset="0.55" stopColor="#2A1470" />
          <stop offset="1" stopColor="#10063A" />
        </radialGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A1C8E" />
          <stop offset="1" stopColor="#170A4A" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-sky)`} />
      {[260, 620, 980, 1340].map((x, i) => (
        <g key={x} className="bd-beam" style={{ animationDelay: `${i * -2.3}s`, transformOrigin: `${x}px -40px` }}>
          <polygon points={`${x - 26},-40 ${x + 26},-40 ${x + 230},900 ${x - 230},900`} fill={`url(#${id}-beam)`} />
        </g>
      ))}
      {sparkles.map((p, i) => (
        <path key={i} d={SPARKLE} className="bd-twinkle" fill={i % 3 === 0 ? "#FFC93C" : i % 3 === 1 ? "#FF8CC2" : "#fff"} transform={`translate(${p.x} ${p.y * 0.72}) scale(${0.5 + p.r})`} style={{ animationDelay: `${p.d * -4}s` }} />
      ))}
      <ellipse cx="800" cy="1010" rx="980" ry="250" fill={`url(#${id}-floor)`} />
      <ellipse cx="800" cy="1010" rx="980" ry="250" fill="none" stroke="#FF4FA3" strokeOpacity="0.55" strokeWidth="6" />
      <ellipse cx="800" cy="1030" rx="700" ry="160" fill="none" stroke="#FFC93C" strokeOpacity="0.25" strokeWidth="4" strokeDasharray="4 22" />
      <g>
        {Array.from({ length: 21 }, (_, i) => (
          <circle key={i} cx={40 + i * 76} cy={26} r={9} className="bd-bulb" fill="#FFE58A" stroke="#1B1033" strokeWidth="3" style={{ animationDelay: `${(i % 3) * 0.33}s` }} />
        ))}
      </g>
    </>
  );
}

function Arcade({ id }: { id: string }) {
  const stars = scatter(70, 11, 1600, 520);
  const horizon = 560;
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05020F" />
          <stop offset="0.6" stopColor="#2A0A55" />
          <stop offset="1" stopColor="#4B0F6B" />
        </linearGradient>
        <linearGradient id={`${id}-sun`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE58A" />
          <stop offset="0.5" stopColor="#FF8A3D" />
          <stop offset="1" stopColor="#FF3DCB" />
        </linearGradient>
        <clipPath id={`${id}-sunclip`}>
          <rect x="0" y="0" width="1600" height={horizon} />
        </clipPath>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-sky)`} />
      {stars.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={0.8 + p.r * 1.8} fill="#fff" className="bd-twinkle" style={{ animationDelay: `${p.d * -5}s` }} />
      ))}
      <g clipPath={`url(#${id}-sunclip)`}>
        <circle cx="800" cy={horizon - 10} r="230" fill={`url(#${id}-sun)`} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x="560" y={horizon - 120 + i * 22} width="480" height={4 + i * 2.2} fill="#2A0A55" />
        ))}
      </g>
      <path d={`M0 ${horizon} L180 470 L320 ${horizon - 20} L470 430 L640 ${horizon} Z`} fill="#16052E" stroke="#21E6FF" strokeWidth="3" strokeOpacity="0.7" />
      <path d={`M960 ${horizon} L1110 440 L1260 ${horizon - 30} L1420 460 L1600 ${horizon} Z`} fill="#16052E" stroke="#21E6FF" strokeWidth="3" strokeOpacity="0.7" />
      <rect x="0" y={horizon} width="1600" height={900 - horizon} fill="#0B0420" />
      <g stroke="#FF3DCB" strokeOpacity="0.75" strokeWidth="2.5">
        {Array.from({ length: 25 }, (_, i) => {
          const x = -1600 + i * 200;
          return <line key={i} x1={800} y1={horizon} x2={x} y2={900} />;
        })}
      </g>
      <g className="bd-grid" stroke="#FF3DCB" strokeOpacity="0.75" strokeWidth="2.5">
        {Array.from({ length: 9 }, (_, i) => {
          const y = horizon + Math.pow(i / 8, 1.8) * (900 - horizon);
          return <line key={i} x1={0} y1={y} x2={1600} y2={y} />;
        })}
      </g>
      <line x1="0" y1={horizon} x2="1600" y2={horizon} stroke="#21E6FF" strokeWidth="4" />
    </>
  );
}

function Cloud({ x, y, s, cls }: { x: number; y: number; s: number; cls: string }) {
  return (
    <g className={cls} transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 40 C-30 40 -34 6 -6 4 C0 -22 40 -26 50 -2 C70 -14 98 0 92 22 C112 26 108 40 90 40 Z" fill="#fff" stroke="#1B1033" strokeWidth="5" strokeLinejoin="round" />
    </g>
  );
}

function Picnic({ id }: { id: string }) {
  const flowers = scatter(40, 23, 1600, 160);
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5CC0F5" />
          <stop offset="1" stopColor="#CFF1FF" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-sky)`} />
      <g className="bd-spin-slow" style={{ transformOrigin: "1360px 150px" }}>
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x="1354" y="20" width="12" height="44" rx="6" fill="#FFE58A" transform={`rotate(${i * 30} 1360 150)`} />
        ))}
      </g>
      <circle cx="1360" cy="150" r="70" fill="#FFC93C" stroke="#1B1033" strokeWidth="6" />
      <Cloud x={140} y={130} s={1.6} cls="bd-drift" />
      <Cloud x={620} y={80} s={1.1} cls="bd-drift bd-drift-b" />
      <Cloud x={980} y={220} s={1.3} cls="bd-drift bd-drift-c" />
      <path d="M0 640 C220 560 420 560 640 620 C860 680 1060 560 1300 580 C1440 592 1540 620 1600 640 L1600 900 L0 900 Z" fill="#5FD98A" stroke="#1B1033" strokeWidth="6" />
      <path d="M0 740 C260 680 520 700 760 750 C1000 800 1260 690 1600 720 L1600 900 L0 900 Z" fill="#3FBF6E" stroke="#1B1033" strokeWidth="6" />
      {flowers.map((p, i) => (
        <circle key={i} cx={p.x} cy={760 + p.y * 0.85} r={4 + p.r * 4} fill={["#FF6FCB", "#FFD23F", "#fff", "#FF5A5F"][i % 4]} stroke="#1B1033" strokeWidth="2.5" />
      ))}
    </>
  );
}

function Bat({ x, y, s, delay }: { x: number; y: number; s: number; delay: number }) {
  return (
    <g className="bd-bat-path" style={{ animationDelay: `${delay}s` }}>
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <g className="bd-bat" style={{ animationDelay: `${delay}s` }}>
          <path d="M0 0 C-10 -14 -30 -14 -46 -4 C-38 -2 -34 4 -34 10 C-26 4 -18 6 -12 12 C-8 6 -4 4 0 6 C4 4 8 6 12 12 C18 6 26 4 34 10 C34 4 38 -2 46 -4 C30 -14 10 -14 0 0 Z" fill="#0C0618" />
        </g>
      </g>
    </g>
  );
}

function Pumpkin({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -40 C4 -52 12 -56 18 -56" stroke="#2F7A3A" strokeWidth="7" fill="none" strokeLinecap="round" />
      <ellipse cx="0" cy="0" rx="58" ry="44" fill="#FF8A3D" stroke="#1B1033" strokeWidth="6" />
      <path d="M-20 -40 C-34 -10 -34 20 -20 42 M20 -40 C34 -10 34 20 20 42" stroke="#D9621A" strokeWidth="5" fill="none" />
      <path d="M-30 -6 L-16 -20 L-6 -6 Z M30 -6 L16 -20 L6 -6 Z" fill="#FFE58A" className="bd-flicker" />
      <path d="M-30 12 Q0 34 30 12 L22 16 L14 10 L6 18 L-4 10 L-12 18 L-22 10 Z" fill="#FFE58A" className="bd-flicker" />
    </g>
  );
}

function Spooky({ id }: { id: string }) {
  const stars = scatter(60, 31, 1600, 560);
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0C0618" />
          <stop offset="1" stopColor="#3A1D63" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0.45" stopColor="#FFF1C9" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FFF1C9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-sky)`} />
      {stars.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={0.8 + p.r * 1.6} fill="#fff" className="bd-twinkle" style={{ animationDelay: `${p.d * -5}s` }} />
      ))}
      <circle cx="1240" cy="190" r="200" fill={`url(#${id}-glow)`} />
      <circle cx="1240" cy="190" r="96" fill="#FFF1C9" stroke="#1B1033" strokeWidth="6" />
      <circle cx="1210" cy="170" r="16" fill="#F2D9A2" />
      <circle cx="1268" cy="214" r="11" fill="#F2D9A2" />
      <circle cx="1262" cy="152" r="7" fill="#F2D9A2" />
      <Bat x={360} y={210} s={1.2} delay={0} />
      <Bat x={560} y={140} s={0.8} delay={-1.3} />
      <Bat x={980} y={260} s={1} delay={-2.4} />
      <path d="M0 700 C200 640 380 660 560 700 C760 744 960 640 1180 660 C1360 676 1500 700 1600 690 L1600 900 L0 900 Z" fill="#140A26" />
      <path d="M180 700 L180 560 L220 520 L260 560 L260 700 Z M200 590 h20 v24 h-20 Z" fill="#0C0618" />
      <path d="M200 590 h20 v24 h-20 Z" fill="#FFC93C" className="bd-flicker" />
      <ellipse className="bd-drift bd-fog" cx="500" cy="760" rx="520" ry="46" fill="#fff" opacity="0.06" />
      <ellipse className="bd-drift bd-drift-b bd-fog" cx="1200" cy="800" rx="560" ry="50" fill="#fff" opacity="0.07" />
      <Pumpkin x={1320} y={800} s={1.25} />
      <Pumpkin x={1470} y={830} s={0.8} />
      <Pumpkin x={110} y={830} s={0.9} />
    </>
  );
}

function Cosmos({ id }: { id: string }) {
  const stars = scatter(130, 41);
  return (
    <>
      <defs>
        <radialGradient id={`${id}-nebA`} cx="25%" cy="30%" r="45%">
          <stop offset="0" stopColor="#9B6BFF" stopOpacity="0.5" />
          <stop offset="1" stopColor="#9B6BFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-nebB`} cx="80%" cy="75%" r="45%">
          <stop offset="0" stopColor="#3FE0FF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#3FE0FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="#050B2A" />
      <rect width="1600" height="900" fill={`url(#${id}-nebA)`} />
      <rect width="1600" height="900" fill={`url(#${id}-nebB)`} />
      {stars.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={0.6 + p.r * 2} fill="#fff" className="bd-twinkle" style={{ animationDelay: `${p.d * -6}s` }} />
      ))}
      <g className="bd-float">
        <circle cx="220" cy="700" r="150" fill="#FF6FCB" stroke="#1B1033" strokeWidth="7" />
        <path d="M100 640 C160 620 280 660 340 640" stroke="#E0459F" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M90 720 C170 700 270 740 350 720" stroke="#E0459F" strokeWidth="10" fill="none" strokeLinecap="round" />
        <ellipse cx="220" cy="700" rx="260" ry="54" fill="none" stroke="#FFC93C" strokeWidth="14" transform="rotate(-14 220 700)" />
      </g>
      <g className="bd-float bd-float-b">
        <circle cx="1360" cy="170" r="54" fill="#2FDB9A" stroke="#1B1033" strokeWidth="6" />
        <circle cx="1342" cy="156" r="10" fill="#17A673" />
        <circle cx="1378" cy="190" r="7" fill="#17A673" />
      </g>
      <line className="bd-shooting" x1="900" y1="120" x2="1040" y2="60" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

const SCENES: Record<ThemeId, (props: { id: string }) => ReactElement> = {
  showtime: Showtime,
  arcade: Arcade,
  picnic: Picnic,
  spooky: Spooky,
  cosmos: Cosmos,
};

export const Backdrop = memo(function Backdrop({ theme, fixed = true }: { theme: ThemeId; fixed?: boolean }) {
  const id = useId().replace(/:/g, "");
  const Scene = SCENES[theme] ?? Showtime;
  const image = ART.backdrops[theme];
  if (image) {
    return (
      <div className={`backdrop ${fixed ? "is-fixed" : ""}`} aria-hidden="true">
        <img src={image} alt="" className="backdrop-image" />
      </div>
    );
  }
  return (
    <div className={`backdrop ${fixed ? "is-fixed" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <Scene id={id} />
      </svg>
    </div>
  );
});
