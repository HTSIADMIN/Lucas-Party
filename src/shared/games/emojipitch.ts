// Emoji Pitch — everyone gets a secret prompt ("a haunted house", "going to
// the dentist") and pitches it in 1–3 emoji. Then each pitch hits the TV and
// the room picks which of four prompts it was. Clear pitches pay the pitcher;
// sharp eyes pay the guessers.

export const EP_MAX_EMOJI = 3;
export const EP_GUESS_POINTS = 100;
/** The pitcher, per player who guessed their prompt. */
export const EP_PITCH_POINTS = 50;

export type EpPhase = "intro" | "pitch" | "guess" | "reveal" | "standings" | "podium";

export interface EpScoreLine { playerId: string; score: number; gained: number }

export interface EpTv {
  phase: EpPhase;
  /** 1-based index of the pitch on show. */
  round: number;
  totalRounds: number;
  pitcherId: string | null;
  emoji: string | null;
  options: string[];
  doneIds: string[];
  activeIds: string[];
  /** From the reveal on. */
  answer: number | null;
  picks: Record<string, number> | null;
  scores: EpScoreLine[];
}

export interface EpPlayer {
  phase: EpPhase;
  round: number;
  totalRounds: number;
  /** Your own prompt while pitching. */
  myPrompt: string | null;
  myPitch: string | null;
  isPitcher: boolean;
  options: string[];
  myPick: number | null;
  answer: number | null;
  score: number;
  gained: number;
  rank: number;
}

export type EpInput = { type: "pitch"; emoji: string } | { type: "pick"; index: number };

const EMOJI_RE = /\p{Extended_Pictographic}/u;
const KEYCAP_OR_FLAG_RE = /^(?:\p{Regional_Indicator}{2}|[#*0-9]\u{FE0F}?\u{20E3})$/u;

/** Splits text into user-perceived characters and keeps it only if it's 1–3 emoji. */
export function epCleanPitch(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const text = input.replace(/\s+/g, "");
  if (!text) return null;
  const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  const parts = segmenter ? [...segmenter.segment(text)].map((s) => s.segment) : Array.from(text);
  if (parts.length < 1 || parts.length > EP_MAX_EMOJI) return null;
  if (!parts.every((p) => EMOJI_RE.test(p) || KEYCAP_OR_FLAG_RE.test(p))) return null;
  return parts.join("");
}
