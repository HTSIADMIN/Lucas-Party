// Hold'em Night — no-limit Texas Hold'em with party chips. The TV is the
// table (board, pots, seats, the showdown); every phone holds two private hole
// cards and the action buttons. These are the plain view/input shapes shared
// by the engine and the views — engine card types stay in the engine, so the
// views get their own `HeCard`.

import type { CharacterId } from "../characters";

export const HE_START_CHIPS = 1000;
export const HE_SMALL_BLIND = 10;
export const HE_BIG_BLIND = 20;
/** Blinds double every this many hands. */
export const HE_BLIND_LEVEL_HANDS = 6;
/** No game runs longer than this, even "last stack standing". */
export const HE_HAND_CAP = 80;

export type HeSuit = "spades" | "hearts" | "diamonds" | "clubs";
export type HeRank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export interface HeCard {
  rank: HeRank;
  suit: HeSuit;
}

/**
 * intro → (deal → betting ⇄ street → result) per hand → podium.
 * `street` is the short beat between betting rounds while new board cards land
 * (and, during an all-in runout, every step of the runout).
 */
export type HePhase = "intro" | "deal" | "betting" | "street" | "result" | "podium";
export type HeStreet = "preflop" | "flop" | "turn" | "river";
/** waiting = not dealt in yet; out = busted (spectating). */
export type HeSeatStatus = "waiting" | "in" | "folded" | "allin" | "out";
export type HeActionKind = "sb" | "bb" | "fold" | "check" | "call" | "bet" | "raise";

/** The most recent thing someone did at the table. */
export interface HeActionLog {
  playerId: string;
  kind: HeActionKind;
  /** Chips put in for a blind or a call; the new street total for a bet or raise. */
  amount: number;
  allIn: boolean;
  /** Made by the turn timer (or for a phone that dropped). */
  auto: boolean;
}

export interface HePot {
  amount: number;
  eligibleIds: string[];
  /** Set once the hand is over, ordered from the button (the odd chip goes to the first). */
  winnerIds: string[];
  /** The winning hand's name at a showdown. */
  handLabel: string | null;
}

/** One seat at the oval, as the TV shows it. Hole cards only at a showdown or an all-in runout. */
export interface HeSeat {
  playerId: string;
  name: string;
  character: CharacterId;
  chips: number;
  /** Chips in front of them on this street. */
  bet: number;
  status: HeSeatStatus;
  /** Still holding (face-down) cards this hand. */
  holding: boolean;
  isButton: boolean;
  blind: "sb" | "bb" | null;
  /** What they did last on this street. */
  lastAction: HeActionKind | null;
  cards: HeCard[] | null;
  handLabel: string | null;
  /** Their best five at the end of a showdown, for highlighting. */
  bestCards: HeCard[] | null;
  /** Chips won from the pots this hand (result only). */
  won: number;
  /** Net result of this hand (result only). */
  delta: number;
}

export interface HeStanding {
  playerId: string;
  chips: number;
  /** Net since the start of the game. */
  delta: number;
}

export interface HeTv {
  phase: HePhase;
  hand: number;
  /** 0 = last stack standing. */
  totalHands: number;
  finalHand: boolean;
  smallBlind: number;
  bigBlind: number;
  /** The blinds went up at the start of this hand. */
  blindsUp: boolean;
  /** Hands left at this blind level, this one included. */
  handsUntilBlindsUp: number;
  headsUp: boolean;
  street: HeStreet;
  board: HeCard[];
  /** Collected pots (main first). Bets still in front of seats aren't in here yet. */
  pots: HePot[];
  /** Everything in the middle, bets in front included. */
  potTotal: number;
  currentBet: number;
  seats: HeSeat[];
  actorId: string | null;
  /** What the player to act needs to put in to call. */
  toCall: number;
  log: HeActionLog | null;
  /** Bumps on every action. */
  seq: number;
  runout: boolean;
  showdown: boolean;
  standings: HeStanding[];
}

export interface HePlayer {
  phase: HePhase;
  hand: number;
  totalHands: number;
  finalHand: boolean;
  smallBlind: number;
  bigBlind: number;
  street: HeStreet;
  board: HeCard[];
  /** Your own hole cards — nobody else's ever appear in your view. */
  cards: HeCard[];
  /** Your best hand right now (hole + board). */
  handLabel: string | null;
  status: HeSeatStatus;
  chips: number;
  bet: number;
  isButton: boolean;
  blind: "sb" | "bb" | null;
  potTotal: number;
  currentBet: number;
  /** What a call costs you (capped at your chips). */
  toCall: number;
  actorId: string | null;
  myTurn: boolean;
  /** Bumps on every action — key your controls on it. */
  seq: number;
  canCheck: boolean;
  canCall: boolean;
  /** You may put in more than a call (a bet, a raise, or a short all-in). */
  canRaise: boolean;
  /** Street totals ("raise to"). Equal when all-in is the only raise left. */
  minRaiseTo: number;
  maxRaiseTo: number;
  /** Nothing has been bet on this street yet, so it's a "bet", not a "raise". */
  isBet: boolean;
  log: HeActionLog | null;
  runout: boolean;
  showdown: boolean;
  /** The settled pots (result only). */
  results: HePot[];
  won: number;
  delta: number;
  rank: number;
  /** Your finishing place once you're out. */
  place: number | null;
  playersLeft: number;
}

export type HeAction = "fold" | "check" | "call" | "raise" | "allin";
/** `amount` is the street total to raise to ("raise to 120"). */
export type HeInput = { type: "act"; action: HeAction; amount?: number };

export function heBlinds(hand: number): { small: number; big: number } {
  const level = Math.floor((Math.max(1, hand) - 1) / HE_BLIND_LEVEL_HANDS);
  const mult = 2 ** level;
  return { small: HE_SMALL_BLIND * mult, big: HE_BIG_BLIND * mult };
}

/**
 * A pot-sized raise is "call, then raise by the whole pot", so `fraction` of
 * a pot raise totals currentBet + fraction × (pot + toCall). With nothing bet
 * yet it's simply fraction × pot. Clamp the result to your raise range.
 */
export function heRaiseTo(potTotal: number, currentBet: number, toCall: number, fraction: number): number {
  return Math.round(currentBet + fraction * (potTotal + toCall));
}

/** Short seat tag for the TV ("RAISE", "ALL IN"…). */
export function heActionTag(kind: HeActionKind): string {
  return { sb: "SB", bb: "BB", fold: "FOLD", check: "CHECK", call: "CALL", bet: "BET", raise: "RAISE" }[kind];
}

/** "Bob raises to 120" — the same line on the TV and on phones. */
export function heActionText(name: string, log: HeActionLog): string {
  const n = log.amount.toLocaleString();
  const late = log.auto ? " (out of time)" : "";
  switch (log.kind) {
    case "sb":
      return log.allIn ? `${name} posts ${n} and is all in!` : `${name} posts the small blind (${n})`;
    case "bb":
      return log.allIn ? `${name} posts ${n} and is all in!` : `${name} posts the big blind (${n})`;
    case "fold":
      return `${name} folds${late}`;
    case "check":
      return `${name} checks${late}`;
    case "call":
      return log.allIn ? `${name} calls all in (${n})` : `${name} calls ${n}`;
    case "bet":
      return log.allIn ? `${name} bets all in: ${n}!` : `${name} bets ${n}`;
    case "raise":
      return log.allIn ? `${name} raises all in to ${n}!` : `${name} raises to ${n}`;
  }
}
