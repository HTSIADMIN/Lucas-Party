// Word Bomb — the bomb comes to you with a few letters ("ING"). Type a real
// word containing them to pass it on before the hidden fuse runs out. If it
// blows up in your hands you lose a life. There's no dictionary: the room is
// the dictionary — anyone can shout "No way!" on a fake word, and if half the
// room agrees, the faker loses a life instead.

export const WB_WORD_MAX = 24;
export const WB_CHALLENGE_MS = 5000;

export type WbPhase = "intro" | "play" | "boom" | "podium";

export interface WbWord {
  playerId: string;
  word: string;
  syllable: string;
  at: number;
  challengers: string[];
  /** null while the challenge window is open. */
  verdict: "ok" | "rejected" | null;
}

export interface WbScoreLine { playerId: string; score: number; gained: number }

export interface WbTv {
  phase: WbPhase;
  holderId: string | null;
  syllable: string | null;
  lives: Record<string, number>;
  /** Most recent first. */
  words: WbWord[];
  /** Who just got blown up (boom phase). */
  boomId: string | null;
  bombs: number;
  scores: WbScoreLine[];
}

export interface WbPlayer {
  phase: WbPhase;
  holderId: string | null;
  isHolder: boolean;
  syllable: string | null;
  lives: number;
  alive: boolean;
  /** Words you can still challenge (not yours, window open). */
  challengeable: WbWord[];
  usedCount: number;
  score: number;
  gained: number;
  rank: number;
}

export type WbInput = { type: "word"; text: string } | { type: "challenge"; at: number };
