// Lie Detector — one player gets a yes/no question about themselves, secretly
// decides to tell the truth or lie, and answers OUT LOUD (with a story, ideally).
// Everyone else votes: truth or lie? Spot the liar to score; fool the room to
// score bigger.

export const LIE_CORRECT_POINTS = 100;
/** The speaker, per voter they fooled. */
export const LIE_FOOL_POINTS = 60;

export type LiePhase = "intro" | "choose" | "talk" | "vote" | "reveal" | "standings" | "podium";
export type LieVerdict = "truth" | "lie";

export interface LieScoreLine { playerId: string; score: number; gained: number }

export interface LieTv {
  phase: LiePhase;
  round: number;
  totalRounds: number;
  speakerId: string | null;
  question: string | null;
  doneIds: string[];
  activeIds: string[];
  /** Revealed at the end of the round. */
  verdict: LieVerdict | null;
  votes: Record<string, LieVerdict> | null;
  scores: LieScoreLine[];
}

export interface LiePlayer {
  phase: LiePhase;
  round: number;
  totalRounds: number;
  speakerId: string | null;
  isSpeaker: boolean;
  question: string | null;
  /** The speaker's own secret choice. */
  myChoice: LieVerdict | null;
  myVote: LieVerdict | null;
  verdict: LieVerdict | null;
  score: number;
  gained: number;
  rank: number;
}

export type LieInput = { type: "choose"; choice: LieVerdict } | { type: "doneTalking" } | { type: "vote"; verdict: LieVerdict };
