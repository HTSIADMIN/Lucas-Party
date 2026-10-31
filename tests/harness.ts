// A fake GameContext with a manual clock, for driving game state machines in tests.
import type { GameId, RoomEvent, RoomSettings } from "@party/shared";
import type { GameContext, GameDefinition, GamePlayer } from "../src/shared/engine/types";
import { pick, randomFloat, randomInt, shuffle } from "../src/shared/engine/random";

export function players(n: number): GamePlayer[] {
  const chars = ["blip", "tango", "sunny", "sprout", "splash", "boxy", "wisp", "puff"] as const;
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Player ${i}`, character: chars[i % 8]! }));
}

export function harness<S>(def: GameDefinition<S>, n: number, opts: { options?: Record<string, number>; random?: () => number } = {}) {
  let now = 1_000_000;
  let deadline: number | null = null;
  let finished = false;
  const events: RoomEvent[] = [];
  const roster = players(n);
  const connected = new Set(roster.map((p) => p.id));
  const settings: RoomSettings = { theme: "showtime", familyMode: true, pace: "normal", gameId: def.id as GameId, gameOptions: {} };
  const ctx: GameContext = {
    gameId: def.id,
    options: opts.options ?? {},
    settings,
    memory: {},
    now: () => now,
    random: opts.random ?? randomFloat,
    randomInt,
    pick,
    shuffle,
    timer: (ms) => ms,
    setDeadline: (ms) => {
      deadline = ms === null ? null : now + ms;
    },
    get deadline() {
      return deadline;
    },
    isConnected: (id) => connected.has(id),
    emit: (e) => void events.push(e),
    finish: () => {
      finished = true;
    },
  };
  const state = def.create(ctx, roster);
  return {
    ctx,
    state,
    roster,
    events,
    connected,
    get finished() {
      return finished;
    },
    get deadline() {
      return deadline;
    },
    advance(ms: number) {
      now += ms;
    },
    /** Jumps the clock to the pending deadline and fires it. */
    fire() {
      if (deadline === null) throw new Error("no deadline pending");
      now = Math.max(now, deadline);
      deadline = null;
      def.onDeadline(state, ctx);
    },
    input(playerId: string, data: unknown) {
      def.onInput(state, ctx, playerId, data);
    },
    tv: () => def.tvView(state, ctx),
    view: (playerId: string) => def.playerView(state, ctx, playerId),
  };
}
