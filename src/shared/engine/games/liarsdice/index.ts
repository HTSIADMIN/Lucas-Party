// Liar's Dice — bluffing about the dice under everyone's cups.
//
// Every round each player still in rolls their dice in secret. Turns go round
// the table (seat order) from whoever lost a die last round: raise the bid
// (more dice, or the same number of a higher face — ones are wild), or
// challenge it. LIAR! says the bid is too high: the cups lift and whoever was
// wrong loses a die. SPOT ON! says the count is exact: right wins the caller a
// die back (never above the starting count), wrong costs them one. Out of dice
// = out of the game; the last player with dice wins.
//
// Podium points: +100 for every opponent eliminated before you, +300 for the
// winner, +50 for every correct LIAR!/SPOT ON!.

import {
  LD_CALL_POINTS,
  LD_DEFAULT_DICE,
  LD_MAX_DICE,
  LD_MIN_FACE,
  LD_OUTLAST_POINTS,
  LD_WINNER_POINTS,
  ldIsMatch,
  ldIsRaise,
  ldMinRaise,
  type LdBid,
  type LdCall,
  type LdCallKind,
  type LdPhase,
  type LdPlayer,
  type LdTv,
} from "@party/shared";
import { asRecord, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";

const INTRO_MS = 7000;
const ROLL_MS = 3200;
const TURN_MS = 30_000;
/** A bidder whose phone has dropped gets this long before the clock plays for them. */
const AWAY_GRACE_MS = 2000;
const REVEAL_MS = 4500;
const RESULT_MS = 5000;
const FINAL_RESULT_MS = 6500;
const STANDINGS_MS = 6500;

export interface LdState {
  players: GamePlayer[];
  /** Seat order, which is also turn order. */
  ids: string[];
  phase: LdPhase;
  round: number;
  startDice: number;
  /** Dice each player has left. 0 = out. */
  dice: Record<string, number>;
  /** This round's secret roll per player (sorted; empty once out). */
  rolls: Record<string, number[]>;
  openerId: string | null;
  turnId: string | null;
  /** When the current turn's full clock runs out — restored if an away bidder comes back. */
  turnEndsAt: number | null;
  bids: LdBid[];
  call: LdCall | null;
  /** Opens the next round: the last player to lose a die (or an exact SPOT ON caller). */
  starterId: string | null;
  outOrder: string[];
  winnerId: string | null;
  /** The heads-up finale has been announced. */
  headsUp: boolean;
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function award(state: LdState, playerId: string, points: number) {
  state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
  state.gained[playerId] = (state.gained[playerId] ?? 0) + points;
}

function nameOf(state: LdState, id: string | null): string {
  return state.players.find((p) => p.id === id)?.name ?? "Someone";
}

function living(state: LdState): string[] {
  return state.ids.filter((id) => (state.dice[id] ?? 0) > 0);
}

/** Dice rolled this round across the whole table. */
function totalDice(state: LdState): number {
  return Object.values(state.rolls).reduce((n, roll) => n + roll.length, 0);
}

/** The next seat clockwise that still has dice. */
function nextLiving(state: LdState, fromId: string): string | null {
  const start = state.ids.indexOf(fromId);
  for (let step = 1; step <= state.ids.length; step++) {
    const id = state.ids[(start + step) % state.ids.length]!;
    if (id !== fromId && (state.dice[id] ?? 0) > 0) return id;
  }
  return null;
}

function currentBid(state: LdState): LdBid | null {
  return state.bids[state.bids.length - 1] ?? null;
}

/** Views get copies so nothing downstream can hold a live reference into the state. */
function copyBid(bid: LdBid | null): LdBid | null {
  return bid ? { ...bid } : null;
}

/** Everyone still in rolls; then the opener gets the first bid. One cup left = game over. */
function nextRound(state: LdState, ctx: GameContext) {
  const alive = living(state);
  if (alive.length <= 1) return showStandings(state, ctx);
  state.round++;
  state.gained = {};
  state.bids = [];
  state.call = null;
  state.turnId = null;
  state.turnEndsAt = null;
  state.rolls = {};
  for (const id of state.ids) {
    const n = state.dice[id] ?? 0;
    state.rolls[id] = Array.from({ length: n }, () => ctx.randomInt(1, 7)).sort((a, b) => a - b);
  }
  // Round one opens with a random player; after that last round's loser does
  // (or the next seat along if they just went out).
  const starter = state.starterId;
  state.openerId = starter === null ? ctx.pick(alive) : (state.dice[starter] ?? 0) > 0 ? starter : (nextLiving(state, starter) ?? alive[0]!);
  const duel = alive.length === 2 && state.ids.length > 2 && !state.headsUp;
  if (duel) state.headsUp = true;
  state.phase = "roll";
  ctx.setDeadline(ROLL_MS);
  ctx.emit({ kind: "roll", sfx: duel ? "round.final" : "round.start", text: duel ? "Heads-up showdown!" : `Round ${state.round}`, haptic: 60 });
}

function beginTurn(state: LdState, ctx: GameContext, playerId: string) {
  state.phase = "bid";
  state.turnId = playerId;
  const full = ctx.timer(TURN_MS);
  state.turnEndsAt = ctx.now() + full;
  // A dropped phone never holds up the table: the clock plays for them after a short grace.
  ctx.setDeadline(ctx.isConnected(playerId) ? full : Math.min(full, AWAY_GRACE_MS));
  ctx.emit({ kind: "turn", playerId, haptic: [60, 40, 60], to: [playerId], tv: false });
}

function placeBid(state: LdState, ctx: GameContext, playerId: string, quantity: number, face: number, auto: boolean) {
  state.bids.push({ playerId, quantity, face, auto });
  ctx.emit({ kind: "bid", sfx: "chip.place", playerId, text: `${nameOf(state, playerId)}: ${quantity} × ${face}s` });
  const next = nextLiving(state, playerId);
  if (next === null) return showStandings(state, ctx);
  beginTurn(state, ctx, next);
}

/** LIAR! or SPOT ON! on the current bid: count the whole table and lift the cups. */
function callBid(state: LdState, ctx: GameContext, callerId: string, kind: LdCallKind, auto: boolean) {
  const bid = currentBid(state);
  if (!bid) return;
  let count = 0;
  for (const roll of Object.values(state.rolls)) for (const value of roll) if (ldIsMatch(value, bid.face)) count++;
  const correct = kind === "liar" ? count < bid.quantity : count === bid.quantity;
  state.call = {
    kind,
    callerId,
    bidderId: bid.playerId,
    quantity: bid.quantity,
    face: bid.face,
    count,
    correct,
    loserId: kind === "liar" ? (correct ? bid.playerId : callerId) : correct ? null : callerId,
    gainedDie: kind === "spotOn" && correct && (state.dice[callerId] ?? 0) < state.startDice,
    eliminatedId: null,
    auto,
  };
  state.turnId = null;
  state.turnEndsAt = null;
  state.phase = "reveal";
  ctx.setDeadline(REVEAL_MS);
  ctx.emit({ kind, sfx: "reveal.drumroll", playerId: callerId, text: `${nameOf(state, callerId)} calls ${kind === "liar" ? "LIAR" : "SPOT ON"}!`, haptic: [100, 50, 100] });
}

/** Time ran out (or the bidder is away): open with the smallest bid, otherwise call LIAR. */
function playForBidder(state: LdState, ctx: GameContext) {
  const id = state.turnId;
  if (id === null) return;
  const bid = currentBid(state);
  if (bid) return callBid(state, ctx, id, "liar", true);
  const opening = ldMinRaise(null, totalDice(state)) ?? { quantity: 1, face: LD_MIN_FACE };
  placeBid(state, ctx, id, opening.quantity, opening.face, true);
}

function eliminate(state: LdState, call: LdCall, playerId: string) {
  call.eliminatedId = playerId;
  state.outOrder.push(playerId);
  const alive = living(state);
  for (const id of alive) award(state, id, LD_OUTLAST_POINTS);
  if (alive.length === 1) {
    state.winnerId = alive[0]!;
    award(state, state.winnerId, LD_WINNER_POINTS);
  }
}

/** The verdict: dice change hands, points land, maybe someone's out. */
function resolve(state: LdState, ctx: GameContext) {
  const call = state.call;
  if (!call) return nextRound(state, ctx);
  if (call.correct) award(state, call.callerId, LD_CALL_POINTS);
  if (call.gainedDie) state.dice[call.callerId] = Math.min(state.startDice, (state.dice[call.callerId] ?? 0) + 1);
  if (call.loserId !== null) {
    const left = Math.max(0, (state.dice[call.loserId] ?? 0) - 1);
    state.dice[call.loserId] = left;
    if (left === 0) eliminate(state, call, call.loserId);
  }
  state.starterId = call.loserId ?? call.callerId;
  state.phase = "result";
  ctx.setDeadline(state.winnerId !== null ? FINAL_RESULT_MS : RESULT_MS);

  const sfx = call.eliminatedId ? "fail.jinx" : call.kind === "liar" ? (call.correct ? "reveal.caught" : "reveal.escape") : call.correct ? "win.zinger" : "fail.buzz";
  const text = call.loserId === null ? `Spot on! ${nameOf(state, call.callerId)} nailed it` : `${nameOf(state, call.loserId)} ${call.eliminatedId ? "is out of dice!" : "loses a die"}`;
  ctx.emit({ kind: "verdict", sfx, text });
  if (call.loserId !== null) ctx.emit({ kind: "loseDie", playerId: call.loserId, haptic: [150, 60, 150], to: [call.loserId], tv: false });
  if (call.correct) ctx.emit({ kind: "goodCall", playerId: call.callerId, haptic: 80, to: [call.callerId], tv: false });
}

function showStandings(state: LdState, ctx: GameContext) {
  // A table that started with a lone player: their cup is the last one standing.
  const alive = living(state);
  if (state.winnerId === null && alive.length === 1) {
    state.winnerId = alive[0]!;
    award(state, state.winnerId, LD_WINNER_POINTS);
  }
  state.phase = "standings";
  state.turnId = null;
  state.turnEndsAt = null;
  ctx.setDeadline(STANDINGS_MS);
  ctx.emit({ kind: "standings", sfx: "scores.tally" });
}

const REVEALED: LdPhase[] = ["reveal", "result"];

export const liarsdice: GameDefinition<LdState> = {
  id: "liarsdice",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const startDice = Math.max(1, Math.min(LD_MAX_DICE, Math.round(ctx.options.dice ?? LD_DEFAULT_DICE) || LD_DEFAULT_DICE));
    const state: LdState = {
      players,
      ids,
      phase: "intro",
      round: 0,
      startDice,
      dice: Object.fromEntries(ids.map((id) => [id, startDice])),
      rolls: {},
      openerId: null,
      turnId: null,
      turnEndsAt: null,
      bids: [],
      call: null,
      starterId: null,
      outOrder: [],
      winnerId: null,
      headsUp: false,
      scores: Object.fromEntries(ids.map((id) => [id, 0])),
      gained: {},
    };
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        return nextRound(state, ctx);
      case "roll": {
        const opener = state.openerId !== null && (state.dice[state.openerId] ?? 0) > 0 ? state.openerId : living(state)[0];
        if (opener === undefined) return showStandings(state, ctx);
        return beginTurn(state, ctx, opener);
      }
      case "bid":
        return playForBidder(state, ctx);
      case "reveal":
        return resolve(state, ctx);
      case "result":
        return nextRound(state, ctx);
      case "standings":
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
    if (!input || state.phase !== "bid" || state.turnId !== playerId) return;
    const prev = currentBid(state);
    if (input.type === "bid") {
      const quantity = Number(input.quantity);
      const face = Number(input.face);
      if (!ldIsRaise(prev, { quantity, face }, totalDice(state))) return;
      return placeBid(state, ctx, playerId, quantity, face, false);
    }
    if ((input.type === "liar" || input.type === "spotOn") && prev) {
      return callBid(state, ctx, playerId, input.type === "liar" ? "liar" : "spotOn", false);
    }
  },

  onConnectionChange(state, ctx, playerId, connected) {
    if (state.phase !== "bid" || state.turnId !== playerId || ctx.deadline === null) return;
    const remaining = ctx.deadline - ctx.now();
    if (!connected) {
      if (remaining > AWAY_GRACE_MS) ctx.setDeadline(AWAY_GRACE_MS);
    } else if (state.turnEndsAt !== null && state.turnEndsAt - ctx.now() > remaining) {
      // Back in time: hand them the rest of their turn.
      ctx.setDeadline(state.turnEndsAt - ctx.now());
    }
  },

  onResume(state, _ctx, pausedForMs) {
    if (state.turnEndsAt !== null) state.turnEndsAt += pausedForMs;
  },

  tvView(state): LdTv {
    const revealed = REVEALED.includes(state.phase);
    return {
      phase: state.phase,
      round: state.round,
      startDice: state.startDice,
      totalDice: totalDice(state),
      // Dice values stay under the cups until someone calls.
      seats: state.ids.map((id) => ({
        playerId: id,
        dice: state.dice[id] ?? 0,
        out: (state.dice[id] ?? 0) === 0,
        shown: revealed ? [...(state.rolls[id] ?? [])] : null,
      })),
      openerId: state.openerId,
      turnId: state.phase === "bid" ? state.turnId : null,
      bid: copyBid(currentBid(state)),
      history: state.bids.map((b) => ({ ...b })),
      call: revealed && state.call ? { ...state.call } : null,
      outOrder: [...state.outOrder],
      winnerId: state.winnerId,
      scores: sortedScores(state.scores, state.phase === "standings" || state.phase === "podium" ? state.gained : {}),
    };
  },

  playerView(state, _ctx, playerId): LdPlayer {
    const diceLeft = state.dice[playerId] ?? 0;
    const myTurn = state.phase === "bid" && state.turnId === playerId;
    const bid = currentBid(state);
    return {
      phase: state.phase,
      round: state.round,
      startDice: state.startDice,
      totalDice: totalDice(state),
      myDice: [...(state.rolls[playerId] ?? [])],
      diceLeft,
      out: diceLeft === 0,
      openerId: state.openerId,
      turnId: state.phase === "bid" ? state.turnId : null,
      myTurn,
      bid: copyBid(bid),
      history: state.bids.map((b) => ({ ...b })),
      minRaise: myTurn ? ldMinRaise(bid, totalDice(state)) : null,
      canCall: myTurn && bid !== null,
      call: REVEALED.includes(state.phase) && state.call ? { ...state.call } : null,
      winnerId: state.winnerId,
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
