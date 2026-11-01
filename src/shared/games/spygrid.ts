// Spy Grid — two teams race to find their agents on a 5×5 grid of words. Each
// team's spymaster sees the secret key on their phone and gives a one-word
// clue plus a number; teammates vote on their phones to flip words. Flip the
// assassin and your team loses the board on the spot.

import { textKey } from "../text";

export const SPY_BOARD_SIZE = 25;
export const SPY_COLUMNS = 5;
/** The team that starts a board has one more agent to find. */
export const SPY_STARTING_AGENTS = 9;
export const SPY_OTHER_AGENTS = 8;
export const SPY_BYSTANDERS = 7;
export const SPY_CLUE_MAX = 20;
export const SPY_COUNT_MIN = 1;
export const SPY_COUNT_MAX = 9;
/** Each member of the team that wins a board. */
export const SPY_WIN_POINTS = 300;
/** Each member of a team, for every one of its agents that gets flipped. */
export const SPY_AGENT_POINTS = 20;
/** Vote target meaning "we're done guessing this turn". */
export const SPY_END_TURN = -1;

export type SpyTeam = "red" | "blue";
export const SPY_TEAMS: readonly SpyTeam[] = ["red", "blue"];
export const SPY_TEAM_NAME: Record<SpyTeam, string> = { red: "Red", blue: "Blue" };

export type SpyCardKind = SpyTeam | "bystander" | "assassin";

export type SpyPhase = "intro" | "teams" | "clue" | "guess" | "boardEnd" | "standings" | "podium";

/** agents = a team found all its agents; assassin = the guessing team flipped it; stalled = nobody gave a clue for too long. */
export type SpyOutcome = "agents" | "assassin" | "stalled";

/** Why the last turn ended. */
export type SpyTurnEndReason = "bystander" | "opponent" | "outOfGuesses" | "endTurn" | "guessTimeout" | "clueTimeout";

export interface SpyTurnEnd { team: SpyTeam; reason: SpyTurnEndReason }

export interface SpyCard {
  word: string;
  /** Null while this viewer isn't allowed to know what the card is. */
  kind: SpyCardKind | null;
  /** Flipped during play — as opposed to shown on a spymaster's key or after the board. */
  flipped: boolean;
}

export interface SpyClue { team: SpyTeam; word: string; count: number }

/** One operative's current pick: a card index, or SPY_END_TURN. */
export interface SpyVote { playerId: string; index: number }

export interface SpyFlip { index: number; kind: SpyCardKind; team: SpyTeam }

export interface SpyTeamInfo {
  team: SpyTeam;
  memberIds: string[];
  /** Who holds this board's key: the spymaster, plus anyone who stepped in when they dropped out. */
  spymasterIds: string[];
  agents: number;
  found: number;
}

export interface SpyScoreLine { playerId: string; score: number; gained: number }

/** Everything both views share. Card kinds are filtered per recipient. */
export interface SpyCommonView {
  phase: SpyPhase;
  board: number;
  totalBoards: number;
  cards: SpyCard[];
  /** Always [red, blue]. */
  teams: SpyTeamInfo[];
  startingTeam: SpyTeam | null;
  /** The team whose turn it is (clue + guess phases only). */
  activeTeam: SpyTeam | null;
  clue: SpyClue | null;
  guessesLeft: number;
  /** Live votes from the guessing team's connected operatives. */
  votes: SpyVote[];
  /** How many matching votes flip a card (or end the turn). */
  votesNeeded: number;
  lastFlip: SpyFlip | null;
  /** How the previous turn ended, for the "turn over" note. */
  turnEnd: SpyTurnEnd | null;
  /** This board's clues, oldest first. */
  history: SpyClue[];
  winner: SpyTeam | null;
  outcome: SpyOutcome | null;
}

export interface SpyTv extends SpyCommonView {
  scores: SpyScoreLine[];
}

export interface SpyPlayer extends SpyCommonView {
  team: SpyTeam;
  /** Holds the key this board: `cards` then carry every kind. */
  isSpymaster: boolean;
  canClue: boolean;
  canVote: boolean;
  myVote: number | null;
  score: number;
  gained: number;
  rank: number;
}

export type SpyInput =
  | { type: "clue"; word: string; count: number }
  | { type: "vote"; index: number }
  | { type: "unvote" };

/** Half the connected operatives, rounded up — a lone operative's vote counts straight away. */
export function spyVotesNeeded(operatives: number): number {
  return Math.max(1, Math.ceil(operatives / 2));
}

/** Letters and digits, optionally joined by an apostrophe or hyphen ("rock'n'roll", "ice-cold"). */
const ONE_WORD_RE = /^[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*$/u;

/**
 * Why a clue isn't allowed, or null when it's fine. `liveWords` are the board's
 * unflipped words: a clue may not be one of them, contain one, or sit inside one.
 */
export function spyClueProblem(clue: string, liveWords: readonly string[]): string | null {
  const word = clue.trim();
  if (!word) return "Type a clue first.";
  if (!ONE_WORD_RE.test(word)) return "One word only — no spaces or symbols.";
  const key = textKey(word);
  const clash = liveWords.find((w) => {
    const k = textKey(w);
    return k.length > 0 && (key.includes(k) || k.includes(key));
  });
  return clash ? `Too close to “${clash}” on the board.` : null;
}
