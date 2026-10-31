// Most Likely To… — everyone votes for the friend who best fits the prompt.
// You score for voting with the room; whoever the room picks takes the prompt
// home as a title, handed out in an awards ceremony at the end.

export const ML_MATCH_POINTS = 100;
/** Per matching voter when the room ties between several picks. */
export const ML_TIE_POINTS = 50;

export type MlPhase = "intro" | "vote" | "reveal" | "standings" | "awards" | "podium";

export interface MlAward { playerId: string; prompt: string; votes: number }

export interface MlScoreLine { playerId: string; score: number; gained: number }

export interface MlTv {
  phase: MlPhase;
  round: number;
  totalRounds: number;
  /** Finishes "Who's most likely to…". */
  prompt: string | null;
  votedIds: string[];
  /** voter → pick, from the reveal on. */
  votes: Record<string, string> | null;
  /** The room's pick(s) this round. Several means a tie. */
  topIds: string[];
  /** Points each voter who sided with the room earned this round. */
  points: number;
  /** Every title handed out so far (shown in the awards). */
  awards: MlAward[];
  scores: MlScoreLine[];
}

export interface MlPlayer {
  phase: MlPhase;
  round: number;
  totalRounds: number;
  prompt: string | null;
  myVote: string | null;
  topIds: string[];
  votesForMe: number;
  matched: boolean;
  myAwards: string[];
  score: number;
  gained: number;
  rank: number;
}

export type MlInput = { type: "vote"; targetId: string };
