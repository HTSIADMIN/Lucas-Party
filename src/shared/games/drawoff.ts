// Draw Off — everyone draws the SAME weird prompt at the same time, then the
// whole gallery goes up on the TV and the room votes for its favourite (not
// your own). Votes are points; the crowd favourite gets a bonus.

import type { DrawStroke } from "../drawing";

export const DO_VOTE_POINTS = 100;
export const DO_FAVOURITE_BONUS = 100;

export type DoPhase = "intro" | "draw" | "gallery" | "reveal" | "standings" | "podium";

export interface DoEntry {
  /** Gallery number (1-based) — matches the phone's vote buttons. */
  number: number;
  playerId: string;
  strokes: DrawStroke[];
  votes: number | null;
}

export interface DoScoreLine { playerId: string; score: number; gained: number }

export interface DoTv {
  phase: DoPhase;
  round: number;
  totalRounds: number;
  prompt: string | null;
  doneIds: string[];
  activeIds: string[];
  /** The gallery, from the gallery phase on (artists hidden until the reveal). */
  entries: DoEntry[];
  showArtists: boolean;
  scores: DoScoreLine[];
}

export interface DoPlayer {
  phase: DoPhase;
  round: number;
  totalRounds: number;
  prompt: string | null;
  submitted: boolean;
  /** Gallery numbers you can vote for (everyone's but yours). */
  choices: number[];
  myNumber: number | null;
  myVote: number | null;
  score: number;
  gained: number;
  rank: number;
}

export type DoInput = { type: "drawing"; strokes: DrawStroke[] } | { type: "vote"; number: number };
