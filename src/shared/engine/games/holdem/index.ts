// Hold'em Night — no-limit Texas Hold'em with party chips.
//
// Everyone starts with 1,000 chips. Each hand the button moves on, the blinds
// go in (10/20, doubling every 6 hands; heads-up the button posts the small
// blind and acts first preflop), everyone gets two hole cards, then up to four
// betting rounds around the board. A round ends once everyone who can still
// act has acted since the last full raise and matched the bet; a short all-in
// doesn't reopen the betting for players who already acted. When at most one
// player can still bet, the live hands are tabled and the board runs out on
// short beats. Pots (main + side) are cut from each player's total
// contribution. Busted players spectate; the game ends after the hand limit,
// or when one stack holds every chip.

import {
  HE_BIG_BLIND,
  HE_BLIND_LEVEL_HANDS,
  HE_HAND_CAP,
  HE_SMALL_BLIND,
  HE_START_CHIPS,
  heBlinds,
  type HeAction,
  type HeActionKind,
  type HeActionLog,
  type HeCard,
  type HePhase,
  type HePlayer,
  type HePot,
  type HeSeat,
  type HeSeatStatus,
  type HeStanding,
  type HeStreet,
  type HeTv,
} from "@party/shared";
import { freshDeck, type Card } from "../../casino/cards";
import { compareScores, type HandScore } from "../../casino/poker";
import { asRecord, rankOf, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { evaluate, handName } from "./hands";
import { buildPots, splitPot, type Contribution } from "./pots";

const INTRO_MS = 7000;
/** Blinds in, cards out: a beat to peek before the first action. */
const DEAL_MS = 2500;
const TURN_MS = 30_000;
/** A dropped phone's turn auto-acts after this. */
const AWAY_GRACE_MS = 2000;
/** A phone that comes back mid-turn gets at least this long. */
const BACK_MIN_MS = 5000;
const STREET_MS = 1500;
const RUNOUT_REVEAL_MS = 2500;
const RUNOUT_STEP_MS = 2200;
const RUNOUT_LAST_MS = 1600;
const RESULT_MS = 6000;
const SHOWDOWN_MS = 7000;
const EXTRA_POT_MS = 1000;

const ACTIONS: readonly HeAction[] = ["fold", "check", "call", "raise", "allin"];

interface Seat {
  id: string;
  chips: number;
  hole: Card[];
  inHand: boolean;
  folded: boolean;
  allIn: boolean;
  /** Chips in front of them on this street. */
  streetBet: number;
  /** Everything they put in this hand, street bets included. */
  committed: number;
  /** The bet they last acted against on this street; null = hasn't acted yet. */
  actedAt: number | null;
  lastAction: HeActionKind | null;
  startChips: number;
  won: number;
  bustedHand: number | null;
}

export interface HoldemState {
  players: GamePlayer[];
  ids: string[];
  seats: Record<string, Seat>;
  phase: HePhase;
  hand: number;
  /** 0 = last stack standing (capped at HE_HAND_CAP). */
  totalHands: number;
  buttonId: string;
  sbId: string | null;
  bbId: string | null;
  smallBlind: number;
  bigBlind: number;
  /** Never leaves the engine. */
  deck: Card[];
  board: Card[];
  street: HeStreet;
  currentBet: number;
  /** The last full bet or raise this street: the smallest legal raise increment. */
  minRaise: number;
  actorId: string | null;
  /** When the actor's full turn timer runs out (a dropped phone's grace can cut it short). */
  turnEndsAt: number | null;
  seq: number;
  log: HeActionLog | null;
  runout: boolean;
  showdown: boolean;
  /** Face up on the TV: the live hands once an all-in runout starts, or at showdown. */
  revealed: string[];
  results: HePot[];
  bustOrder: string[];
}

// ── Table helpers ──────────────────────────────────────────────────────────

const seatList = (state: HoldemState) => state.ids.map((id) => state.seats[id]!);
const dealtIn = (state: HoldemState) => seatList(state).filter((s) => s.inHand);
const liveSeats = (state: HoldemState) => dealtIn(state).filter((s) => !s.folded);
const canAct = (s: Seat) => s.inHand && !s.folded && !s.allIn;
const viewCard = (c: Card): HeCard => ({ rank: c.rank, suit: c.suit });

/** First seat clockwise after `fromId` that matches; `fromId` itself is checked last. */
function nextSeat(state: HoldemState, fromId: string, match: (s: Seat) => boolean): Seat | null {
  const n = state.ids.length;
  const start = state.ids.indexOf(fromId);
  for (let step = 1; step <= n; step++) {
    const seat = state.seats[state.ids[(start + step) % n]!]!;
    if (match(seat)) return seat;
  }
  return null;
}

/** `ids` in seat order, starting left of `fromId`. */
function clockwiseFrom(state: HoldemState, fromId: string, ids: string[]): string[] {
  const n = state.ids.length;
  const start = state.ids.indexOf(fromId);
  const out: string[] = [];
  for (let step = 1; step <= n; step++) {
    const id = state.ids[(start + step) % n]!;
    if (ids.includes(id)) out.push(id);
  }
  return out;
}

function isFinalHand(state: HoldemState): boolean {
  return state.hand >= (state.totalHands > 0 ? state.totalHands : HE_HAND_CAP);
}

function chipCounts(state: HoldemState): Record<string, number> {
  return Object.fromEntries(state.ids.map((id) => [id, state.seats[id]!.chips]));
}

function potTotal(state: HoldemState): number {
  return dealtIn(state).reduce((n, s) => n + s.committed, 0);
}

function contributions(state: HoldemState, collectedOnly: boolean): Contribution[] {
  return dealtIn(state).map((s) => ({ id: s.id, amount: s.committed - (collectedOnly ? s.streetBet : 0), live: !s.folded }));
}

/**
 * What `s` has to put in to call. Preflop the bet to match is the full big
 * blind even when it was posted short — but once nobody else can act, nobody
 * has to cover more than the other live players actually put in.
 */
function owedBy(state: HoldemState, s: Seat): number {
  const others = dealtIn(state).filter((o) => o !== s && !o.folded);
  const target = others.some(canAct) ? state.currentBet : Math.min(state.currentBet, Math.max(0, ...others.map((o) => o.streetBet)));
  return Math.max(0, target - s.streetBet);
}

/** Still owes the table a decision this street. */
function needsToAct(state: HoldemState, s: Seat): boolean {
  if (!canAct(s)) return false;
  if (owedBy(state, s) > 0) return true;
  // Matched already: only someone who hasn't acted keeps an option, and only if anyone could answer it.
  return s.actedAt === null && dealtIn(state).filter(canAct).length >= 2;
}

/**
 * May put in more than a call: not when nobody is left to answer, and not
 * after a short all-in when they've already acted and face less than a full raise.
 */
function mayRaise(state: HoldemState, s: Seat): boolean {
  if (!canAct(s) || s.chips <= owedBy(state, s)) return false;
  if (!dealtIn(state).some((o) => o !== s && canAct(o))) return false;
  return s.actedAt === null || state.currentBet - s.actedAt >= state.minRaise;
}

/** Street totals a raise may go to. `min` drops to `max` when all-in is the only raise left. */
function raiseRange(state: HoldemState, s: Seat): { min: number; max: number } {
  const max = s.streetBet + s.chips;
  return { min: Math.min(max, state.currentBet + state.minRaise), max };
}

function commit(s: Seat, amount: number): number {
  const paid = Math.max(0, Math.min(s.chips, Math.floor(amount)));
  s.chips -= paid;
  s.streetBet += paid;
  s.committed += paid;
  if (s.chips === 0) s.allIn = true;
  return paid;
}

function award(state: HoldemState, id: string, chips: number) {
  const s = state.seats[id]!;
  s.chips += chips;
  s.won += chips;
}

/** A dropped phone gets a short grace — unless every phone is gone (the TV probably just refreshed). */
function isAway(state: HoldemState, ctx: GameContext, id: string): boolean {
  return !ctx.isConnected(id) && state.ids.some((other) => other !== id && ctx.isConnected(other));
}

// ── Hand flow ──────────────────────────────────────────────────────────────

function startHand(state: HoldemState, ctx: GameContext) {
  state.hand++;
  const hasChips = (s: Seat) => s.chips > 0;
  if (state.hand > 1 || !hasChips(state.seats[state.buttonId]!)) state.buttonId = nextSeat(state, state.buttonId, hasChips)!.id;
  const { small, big } = heBlinds(state.hand);
  const blindsUp = state.hand > 1 && big > state.bigBlind;
  state.smallBlind = small;
  state.bigBlind = big;

  for (const s of seatList(state)) {
    s.hole = [];
    s.inHand = s.chips > 0;
    s.folded = false;
    s.allIn = false;
    s.streetBet = 0;
    s.committed = 0;
    s.actedAt = null;
    s.lastAction = null;
    s.startChips = s.chips;
    s.won = 0;
  }
  const dealt = dealtIn(state);
  // Heads-up the button is the small blind.
  const sb = dealt.length === 2 ? state.seats[state.buttonId]! : nextSeat(state, state.buttonId, (s) => s.inHand)!;
  const bb = nextSeat(state, sb.id, (s) => s.inHand)!;
  state.sbId = sb.id;
  state.bbId = bb.id;

  state.deck = freshDeck(1, ctx.random);
  state.board = [];
  state.street = "preflop";
  state.actorId = null;
  state.turnEndsAt = null;
  state.runout = false;
  state.showdown = false;
  state.revealed = [];
  state.results = [];
  // One card at a time, starting left of the button.
  const order = clockwiseFrom(state, state.buttonId, dealt.map((s) => s.id));
  for (let round = 0; round < 2; round++) for (const id of order) state.seats[id]!.hole.push(state.deck.shift()!);

  postBlind(state, sb, small, "sb");
  postBlind(state, bb, big, "bb");
  // The full big blind is the bet to match, even when the big blind couldn't cover it.
  state.currentBet = big;
  state.minRaise = big;
  state.phase = "deal";
  ctx.setDeadline(DEAL_MS);
  const final = isFinalHand(state);
  ctx.emit({
    kind: "hand",
    // A fanfare for the big moments, a quick shuffle-swish for the rest.
    sfx: final ? "round.final" : blindsUp || state.hand === 1 ? "round.start" : "card.shuffle",
    text: final ? "Final hand!" : blindsUp ? `Blinds up: ${small}/${big}` : `Hand ${state.hand}`,
    haptic: 40,
  });
}

function postBlind(state: HoldemState, s: Seat, amount: number, kind: "sb" | "bb") {
  const paid = commit(s, amount);
  s.lastAction = kind;
  state.log = { playerId: s.id, kind, amount: paid, allIn: s.allIn, auto: false };
}

function beginBetting(state: HoldemState, ctx: GameContext) {
  state.phase = "betting";
  // Preflop the action starts left of the big blind (heads-up: the button); later streets left of the button.
  const from = state.street === "preflop" ? state.bbId ?? state.buttonId : state.buttonId;
  const first = nextSeat(state, from, (s) => needsToAct(state, s));
  if (!first) return endRound(state, ctx);
  startTurn(state, ctx, first);
}

function startTurn(state: HoldemState, ctx: GameContext, s: Seat) {
  state.phase = "betting";
  state.actorId = s.id;
  const ms = ctx.timer(TURN_MS);
  state.turnEndsAt = ctx.now() + ms;
  ctx.setDeadline(isAway(state, ctx, s.id) ? AWAY_GRACE_MS : ms);
  ctx.emit({ kind: "turn", playerId: s.id, to: [s.id], tv: false, haptic: [60, 40, 60] });
}

/** Applies one action. Returns false (and changes nothing) when it isn't legal right now. */
function act(state: HoldemState, ctx: GameContext, s: Seat, action: HeAction, amount: number, auto: boolean): boolean {
  const owed = owedBy(state, s);
  let kind: HeActionKind;
  let logged = 0;
  let sfx = "chip.place";
  switch (action) {
    case "fold":
      s.folded = true;
      kind = "fold";
      sfx = "ui.whoosh";
      break;
    case "check":
      if (owed > 0) return false;
      kind = "check";
      sfx = "ui.tick";
      break;
    case "call":
      if (owed <= 0) return false;
      logged = commit(s, owed);
      kind = "call";
      break;
    case "raise":
    case "allin": {
      if (!mayRaise(state, s)) {
        // All in for no more than the call is just a call.
        if (action === "allin" && owed > 0 && s.chips <= owed) return act(state, ctx, s, "call", 0, auto);
        return false;
      }
      const { min, max } = raiseRange(state, s);
      const target = action === "allin" ? max : Math.round(amount);
      if (!Number.isFinite(target)) return false;
      const to = Math.max(min, Math.min(max, target));
      kind = state.currentBet === 0 ? "bet" : "raise";
      // Only a full raise sets a new minimum; a short all-in leaves it alone.
      if (to - state.currentBet >= state.minRaise) state.minRaise = to - state.currentBet;
      commit(s, to - s.streetBet);
      state.currentBet = to;
      logged = to;
      break;
    }
    default:
      return false;
  }
  s.actedAt = state.currentBet;
  s.lastAction = kind;
  state.log = { playerId: s.id, kind, amount: logged, allIn: s.allIn, auto };
  state.seq++;
  ctx.emit({ kind: "action", sfx: s.allIn && kind !== "fold" ? "reveal.caught" : sfx, playerId: s.id });
  return true;
}

function afterAction(state: HoldemState, ctx: GameContext, lastId: string) {
  const standing = liveSeats(state);
  if (standing.length === 1) return winByFold(state, ctx, standing[0]!);
  const next = nextSeat(state, lastId, (s) => needsToAct(state, s));
  if (next) return startTurn(state, ctx, next);
  endRound(state, ctx);
}

function onTurnTimeout(state: HoldemState, ctx: GameContext) {
  const s = state.actorId ? state.seats[state.actorId] : undefined;
  if (!s || !needsToAct(state, s)) {
    // Shouldn't happen — hand the turn to whoever owes a decision so the hand can't stall.
    const next = nextSeat(state, state.buttonId, (o) => needsToAct(state, o));
    return next ? startTurn(state, ctx, next) : endRound(state, ctx);
  }
  act(state, ctx, s, owedBy(state, s) === 0 ? "check" : "fold", 0, true);
  afterAction(state, ctx, s.id);
}

/** The part of a bet nobody matched goes back to its owner. */
function returnUncalled(state: HoldemState) {
  const [top, second] = dealtIn(state).sort((a, b) => b.streetBet - a.streetBet);
  const matched = second?.streetBet ?? 0;
  if (!top || top.folded || top.streetBet <= matched) return;
  const extra = top.streetBet - matched;
  top.streetBet -= extra;
  top.committed -= extra;
  top.chips += extra;
  top.allIn = false;
}

/** Sweeps the street's bets into the pot and resets the betting. */
function collectBets(state: HoldemState) {
  for (const s of seatList(state)) {
    s.streetBet = 0;
    s.actedAt = null;
    s.lastAction = null;
  }
  state.currentBet = 0;
  state.minRaise = state.bigBlind;
}

function endRound(state: HoldemState, ctx: GameContext) {
  returnUncalled(state);
  collectBets(state);
  state.actorId = null;
  state.turnEndsAt = null;
  if (state.board.length >= 5) return showdown(state, ctx);
  if (dealtIn(state).filter(canAct).length <= 1) {
    // Nobody left to bet against: table the hands and run out the board.
    state.runout = true;
    state.revealed = liveSeats(state).map((s) => s.id);
    state.phase = "street";
    ctx.setDeadline(RUNOUT_REVEAL_MS);
    ctx.emit({ kind: "runout", sfx: "reveal.drumroll" });
    return;
  }
  dealStreet(state, ctx);
  state.phase = "street";
  ctx.setDeadline(STREET_MS);
}

function dealStreet(state: HoldemState, ctx: GameContext) {
  const count = state.board.length === 0 ? 3 : 1;
  for (let i = 0; i < count; i++) state.board.push(state.deck.shift()!);
  state.street = state.board.length === 3 ? "flop" : state.board.length === 4 ? "turn" : "river";
  ctx.emit({ kind: "street", sfx: "card.flip" });
}

function onStreetDone(state: HoldemState, ctx: GameContext) {
  if (!state.runout) return beginBetting(state, ctx);
  if (state.board.length >= 5) return showdown(state, ctx);
  dealStreet(state, ctx);
  ctx.setDeadline(state.board.length >= 5 ? RUNOUT_LAST_MS : RUNOUT_STEP_MS);
}

function showdown(state: HoldemState, ctx: GameContext) {
  const contenders = liveSeats(state);
  const scores: Record<string, HandScore> = {};
  for (const s of contenders) scores[s.id] = evaluate(s.hole, state.board)!;
  state.results = buildPots(contributions(state, false)).map((pot): HePot => {
    let best: HandScore | null = null;
    let winners: string[] = [];
    for (const id of pot.eligibleIds) {
      const score = scores[id]!;
      const diff = best ? compareScores(score.scoreKey, best.scoreKey) : 1;
      if (diff > 0) {
        best = score;
        winners = [id];
      } else if (diff === 0) winners.push(id);
    }
    // Odd chips go to the first winner left of the button.
    const ordered = clockwiseFrom(state, state.buttonId, winners);
    for (const [id, chips] of Object.entries(splitPot(pot.amount, ordered))) award(state, id, chips);
    return { amount: pot.amount, eligibleIds: pot.eligibleIds, winnerIds: ordered, handLabel: best ? handName(best) : null };
  });
  state.showdown = true;
  state.revealed = contenders.map((s) => s.id);
  finishHand(state, ctx);
}

function winByFold(state: HoldemState, ctx: GameContext, winner: Seat) {
  returnUncalled(state);
  collectBets(state);
  const total = potTotal(state);
  award(state, winner.id, total);
  state.results = [{ amount: total, eligibleIds: [winner.id], winnerIds: [winner.id], handLabel: null }];
  state.showdown = false;
  finishHand(state, ctx);
}

function finishHand(state: HoldemState, ctx: GameContext) {
  state.phase = "result";
  state.actorId = null;
  state.turnEndsAt = null;
  for (const s of dealtIn(state)) {
    if (s.chips > 0 || s.bustedHand !== null) continue;
    s.bustedHand = state.hand;
    state.bustOrder.push(s.id);
    ctx.emit({ kind: "bust", playerId: s.id, to: [s.id], text: "You're out of chips!", haptic: [200, 80, 200] });
  }
  const winners = [...new Set(state.results.flatMap((p) => p.winnerIds))];
  const extraPots = Math.min(3, Math.max(0, state.results.length - 1));
  ctx.setDeadline((state.showdown ? SHOWDOWN_MS : RESULT_MS) + extraPots * EXTRA_POT_MS);
  ctx.emit({ kind: state.showdown ? "showdown" : "win", sfx: state.showdown ? "win.zinger" : "chips.collide", to: winners, haptic: [80, 40, 160] });
}

function afterResult(state: HoldemState, ctx: GameContext) {
  const left = seatList(state).filter((s) => s.chips > 0).length;
  if (left > 1 && !isFinalHand(state)) return startHand(state, ctx);
  state.phase = "podium";
  state.actorId = null;
  ctx.setDeadline(null);
  ctx.finish();
  ctx.emit({ kind: "podium", sfx: "win.big" });
}

// ── Views ──────────────────────────────────────────────────────────────────

function statusOf(s: Seat): HeSeatStatus {
  if (s.bustedHand !== null) return "out";
  if (!s.inHand) return "waiting";
  if (s.folded) return "folded";
  return s.allIn ? "allin" : "in";
}

function blindOf(state: HoldemState, id: string): "sb" | "bb" | null {
  if (state.phase === "intro" || state.phase === "podium") return null;
  return state.sbId === id ? "sb" : state.bbId === id ? "bb" : null;
}

function potsView(state: HoldemState): HePot[] {
  if (state.phase === "result") return state.results;
  if (state.phase === "intro" || state.phase === "podium") return [];
  return buildPots(contributions(state, true)).map((p) => ({ ...p, winnerIds: [], handLabel: null }));
}

function seatView(state: HoldemState, s: Seat, player: GamePlayer): HeSeat {
  const playing = state.phase !== "intro" && state.phase !== "podium";
  const result = state.phase === "result";
  // Hole cards reach the TV only for hands headed to (or at) showdown.
  const open = playing && state.revealed.includes(s.id) && s.hole.length > 0;
  const score = open ? evaluate(s.hole, state.board) : null;
  return {
    playerId: s.id,
    name: player.name,
    character: player.character,
    chips: s.chips,
    bet: s.streetBet,
    status: statusOf(s),
    holding: playing && s.inHand && !s.folded && s.hole.length > 0,
    isButton: playing && state.buttonId === s.id,
    blind: blindOf(state, s.id),
    lastAction: s.lastAction,
    cards: open ? s.hole.map(viewCard) : null,
    handLabel: score ? handName(score) : null,
    bestCards: score && result && state.showdown ? score.best.map(viewCard) : null,
    won: result ? s.won : 0,
    delta: result ? s.chips - s.startChips : 0,
  };
}

function standings(state: HoldemState): HeStanding[] {
  // Busted players rank by how long they lasted.
  const outAt = (id: string) => state.bustOrder.indexOf(id);
  return state.ids
    .map((id) => ({ playerId: id, chips: state.seats[id]!.chips, delta: state.seats[id]!.chips - HE_START_CHIPS }))
    .sort((a, b) => b.chips - a.chips || outAt(b.playerId) - outAt(a.playerId));
}

function blindInfo(state: HoldemState) {
  const hand = Math.max(1, state.hand);
  return {
    blindsUp: state.hand > 1 && heBlinds(state.hand).big > heBlinds(state.hand - 1).big,
    handsUntilBlindsUp: HE_BLIND_LEVEL_HANDS - ((hand - 1) % HE_BLIND_LEVEL_HANDS),
  };
}

function emptySeat(id: string): Seat {
  return { id, chips: 0, hole: [], inHand: false, folded: false, allIn: false, streetBet: 0, committed: 0, actedAt: null, lastAction: null, startChips: 0, won: 0, bustedHand: null };
}

export const holdem: GameDefinition<HoldemState> = {
  id: "holdem",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const raw = Number(ctx.options.hands ?? 0);
    const seats: Record<string, Seat> = {};
    for (const id of ids) seats[id] = { ...emptySeat(id), chips: HE_START_CHIPS, startChips: HE_START_CHIPS };
    const state: HoldemState = {
      players,
      ids,
      seats,
      phase: "intro",
      hand: 0,
      totalHands: Number.isFinite(raw) && raw > 0 ? Math.min(HE_HAND_CAP, Math.floor(raw)) : 0,
      buttonId: ids[ctx.randomInt(0, ids.length)]!,
      sbId: null,
      bbId: null,
      smallBlind: HE_SMALL_BLIND,
      bigBlind: HE_BIG_BLIND,
      deck: [],
      board: [],
      street: "preflop",
      currentBet: 0,
      minRaise: HE_BIG_BLIND,
      actorId: null,
      turnEndsAt: null,
      seq: 0,
      log: null,
      runout: false,
      showdown: false,
      revealed: [],
      results: [],
      bustOrder: [],
    };
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        return startHand(state, ctx);
      case "deal":
        return beginBetting(state, ctx);
      case "betting":
        return onTurnTimeout(state, ctx);
      case "street":
        return onStreetDone(state, ctx);
      case "result":
        return afterResult(state, ctx);
      case "podium":
        return;
    }
  },

  onInput(state, ctx, playerId, raw) {
    const input = asRecord(raw);
    if (!input || input.type !== "act" || state.phase !== "betting" || state.actorId !== playerId) return;
    const seat = state.seats[playerId];
    // "bet" is just a raise with nothing to raise yet.
    const action = ACTIONS.find((a) => a === (input.action === "bet" ? "raise" : input.action));
    if (!seat || !action) return;
    if (act(state, ctx, seat, action, Number(input.amount), false)) afterAction(state, ctx, playerId);
  },

  onConnectionChange(state, ctx, playerId, connected) {
    if (state.phase !== "betting" || state.actorId !== playerId) return;
    const now = ctx.now();
    const left = (ctx.deadline ?? now) - now;
    if (!connected) {
      if (isAway(state, ctx, playerId) && left > AWAY_GRACE_MS) ctx.setDeadline(AWAY_GRACE_MS);
      return;
    }
    // Back in time: they get the rest of their turn (and never less than a few seconds).
    ctx.setDeadline(Math.max(BACK_MIN_MS, left, (state.turnEndsAt ?? now) - now));
  },

  onResume(state, _ctx, pausedForMs) {
    if (state.turnEndsAt !== null) state.turnEndsAt += pausedForMs;
  },

  tvView(state): HeTv {
    const actor = state.phase === "betting" && state.actorId ? state.seats[state.actorId] : undefined;
    return {
      phase: state.phase,
      hand: state.hand,
      totalHands: state.totalHands,
      finalHand: state.hand > 0 && isFinalHand(state),
      smallBlind: state.smallBlind,
      bigBlind: state.bigBlind,
      ...blindInfo(state),
      headsUp: dealtIn(state).length === 2,
      street: state.street,
      board: state.board.map(viewCard),
      pots: potsView(state),
      potTotal: potTotal(state),
      currentBet: state.currentBet,
      seats: state.players.map((p) => seatView(state, state.seats[p.id]!, p)),
      actorId: actor ? actor.id : null,
      toCall: actor ? Math.min(actor.chips, owedBy(state, actor)) : 0,
      log: state.log,
      seq: state.seq,
      runout: state.runout,
      showdown: state.showdown,
      standings: standings(state),
    };
  },

  playerView(state, _ctx, playerId): HePlayer {
    const s = state.seats[playerId] ?? emptySeat(playerId);
    const myTurn = state.phase === "betting" && state.actorId === playerId;
    const owed = s.inHand && !s.folded ? owedBy(state, s) : 0;
    const raise = myTurn && mayRaise(state, s);
    const range = raiseRange(state, s);
    const score = evaluate(s.hole, state.board);
    const result = state.phase === "result";
    const busted = s.bustedHand;
    return {
      phase: state.phase,
      hand: state.hand,
      totalHands: state.totalHands,
      finalHand: state.hand > 0 && isFinalHand(state),
      smallBlind: state.smallBlind,
      bigBlind: state.bigBlind,
      street: state.street,
      board: state.board.map(viewCard),
      // Only ever this player's own cards.
      cards: s.hole.map(viewCard),
      handLabel: score ? handName(score) : null,
      status: statusOf(s),
      chips: s.chips,
      bet: s.streetBet,
      isButton: state.phase !== "intro" && state.phase !== "podium" && state.buttonId === playerId,
      blind: blindOf(state, playerId),
      potTotal: potTotal(state),
      currentBet: state.currentBet,
      toCall: Math.min(owed, s.chips),
      actorId: state.phase === "betting" ? state.actorId : null,
      myTurn,
      seq: state.seq,
      canCheck: myTurn && owed === 0,
      canCall: myTurn && owed > 0,
      canRaise: raise,
      minRaiseTo: raise ? range.min : 0,
      maxRaiseTo: raise ? range.max : 0,
      isBet: state.currentBet === 0,
      log: state.log,
      runout: state.runout,
      showdown: state.showdown,
      results: result ? state.results : [],
      won: result ? s.won : 0,
      delta: result ? s.chips - s.startChips : 0,
      rank: rankOf(chipCounts(state), playerId),
      place: busted === null ? null : 1 + seatList(state).filter((o) => o.bustedHand === null || o.bustedHand > busted).length,
      playersLeft: seatList(state).filter((o) => o.chips > 0).length,
    };
  },

  scores(state) {
    return chipCounts(state);
  },
};
