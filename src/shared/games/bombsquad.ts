// Bomb Squad — co-op. One player's phone shows the bomb; everyone else holds
// pieces of the defusal manual on theirs. The TV only shows the countdown and
// strikes, so the room has to TALK. Three modules per bomb: Wires, Keypad and
// Sound-alikes. Three strikes or zero seconds and it's boom.

export type BsWireColor = "red" | "blue" | "yellow" | "white" | "black";
export type BsModule = "wires" | "keypad" | "words";
export const BS_MODULES: readonly BsModule[] = ["wires", "keypad", "words"];
export const BS_MAX_STRIKES = 3;
export const BS_WORD_STAGES = 3;
/** Everyone, per bomb defused, plus a bonus per second left. */
export const BS_DEFUSE_POINTS = 200;
export const BS_SECOND_POINTS = 2;
export const BS_DEFUSER_BONUS = 100;

export type BsPhase = "intro" | "brief" | "defuse" | "result" | "standings" | "podium";

/** What the defuser sees. Never sent to anyone else. */
export interface BsBomb {
  wires: BsWireColor[];
  /** Wire indexes already cut. */
  cut: number[];
  keypad: string[];
  /** Keypad symbols already pressed (in order). */
  pressed: string[];
  word: { stage: number; display: string; buttons: string[] } | null;
  solved: Record<BsModule, boolean>;
}

/** Manual pages an expert holds. */
export interface BsManual {
  wires?: { count: number; rules: string[] }[];
  keypad?: string[][];
  words?: Record<string, string>;
}

export interface BsScoreLine { playerId: string; score: number; gained: number }

export interface BsTv {
  phase: BsPhase;
  round: number;
  totalRounds: number;
  defuserId: string | null;
  /** Room time the bomb goes off. */
  explodesAt: number | null;
  strikes: number;
  solved: Record<BsModule, boolean>;
  outcome: "defused" | "exploded" | null;
  secondsLeft: number | null;
  scores: BsScoreLine[];
}

export interface BsPlayer {
  phase: BsPhase;
  round: number;
  totalRounds: number;
  defuserId: string | null;
  isDefuser: boolean;
  bomb: BsBomb | null;
  manual: BsManual | null;
  strikes: number;
  outcome: "defused" | "exploded" | null;
  score: number;
  gained: number;
  rank: number;
}

export type BsInput = { type: "cut"; wire: number } | { type: "key"; symbol: string } | { type: "word"; label: string };
