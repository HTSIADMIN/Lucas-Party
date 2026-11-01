// Telly Trivia — multiple-choice general knowledge with a speed bonus. Answer
// on your phone; the faster you lock in a right answer, the more it's worth.
// The last question counts double.

export const QZ_BASE_POINTS = 100;
/** Extra points for answering instantly, sliding to zero at the buzzer. */
export const QZ_SPEED_POINTS = 100;

export type QzPhase = "intro" | "question" | "reveal" | "standings" | "podium";

export interface QzQuestion {
  category: string;
  text: string;
  options: string[];
}

export interface QzAnswerLine { playerId: string; choice: number; correct: boolean; points: number }

export interface QzScoreLine { playerId: string; score: number; gained: number }

export interface QzTv {
  phase: QzPhase;
  round: number;
  totalRounds: number;
  final: boolean;
  question: QzQuestion | null;
  doneIds: string[];
  /** From the reveal on. */
  answer: number | null;
  answers: QzAnswerLine[];
  scores: QzScoreLine[];
}

export interface QzPlayer {
  phase: QzPhase;
  round: number;
  totalRounds: number;
  final: boolean;
  question: QzQuestion | null;
  myChoice: number | null;
  answer: number | null;
  score: number;
  gained: number;
  rank: number;
}

export type QzInput = { type: "answer"; choice: number };
