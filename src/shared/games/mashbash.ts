// Mash Bash — a race across a board on the TV where every round is a quick
// phone minigame. Finish places move you forward; boost and slip spaces shake
// things up. First across the finish line (or furthest after the last round)
// wins. Every minigame is timed on the phones themselves, so lag can't decide it.

export type MbGame = "tap" | "draw" | "clock" | "unique" | "memory";

export type MbPhase = "intro" | "ready" | "steady" | "draw" | "show" | "play" | "result" | "board" | "podium";

export const MB_FINISH = 30;
/** Spaces moved by finishing place (1st, 2nd, 3rd…); everyone else moves the last value. */
export const MB_MOVES = [5, 4, 3, 2] as const;
export const MB_NO_SHOW_MOVE = 1;
export const MB_BOOSTS: readonly number[] = [4, 11, 19, 26];
export const MB_SLIPS: readonly number[] = [8, 15, 23];
export const MB_SPACE_EFFECT = 3;
export const MB_TAP_MS = 5000;
export const MB_MEMORY_PADS = 4;
export const MB_UNIQUE_MAX = 8;
export const MB_CLOCK_VISIBLE_MS = 3000;
export const MB_MIN_REACTION_MS = 90;

export const MB_GAME_INFO: Record<MbGame, { name: string; howTo: string }> = {
  tap: { name: "Tap Race", howTo: "Mash the button as fast as you can for 5 seconds!" },
  draw: { name: "Quick Draw", howTo: "Watch your phone. Tap the instant it says DRAW — not before!" },
  clock: { name: "Stop the Clock", howTo: "Stop the clock at the target. It vanishes after 3 seconds…" },
  unique: { name: "Lowest Unique", howTo: "Pick a number from 1 to 8. The lowest number nobody else picked wins." },
  memory: { name: "Memory Flash", howTo: "Watch the pads light up on the TV, then repeat the pattern on your phone." },
};

export interface MbResultLine {
  playerId: string;
  /** Human-readable score for this minigame ("42 taps", "231 ms", "3"…). */
  label: string;
  place: number | null;
  move: number;
}

export interface MbMoveEvent { playerId: string; kind: "boost" | "slip"; from: number; to: number }

export interface MbScoreLine { playerId: string; score: number; gained: number }

export interface MbTv {
  phase: MbPhase;
  round: number;
  totalRounds: number;
  game: MbGame;
  /** Stop the Clock target in ms. */
  target: number | null;
  /** Memory Flash pattern (pad indexes), only while it's being shown. */
  sequence: number[] | null;
  /** Room time the current minigame window started (for the TV clock display). */
  startedAt: number | null;
  doneIds: string[];
  results: MbResultLine[];
  positions: Record<string, number>;
  events: MbMoveEvent[];
  scores: MbScoreLine[];
}

export interface MbPlayer {
  phase: MbPhase;
  round: number;
  totalRounds: number;
  game: MbGame;
  target: number | null;
  /** How long the memory pattern is (players must repeat it from memory). */
  sequenceLength: number;
  done: boolean;
  mine: MbResultLine | null;
  position: number;
  score: number;
  gained: number;
  rank: number;
}

export type MbInput =
  | { type: "taps"; count: number }
  | { type: "early" }
  | { type: "shot"; ms: number }
  | { type: "stop"; ms: number }
  | { type: "pick"; value: number }
  | { type: "memory"; pads: number[]; ms: number };
