// Fib Factory (friends edition) — each round one player is in the spotlight
// and secretly answers a question about themselves. Everyone else writes a
// lie that sounds like them; then the room hunts for the truth. Find it, fool
// people, and be knowable enough that your friends spot you.

export const FIB_ANSWER_MAX = 50;
/** Picking the truth. */
export const FIB_TRUTH_POINTS = 100;
/** The spotlight player, per friend who found their truth. */
export const FIB_KNOWN_POINTS = 50;
/** A lie's author, per player it fooled. */
export const FIB_FOOL_POINTS = 50;

export type FibPhase = "intro" | "write" | "pick" | "reveal" | "standings" | "podium";

export interface FibOption { key: string; text: string }

export interface FibRevealOption {
  key: string;
  text: string;
  truth: boolean;
  authorIds: string[];
  pickerIds: string[];
}

export interface FibScoreLine { playerId: string; score: number; gained: number }

export interface FibTv {
  phase: FibPhase;
  round: number;
  totalRounds: number;
  subjectId: string | null;
  /** "My most useless talent is ___" */
  question: string | null;
  doneIds: string[];
  activeIds: string[];
  options: FibOption[];
  reveal: FibRevealOption[];
  /** The spotlight player never answered, so the round didn't count. */
  skipped: boolean;
  scores: FibScoreLine[];
}

export interface FibPlayer {
  phase: FibPhase;
  round: number;
  totalRounds: number;
  subjectId: string | null;
  isSubject: boolean;
  question: string | null;
  myAnswer: string | null;
  options: FibOption[];
  myPick: string | null;
  truth: string | null;
  skipped: boolean;
  score: number;
  gained: number;
  rank: number;
}

export type FibInput = { type: "answer"; text: string } | { type: "pick"; key: string };
