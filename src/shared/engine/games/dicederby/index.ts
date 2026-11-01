// Dice Derby — a stacking dice race with betting.
//
// Before the start everyone secretly picks the overall winner. Each leg:
// everyone bets chips on a racer; then every racer rolls a 1–3 in random
// order. A moving racer carries every racer stacked on top of it, and lands
// on top of whatever is already on its new space. When the leg ends the
// leader pays its odds (set when betting opened), second place refunds the
// stake, everyone else loses it. First racer past the finish ends the race.

import {
  CHARACTERS,
  DD_ODDS,
  DD_POCKET_LINT,
  DD_RACERS,
  DD_START_CHIPS,
  DD_TRACK,
  DD_WINNER_BONUS,
  ddIsRacer,
  type DdBet,
  type DdPhase,
  type DdPlayer,
  type DdRacer,
  type DdRoll,
  type DdTv,
} from "@party/shared";
import { asRecord, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";

const INTRO_MS = 8000;
const PICK_MS = 20_000;
const BET_MS = 20_000;
const ROLL_STEP_MS = 1700;
const LEG_RESULT_MS = 7000;
const FINISH_MS = 9000;
const GRACE_MS = 900;
const MIN_BET = 5;

export interface DdState {
  players: GamePlayer[];
  ids: string[];
  phase: DdPhase;
  leg: number;
  /** stacks[space] = racers on that space, bottom first. */
  stacks: DdRacer[][];
  odds: Record<DdRacer, number>;
  /** Racers still to roll this leg. */
  toRoll: DdRacer[];
  rolls: DdRoll[];
  chips: Record<string, number>;
  picks: Record<string, DdRacer>;
  bets: Record<string, DdBet>;
  winner: DdRacer | null;
  gained: Record<string, number>;
}

function positionOf(state: DdState, racer: DdRacer): number {
  return state.stacks.findIndex((s) => s.includes(racer));
}

/** First to last: further along wins; on a shared space, higher in the stack wins. */
function standings(state: DdState): DdRacer[] {
  const out: DdRacer[] = [];
  for (let space = state.stacks.length - 1; space >= 0; space--) out.push(...[...state.stacks[space]!].reverse());
  return out;
}

function setOdds(state: DdState) {
  standings(state).forEach((racer, i) => (state.odds[racer] = DD_ODDS[i] ?? DD_ODDS[DD_ODDS.length - 1]!));
}

/** Moves a racer (and everything stacked on it) forward, landing on top of the new space. */
function move(state: DdState, racer: DdRacer, steps: number) {
  const from = positionOf(state, racer);
  const stack = state.stacks[from]!;
  const riders = stack.splice(stack.indexOf(racer));
  const to = Math.min(DD_TRACK, from + steps);
  state.stacks[to]!.push(...riders);
}

function startBetting(state: DdState, ctx: GameContext) {
  state.phase = "bet";
  state.bets = {};
  state.rolls = [];
  state.gained = {};
  for (const id of state.ids) {
    if ((state.chips[id] ?? 0) < MIN_BET) {
      state.chips[id] = (state.chips[id] ?? 0) + DD_POCKET_LINT;
      ctx.emit({ kind: "lint", sfx: "coin.drop", playerId: id, text: `Found ${DD_POCKET_LINT} chips in the stands!`, to: [id], haptic: 60 });
    }
  }
  setOdds(state);
  ctx.setDeadline(ctx.timer(BET_MS));
  ctx.emit({ kind: "bet", sfx: "round.start", text: `Leg ${state.leg} — place your bets!`, haptic: 60 });
}

function startRolling(state: DdState, ctx: GameContext) {
  state.phase = "roll";
  state.toRoll = ctx.shuffle([...DD_RACERS]);
  ctx.setDeadline(800);
}

function rollNext(state: DdState, ctx: GameContext) {
  const racer = state.toRoll.shift();
  if (!racer) return settleLeg(state, ctx);
  const value = ctx.randomInt(1, 4);
  move(state, racer, value);
  state.rolls.push({ racer, value });
  ctx.emit({ kind: "roll", sfx: "dice.throw", text: `${CHARACTERS[racer].name} rolls ${value}` });
  if (positionOf(state, racer) >= DD_TRACK) {
    // Someone crossed the line: the leg (and the race) ends right here.
    state.toRoll = [];
  }
  ctx.setDeadline(ROLL_STEP_MS);
}

function settleLeg(state: DdState, ctx: GameContext) {
  const order = standings(state);
  for (const bet of Object.values(state.bets)) {
    const place = order.indexOf(bet.racer);
    bet.payout = place === 0 ? bet.amount * state.odds[bet.racer] : place === 1 ? bet.amount : 0;
    state.chips[bet.playerId] = (state.chips[bet.playerId] ?? 0) + bet.payout;
    state.gained[bet.playerId] = bet.payout - bet.amount;
  }
  const finished = order.some((r) => positionOf(state, r) >= DD_TRACK);
  if (finished) {
    state.winner = order[0]!;
    for (const [id, racer] of Object.entries(state.picks)) {
      if (racer !== state.winner) continue;
      state.chips[id] = (state.chips[id] ?? 0) + DD_WINNER_BONUS;
      state.gained[id] = (state.gained[id] ?? 0) + DD_WINNER_BONUS;
    }
    state.phase = "finish";
    ctx.setDeadline(FINISH_MS);
    ctx.emit({ kind: "finish", sfx: "win.big", text: `${CHARACTERS[state.winner].name} wins the Derby!` });
    return;
  }
  state.phase = "legResult";
  ctx.setDeadline(LEG_RESULT_MS);
  ctx.emit({ kind: "legResult", sfx: "scores.tally", text: `${CHARACTERS[order[0]!].name} leads after leg ${state.leg}` });
}

function checkProgress(state: DdState, ctx: GameContext) {
  if (state.phase !== "pick" && state.phase !== "bet") return;
  const done = state.phase === "pick" ? state.picks : state.bets;
  const waiting = state.ids.filter((id) => !done[id] && ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

export const dicederby: GameDefinition<DdState> = {
  id: "dicederby",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const stacks: DdRacer[][] = Array.from({ length: DD_TRACK + 1 }, () => []);
    // Staggered start: each racer rolls once to set up, like a real derby.
    const state: DdState = {
      players,
      ids,
      phase: "intro",
      leg: 1,
      stacks,
      odds: Object.fromEntries(DD_RACERS.map((r) => [r, 2])) as Record<DdRacer, number>,
      toRoll: [],
      rolls: [],
      chips: Object.fromEntries(ids.map((id) => [id, DD_START_CHIPS])),
      picks: {},
      bets: {},
      winner: null,
      gained: {},
    };
    for (const racer of ctx.shuffle([...DD_RACERS])) stacks[ctx.randomInt(0, 3)]!.push(racer);
    setOdds(state);
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        state.phase = "pick";
        ctx.setDeadline(ctx.timer(PICK_MS));
        ctx.emit({ kind: "pick", sfx: "round.start", text: "Pick the Derby winner!", haptic: 60 });
        return;
      case "pick":
        return startBetting(state, ctx);
      case "bet":
        return startRolling(state, ctx);
      case "roll":
        return rollNext(state, ctx);
      case "legResult":
        state.leg++;
        return startBetting(state, ctx);
      case "finish":
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
    if (!input || !state.ids.includes(playerId) || !ddIsRacer(input.racer)) return;
    if (input.type === "pick") {
      if (state.phase !== "pick" || state.picks[playerId]) return;
      state.picks[playerId] = input.racer;
      ctx.emit({ kind: "picked", sfx: "ui.tick", playerId });
      return checkProgress(state, ctx);
    }
    if (input.type === "bet") {
      if (state.phase !== "bet" || state.bets[playerId]) return;
      const chips = state.chips[playerId] ?? 0;
      const amount = Math.round(Number(input.amount));
      if (!Number.isFinite(amount)) return;
      const stake = Math.max(Math.min(MIN_BET, chips), Math.min(chips, amount));
      if (stake <= 0) return;
      state.chips[playerId] = chips - stake;
      state.bets[playerId] = { playerId, racer: input.racer, amount: stake, payout: null };
      ctx.emit({ kind: "betPlaced", sfx: "chip.place", playerId });
      return checkProgress(state, ctx);
    }
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): DdTv {
    const revealBets = ["roll", "legResult", "finish", "podium"].includes(state.phase);
    return {
      phase: state.phase,
      leg: state.leg,
      positions: Object.fromEntries(DD_RACERS.map((r) => [r, positionOf(state, r)])) as Record<DdRacer, number>,
      stacks: state.stacks,
      standings: standings(state),
      odds: state.odds,
      rolls: state.rolls,
      doneIds: Object.keys(state.phase === "pick" ? state.picks : state.bets),
      bets: revealBets ? Object.values(state.bets) : [],
      winner: state.winner,
      picks: state.phase === "finish" || state.phase === "podium" ? state.picks : null,
      scores: sortedScores(state.chips, state.gained),
    };
  },

  playerView(state, _ctx, playerId): DdPlayer {
    return {
      phase: state.phase,
      leg: state.leg,
      chips: state.chips[playerId] ?? 0,
      odds: state.odds,
      standings: standings(state),
      myPick: state.picks[playerId] ?? null,
      myBet: state.bets[playerId] ?? null,
      winner: state.winner,
      score: state.chips[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.chips, playerId),
    };
  },

  scores(state) {
    return state.chips;
  },
};
