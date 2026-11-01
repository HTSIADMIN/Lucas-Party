// The roulette wheel (TV). Spins from rest to land the winning pocket under
// the pointer at the top.

import { RED_NUMBERS, WHEEL_ORDER } from "@party/shared/engine/casino/roulette";

const SLICE = 360 / WHEEL_ORDER.length;

function pocketColor(n: number): string {
  return n === 0 ? "#1f9d5c" : RED_NUMBERS.has(n) ? "#e0455a" : "#1b1033";
}

export function Wheel({ result, spinKey }: { result: number | null; spinKey: string }) {
  const index = result === null ? 0 : WHEEL_ORDER.indexOf(result);
  // Five full turns, then line the pocket's centre up with the pointer.
  const deg = result === null ? 0 : 360 * 5 - index * SLICE;
  return (
    <div className="ro-wheel-wrap">
      <span className="ro-pointer" aria-hidden="true">▼</span>
      <svg key={spinKey} className={`ro-wheel ${result !== null ? "is-spinning" : ""}`} viewBox="-110 -110 220 220" style={{ ["--spin" as string]: `${deg}deg` }} role="img" aria-label={result === null ? "Roulette wheel" : `The ball lands on ${result}`}>
        <circle r="108" fill="#6b4232" stroke="#1b1033" strokeWidth="4" />
        {WHEEL_ORDER.map((n, i) => {
          const a0 = ((i - 0.5) * SLICE - 90) * (Math.PI / 180);
          const a1 = ((i + 0.5) * SLICE - 90) * (Math.PI / 180);
          const r = 96;
          const path = `M0 0 L${(r * Math.cos(a0)).toFixed(2)} ${(r * Math.sin(a0)).toFixed(2)} A${r} ${r} 0 0 1 ${(r * Math.cos(a1)).toFixed(2)} ${(r * Math.sin(a1)).toFixed(2)} Z`;
          const mid = (i * SLICE - 90) * (Math.PI / 180);
          return (
            <g key={n}>
              <path d={path} fill={pocketColor(n)} stroke="#d9a066" strokeWidth="0.8" />
              <text x={(84 * Math.cos(mid)).toFixed(2)} y={(84 * Math.sin(mid)).toFixed(2)} fill="#fff" fontSize="8" fontFamily="var(--font-display)" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${i * SLICE} ${(84 * Math.cos(mid)).toFixed(2)} ${(84 * Math.sin(mid)).toFixed(2)})`}>
                {n}
              </text>
            </g>
          );
        })}
        <circle r="58" fill="#8a5a3c" stroke="#1b1033" strokeWidth="3" />
        <circle r="18" fill="#d9a066" stroke="#1b1033" strokeWidth="3" />
      </svg>
    </div>
  );
}

export { pocketColor };
