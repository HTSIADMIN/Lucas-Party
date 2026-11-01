// Bid or Bust — sealed-bid mystery boxes.
//
// Each round four boxes get hidden values (one is usually a rubber chicken
// worth a loss, sometimes one is a jackpot). Every player receives one true
// hint about one box, privately. Everyone submits sealed bids for any boxes
// (total up to their chips). Boxes open one at a time: the single highest
// bidder pays their bid and takes the contents; a tie means nobody buys.

import {
  BB_BOXES,
  BB_BOX_LABELS,
  BB_CHICKEN,
  BB_START_CHIPS,
  type BbBoxResult,
  type BbPhase,
  type BbPlayer,
  type BbTv,
} from "@party/shared";
import { asRecord, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";

const INTRO_MS = 8000;
const BID_MS = 40_000;
const REVEAL_STEP_MS = 2800;
const STANDINGS_MS = 5000;
const GRACE_MS = 900;
const VALUES = [0, 50, 100, 150, 200, 250, 300, 400];
const JACKPOT = 800;
const POCKET_LINT = 100;

export interface BbState {
  players: GamePlayer[];
  ids: string[];
  phase: BbPhase;
  round: number;
  totalRounds: number;
  values: number[];
  hints: Record<string, string>;
  bids: Record<string, number[]>;
  results: BbBoxResult[];
  chips: Record<string, number>;
  gained: Record<string, number>;
}

function label(i: number): string {
  return `Box ${BB_BOX_LABELS[i]}`;
}

/** One true statement about one box. */
function makeHint(values: number[], ctx: GameContext): string {
  const i = ctx.randomInt(0, BB_BOXES);
  const v = values[i]!;
  const j = (i + 1 + ctx.randomInt(0, BB_BOXES - 1)) % BB_BOXES;
  const options = [
    v === BB_CHICKEN ? `${label(i)} is the rubber chicken! 🐔` : `${label(i)} is NOT the rubber chicken.`,
    v >= 200 ? `${label(i)} holds 200 or more.` : `${label(i)} holds less than 200.`,
    v > values[j]! ? `${label(i)} is worth more than ${label(j)}.` : v < values[j]! ? `${label(i)} is worth less than ${label(j)}.` : `${label(i)} and ${label(j)} are worth the same.`,
    `${label(i)} and ${label(j)} add up to ${v + values[j]!}.`,
  ];
  if (v === JACKPOT) options.push(`${label(i)} is the jackpot! 💰`);
  return ctx.pick(options);
}

function startRound(state: BbState, ctx: GameContext) {
  const values = Array.from({ length: BB_BOXES }, () => ctx.pick(VALUES));
  if (ctx.random() < 0.8) values[ctx.randomInt(0, BB_BOXES)] = BB_CHICKEN;
  if (ctx.random() < 0.3) {
    const free = values.map((v, i) => (v === BB_CHICKEN ? -1 : i)).filter((i) => i >= 0);
    values[ctx.pick(free)] = JACKPOT;
  }
  state.values = values;
  state.hints = Object.fromEntries(state.ids.map((id) => [id, makeHint(values, ctx)]));
  for (const id of state.ids) {
    if ((state.chips[id] ?? 0) < POCKET_LINT) {
      state.chips[id] = (state.chips[id] ?? 0) + POCKET_LINT;
      ctx.emit({ kind: "lint", sfx: "coin.drop", playerId: id, text: `Found ${POCKET_LINT} chips under the couch!`, to: [id], haptic: 60 });
    }
  }
  state.bids = {};
  state.results = [];
  state.gained = {};
  state.phase = "bid";
  ctx.setDeadline(ctx.timer(BID_MS));
  ctx.emit({ kind: "round", sfx: state.round === state.totalRounds ? "round.final" : "round.start", text: `Round ${state.round} — check your hint!`, haptic: 60 });
}

/** Opens the next box: highest single bidder buys it. */
function revealNext(state: BbState, ctx: GameContext) {
  const i = state.results.length;
  if (i >= BB_BOXES) {
    state.phase = "standings";
    ctx.setDeadline(STANDINGS_MS);
    ctx.emit({ kind: "standings", sfx: "scores.tally" });
    return;
  }
  const bids = Object.entries(state.bids)
    .map(([playerId, b]) => ({ playerId, amount: b[i] ?? 0 }))
    .filter((b) => b.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const top = bids[0];
  const tie = top && bids[1] && bids[1].amount === top.amount;
  const winnerId = top && !tie ? top.playerId : null;
  const value = state.values[i]!;
  if (winnerId) {
    // A chicken can't push you below zero.
    const before = state.chips[winnerId] ?? 0;
    const after = Math.max(0, before + value - top!.amount);
    state.chips[winnerId] = after;
    state.gained[winnerId] = (state.gained[winnerId] ?? 0) + after - before;
  }
  state.results.push({ index: i, value, winnerId, winningBid: winnerId ? top!.amount : 0, bids });
  state.phase = "reveal";
  ctx.setDeadline(REVEAL_STEP_MS);
  ctx.emit({ kind: "open", sfx: value === BB_CHICKEN ? "fail.buzz" : value === JACKPOT ? "win.big" : "coin.drop", text: `${label(i)}: ${value === BB_CHICKEN ? "rubber chicken!" : `${value} chips`}` });
}

function checkProgress(state: BbState, ctx: GameContext) {
  if (state.phase !== "bid") return;
  const waiting = state.ids.filter((id) => !state.bids[id] && ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

export const bidorbust: GameDefinition<BbState> = {
  id: "bidorbust",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const state: BbState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds: ctx.options.rounds ?? 5,
      values: [],
      hints: {},
      bids: {},
      results: [],
      chips: Object.fromEntries(ids.map((id) => [id, BB_START_CHIPS])),
      gained: {},
    };
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        return startRound(state, ctx);
      case "bid":
        ctx.emit({ kind: "sold", sfx: "reveal.drumroll", text: "Bidding closed!" });
        return revealNext(state, ctx);
      case "reveal":
        return revealNext(state, ctx);
      case "standings":
        if (state.round < state.totalRounds) {
          state.round++;
          return startRound(state, ctx);
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

  onInput(state, ctx, playerId, raw) {
    const input = asRecord(raw);
    if (!input || input.type !== "bids" || state.phase !== "bid" || !state.ids.includes(playerId) || state.bids[playerId]) return;
    const sent: unknown = input.bids;
    if (!Array.isArray(sent)) return;
    const bids = Array.from({ length: BB_BOXES }, (_, i) => Math.max(0, Math.round(Number(sent[i]) || 0)));
    const total = bids.reduce((a, b) => a + b, 0);
    if (total > Math.max(0, state.chips[playerId] ?? 0)) return;
    state.bids[playerId] = bids;
    ctx.emit({ kind: "bid", sfx: "chip.place", playerId });
    checkProgress(state, ctx);
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): BbTv {
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      doneIds: Object.keys(state.bids),
      results: state.results,
      scores: sortedScores(state.chips, state.gained),
    };
  },

  playerView(state, _ctx, playerId): BbPlayer {
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      chips: state.chips[playerId] ?? 0,
      hint: state.phase === "intro" || state.phase === "podium" ? null : state.hints[playerId] ?? null,
      myBids: state.bids[playerId] ?? null,
      results: state.results,
      score: state.chips[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.chips, playerId),
    };
  },

  scores(state) {
    return state.chips;
  },
};
