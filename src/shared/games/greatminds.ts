// Great Minds — think like the herd. Everyone answers the same simple question;
// the biggest group of matching answers scores. A lone odd answer earns the
// Dunce Cap, which costs points if you're still wearing it at the end. The host
// can merge answers that mean the same thing ("soda" + "pop") during the reveal.

export const GM_ANSWER_MAX = 30;
export const GM_HERD_POINTS = 100;
/** Each member of a tied biggest group. */
export const GM_TIED_HERD_POINTS = 50;
export const GM_DUNCE_PENALTY = 150;

export type GmPhase = "intro" | "answer" | "reveal" | "standings" | "podium";

export interface GmGroup {
  /** Stable id used for merges. */
  key: string;
  /** The most common spelling in the group. */
  text: string;
  playerIds: string[];
  /** This group is (part of) the herd and scores this round. */
  herd: boolean;
}

export interface GmScoreLine { playerId: string; score: number; gained: number }

export interface GmTv {
  phase: GmPhase;
  round: number;
  totalRounds: number;
  question: string | null;
  answeredIds: string[];
  /** Revealed from the reveal phase on; biggest first. */
  groups: GmGroup[];
  noAnswerIds: string[];
  /** Points each herd member gets this round (100, 50 on a tie, 0 if nobody matched). */
  herdPoints: number;
  dunceId: string | null;
  /** The cap just changed heads this round. */
  dunceMoved: boolean;
  scores: GmScoreLine[];
}

export interface GmPlayer {
  phase: GmPhase;
  round: number;
  totalRounds: number;
  question: string | null;
  myAnswer: string | null;
  groups: GmGroup[];
  inHerd: boolean;
  /** How many other players gave my answer. */
  matchCount: number;
  hasDunce: boolean;
  /** Host only, during the reveal. */
  canMerge: boolean;
  score: number;
  gained: number;
  rank: number;
}

export type GmInput = { type: "answer"; text: string } | { type: "merge"; keys: string[] };
