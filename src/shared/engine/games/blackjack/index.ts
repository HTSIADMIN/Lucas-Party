// Blackjack Bash — everyone versus the TV's dealer.
//
// Each hand: bet (at least 10% of your chips; broke players find pocket lint),
// a casino-order deal from a 6-deck shoe, then the whole table plays at once —
// hit, stand or double on your phone. A dealer blackjack ends the hand before
// anyone acts. Otherwise the dealer flips the hole card and draws one card per
// beat (stands on all 17s). Blackjack pays 3:2. Party twist: one Peek per
// game shows you the hole card — on your phone only.

import {
  BJ_BROKE_BELOW,
  BJ_POCKET_LINT,
  BJ_START_CHIPS,
  bjMinBet,
  type BjCard,
  type BjDealerView,
  type BjHandStatus,
  type BjOutcome,
  type BjPhase,
  type BjPlayer,
  type BjSeat,
  type BjStanding,
  type BjTv,
} from "@party/shared";
import { BLACKJACK_RETURN, dealerShouldHit, handValue, isBlackjack, outcomeOf } from "../../casino/blackjack";
import { cardValue, freshDeck, type Card } from "../../casino/cards";
import { asRecord, rankOf, type GameContext, type GameDefinition, type GamePlayer } from "../../types";

const INTRO_MS = 7000;
const BET_MS = 20_000;
const PLAY_MS = 25_000;
/** The hole card flips, then each dealer card gets its own beat. */
const REVEAL_MS = 1300;
const DRAW_MS = 900;
const DEALER_BLACKJACK_MS = 2600;
const RESULTS_MS = 6500;
const STANDINGS_MS = 5000;
const GRACE_MS = 1000;
const DEFAULT_HANDS = 8;
const SHOE_DECKS = 6;
const RESHUFFLE_BELOW = 52;

interface Hand {
  playerId: string;
  /** The whole stake on the table — a double doubles it. */
  bet: number;
  cards: Card[];
  status: BjHandStatus;
  doubled: boolean;
  outcome: BjOutcome | null;
  payout: number | null;
}

export interface BlackjackState {
  players: GamePlayer[];
  ids: string[];
  phase: BjPhase;
  hand: number;
  totalHands: number;
  chips: Record<string, number>;
  /** Chips won or lost on the last settled hand. */
  deltas: Record<string, number>;
  /** Bet phase: what each player has put down so far. */
  slips: Record<string, number>;
  /** This hand's seats. Players without one are sitting out. */
  hands: Record<string, Hand>;
  shoe: Card[];
  dealer: Card[];
  holeRevealed: boolean;
  /** playerId → the hand they spent their one Peek on. */
  peekedOn: Record<string, number>;
}

function isFinalHand(state: BlackjackState) {
  return state.hand === state.totalHands;
}

function nameOf(state: BlackjackState, id: string) {
  return state.players.find((p) => p.id === id)?.name ?? "Someone";
}

function clampBet(chips: number, amount: number) {
  return Math.max(bjMinBet(chips), Math.min(chips, Math.round(amount)));
}

function draw(state: BlackjackState, ctx: GameContext): Card {
  // The reshuffle before each deal keeps a full deck in the shoe; this is a backstop.
  if (state.shoe.length === 0) state.shoe = freshDeck(SHOE_DECKS, ctx.random);
  return state.shoe.pop()!;
}

function startBetting(state: BlackjackState, ctx: GameContext) {
  state.phase = "bet";
  state.slips = {};
  state.hands = {};
  state.dealer = [];
  state.holeRevealed = false;
  for (const id of state.ids) {
    const chips = state.chips[id] ?? 0;
    if (chips >= BJ_BROKE_BELOW) continue;
    state.chips[id] = chips + BJ_POCKET_LINT;
    // The room hears about it on the TV; the lucky finder gets their own toast.
    ctx.emit({ kind: "lint", sfx: "coin.drop", text: `${nameOf(state, id)} found some pocket lint: +${BJ_POCKET_LINT} chips`, to: [] });
    ctx.emit({ kind: "lint", text: `You found some pocket lint: +${BJ_POCKET_LINT} chips`, to: [id], tv: false, haptic: 80 });
  }
  ctx.setDeadline(ctx.timer(BET_MS));
  const final = isFinalHand(state);
  ctx.emit({ kind: "bet", sfx: final ? "round.final" : "round.start", text: final ? "Final hand!" : `Hand ${state.hand}`, haptic: 50 });
}

