// Odd One Out — hidden-word bluffing. Everyone but the faker sees the secret
// word from a 16-word topic grid; clues go round one at a time; then the room
// votes. A caught faker can still steal the round by guessing the word.

export const ODD_CLUE_MAX = 24;

export type OddPhase =
  | "intro"
  | "reveal"
  | "clue"
  | "discuss"
  | "vote"
  | "voteReveal"
  | "guess"
  | "result"
  | "standings"
  | "podium";

/** escaped = room accused the wrong player (or tied); caught = faker caught and guessed wrong; stolen = caught but guessed the word. */
export type OddOutcome = "escaped" | "caught" | "stolen";

export interface OddScoreLine { playerId: string; score: number; gained: number }

export interface OddTopic { name: string; words: string[] }

export interface OddTv {
  phase: OddPhase;
  round: number;
  totalRounds: number;
  topic: OddTopic | null;
  turnOrder: string[];
  currentTurnId: string | null;
  /** playerId → clue. `null` means they ran out of time. Absent = not given yet. */
  clues: Record<string, string | null>;
  doneIds: string[];
  /** voter → suspect, revealed from voteReveal on. */
  votes: Record<string, string> | null;
  accusedId: string | null;
  /** Revealed when the faker is caught (guess phase) or at the result. */
  oddId: string | null;
  secretIndex: number | null;
  guessIndex: number | null;
  outcome: OddOutcome | null;
  scores: OddScoreLine[];
}

export interface OddPlayer {
  phase: OddPhase;
  round: number;
  totalRounds: number;
  isOdd: boolean;
  topic: OddTopic | null;
  /** Null for the faker. */
  secretWord: string | null;
  currentTurnId: string | null;
  myTurn: boolean;
  clues: Record<string, string | null>;
  done: boolean;
  myVote: string | null;
  canGuess: boolean;
  guessIndex: number | null;
  accusedId: string | null;
  oddId: string | null;
  secretIndex: number | null;
  outcome: OddOutcome | null;
  score: number;
  gained: number;
  rank: number;
}

export type OddInput =
  | { type: "ready" }
  | { type: "clue"; text: string }
  | { type: "vote"; suspectId: string }
  | { type: "guess"; index: number };
