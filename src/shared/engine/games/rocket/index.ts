// Rocket Riot — the solo Crash game rebuilt for a couch.
//
// Each launch: bet (with an optional one-time Double Down and an Autopilot
// target), 3-2-1, then the multiplier climbs on m(t) = e^(GROWTH·t). Bail out
// before the explosion to lock in bet × multiplier. The last rider off before
// the boom earns the Daredevil bonus. The final launch is a Moonshot: higher
// floor on the crash point, minimum bet 50%.

import {
  ROCKET_BAIL_LATENCY_CREDIT_MS,
  ROCKET_DAREDEVIL_BONUS,
  ROCKET_MAX_MULT,
  ROCKET_POCKET_LINT,
  ROCKET_START_CHIPS,
  floorMult,
  minBetFor,
  rocketMultiplierAt,
  rocketPayout,
  rocketTimeFor,
  type RocketPhase,
  type RocketPlayer,
  type RocketRider,
  type RocketTv,
} from "@party/shared";
import { asRecord, rankOf, type GameContext, type GameDefinition, type GamePlayer } from "../../types";

const INTRO_MS = 6000;
const BET_MS = 12_000;
const COUNTDOWN_MS = 3200;
const BOOM_MS = 6000;
const STANDINGS_MS = 5000;
const ALL_LOCKED_GRACE_MS = 1200;
/** Once everyone has bailed, the rocket keeps going at most this long before it pops. */
const ALL_BAILED_RUNOUT_MS = 2500;
const INSTANT_BUST_CHANCE = 0.03;
const MOONSHOT_FLOOR = 1.5;

interface BetSlip { amount: number; double: boolean; autoTarget: number | null }

interface Rider {
  playerId: string;
  bet: number;
  doubled: boolean;
  autoTarget: number | null;
  bailedAt: number | null;
  payout: number | null;
  daredevil: boolean;
}

export interface RocketState {
  players: GamePlayer[];
  ids: string[];
  phase: RocketPhase;
  round: number;
  totalRounds: number;
  chips: Record<string, number>;
  deltas: Record<string, number>;
  slips: Record<string, BetSlip>;
  riders: Record<string, Rider>;
  doubleUsed: Record<string, boolean>;
  flightStartedAt: number | null;
  crashPoint: number;
  crashAtMs: number;
  exploded: boolean;
  explodedAtMs: number | null;
  history: number[];
}

function isFinalRound(state: RocketState) {
  return state.round === state.totalRounds;
}

function pickCrashPoint(ctx: GameContext, moonshot: boolean): number {
  const u = ctx.random();
  if (!moonshot && u < INSTANT_BUST_CHANCE) return 1;
  // P(crash ≥ m) ≈ (1 - bust) / m — the classic crash curve, capped for pacing.
  let m = Math.floor(((1 - INSTANT_BUST_CHANCE) / (1 - u)) * 100) / 100;
  m = Math.max(1, Math.min(ROCKET_MAX_MULT, m));
  return moonshot ? Math.max(MOONSHOT_FLOOR, m) : m;
}

function startBetting(state: RocketState, ctx: GameContext) {
  state.phase = "bet";
  state.slips = {};
  state.riders = {};
  state.flightStartedAt = null;
  state.exploded = false;
  state.explodedAtMs = null;
  for (const id of state.ids) {
    if (state.chips[id]! < 10) {
      state.chips[id] = (state.chips[id] ?? 0) + ROCKET_POCKET_LINT;
      ctx.emit({ kind: "lint", sfx: "coin.drop", playerId: id, text: "Found some pocket lint: +100 chips", to: [id], haptic: 80 });
    }
  }
  ctx.setDeadline(ctx.timer(BET_MS));
  ctx.emit({ kind: "bet", sfx: isFinalRound(state) ? "round.final" : "round.start", text: isFinalRound(state) ? "MOONSHOT! Minimum bet 50%" : `Launch ${state.round}`, haptic: 50 });
}

function lockBets(state: RocketState, ctx: GameContext) {
  const final = isFinalRound(state);
  for (const id of state.ids) {
    const chips = state.chips[id]!;
    const min = minBetFor(chips, final);
    const slip = state.slips[id];
    const amount = Math.max(min, Math.min(chips, slip?.amount ?? min));
    const doubled = Boolean(slip?.double) && !state.doubleUsed[id];
    if (doubled) state.doubleUsed[id] = true;
    state.chips[id] = chips - amount;
    state.riders[id] = { playerId: id, bet: amount, doubled, autoTarget: slip?.autoTarget ?? null, bailedAt: null, payout: null, daredevil: false };
  }
  state.crashPoint = pickCrashPoint(ctx, final);
  state.crashAtMs = rocketTimeFor(state.crashPoint);
  state.phase = "countdown";
  ctx.setDeadline(COUNTDOWN_MS);
  ctx.emit({ kind: "countdown", sfx: "rocket.countdown" });
}