function deal(state: BlackjackState, ctx: GameContext) {
  if (state.shoe.length < RESHUFFLE_BELOW) state.shoe = freshDeck(SHOE_DECKS, ctx.random);
  // A phone that's away and never bet sits the hand out instead of bleeding chips.
  const seated = state.ids.filter((id) => state.slips[id] !== undefined || ctx.isConnected(id));
  for (const id of seated) {
    const chips = state.chips[id] ?? 0;
    const bet = clampBet(chips, state.slips[id] ?? bjMinBet(chips));
    state.chips[id] = chips - bet;
    state.hands[id] = { playerId: id, bet, cards: [], status: "playing", doubled: false, outcome: null, payout: null };
  }
  // Casino order: a card each and the dealer's up card, then a second card each and the hole card.
  for (let pass = 0; pass < 2; pass++) {
    for (const id of seated) state.hands[id]!.cards.push(draw(state, ctx));
    state.dealer.push(draw(state, ctx));
  }
  const naturals = seated.filter((id) => isBlackjack(state.hands[id]!.cards));
  for (const id of naturals) state.hands[id]!.status = "blackjack";
  ctx.emit({ kind: "deal", sfx: "card.deal", to: seated, haptic: [30, 40, 30] });

  if (isBlackjack(state.dealer)) {
    // The dealer peeks before anyone acts: blackjack settles the hand on the spot.
    for (const hand of Object.values(state.hands)) if (hand.status === "playing") hand.status = "stood";
    state.phase = "dealer";
    state.holeRevealed = true;
    ctx.setDeadline(DEALER_BLACKJACK_MS);
    ctx.emit({ kind: "dealerBlackjack", sfx: "fail.jinx", text: "Dealer blackjack!" });
    return;
  }
  for (const id of naturals) ctx.emit({ kind: "blackjack", sfx: "win.zinger", playerId: id, to: [id], haptic: [60, 40, 140] });
  state.phase = "play";
  ctx.setDeadline(ctx.timer(PLAY_MS));
  checkProgress(state, ctx);
}

/** One card on a live hand: a bust ends it, and 21 stands by itself. */
function hit(state: BlackjackState, ctx: GameContext, hand: Hand) {
  hand.cards.push(draw(state, ctx));
  const { total } = handValue(hand.cards);
  if (total > 21) {
    hand.status = "bust";
    ctx.emit({ kind: "bust", sfx: "fail.buzz", playerId: hand.playerId, to: [hand.playerId], haptic: [140, 60, 140] });
    return;
  }
  if (total === 21) hand.status = "stood";
  ctx.emit({ kind: "hit", sfx: "card.deal", playerId: hand.playerId });
}

function canDouble(state: BlackjackState, hand: Hand) {
  return hand.status === "playing" && hand.cards.length === 2 && (state.chips[hand.playerId] ?? 0) >= hand.bet;
}

function startDealer(state: BlackjackState, ctx: GameContext) {
  // Out of time = stand.
  for (const hand of Object.values(state.hands)) if (hand.status === "playing") hand.status = "stood";
  state.phase = "dealer";
  state.holeRevealed = true;
  ctx.setDeadline(REVEAL_MS);
  ctx.emit({ kind: "reveal", sfx: "card.flip" });
}

function dealerStep(state: BlackjackState, ctx: GameContext) {
  // The dealer only draws while someone is still standing on a live hand.
  const contested = Object.values(state.hands).some((h) => h.status === "stood");
  if (contested && dealerShouldHit(state.dealer)) {
    state.dealer.push(draw(state, ctx));
    ctx.setDeadline(DRAW_MS);
    ctx.emit({ kind: "dealerDraw", sfx: "card.deal" });
    return;
  }
  settle(state, ctx);
}

