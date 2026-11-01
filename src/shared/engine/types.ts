// The contract every party game implements. A game is a plain state machine:
// the room owns the clock, sockets and broadcasting; the game only reacts to
// inputs and deadlines and projects views. Views must never leak private info
// to the wrong recipient — the TV view is public, player views are personal.

import type { CharacterId, GameId, RoomEvent, RoomSettings } from "@party/shared";

export interface GamePlayer {
  id: string;
  name: string;
  character: CharacterId;
}

export interface GameContext {
  readonly gameId: GameId;
  readonly options: Readonly<Record<string, number>>;
  readonly settings: Readonly<RoomSettings>;
  /** Survives across games in the same room (e.g. prompts already used tonight). */
  readonly memory: Record<string, unknown>;
  now(): number;
  random(): number;
  randomInt(min: number, maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  /** Scales a player-facing timer by the room's pace setting. */
  timer(ms: number): number;
  /** Schedules onDeadline after `ms`, replacing any pending deadline. `null` clears it. */
  setDeadline(ms: number | null): void;
  readonly deadline: number | null;
  isConnected(playerId: string): boolean;
  /** The room owner's seat — for host-only in-game actions (e.g. merging answers). */
  isHost(playerId: string): boolean;
  emit(event: RoomEvent): void;
  /** Marks the game finished: the final podium is on screen and the host picks what's next. */
  finish(): void;
}

export interface GameDefinition<S> {
  id: GameId;
  create(ctx: GameContext, players: GamePlayer[]): S;
  onInput(state: S, ctx: GameContext, playerId: string, input: unknown): void;
  onDeadline(state: S, ctx: GameContext): void;
  /** Host pressed Skip. Defaults to onDeadline. */
  onSkip?(state: S, ctx: GameContext): void;
  onConnectionChange?(state: S, ctx: GameContext, playerId: string, connected: boolean): void;
  /** Called when the host resumes, with how long the game was paused. */
  onResume?(state: S, ctx: GameContext, pausedForMs: number): void;
  tvView(state: S, ctx: GameContext): unknown;
  playerView(state: S, ctx: GameContext, playerId: string): unknown;
  scores(state: S): Record<string, number>;
}

/** Narrow helper for validating untrusted input objects. */
export function asRecord(input: unknown): Record<string, unknown> | null {
  return typeof input === "object" && input !== null && !Array.isArray(input) ? (input as Record<string, unknown>) : null;
}

export function rankOf(scores: Record<string, number>, playerId: string): number {
  const mine = scores[playerId] ?? 0;
  let rank = 1;
  for (const [id, s] of Object.entries(scores)) if (id !== playerId && s > mine) rank++;
  return rank;
}

export function sortedScores(scores: Record<string, number>, gained: Record<string, number> = {}) {
  return Object.entries(scores)
    .map(([playerId, score]) => ({ playerId, score, gained: gained[playerId] ?? 0 }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Picks who gets a rotating role (psychic, speaker, defendant…): the connected
 * player who has had it the fewest times, seat order breaking ties. Someone
 * who was away keeps their turn for when they're back. Bumps their count.
 */
export function nextTurn(order: readonly string[], counts: Record<string, number>, isConnected: (id: string) => boolean): string {
  const ranked = [...order].sort((a, b) => (counts[a] ?? 0) - (counts[b] ?? 0) || order.indexOf(a) - order.indexOf(b));
  const pick = ranked.find(isConnected) ?? ranked[0]!;
  counts[pick] = (counts[pick] ?? 0) + 1;
  return pick;
}

/** Pulls `count` unused items from a bank, remembering what this room has seen. */
export function drawFresh<T>(ctx: GameContext, memoryKey: string, bank: readonly T[], keyOf: (item: T) => string, count: number): T[] {
  const used = new Set((ctx.memory[memoryKey] as string[] | undefined) ?? []);
  let pool = bank.filter((item) => !used.has(keyOf(item)));
  if (pool.length < count) {
    used.clear();
    pool = bank.slice();
  }
  const picked = ctx.shuffle(pool).slice(0, count);
  for (const item of picked) used.add(keyOf(item));
  ctx.memory[memoryKey] = [...used];
  return picked;
}
