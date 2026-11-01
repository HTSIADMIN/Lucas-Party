// The colour grid, shared by the TV and the phones. Every cell's colour comes
// from shadeColor(), so all screens paint the same shades. Pass `onSelect` to
// turn it into a picker: tap, or drag a finger across it, or use arrow keys.

import { memo, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import {
  CHARACTERS,
  SHADE_CELLS,
  SHADE_COLS,
  SHADE_FRAME_REACH,
  SHADE_ROWS,
  shadeCell,
  shadeCol,
  shadeColLabel,
  shadeColor,
  shadeDistance,
  shadeLabel,
  shadeRow,
  type PlayerPublic,
  type RoomView,
  type ShadePick,
} from "@party/shared";

export interface ShadeMarker {
  key: string;
  cell: number;
  color: string;
  label: string;
  /** Pop-in delay, so a batch of markers lands one after another. */
  delayMs?: number;
}

const COL_LABELS = Array.from({ length: SHADE_COLS }, (_, c) => shadeColLabel(c));
const ROW_LABELS = Array.from({ length: SHADE_ROWS }, (_, r) => String(r + 1));
const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

/** Moves a selection by whole cells, stopping at the edges. Starts mid-board when nothing's picked. */
export function nudgeCell(cell: number | null, dc: number, dr: number): number {
  if (cell === null) return shadeCell(Math.floor(SHADE_COLS / 2), Math.floor(SHADE_ROWS / 2));
  const col = Math.min(SHADE_COLS - 1, Math.max(0, shadeCol(cell) + dc));
  const row = Math.min(SHADE_ROWS - 1, Math.max(0, shadeRow(cell) + dr));
  return shadeCell(col, row);
}

/** Short marker labels: one letter where it's unique, two where first letters clash. */
export function initialsFor(players: PlayerPublic[]): Map<string, string> {
  const letters = (name: string) => Array.from(name.trim());
  const first = (name: string) => (letters(name)[0] ?? "?").toUpperCase();
  const counts = new Map<string, number>();
  for (const p of players) counts.set(first(p.name), (counts.get(first(p.name)) ?? 0) + 1);
  return new Map(
    players.map((p) => {
      const one = first(p.name);
      if ((counts.get(one) ?? 0) < 2) return [p.id, one];
      const words = p.name.trim().split(/\s+/);
      const second = words.length > 1 ? (letters(words[1]!)[0] ?? "").toUpperCase() : (letters(p.name)[1] ?? "").toLowerCase();
      return [p.id, one + second];
    }),
  );
}

/** Board markers for picks: the player's colour and initials, one batch popping in at a time. */
export function pickMarkers(picks: ShadePick[], room: RoomView): ShadeMarker[] {
  const initials = initialsFor(room.players);
  const seen = { 1: 0, 2: 0 };
  return picks.map((pick) => {
    const player = room.players.find((p) => p.id === pick.playerId);
    return {
      key: `${pick.playerId}-${pick.step}`,
      cell: pick.cell,
      color: player ? CHARACTERS[player.character].color : "var(--surface-3)",
      label: initials.get(pick.playerId) ?? "?",
      delayMs: seen[pick.step]++ * 90,
    };
  });
}

/** Position of a point inside the cell area, in cell units from the top-left corner. */
function at(x: number, y: number): CSSProperties {
  return { left: `${(x / SHADE_COLS) * 100}%`, top: `${(y / SHADE_ROWS) * 100}%` };
}

/** The block of cells within `reach` of the target, clipped to the board. */
function frameStyle(target: number, reach: number): CSSProperties {
  const c0 = Math.max(0, shadeCol(target) - reach);
  const c1 = Math.min(SHADE_COLS - 1, shadeCol(target) + reach);
  const r0 = Math.max(0, shadeRow(target) - reach);
  const r1 = Math.min(SHADE_ROWS - 1, shadeRow(target) + reach);
  return { ...at(c0, r0), width: `${((c1 - c0 + 1) / SHADE_COLS) * 100}%`, height: `${((r1 - r0 + 1) / SHADE_ROWS) * 100}%` };
}

/** Markers sharing a cell fan out (offsets in cells) and shrink, so each stays visible. */
function spread(count: number, index: number): { dx: number; dy: number; scale: number } {
  if (count <= 1) return { dx: 0, dy: 0, scale: 1 };
  if (count === 2) return { dx: index === 0 ? -0.2 : 0.2, dy: 0, scale: 0.78 };
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  const radius = count <= 4 ? 0.22 : 0.27;
  return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius, scale: count <= 4 ? 0.66 : 0.52 };
}

/** The 180 swatches. Memoised — they only change when the target or spotlight does. */
const Cells = memo(function Cells({ target, spotlight }: { target: number | null; spotlight: boolean }) {
  return (
    <>
      {Array.from({ length: SHADE_CELLS }, (_, cell) => {
        const far = spotlight && target !== null && shadeDistance(cell, target) > SHADE_FRAME_REACH;
        return <span key={cell} className={`shade-cell ${far ? "is-far" : ""} ${cell === target ? "is-target" : ""}`} style={{ background: shadeColor(cell) }} />;
      })}
    </>
  );
});