function launch(state: RocketState, ctx: GameContext) {
  state.phase = "flight";
  state.flightStartedAt = ctx.now();
  ctx.emit({ kind: "launch", sfx: "rocket.launch", haptic: [40, 40, 120] });
  scheduleFlight(state, ctx);
}

/** Next interesting moment: the earliest Autopilot target, or the explosion. */
function scheduleFlight(state: RocketState, ctx: GameContext) {
  const elapsed = ctx.now() - state.flightStartedAt!;
  let next = state.crashAtMs;
  for (const r of Object.values(state.riders)) {
    if (r.bailedAt === null && r.autoTarget !== null && r.autoTarget < state.crashPoint) {
      next = Math.min(next, rocketTimeFor(r.autoTarget));
    }
  }
  ctx.setDeadline(Math.max(0, next - elapsed));
}

function bail(state: RocketState, ctx: GameContext, rider: Rider, mult: number) {
  const m = Math.max(1, Math.min(state.crashPoint, floorMult(mult)));
  rider.bailedAt = m;
  rider.payout = rocketPayout(rider.bet, m, rider.doubled);
  state.chips[rider.playerId] = (state.chips[rider.playerId] ?? 0) + rider.payout;
  const name = state.players.find((p) => p.id === rider.playerId)?.name ?? "Someone";
  ctx.emit({ kind: "bail", sfx: "rocket.bail", playerId: rider.playerId, text: `${name} bailed at ${m.toFixed(2)}×`, haptic: 60, to: [rider.playerId] });
}

function onFlightTick(state: RocketState, ctx: GameContext) {
  const elapsed = ctx.now() - state.flightStartedAt!;
  for (const r of Object.values(state.riders)) {
    if (r.bailedAt === null && r.autoTarget !== null && r.autoTarget < state.crashPoint && rocketTimeFor(r.autoTarget) <= elapsed + 5) {
      bail(state, ctx, r, r.autoTarget);
    }
  }
  const everyoneOff = Object.values(state.riders).every((r) => r.bailedAt !== null);
  if (elapsed + 5 >= state.crashAtMs || everyoneOff) {
    if (everyoneOff && elapsed + 5 < state.crashAtMs) {
      // Let the rocket fly on for a beat, then pop it early.
      state.crashAtMs = Math.min(state.crashAtMs, elapsed + ALL_BAILED_RUNOUT_MS);
      if (elapsed + 5 < state.crashAtMs) return ctx.setDeadline(state.crashAtMs - elapsed);
    }
    return explode(state, ctx);
  }
  scheduleFlight(state, ctx);
}

function explode(state: RocketState, ctx: GameContext) {
  state.exploded = true;
  state.explodedAtMs = Math.min(state.crashAtMs, ctx.now() - state.flightStartedAt!);
  state.phase = "boom";
  const riders = Object.values(state.riders);
  const bailed = riders.filter((r) => r.bailedAt !== null);
  if (riders.length >= 2 && bailed.length > 0) {
    const best = Math.max(...bailed.map((r) => r.bailedAt!));
    for (const r of bailed.filter((x) => x.bailedAt === best)) {
      const bonus = Math.floor(r.payout! * ROCKET_DAREDEVIL_BONUS);
      r.daredevil = true;
      r.payout! += bonus;
      state.chips[r.playerId] = (state.chips[r.playerId] ?? 0) + bonus;
    }
  }
  state.deltas = {};
  for (const r of riders) state.deltas[r.playerId] = (r.payout ?? 0) - r.bet;
  state.history.push(state.crashPoint);
  const toasted = riders.filter((r) => r.bailedAt === null).map((r) => r.playerId);
  ctx.emit({ kind: "boom", sfx: "rocket.boom", text: `BOOM at ${state.crashPoint.toFixed(2)}×`, haptic: [200, 60, 200], to: toasted });
  ctx.setDeadline(BOOM_MS);
}

function standingsList(state: RocketState) {
  return state.ids
    .map((playerId) => ({ playerId, chips: state.chips[playerId] ?? 0, delta: state.deltas[playerId] ?? 0 }))
    .sort((a, b) => b.chips - a.chips);
}

function riderView(r: Rider): RocketRider {
  return { playerId: r.playerId, bet: r.bet, doubled: r.doubled, bailedAt: r.bailedAt, payout: r.payout, daredevil: r.daredevil };
}