function settle(state: BlackjackState, ctx: GameContext) {
  state.deltas = {};
  for (const hand of Object.values(state.hands)) {
    const outcome = outcomeOf(hand.cards, state.dealer);
    hand.outcome = outcome;
    hand.payout = Math.floor(hand.bet * BLACKJACK_RETURN[outcome]);
    state.chips[hand.playerId] = (state.chips[hand.playerId] ?? 0) + hand.payout;
    state.deltas[hand.playerId] = hand.payout - hand.bet;
    const haptic = hand.payout > hand.bet ? [60, 40, 140] : hand.payout === hand.bet ? 40 : 220;
    ctx.emit({ kind: "settle", playerId: hand.playerId, to: [hand.playerId], tv: false, haptic });
  }
  state.phase = "results";
  ctx.setDeadline(RESULTS_MS);
  if (handValue(state.dealer).total > 21) ctx.emit({ kind: "dealerBust", sfx: "win.zinger", text: "Dealer busts!" });
  else ctx.emit({ kind: "results", sfx: "reveal.votes" });
}

/** Everyone who can still act has acted: wrap the phase up after a short beat. */
function checkProgress(state: BlackjackState, ctx: GameContext) {
  let waiting: string[];
  if (state.phase === "bet") waiting = state.ids.filter((id) => state.slips[id] === undefined);
  else if (state.phase === "play") waiting = Object.values(state.hands).filter((h) => h.status === "playing").map((h) => h.playerId);
  else return;
  // Away phones never hold up the table.
  if (waiting.some((id) => ctx.isConnected(id))) return;
  if (ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

function cardView(card: Card): BjCard {
  return { rank: card.rank, suit: card.suit };
}

/** The dealer's hand as a viewer sees it: the hole card stays face-down until revealed (or peeked). */
function dealerView(state: BlackjackState, seesHole: boolean): BjDealerView {
  const visible = seesHole || state.holeRevealed;
  const full = visible && state.dealer.length > 0 ? handValue(state.dealer) : null;
  const up = state.dealer[0];
  return {
    dealer: state.dealer.map((c, i) => (i === 1 && !visible ? null : cardView(c))),
    dealerTotal: full?.total ?? null,
    dealerSoft: full?.soft ?? false,
    dealerShows: !visible && up ? cardValue(up) : null,
    dealerBlackjack: visible && isBlackjack(state.dealer),
    dealerBust: full !== null && full.total > 21,
  };
}

function inHand(state: BlackjackState) {
  return state.phase === "play" || state.phase === "dealer" || state.phase === "results";
}

function seatView(state: BlackjackState, id: string): BjSeat {
  const hand = state.hands[id];
  const value = hand ? handValue(hand.cards) : { total: 0, soft: false };
  const betting = state.phase === "bet";
  return {
    playerId: id,
    chips: state.chips[id] ?? 0,
    bet: betting ? state.slips[id] ?? null : hand?.bet ?? null,
    sittingOut: inHand(state) && !hand,
    cards: hand ? hand.cards.map(cardView) : [],
    total: value.total,
    soft: value.soft,
    status: hand?.status ?? null,
    doubled: hand?.doubled ?? false,
    peeked: Boolean(hand) && state.peekedOn[id] === state.hand,
    outcome: hand?.outcome ?? null,
    delta: hand?.outcome ? state.deltas[id] ?? 0 : null,
  };
}

function standingsList(state: BlackjackState): BjStanding[] {
  return state.ids
    .map((playerId) => ({ playerId, chips: state.chips[playerId] ?? 0, delta: state.deltas[playerId] ?? 0 }))
    .sort((a, b) => b.chips - a.chips);
}

function handsOption(ctx: GameContext) {
  const n = Number(ctx.options.rounds ?? DEFAULT_HANDS);
  return Number.isFinite(n) && n >= 1 ? Math.min(50, Math.floor(n)) : DEFAULT_HANDS;
}

export const blackjack: GameDefinition<BlackjackState> = {
  id: "blackjack",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const state: BlackjackState = {
      players,
      ids,
      phase: "intro",
      hand: 1,
      totalHands: handsOption(ctx),
      chips: Object.fromEntries(ids.map((id) => [id, BJ_START_CHIPS])),
      deltas: {},
      slips: {},
      hands: {},
      shoe: freshDeck(SHOE_DECKS, ctx.random),
      dealer: [],
      holeRevealed: false,
      peekedOn: {},
    };
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        return startBetting(state, ctx);
      case "bet":
        return deal(state, ctx);
      case "play":
        return startDealer(state, ctx);
      case "dealer":
        return dealerStep(state, ctx);
      case "results":
        state.phase = "standings";
        ctx.emit({ kind: "standings", sfx: "scores.tally" });
        return ctx.setDeadline(STANDINGS_MS);
      case "standings":
        if (state.hand < state.totalHands) {
          state.hand++;
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

  onInput(state, ctx, playerId, raw) {
    const input = asRecord(raw);
    if (!input || !state.ids.includes(playerId)) return;

    if (input.type === "bet") {
      if (state.phase !== "bet" || typeof input.amount !== "number" || !Number.isFinite(input.amount)) return;
      state.slips[playerId] = clampBet(state.chips[playerId] ?? 0, input.amount);
      ctx.emit({ kind: "betPlaced", sfx: "chip.place", playerId });
      return checkProgress(state, ctx);
    }

    if (state.phase !== "play") return;
    const hand = state.hands[playerId];
    if (!hand || hand.status !== "playing") return;
    // Phones send the hand size they were looking at: a stale or repeated tap is dropped.
    if (input.cards !== undefined && Number(input.cards) !== hand.cards.length) return;

    switch (input.type) {
      case "hit":
        hit(state, ctx, hand);
        break;
      case "stand":
        hand.status = "stood";
        ctx.emit({ kind: "stand", sfx: "ui.click", playerId });
        break;
      case "double":
        if (!canDouble(state, hand)) return;
        state.chips[playerId] = (state.chips[playerId] ?? 0) - hand.bet;
        hand.bet *= 2;
        hand.doubled = true;
        ctx.emit({ kind: "double", sfx: "chip.place", playerId });
        // Exactly one card, then stand.
        hit(state, ctx, hand);
        if (hand.status === "playing") hand.status = "stood";
        break;
      case "peek":
        if (state.peekedOn[playerId] !== undefined) return;
        state.peekedOn[playerId] = state.hand;
        ctx.emit({ kind: "peek", sfx: "ui.pop", playerId, to: [playerId], haptic: 40 });
        return;
      default:
        return;
    }
    checkProgress(state, ctx);
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): BjTv {
    // The TV is public: the hole card stays null here until the dealer flips it.
    return {
      phase: state.phase,
      hand: state.hand,
      totalHands: state.totalHands,
      finalHand: isFinalHand(state),
      ...dealerView(state, false),
      seats: state.ids.map((id) => seatView(state, id)),
      standings: standingsList(state),
    };
  },

  playerView(state, _ctx, playerId): BjPlayer {
    const chips = state.chips[playerId] ?? 0;
    const hand = state.hands[playerId];
    const value = hand ? handValue(hand.cards) : { total: 0, soft: false };
    const betting = state.phase === "bet";
    const live = state.phase === "play" && hand?.status === "playing";
    const peekLeft = state.peekedOn[playerId] === undefined;
    const peeked = Boolean(hand) && state.peekedOn[playerId] === state.hand;
    return {
      phase: state.phase,
      hand: state.hand,
      totalHands: state.totalHands,
      finalHand: isFinalHand(state),
      chips,
      minBet: bjMinBet(chips),
      bet: betting ? state.slips[playerId] ?? null : hand?.bet ?? null,
      locked: betting && state.slips[playerId] !== undefined,
      sittingOut: inHand(state) && !hand,
      cards: hand ? hand.cards.map(cardView) : [],
      total: value.total,
      soft: value.soft,
      status: hand?.status ?? null,
      doubled: hand?.doubled ?? false,
      canAct: live,
      canDouble: live && hand !== undefined && canDouble(state, hand),
      peekLeft,
      canPeek: live && peekLeft,
      peeked,
      // Only the peeker's own view ever carries the hole card early.
      ...dealerView(state, peeked),
      outcome: hand?.outcome ?? null,
      delta: hand?.outcome ? state.deltas[playerId] ?? 0 : null,
      lastDelta: state.deltas[playerId] ?? 0,
      rank: rankOf(state.chips, playerId),
    };
  },

  scores(state) {
    return state.chips;
  },
};
