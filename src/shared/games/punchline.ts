// Punchline Panic — view + input types shared by server and clients.
//
// Rounds 1–2: every player answers two prompts; each prompt is shared by
// exactly two players and faces off on the TV while everyone else votes.
// Round 3 ("Last Laugh"): one prompt for everyone, one favourite vote each.

export const PUNCHLINE_ANSWER_MAX = 60;

export type PunchlinePhase =
  | "intro"
  | "write"
  | "vote"
  | "reveal"
  | "scores"
  | "finalIntro"
  | "finalWrite"
  | "finalVote"
  | "finalReveal"
  | "podium";

export type Side = "A" | "B";
export type MatchupOutcome = "normal" | "zinger" | "jinx" | "forfeit" | "empty";

export interface RevealSide {
  key: Side;
  authorId: string;
  text: string | null;
  panic: boolean;
  voterIds: string[];
  points: number;
  winner: boolean;
}

export interface ScoreLine { playerId: string; score: number; gained: number }

export interface FinalEntry {
  key: string;
  text: string | null;
  /** Revealed in finalReveal only. */
  authorId?: string;
  voterIds?: string[];
  points?: number;
}

export interface PunchlineTv {
  phase: PunchlinePhase;
  round: number;
  matchupNumber: number;
  matchupCount: number;
  prompt: string | null;
  options: { key: Side; text: string | null }[] | null;
  /** Players we're still waiting on in the current write/vote phase. */
  waitingOnIds: string[];
  /** Players who are done in the current write/vote phase. */
  doneIds: string[];
  reveal: { outcome: MatchupOutcome; sides: [RevealSide, RevealSide] } | null;
  final: FinalEntry[] | null;
  scores: ScoreLine[];
}

export type PunchlinePlayer =
  | { phase: "intro" | "finalIntro"; round: number }
  | { phase: "write"; prompts: { id: string; text: string; answer: string | null; panic: boolean }[] }
  | { phase: "finalWrite"; prompt: string; answer: string | null; panic: boolean }
  | {
      phase: "vote";
      matchupId: string;
      prompt: string;
      options: { key: Side; text: string | null }[];
      role: "voter" | "author" | "spectator";
      myVote: Side | null;
    }
  | { phase: "finalVote"; prompt: string; entries: { key: string; text: string | null; mine: boolean }[]; myVote: string | null }
  | { phase: "reveal" | "scores" | "finalReveal" | "podium"; score: number; rank: number; gained: number };

export type PunchlineInput =
  | { type: "answer"; promptId: string; text: string }
  | { type: "panic"; promptId: string }
  | { type: "vote"; matchupId: string; choice: Side }
  | { type: "finalAnswer"; text: string }
  | { type: "finalPanic" }
  | { type: "finalVote"; key: string };