function RowLabels({ side, activeRow }: { side: "left" | "right"; activeRow: number }) {
  return (
    <div className={`shade-rows is-${side}`} aria-hidden="true">
      {ROW_LABELS.map((label, r) => (
        <span key={label} className={r === activeRow ? "is-on" : ""}>
          {label}
        </span>
      ))}
    </div>
  );
}

export function ColorGrid({
  size,
  target = null,
  spotlight = false,
  markers = [],
  selected = null,
  onSelect,
  className = "",
}: {
  size: "tv" | "phone";
  /** Outlined and lifted off the board. */
  target?: number | null;
  /** Frame the scoring area around the target and dim everything else. */
  spotlight?: boolean;
  markers?: ShadeMarker[];
  selected?: number | null;
  onSelect?(cell: number): void;
  className?: string;
}) {
  const area = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const cellAt = (e: PointerEvent<HTMLDivElement>) => {
    const rect = area.current!.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * SHADE_COLS);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * SHADE_ROWS);
    return shadeCell(Math.min(SHADE_COLS - 1, Math.max(0, col)), Math.min(SHADE_ROWS - 1, Math.max(0, row)));
  };
  const choose = (cell: number) => {
    if (cell !== selected) onSelect?.(cell);
  };

  const live = onSelect
    ? {
        tabIndex: 0,
        role: "group",
        "aria-label": `Colour grid${selected !== null ? `, ${shadeLabel(selected)} selected` : ""}. Tap or drag to choose a shade; arrow keys nudge.`,
        onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          choose(cellAt(e));
        },
        onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
          if (dragging.current) choose(cellAt(e));
        },
        onPointerUp: () => {
          dragging.current = false;
        },
        onPointerCancel: () => {
          dragging.current = false;
        },
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          const move = ARROWS[e.key];
          if (!move) return;
          e.preventDefault();
          choose(nudgeCell(selected, move[0], move[1]));
        },
      }
    : { role: "img", "aria-label": "Colour grid" };

  // Markers on the same cell fan out around it.
  const byCell = new Map<number, ShadeMarker[]>();
  for (const m of markers) byCell.set(m.cell, [...(byCell.get(m.cell) ?? []), m]);
  const activeCol = selected !== null ? shadeCol(selected) : -1;
  const activeRow = selected !== null ? shadeRow(selected) : -1;

  return (
    <div className={`shade-board is-${size} ${className}`}>
      <div className="shade-cols" aria-hidden="true">
        {COL_LABELS.map((label, c) => (
          <span key={label} className={c === activeCol ? "is-on" : ""}>
            {label}
          </span>
        ))}
      </div>
      <RowLabels side="left" activeRow={activeRow} />
      <div ref={area} className={`shade-area ${onSelect ? "is-live" : ""}`} {...live}>
        <Cells target={target} spotlight={spotlight} />
        <div className="shade-overlay" aria-hidden="true">
          {spotlight && target !== null && (
            <>
              <span className="shade-frame" style={frameStyle(target, SHADE_FRAME_REACH)} />
              <span className="shade-frame is-inner" style={frameStyle(target, 1)} />
            </>
          )}
          {markers.map((m) => {
            const group = byCell.get(m.cell) ?? [m];
            const { dx, dy, scale } = spread(group.length, group.indexOf(m));
            const style = {
              ...at(shadeCol(m.cell) + 0.5 + dx, shadeRow(m.cell) + 0.5 + dy),
              "--mark-color": m.color,
              "--mark-scale": scale,
              animationDelay: m.delayMs ? `${m.delayMs}ms` : undefined,
            } as CSSProperties;
            return (
              <span key={m.key} className="shade-mark" style={style}>
                <b>{m.label}</b>
              </span>
            );
          })}
          {selected !== null && <span key={selected} className="shade-select" style={{ ...at(activeCol + 0.5, activeRow + 0.5), background: shadeColor(selected) }} />}
        </div>
      </div>
      {size === "tv" && <RowLabels side="right" activeRow={activeRow} />}
    </div>
  );
}

/** A single shade, big, with its coordinates. `cell: null` draws an empty slot. */
export function ShadeSwatch({ cell, size, caption, className = "" }: { cell: number | null; size: "md" | "lg" | "tv"; caption?: ReactNode; className?: string }) {
  return (
    <div className={`shade-swatch is-${size} ${className}`}>
      <div className={`shade-swatch-box ${cell === null ? "is-empty" : ""}`} style={cell !== null ? { background: shadeColor(cell) } : undefined}>
        <span className="shade-swatch-tag">{cell !== null ? shadeLabel(cell) : "?"}</span>
      </div>
      {caption && <span className="shade-swatch-caption">{caption}</span>}
    </div>
  );
}
