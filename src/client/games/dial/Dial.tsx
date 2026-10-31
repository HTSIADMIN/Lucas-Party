// The half-circle dial, shared by the TV and the phones. 0 is the left end of
// the card, 100 the right. Pass `onChange` to make it draggable.

import { useRef, type PointerEvent } from "react";
import { DIAL_BANDS, type DialCard } from "@party/shared";

const CX = 100;
const CY = 104;
const R = 92;

function polar(r: number, value: number): [number, number] {
  const angle = Math.PI * (1 - value / 100);
  return [CX + r * Math.cos(angle), CY - r * Math.sin(angle)];
}

function wedge(from: number, to: number, r = R): string {
  const [x1, y1] = polar(r, Math.max(0, from));
  const [x2, y2] = polar(r, Math.min(100, to));
  return `M${CX} ${CY} L${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

export interface DialMarker {
  key: string;
  value: number;
  color: string;
}

export function Dial({
  card,
  target = null,
  needle = null,
  markers = [],
  onChange,
  className = "",
}: {
  card: DialCard | null;
  target?: number | null;
  needle?: number | null;
  markers?: DialMarker[];
  onChange?(value: number): void;
  className?: string;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const valueAt = (e: PointerEvent<SVGSVGElement>) => {
    const rect = svg.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 200;
    const y = ((e.clientY - rect.top) / rect.height) * 112;
    let angle = Math.atan2(CY - y, x - CX);
    if (angle < 0) angle = x < CX ? Math.PI : 0;
    return Math.round(Math.min(100, Math.max(0, (1 - angle / Math.PI) * 100)));
  };

  const live = onChange
    ? {
        onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          onChange(valueAt(e));
        },
        onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
          if (dragging.current) onChange(valueAt(e));
        },
        onPointerUp: () => {
          dragging.current = false;
        },
        onPointerCancel: () => {
          dragging.current = false;
        },
      }
    : {};

  return (
    <div className={`dial ${onChange ? "is-live" : ""} ${className}`}>
      <svg ref={svg} viewBox="0 0 200 112" role="img" aria-label={card ? `Dial from ${card.left} to ${card.right}` : "Dial"} {...live}>
        <defs>
          <linearGradient id="dial-face" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" style={{ stopColor: "#3FB7FF" }} />
            <stop offset="0.5" style={{ stopColor: "#FFF6E3" }} />
            <stop offset="1" style={{ stopColor: "#FF4FA3" }} />
          </linearGradient>
        </defs>
        <path d={wedge(0, 100)} fill="url(#dial-face)" stroke="#1B1033" strokeWidth="3" strokeLinejoin="round" />
        {target !== null &&
          [...DIAL_BANDS].reverse().map((band) => <path key={band.within} className={`dial-band dial-band-${band.points}`} d={wedge(target - band.within, target + band.within)} />)}
        {target !== null &&
          DIAL_BANDS.map((band, i) => {
            const offsets = i === 0 ? [0] : [-(band.within + DIAL_BANDS[i - 1]!.within) / 2, (band.within + DIAL_BANDS[i - 1]!.within) / 2];
            return offsets
              .map((o) => target + o)
              .filter((v) => v >= 1 && v <= 99)
              .map((v) => {
                const [x, y] = polar(R - 11, v);
                return (
                  <text key={`${band.points}-${v}`} className="dial-band-label" x={x} y={y} textAnchor="middle" dominantBaseline="middle">
                    {band.points}
                  </text>
                );
              });
          })}
        {markers.map((m) => {
          const [x, y] = polar(R - 3, m.value);
          return (
            <g key={m.key} className="dial-marker">
              <line x1={CX} y1={CY} x2={x} y2={y} stroke={m.color} strokeWidth="2.6" strokeLinecap="round" />
              <circle cx={x} cy={y} r="6.5" fill={m.color} stroke="#1B1033" strokeWidth="2" />
            </g>
          );
        })}
        {needle !== null &&
          (() => {
            const [x, y] = polar(R - 6, needle);
            return <line className="dial-needle" x1={CX} y1={CY} x2={x} y2={y} />;
          })()}
        <circle cx={CX} cy={CY} r="9" fill="#1B1033" />
      </svg>
      {card && (
        <div className="dial-labels">
          <span className="dial-label is-left">← {card.left}</span>
          <span className="dial-label is-right">{card.right} →</span>
        </div>
      )}
    </div>
  );
}
