// One Clue — co-op word guessing. Each round one player guesses a mystery
// word; everyone else sees it on their phone and writes a one-word clue.
// Matching clues cancel each other out, so the guesser only sees the unique
// ones. A right guess pays the guesser and every clue that survived.

import { textKey } from "../text";

export const OC_CLUE_MAX = 20;
export const OC_GUESS_MAX = 30;
export const OC_GUESSER_POINTS = 200;
/** Each player whose clue survived, when the guess is right. */
export const OC_CLUE_POINTS = 100;

export type OcPhase = "intro" | "clue" | "guess" | "result" | "standings" | "podium";

/**
 * correct = right guess (or the host counted a near miss); wrong = wrong guess;
 * pass = the guesser passed; timeout = no guess in time; noClues = every clue
 * cancelled (or none came in), so there was nothing to guess from.
 */
export type OcOutcome = "correct" | "wrong" | "pass" | "timeout" | "noClues";

/** One clue on the table. Cancelled cards stay blank (no author, no text) until the result. */
export interface OcClueCard {
  playerId: string | null;
  text: string | null;
  cancelled: boolean;
}

export interface OcScoreLine { playerId: string; score: number; gained: number }

export interface OcTv {
  phase: OcPhase;
  round: number;
  totalRounds: number;
  guesserId: string | null;
  /** Everyone writing a clue this round, and who has locked one in. */
  writerIds: string[];
  submittedIds: string[];
  /** Guess phase: survivors face up, then blank cancelled cards. Result: every clue. */
  cards: OcClueCard[];
  /** Writers who never sent a clue — shown at the result. */
  missingIds: string[];
  /** The mystery word, the guess and the outcome are only filled in at the result. */
  word: string | null;
  guess: string | null;
  outcome: OcOutcome | null;
  /** The host counted a near miss as correct. */
  accepted: boolean;
  /** Running team tally: rounds guessed right out of rounds played. */
  teamRight: number;
  roundsPlayed: number;
  scores: OcScoreLine[];
}

export interface OcPlayer {
  phase: OcPhase;
  round: number;
  totalRounds: number;
  guesserId: string | null;
  isGuesser: boolean;
  /** Clue writers see it from the clue phase on; the guesser only at the result. */
  word: string | null;
  myClue: string | null;
  /** My clue matched someone else's (from the guess phase on). */
  myClueCancelled: boolean;
  /** Clues locked in so far, for the guesser's waiting screen. */
  cluesIn: number;
  writerCount: number;
  /** Same public cards as the TV. */
  cards: OcClueCard[];
  canGuess: boolean;
  guess: string | null;
  outcome: OcOutcome | null;
  /** Host only, at the result of a wrong guess: count it anyway. */
  canAccept: boolean;
  teamRight: number;
  roundsPlayed: number;
  score: number;
  gained: number;
  rank: number;
}

export type OcInput =
  | { type: "clue"; text: string }
  | { type: "guess"; text: string }
  | { type: "pass" }
  | { type: "accept" };

const ARTICLE_RE = /^(a|an|the|some)\s+/;
const MARKS_RE = /\p{M}/gu;
const NON_ALNUM_RE = /[^\p{L}\p{N}]+/gu;
const RSQUO = String.fromCharCode(0x2019);
/** Anything that can't sit inside a word (letters, digits, accents, apostrophes, hyphens) splits it. */
const WORD_BREAK_RE = new RegExp(`[^\\p{L}\\p{N}\\p{M}'${RSQUO}-]+`, "u");
/** A clue at least this long that sits inside the mystery word ("Snow" for Snowman) is too obvious. */
const MIN_PART = 3;

/** Every spelling a word could match on: "The Cherries" → cherries, cherrie, cherry… */
export function ocMatchKeys(text: string): string[] {
  const spaced = text.toLowerCase().normalize("NFKD").replace(MARKS_RE, "").trim().replace(ARTICLE_RE, "");
  const key = spaced.replace(NON_ALNUM_RE, "");
  if (!key) return [];
  const keys = new Set([key]);
  if (key.length > 3 && key.endsWith("ies")) keys.add(`${key.slice(0, -3)}y`);
  if (key.length > 3 && key.endsWith("es")) keys.add(key.slice(0, -2));
  if (key.length > 2 && key.endsWith("s") && !key.endsWith("ss")) keys.add(key.slice(0, -1));
  return [...keys];
}

/** Same word, ignoring case, spacing, punctuation, a leading a/the and simple plurals. */
export function ocSameWord(a: string, b: string): boolean {
  const keys = ocMatchKeys(a);
  return ocMatchKeys(b).some((k) => keys.includes(k));
}

export type OcClueProblem = "empty" | "words" | "obvious";

/**
 * Why a clue can't be used for a mystery word (given as all its accepted
 * spellings), or null if it's fine. Clues are a single word and may not be the
 * word, contain it, or be a chunk of it.
 */
export function ocClueProblem(clue: string, spellings: readonly string[]): OcClueProblem | null {
  const flat = textKey(clue);
  if (!flat) return "empty";
  if (clue.split(WORD_BREAK_RE).filter(Boolean).length > 1) return "words";
  for (const spelling of spellings) {
    const word = textKey(spelling);
    if (!word) continue;
    if (ocSameWord(clue, spelling) || flat.includes(word) || (flat.length >= MIN_PART && word.includes(flat))) return "obvious";
  }
  return null;
}
