// Doodle Fraud — everyone draws a bizarre secret prompt on their phone. Then,
// one drawing at a time, the room writes fake titles for it and tries to pick
// the real one out of the lineup. Fool people with your lie, find the truth,
// and draw well enough that friends recognise your prompt.

import type { DrawStroke } from "../drawing";

export const DF_TITLE_MAX = 50;
/** Guesser finds the real title. */
export const DF_TRUTH_POINTS = 100;
/** The artist, per player who found the real title. */
export const DF_ARTIST_POINTS = 50;
/** A lie's author, per player it fooled. */
export const DF_FOOL_POINTS = 50;

export type DfPhase = "intro" | "draw" | "title" | "pick" | "reveal" | "standings" | "podium";

export interface DfOption { key: string; text: string }

export interface DfRevealOption {
  key: string;
  text: string;
  real: boolean;
  /** Players who wrote this lie (empty for the real title and house lies). */
  authorIds: string[];
  pickerIds: string[];
}

export interface DfScoreLine { playerId: string; score: number; gained: number }

export interface DfTv {
  phase: DfPhase;
  /** 1-based index of the drawing on show. */
  round: number;
  totalRounds: number;
  artistId: string | null;
  drawing: DrawStroke[] | null;
  /** Who's finished the current step (drawing / title / pick). */
  doneIds: string[];
  /** Who the current step is waiting on. */
  activeIds: string[];
  options: DfOption[];
  reveal: DfRevealOption[];
  realPrompt: string | null;
  scores: DfScoreLine[];
}

export interface DfPlayer {
  phase: DfPhase;
  round: number;
  totalRounds: number;
  /** Your own secret prompt during the draw phase. */
  myPrompt: string | null;
  submittedDrawing: boolean;
  isArtist: boolean;
  myTitle: string | null;
  /** Pick choices without your own lie. */
  options: DfOption[];
  myPick: string | null;
  realPrompt: string | null;
  score: number;
  gained: number;
  rank: number;
}

export type DfInput = { type: "drawing"; strokes: DrawStroke[] } | { type: "title"; text: string } | { type: "pick"; key: string };
