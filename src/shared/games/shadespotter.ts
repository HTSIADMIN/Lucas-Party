// Shade Spotter — a giant grid of colours fills the TV. Each round one player,
// the cue-giver, sees a secret shade and describes it in one word; everyone
// else taps the cell they think it is. Then a two-word cue steers a second
// pick. Picks pay by how close they land, and the cue-giver scores for every
// pick that lands right next to the target.
//
// The grid is a pure function of the cell index, so the TV and every phone
// paint exactly the same 180 colours without sending any of them over the wire.

export const SHADE_COLS = 18;
export const SHADE_ROWS = 10;
export const SHADE_CELLS = SHADE_COLS * SHADE_ROWS;

// ── Cells ────────────────────────────────────────────────────────────────
// A cell is an index, row-major from the top-left: row * SHADE_COLS + col.
// Players talk about cells as a column letter (A–R) and row number (1–10).

export function shadeCol(cell: number): number {
  return cell % SHADE_COLS;
}

export function shadeRow(cell: number): number {
  return Math.floor(cell / SHADE_COLS);
}

export function shadeCell(col: number, row: number): number {
  return row * SHADE_COLS + col;
}

export function isShadeCell(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < SHADE_CELLS;
}

export function shadeColLabel(col: number): string {
  return String.fromCharCode(65 + col);
}

/** "F4" — column letter, then row number. */
export function shadeLabel(cell: number): string {
  return `${shadeColLabel(shadeCol(cell))}${shadeRow(cell) + 1}`;
}

/** Steps between two cells, diagonals included (Chebyshev distance). */
export function shadeDistance(a: number, b: number): number {
  return Math.max(Math.abs(shadeCol(a) - shadeCol(b)), Math.abs(shadeRow(a) - shadeRow(b)));
}

// ── Scoring ──────────────────────────────────────────────────────────────

/** What a pick pays by its distance from the target. */
export const SHADE_BANDS = [
  { within: 0, points: 100, label: "Bullseye!" },
  { within: 1, points: 60, label: "So close!" },
  { within: 2, points: 30, label: "Warm" },
] as const;

/** The widest band — the scoring frame on the reveal is (2·reach + 1) cells square. */
export const SHADE_FRAME_REACH = 2;

/** The cue-giver earns this for every pick within SHADE_CUE_GIVER_RANGE of the target… */
export const SHADE_CUE_GIVER_POINTS = 20;
export const SHADE_CUE_GIVER_RANGE = 1;
/** …up to this much per round. */
export const SHADE_CUE_GIVER_CAP = 300;

export function shadePoints(pick: number, target: number): number {
  const distance = shadeDistance(pick, target);
  for (const band of SHADE_BANDS) if (distance <= band.within) return band.points;
  return 0;
}

export function shadeBandLabel(points: number): string {
  return SHADE_BANDS.find((b) => b.points === points)?.label ?? "Missed";
}

/** The cue-giver's round score for this many picks landing in range. */
export function shadeCueGiverPoints(closePicks: number): number {
  return Math.min(SHADE_CUE_GIVER_CAP, closePicks * SHADE_CUE_GIVER_POINTS);
}

// ── Cues ─────────────────────────────────────────────────────────────────

/** Step 1 is a one-word cue, step 2 a cue of up to two words. */
export type ShadeStep = 1 | 2;

/** Longest single word in a cue. */
export const SHADE_WORD_MAX = 20;
/** Input length per step: one word, then two words and a space. */
export const SHADE_CUE_MAX: Record<ShadeStep, number> = { 1: SHADE_WORD_MAX, 2: SHADE_WORD_MAX * 2 + 1 };

const COORD_RE = /^(?:[a-r](?:10|[1-9])|(?:10|[1-9])[a-r])$/i;
const SEPARATOR_RE = /[^\p{L}\p{N}]+/gu;

/**
 * Why a cue can't be used, or null when it's fine. Expects text that already
 * went through cleanText(). Phones call it too, to explain before sending.
 */
export function shadeCueProblem(cue: string, step: ShadeStep): string | null {
  const words = cue.split(" ").filter(Boolean);
  if (words.length === 0) return "Type a cue first.";
  if (words.length > step) return step === 1 ? "One word only!" : "Two words at most!";
  if (words.some((w) => Array.from(w).length > SHADE_WORD_MAX)) return `Words can be ${SHADE_WORD_MAX} letters at most.`;
  // "F4", "4f", "F-4", "f 4"… pointing at the grid isn't describing the colour.
  const tokens = [...cue.split(SEPARATOR_RE), cue.replace(SEPARATOR_RE, "")];
  if (tokens.some((t) => COORD_RE.test(t))) return "No coordinates — describe the colour!";
  return null;
}

// ── Views ────────────────────────────────────────────────────────────────

export type ShadePhase = "intro" | "cue1" | "guess1" | "cue2" | "guess2" | "reveal" | "standings" | "podium";

export interface ShadePick {
  playerId: string;
  step: ShadeStep;
  cell: number;
  /** What the pick scored; 0 until the reveal. */
  points: number;
}

export interface ShadeScoreLine { playerId: string; score: number; gained: number }

