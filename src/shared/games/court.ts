// Character Court — one player stands trial for a ridiculous crime. Two others
// are drafted as the prosecution and the defense and write their best
// argument; everyone else is the jury. Lawyers score for every juror they win
// over; an acquitted defendant walks away with a bonus, a guilty one gets a
// silly sentence read out by Telly.

export const CC_ARGUMENT_MAX = 110;
/** A lawyer, per juror who sided with them. */
export const CC_VOTE_POINTS = 100;
export const CC_ACQUITTAL_POINTS = 100;

export type CcPhase = "intro" | "charge" | "trial" | "verdict" | "standings" | "podium";
export type CcVerdict = "guilty" | "innocent";

export interface CcScoreLine { playerId: string; score: number; gained: number }

export interface CcTv {
  phase: CcPhase;
  round: number;
  totalRounds: number;
  defendantId: string | null;
  prosecutorId: string | null;
  defenderId: string | null;
  crime: string | null;
  /** Shown from the trial on. */
  prosecution: string | null;
  defense: string | null;
  doneIds: string[];
  activeIds: string[];
  votes: Record<string, CcVerdict> | null;
  verdict: CcVerdict | null;
  sentence: string | null;
  scores: CcScoreLine[];
}

export interface CcPlayer {
  phase: CcPhase;
  round: number;
  totalRounds: number;
  role: "defendant" | "prosecutor" | "defender" | "juror" | null;
  defendantId: string | null;
  crime: string | null;
  myArgument: string | null;
  prosecution: string | null;
  defense: string | null;
  myVote: CcVerdict | null;
  verdict: CcVerdict | null;
  score: number;
  gained: number;
  rank: number;
}

export type CcInput = { type: "argue"; text: string } | { type: "vote"; verdict: CcVerdict };
