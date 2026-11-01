// Phone drawings, shared by every drawing game. A drawing is a list of strokes
// in a 0–1000 square: small enough to send over Realtime in one message and
// crisp at any size on the TV (it renders as SVG).

export const DRAW_SIZE = 1000;
/** Ink, cherry, sky, mint, sun, grape, then white (the eraser). */
export const DRAW_COLORS = ["#1B1033", "#FF4D5E", "#3FB7FF", "#2FDB9A", "#FFC93C", "#9B6BFF", "#FFFFFF"] as const;
export const DRAW_WIDTHS = [8, 22] as const;
export const DRAW_MAX_POINTS = 2400;
export const DRAW_MAX_STROKES = 300;

export interface DrawStroke {
  /** Index into DRAW_COLORS. */
  c: number;
  /** Index into DRAW_WIDTHS. */
  w: number;
  /** Flat x,y pairs, integers in 0–1000. */
  p: number[];
}

/** Validates a drawing from a phone. Returns null if it isn't one; trims anything over the limits. */
export function sanitizeDrawing(raw: unknown): DrawStroke[] | null {
  if (!Array.isArray(raw)) return null;
  const out: DrawStroke[] = [];
  let points = 0;
  for (const item of raw.slice(0, DRAW_MAX_STROKES)) {
    if (typeof item !== "object" || item === null) return null;
    const { c, w, p } = item as Record<string, unknown>;
    if (!Number.isInteger(c) || (c as number) < 0 || (c as number) >= DRAW_COLORS.length) return null;
    if (!Number.isInteger(w) || (w as number) < 0 || (w as number) >= DRAW_WIDTHS.length) return null;
    if (!Array.isArray(p) || p.length < 2 || p.length % 2 !== 0) return null;
    const room = (DRAW_MAX_POINTS - points) * 2;
    if (room <= 0) break;
    const coords = p.slice(0, room).map((v) => Math.round(Math.min(DRAW_SIZE, Math.max(0, Number(v)))));
    if (coords.some((v) => !Number.isFinite(v))) return null;
    out.push({ c: c as number, w: w as number, p: coords });
    points += coords.length / 2;
  }
  return out;
}

export function drawingPoints(strokes: readonly DrawStroke[]): number {
  return strokes.reduce((sum, s) => sum + s.p.length / 2, 0);
}