export interface ShadeTv {
  phase: ShadePhase;
  round: number;
  totalRounds: number;
  cueGiverId: string | null;
  /** The cues given so far this round: the one-word cue, then the two-word cue. */
  cues: string[];
  guesserIds: string[];
  /** Guessers who've locked in a pick for the current step. */
  lockedIds: string[];
  /** Picks the room may see: first picks while the second cue is under way, every pick at the reveal. */
  picks: ShadePick[];
  /** From the reveal on. */
  target: number | null;
  cueGiverPoints: number;
  /** The cue-giver never gave a first cue, so the round didn't count. */
  skipped: boolean;
  /** The cue-giver never gave a second cue, so only first picks counted. */
  noSecondCue: boolean;
  scores: ShadeScoreLine[];
}

export interface ShadePlayer {
  phase: ShadePhase;
  round: number;
  totalRounds: number;
  isCueGiver: boolean;
  cueGiverId: string | null;
  cues: string[];
  /** The cue-giver sees it all round; everyone else from the reveal on. */
  target: number | null;
  /** My locked picks for step 1 and step 2. */
  myPicks: [number | null, number | null];
  /** I still owe a pick for the current step. */
  canPick: boolean;
  /** The same public picks the TV shows. */
  picks: ShadePick[];
  guesserIds: string[];
  lockedIds: string[];
  /** At the reveal: my points this round (a guesser's picks, or the cue-giver's bonus). */
  myPoints: number | null;
  cueGiverPoints: number;
  skipped: boolean;
  noSecondCue: boolean;
  score: number;
  gained: number;
  rank: number;
}

export type ShadeInput = { type: "cue"; text: string } | { type: "pick"; cell: number };

// ── The colour grid ──────────────────────────────────────────────────────
// Built in OKLCH (perceptual lightness / chroma / hue) so equal steps look
// equal. Columns sweep the hue wheel in 20° steps starting from red. Each
// column runs from a pastel at the top, through that hue's most vivid sRGB
// colour (its "cusp"), down to a deep shade at the bottom. The cusp sits on
// a row that leans toward the hue's natural lightness — lemon peaks near the
// top, ultramarine near the bottom — so rows stay roughly even in lightness
// without losing the pure, nameable colours.

const HUE_START = 29; // OKLCH hue of a clean red
const HUE_STEP = 360 / SHADE_COLS;
const TOP = { L: 0.93, C: 0.085 };
const BOTTOM_L = 0.32;
/** Share of the most chroma the deep row could hold. */
const BOTTOM_CHROMA = 0.9;
/** Where the vivid band would sit if every hue were equally bright… */
const PEAK_ROW = 4;
/** …and how far it bends toward each hue's own lightness. */
const PEAK_FOLLOW = 0.5;
const PEAK_MIN = 2;
const PEAK_MAX = 7;

type Rgb = [number, number, number];

/** OKLab → linear-light sRGB (Björn Ottosson's reference matrices). */
function oklabToLinear(L: number, a: number, b: number): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function inGamut(rgb: Rgb): boolean {
  return rgb.every((c) => c >= -1e-7 && c <= 1 + 1e-7);
}

/** The most chroma sRGB can show at this lightness and hue (bisection). */
function maxChroma(L: number, hue: number): number {
  const cos = Math.cos(hue);
  const sin = Math.sin(hue);
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklabToLinear(L, mid * cos, mid * sin))) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Lightness and chroma of the hue's most vivid sRGB colour (ternary search). */
function cusp(hue: number): { L: number; C: number } {
  let lo = 0.2;
  let hi = 1;
  for (let i = 0; i < 28; i++) {
    const a = lo + (hi - lo) / 3;
    const b = hi - (hi - lo) / 3;
    if (maxChroma(a, hue) < maxChroma(b, hue)) lo = a;
    else hi = b;
  }
  const L = (lo + hi) / 2;
  return { L, C: maxChroma(L, hue) };
}

function toHex(rgb: Rgb): string {
  let out = "#";
  for (const c of rgb) {
    const v = Math.min(1, Math.max(0, c));
    const encoded = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
    out += Math.round(encoded * 255)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
}

function buildPalette(): string[] {
  const colors = new Array<string>(SHADE_CELLS);
  const lastRow = SHADE_ROWS - 1;
  for (let col = 0; col < SHADE_COLS; col++) {
    const hue = ((HUE_START + col * HUE_STEP) % 360) * (Math.PI / 180);
    const peak = cusp(hue);
    const deep = { L: BOTTOM_L, C: maxChroma(BOTTOM_L, hue) * BOTTOM_CHROMA };
    const natural = ((TOP.L - peak.L) / (TOP.L - BOTTOM_L)) * lastRow;
    const peakRow = Math.min(PEAK_MAX, Math.max(PEAK_MIN, Math.round(PEAK_ROW + (natural - PEAK_ROW) * PEAK_FOLLOW)));
    for (let row = 0; row < SHADE_ROWS; row++) {
      // Pastel → peak down to the peak row, then peak → deep.
      const [from, to, t] = row <= peakRow ? [TOP, peak, row / peakRow] : [peak, deep, (row - peakRow) / (lastRow - peakRow)];
      const L = from.L + (to.L - from.L) * t;
      const C = Math.min(from.C + (to.C - from.C) * t, maxChroma(L, hue));
      colors[shadeCell(col, row)] = toHex(oklabToLinear(L, C * Math.cos(hue), C * Math.sin(hue)));
    }
  }
  return colors;
}

let palette: string[] | null = null;

/** The cell's colour as #rrggbb — identical on every screen. Built once, on first use. */
export function shadeColor(cell: number): string {
  palette ??= buildPalette();
  return palette[cell] ?? "#000000";
}
