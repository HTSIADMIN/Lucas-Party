// Crowd Pleaser — an either/or poll ("Cats or dogs?"). Everyone secretly picks
// a side AND predicts how many of the room picked the first option. The data
// is your own friends, so no answer bank is needed: read the room to score.

/** Points for predicting the split exactly, off by one, off by two. */
export const CP_POINTS = [100, 50, 20] as const;
/** Bonus for being the only one who picked a side. */
export const CP_LONE_WOLF_BONUS = 50;

export type CpPhase = "intro" | "answer" | "reveal" | "standings" | "podium";

export interface CpQuestion { text: string; a: string; b: string }

export interface CpAnswer { playerId: string; choice: "a" | "b"; guess: number; points: number }

export interface CpScoreLine { playerId: string; score: number; gained: number }

export interface CpTv {
  phase: CpPhase;
  round: number;
  totalRounds: number;
  question: CpQuestion | null;
  /** How many players are answering (the range for predictions). */
  voters: number;
  doneIds: string[];
  /** From the reveal on. */
  countA: number | null;
  answers: CpAnswer[];
  scores: CpScoreLine[];
}

export interface CpPlayer {
  phase: CpPhase;
  round: number;
  totalRounds: number;
  question: CpQuestion | null;
  voters: number;
  myChoice: "a" | "b" | null;
  myGuess: number | null;
  countA: number | null;
  score: number;
  gained: number;
  rank: number;
}

export type CpInput = { type: "answer"; choice: "a" | "b"; guess: number };
