// Roulette Royale — party roulette on the casino helpers.
//
// Each spin: everyone places up to six bets from their phone (chips leave
// your stack as you bet; clear to take them back), then the wheel spins.
// Payouts use the standard returns from casino/roulette.ts, except a
// straight-up bet on the hot number returns 51×. Broke players get pocket
// lint before each spin.

import {
  RO_HOT_RETURN,
  RO_MAX_BETS,
  RO_POCKET_LINT,
  RO_START_CHIPS,
  type RoBet,
  type RoPhase,
  type RoPlacedBet,
  type RoPlayer,
  type RoTv,
} from "@party/shared";
import { asRecord, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { betReturn, isValidBet, spinWheel, type RouletteBet } from "../../casino/roulette";

const INTRO_MS = 7000;
const BET_MS = 30_000;
const SPIN_MS = 6500;
const RESULT_MS = 6500;
const STANDINGS_MS = 4500;
const GRACE_MS = 900;
const TYPES = ["straight", "red", "black", "even", "odd", "low", "high", "dozen", "column"];

export interface RoState {
  players: GamePlayer[];
  ids: string[];
  phase: RoPhase;
  round: number;
  totalRounds: number;
  hot: number;
  chips: Record<string, number>;
  bets: RoPlacedBet[];
  done: string[];
  result: number | null;
  spunAt: number | null;
  gained: Record<string, number>;
}

function startBetting(state: RoState, ctx: GameContext) {
  state.phase = "bet";
  state.bets = [];
  state.done = [];
  state.result = null;
  state.spunAt = null;
  state.gained = {};
  state.hot = ctx.randomInt(0, 37);
  for (const id of state.ids) {
    if ((state.chips[id] ?? 0) < 10) {
      state.chips[id] = (state.chips[id] ?? 0) + RO_POCKET_LINT;
      ctx.emit({ kind: "lint", sfx: "coin.drop", playerId: id, text: `Pocket lint: +${RO_POCKET_LINT} chips`, to: [id], haptic: 60 });
    }
  }
  ctx.setDeadline(ctx.timer(BET_MS));
  ctx.emit({ kind: "bet", sfx: state.round === state.totalRounds ? "round.final" : "round.start", text: `Spin ${state.round} — hot number ${state.hot}!`, haptic: 50 });
}

function spin(state: RoState, ctx: GameContext) {
  state.phase = "spin";
  state.result = spinWheel(ctx.random);
  state.spunAt = ctx.now();
  ctx.setDeadline(SPIN_MS);
  ctx.emit({ kind: "spin", sfx: "dice.roll", text: "No more bets!" });
}

function settle(state: RoState, ctx: GameContext) {
  const n = state.result!;
  for (const bet of state.bets) {
    const hotHit = bet.type === "straight" && bet.value === n && n === state.hot;
    bet.payout = bet.amount * (hotHit ? RO_HOT_RETURN : betReturn(bet as RouletteBet, n));
    state.chips[bet.playerId] = (state.chips[bet.playerId] ?? 0) + bet.payout;
    state.gained[bet.playerId] = (state.gained[bet.playerId] ?? 0) + bet.payout - bet.amount;
  }
  state.phase = "result";
  ctx.setDeadline(RESULT_MS);
  const big = state.bets.some((b) => (b.payout ?? 0) >= b.amount * 36);
  ctx.emit({ kind: "result", sfx: big ? "win.big" : state.bets.some((b) => (b.payout ?? 0) > 0) ? "chips.collide" : "fail.buzz", text: `${n}!` });
}

function checkProgress(state: RoState, ctx: GameContext) {
  if (state.phase !== "bet") return;
  const waiting = state.ids.filter((id) => !state.done.includes(id) && ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

export const roulette: GameDefinition<RoState> = {
  id: "roulette",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const state: RoState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds: ctx.options.rounds ?? 8,
      hot: 0,
      chips: Object.fromEntries(ids.map((id) => [id, RO_START_CHIPS])),
      bets: [],
      done: [],
      result: null,
      spunAt: null,
      gained: {},
    };
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        return startBetting(state, ctx);
      case "bet":
        return spin(state, ctx);
      case "spin":
        return settle(state, ctx);
      case "result":
        state.phase = "standings";
        ctx.setDeadline(STANDINGS_MS);
        ctx.emit({ kind: "standings", sfx: "scores.tally" });
        return;
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
    // Never skip a wheel mid-spin; the result is already decided anyway.
    if (state.phase === "spin") return;
    roulette.onDeadline(state, ctx);
  },

  onInput(state, ctx, playerId, raw) {
    const input = asRecord(raw);
    if (!input || state.phase !== "bet" || !state.ids.includes(playerId) || state.done.includes(playerId)) return;
    if (input.type === "bet") {
      const b = asRecord(input.bet);
      if (!b || typeof b.type !== "string" || !TYPES.includes(b.type)) return;
      const bet: RoBet = { type: b.type as RoBet["type"], amount: Math.round(Number(b.amount)) };
      if (b.value !== undefined) bet.value = Number(b.value);
      if (!isValidBet(bet as RouletteBet) || bet.amount > (state.chips[playerId] ?? 0)) return;
      const mine = state.bets.filter((x) => x.playerId === playerId);
      // Same spot again stacks onto the existing bet.
      const same = mine.find((x) => x.type === bet.type && x.value === bet.value);
      if (!same && mine.length >= RO_MAX_BETS) return;
      state.chips[playerId] = (state.chips[playerId] ?? 0) - bet.amount;
      if (same) same.amount += bet.amount;
      else state.bets.push({ ...bet, playerId, payout: null });
      ctx.emit({ kind: "betPlaced", sfx: "chip.place", playerId });
      return;
    }
    if (input.type === "clear") {
      for (const bet of state.bets.filter((x) => x.playerId === playerId)) state.chips[playerId] = (state.chips[playerId] ?? 0) + bet.amount;
      state.bets = state.bets.filter((x) => x.playerId !== playerId);
      return;
    }
    if (input.type === "done") {
      state.done.push(playerId);
      return checkProgress(state, ctx);
    }
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): RoTv {
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      hot: state.hot,
      bets: state.bets,
      doneIds: state.done,
      result: state.phase === "spin" || state.phase === "result" || state.phase === "standings" ? state.result : null,
      spunAt: state.spunAt,
      scores: sortedScores(state.chips, state.gained),
    };
  },

  playerView(state, _ctx, playerId): RoPlayer {
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      hot: state.hot,
      chips: state.chips[playerId] ?? 0,
      myBets: state.bets.filter((b) => b.playerId === playerId),
      done: state.done.includes(playerId),
      // Phones learn the number when the wheel stops, not when it starts.
      result: state.phase === "result" || state.phase === "standings" ? state.result : null,
      score: state.chips[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.chips, playerId),
    };
  },

  scores(state) {
    return state.chips;
  },
};
