// Liar's Dice — everyone rolls secret dice under a cup, then turns go round
// the table raising one shared bid ("there are at least 4 fives out there")
// until someone calls LIAR! or SPOT ON!. Ones are wild. Whoever's wrong loses a
// die; last player with dice wins. The bid rules live here so the engine and
// the phone's bid picker always agree on what a legal raise is.

export const LD_DEFAULT_DICE = 5;
/** Upper clamp for the "dice each" option (the catalog offers 3–5). */
export const LD_MAX_DICE = 6;
/** Faces you can bid on. Ones can't be bid — they're wild and count for every face. */
export const LD_FACES = [2, 3, 4, 5, 6] as const;
export const LD_MIN_FACE = 2;
export const LD_MAX_FACE = 6;
export const LD_WILD_FACE = 1;

/** Every player earns this per opponent eliminated before them. */
export const LD_OUTLAST_POINTS = 100;
/** The last player with dice. */
export const LD_WINNER_POINTS = 300;
/** A LIAR! that catches a bluff, or a SPOT ON! that's exact. */
export const LD_CALL_POINTS = 50;

export type LdPhase = "intro" | "roll" | "bid" | "reveal" | "result" | "standings" | "podium";

export interface LdBidValue {
  quantity: number;
  face: number;
}

export interface LdBid extends LdBidValue {
  playerId: string;
  /** Placed by the clock (time ran out, or the bidder's phone dropped). */
  auto: boolean;
}

export type LdCallKind = "liar" | "spotOn";

/** The call that ended a round, and how it came out. Public from the reveal on. */
export interface LdCall {
  kind: LdCallKind;
  callerId: string;
  bidderId: string;
  quantity: number;
  face: number;
  /** Dice on the whole table showing the bid face, plus every one (wild). */
  count: number;
  /** LIAR: the bid was short. SPOT ON: the count was exact. */
  correct: boolean;
  /** Who loses a die. Null when a SPOT ON was exact. */
  loserId: string | null;
  /** An exact SPOT ON won the caller a die back (false if their cup was already full). */
  gainedDie: boolean;
  /** The loser just ran out of dice. */
  eliminatedId: string | null;
  auto: boolean;
}

export interface LdSeat {
  playerId: string;
  /** Dice left right now. */
  dice: number;
  out: boolean;
  /** This round's dice — only once the cups lift (reveal/result). */
  shown: number[] | null;
}

export interface LdScoreLine { playerId: string; score: number; gained: number }

export interface LdTv {
  phase: LdPhase;
  round: number;
  startDice: number;
  /** Dice rolled this round, across the whole table. */
  totalDice: number;
  /** Seat order = turn order (clockwise). */
  seats: LdSeat[];
  openerId: string | null;
  turnId: string | null;
  bid: LdBid | null;
  history: LdBid[];
  call: LdCall | null;
  /** Elimination order, first out first. */
  outOrder: string[];
  winnerId: string | null;
  scores: LdScoreLine[];
}

export interface LdPlayer {
  phase: LdPhase;
  round: number;
  startDice: number;
  totalDice: number;
  /** Only ever this player's own dice, sorted. */
  myDice: number[];
  diceLeft: number;
  out: boolean;
  openerId: string | null;
  turnId: string | null;
  myTurn: boolean;
  bid: LdBid | null;
  history: LdBid[];
  /** The smallest legal raise on my turn (null when no raise is possible). */
  minRaise: LdBidValue | null;
  /** My turn and there's a bid to challenge. */
  canCall: boolean;
  call: LdCall | null;
  winnerId: string | null;
  score: number;
  gained: number;
  rank: number;
}

export type LdInput = { type: "bid"; quantity: number; face: number } | { type: "liar" } | { type: "spotOn" };

/** A die counts toward a bid if it shows the face or is a wild one. */
export function ldIsMatch(value: number, face: number): boolean {
  return value === face || value === LD_WILD_FACE;
}

/** The lowest quantity of `face` that beats `prev`: same quantity needs a higher face. */
export function ldMinQuantity(prev: LdBidValue | null, face: number): number {
  if (!prev) return 1;
  return face > prev.face ? prev.quantity : prev.quantity + 1;
}

/** A legal bid: faces 2–6, 1…totalDice, and higher than the bid on the table. */
export function ldIsRaise(prev: LdBidValue | null, next: LdBidValue, totalDice: number): boolean {
  const { quantity, face } = next;
  if (!Number.isInteger(quantity) || !Number.isInteger(face)) return false;
  if (face < LD_MIN_FACE || face > LD_MAX_FACE) return false;
  if (quantity < 1 || quantity > totalDice) return false;
  return quantity >= ldMinQuantity(prev, face);
}

/** The smallest legal raise (the opener's "1 × 2"), or null if the bid is already maxed out. */
export function ldMinRaise(prev: LdBidValue | null, totalDice: number): LdBidValue | null {
  const next: LdBidValue = !prev
    ? { quantity: 1, face: LD_MIN_FACE }
    : prev.face < LD_MAX_FACE
      ? { quantity: prev.quantity, face: prev.face + 1 }
      : { quantity: prev.quantity + 1, face: LD_MIN_FACE };
  return ldIsRaise(prev, next, totalDice) ? next : null;
}
