// Heist Night — co-op. Every phone holds a clue about the vault code; nobody
// has the whole picture. Talk it out, then the safecracker punches in the code
// — three tries, and each miss tells the room how many digits were in the
// right spot. Open the vault before the guards come back.

export const HEIST_ATTEMPTS = 3;
/** Everyone, per vault opened, plus a bonus per second left; misses cost. */
export const HEIST_OPEN_POINTS = 200;
export const HEIST_SECOND_POINTS = 2;
export const HEIST_MISS_PENALTY = 40;
export const HEIST_CRACKER_BONUS = 50;

export type HeistPhase = "intro" | "brief" | "crack" | "result" | "standings" | "podium";

export interface HeistAttempt { code: string; inPlace: number }

export interface HeistScoreLine { playerId: string; score: number; gained: number }

export interface HeistTv {
  phase: HeistPhase;
  round: number;
  totalRounds: number;
  digits: number;
  crackerId: string | null;
  /** Room time the guards return. */
  guardsAt: number | null;
  attempts: HeistAttempt[];
  /** Number of clues each player holds (never the clues themselves). */
  clueCounts: Record<string, number>;
  opened: boolean | null;
  code: string | null;
  scores: HeistScoreLine[];
}

export interface HeistPlayer {
  phase: HeistPhase;
  round: number;
  totalRounds: number;
  digits: number;
  crackerId: string | null;
  isCracker: boolean;
  clues: string[];
  attempts: HeistAttempt[];
  attemptsLeft: number;
  opened: boolean | null;
  code: string | null;
  score: number;
  gained: number;
  rank: number;
}

export type HeistInput = { type: "code"; code: string };
