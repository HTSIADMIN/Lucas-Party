// Dial It In — one player (the psychic) sees a secret spot on a spectrum like
// Cold ↔ Hot and gives a one-line clue; everyone else turns the dial on their
// phone to find it. Closer guesses score more, and the psychic earns the
// average of everyone's points, so a great clue pays twice.

export const DIAL_CLUE_MAX = 40;

/** Distance bands on the 0–100 dial and what each pays. */
export const DIAL_BANDS = [
  { within: 3, points: 100, label: "Bullseye!" },
  { within: 8, points: 60, label: "So close!" },
  { within: 14, points: 30, label: "Warm" },
] as const;

export function dialPoints(guess: number, target: number): number {
  const distance = Math.abs(guess - target);
  for (const band of DIAL_BANDS) if (distance <= band.within) return band.points;
  return 0;
}

export type DialPhase = "intro" | "clue" | "guess" | "reveal" | "standings" | "podium";

export interface DialCard { left: string; right: string }

export interface DialGuess { playerId: string; value: number; points: number }

export interface DialScoreLine { playerId: string; score: number; gained: number }

export interface DialTv {
  phase: DialPhase;
  round: number;
  totalRounds: number;
  psychicId: string | null;
  card: DialCard | null;
  clue: string | null;
  guesserIds: string[];
  lockedIds: string[];
  /** From the reveal on. */
  target: number | null;
  guesses: DialGuess[];
  psychicPoints: number;
  /** The psychic never gave a clue, so the round didn't count. */
  skipped: boolean;
  scores: DialScoreLine[];
}

export interface DialPlayer {
  phase: DialPhase;
  round: number;
  totalRounds: number;
  isPsychic: boolean;
  psychicId: string | null;
  card: DialCard | null;
  clue: string | null;
  /** The psychic sees it all round; everyone else from the reveal on. */
  target: number | null;
  myGuess: number | null;
  myPoints: number | null;
  psychicPoints: number;
  skipped: boolean;
  score: number;
  gained: number;
  rank: number;
}

export type DialInput = { type: "clue"; text: string } | { type: "guess"; value: number };
