// Scribble Chain — everyone starts a chain with a silly sentence. Chains pass
// around the room: draw the sentence you're handed, then describe the drawing
// you're handed, and so on. At the end each chain replays on the TV and the
// room votes for its best moment.

import type { DrawStroke } from "../drawing";

export const SC_TEXT_MAX = 60;
export const SC_VOTE_POINTS = 100;

export type ScPhase = "intro" | "write" | "draw" | "describe" | "reveal" | "vote" | "standings" | "podium";
export type ScTask = "write" | "draw" | "describe";

export type ScEntry =
  | { kind: "text"; authorId: string; text: string }
  | { kind: "drawing"; authorId: string; strokes: DrawStroke[] };

/** A phone-sized label for voting while the TV shows the real thing. */
export interface ScEntryLabel { index: number; kind: ScEntry["kind"]; authorId: string; text: string | null }

export interface ScScoreLine { playerId: string; score: number; gained: number }

export interface ScTv {
  phase: ScPhase;
  /** 0 = writing the first sentence. */
  step: number;
  totalSteps: number;
  chainIndex: number;
  totalChains: number;
  doneIds: string[];
  activeIds: string[];
  chainOwnerId: string | null;
  /** The chain being replayed (reveal and vote). */
  entries: ScEntry[];
  /** Votes per entry, shown once voting closes. */
  voteCounts: number[] | null;
  scores: ScScoreLine[];
}

export interface ScPlayer {
  phase: ScPhase;
  step: number;
  totalSteps: number;
  task: ScTask | null;
  /** A ready-made opener for the "Surprise me" button. */
  suggestion: string | null;
  /** The sentence to draw. */
  prompt: string | null;
  /** The drawing to describe. */
  drawing: DrawStroke[] | null;
  submitted: boolean;
  chainIndex: number;
  totalChains: number;
  labels: ScEntryLabel[];
  myVote: number | null;
  score: number;
  gained: number;
  rank: number;
}

export type ScInput = { type: "text"; text: string } | { type: "drawing"; strokes: DrawStroke[] } | { type: "vote"; index: number };