export const rocket: GameDefinition<RocketState> = {
  id: "rocket",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const state: RocketState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds: ctx.options.rounds ?? 7,
      chips: Object.fromEntries(ids.map((id) => [id, ROCKET_START_CHIPS])),
      deltas: {},
      slips: {},
      riders: {},
      doubleUsed: {},
      flightStartedAt: null,
      crashPoint: 1,
      crashAtMs: 0,
      exploded: false,
      explodedAtMs: null,
      history: [],
    };
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        return startBetting(state, ctx);
      case "bet":
        return lockBets(state, ctx);
      case "countdown":
        return launch(state, ctx);
      case "flight":
        return onFlightTick(state, ctx);
      case "boom":
        state.phase = "standings";
        ctx.emit({ kind: "standings", sfx: "scores.tally" });
        return ctx.setDeadline(STANDINGS_MS);
      case "standings":
        if (state.round < state.totalRounds) {
          state.round++;
          return startBetting(state, ctx);
        }
        state.phase = "podium";
        ctx.setDeadline(null);
        ctx.finish();
        ctx.emit({ kind: "podium", sfx: "win.big" });
        return;
      case "podium":
        return;
    }
  },

  onSkip(state, ctx) {
    // Skipping mid-flight would rob players of their bail-out; only skip waits.
    if (state.phase === "flight") return;
    rocket.onDeadline(state, ctx);
  },

  onInput(state, ctx, playerId, raw) {
    const input = asRecord(raw);
    if (!input || !state.ids.includes(playerId)) return;

    if (input.type === "bet" && state.phase === "bet") {
      const chips = state.chips[playerId]!;
      const min = minBetFor(chips, isFinalRound(state));
      const amount = Math.round(Number(input.amount));
      if (!Number.isFinite(amount)) return;
      const target = input.autoTarget === null || input.autoTarget === undefined ? null : Number(input.autoTarget);
      state.slips[playerId] = {
        amount: Math.max(min, Math.min(chips, amount)),
        double: input.double === true && !state.doubleUsed[playerId],
        autoTarget: target !== null && Number.isFinite(target) && target >= 1.01 ? Math.min(ROCKET_MAX_MULT, floorMult(target)) : null,
      };
      ctx.emit({ kind: "locked", sfx: "chip.place", playerId });
      if (state.ids.filter((id) => ctx.isConnected(id)).every((id) => state.slips[id]) && (ctx.deadline ?? 0) - ctx.now() > ALL_LOCKED_GRACE_MS) {
        ctx.setDeadline(ALL_LOCKED_GRACE_MS);
      }
      return;
    }

    if (input.type === "bail" && state.phase === "flight" && !state.exploded) {
      const rider = state.riders[playerId];
      if (!rider || rider.bailedAt !== null) return;
      // Inputs are relayed phone → realtime → TV, so credit the reported press
      // time (bounded) instead of punishing players for the hop.
      const now = ctx.now();
      const reported = Number(input.at);
      const pressedAt = Number.isFinite(reported) ? Math.min(now, Math.max(now - ROCKET_BAIL_LATENCY_CREDIT_MS, reported)) : now;
      const elapsed = pressedAt - state.flightStartedAt!;
      if (elapsed >= state.crashAtMs) return;
      bail(state, ctx, rider, rocketMultiplierAt(elapsed));
      onFlightTick(state, ctx);
    }
  },

  onResume(state, _ctx, pausedForMs) {
    // The curve is a function of time since launch, so a pause shifts the launch.
    if (state.phase === "flight" && state.flightStartedAt !== null) state.flightStartedAt += pausedForMs;
  },

  tvView(state): RocketTv {
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      finalRound: isFinalRound(state),
      flightStartedAt: state.flightStartedAt,
      crashPoint: state.exploded ? state.crashPoint : null,
      explodedAtMs: state.explodedAtMs,
      riders: Object.values(state.riders).map(riderView),
      standings: standingsList(state),
      history: state.history.slice(-10),
      lockedIds: state.phase === "bet" ? Object.keys(state.slips) : [],
    };
  },

  playerView(state, _ctx, playerId): RocketPlayer {
    const chips = state.chips[playerId] ?? 0;
    const rider = state.riders[playerId];
    const slip = state.slips[playerId];
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      finalRound: isFinalRound(state),
      chips,
      minBet: minBetFor(chips, isFinalRound(state)),
      bet: rider?.bet ?? slip?.amount ?? null,
      locked: Boolean(slip) || Boolean(rider),
      doubled: rider?.doubled ?? slip?.double ?? false,
      doubleAvailable: !state.doubleUsed[playerId],
      autoTarget: rider?.autoTarget ?? slip?.autoTarget ?? null,
      flightStartedAt: state.flightStartedAt,
      bailedAt: rider?.bailedAt ?? null,
      payout: rider?.payout ?? null,
      crashPoint: state.exploded ? state.crashPoint : null,
      rank: rankOf(state.chips, playerId),
      lastDelta: state.deltas[playerId] ?? 0,
    };
  },

  scores(state) {
    return state.chips;
  },
};
