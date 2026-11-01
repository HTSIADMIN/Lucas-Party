// Blackjack Bash — the whole room at one table against the TV's dealer.
// Everyone bets, then plays their own hand at the same time on their phone;
// the dealer (stands on all 17s) plays out last on the TV. These are the plain
// view/input shapes shared by the engine and the views — engine card types
// stay in the engine, so views get their own `BjCard`.

export const BJ_START_CHIPS = 1000;
/** Minimum bet: 10% of your chips, rounded to the nearest 10, never under 10. */
export const BJ_MIN_BET_SHARE = 0.1;
export const BJ_MIN_BET_FLOOR = 10;
/** Players with fewer chips than this find some pocket lint before the next hand. */
export const BJ_BROKE_BELOW = 10;
export const BJ_POCKET_LINT = 100;

export function bjMinBet(chips: number): number {
  const share = Math.round((chips * BJ_MIN_BET_SHARE) / 10) * 10;
  return Math.min(chips, Math.max(BJ_MIN_BET_FLOOR, share));
}

export type BjSuit = "spades" | "hearts" | "diamonds" | "clubs";
export type BjRank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export interface BjCard {
  rank: BjRank;
  suit: BjSuit;
}

export type BjPhase = "intro" | "bet" | "play" | "dealer" | "results" | "standings" | "podium";

/** playing = still deciding; stood covers a stand, a double, a timeout and an automatic 21. */
export type BjHandStatus = "playing" | "stood" | "bust" | "blackjack";
export type BjOutcome = "blackjack" | "win" | "push" | "lose";

/** The dealer as one viewer sees it. A face-down card is `null`. */
export interface BjDealerView {
  dealer: (BjCard | null)[];
  /** Null while the hole card is hidden from this viewer. */
  dealerTotal: number | null;
  dealerSoft: boolean;
  /** Blackjack value of the face-up card while the hole card is hidden (an Ace shows 11). */
  dealerShows: number | null;
  dealerBlackjack: boolean;
  dealerBust: boolean;
}

/** One player's spot at the table, as the TV shows it. */
export interface BjSeat {
  playerId: string;
  chips: number;
  /** Bet phase: what they've put down so far (null = still deciding). Later: the stake on the table, doubles included. */
  bet: number | null;
  /** No hand this round: their phone was away for the deal and they hadn't bet. */
  sittingOut: boolean;
  cards: BjCard[];
  total: number;
  soft: boolean;
  status: BjHandStatus | null;
  doubled: boolean;
  /** They spent their Peek this hand. The TV only ever learns *that* they peeked. */
  peeked: boolean;
  outcome: BjOutcome | null;
  /** Chips won (+) or lost (−) on this hand once it's settled. */
  delta: number | null;
}

export interface BjStanding {
  playerId: string;
  chips: number;
  delta: number;
}

export interface BjTv extends BjDealerView {
  phase: BjPhase;
  hand: number;
  totalHands: number;
  finalHand: boolean;
  seats: BjSeat[];
  standings: BjStanding[];
}

export interface BjPlayer extends BjDealerView {
  phase: BjPhase;
  hand: number;
  totalHands: number;
  finalHand: boolean;
  chips: number;
  minBet: number;
  /** Bet phase: your placed bet (null = not yet). Later: your stake on the table (null = sitting out). */
  bet: number | null;
  locked: boolean;
  sittingOut: boolean;
  cards: BjCard[];
  total: number;
  soft: boolean;
  status: BjHandStatus | null;
  doubled: boolean;
  /** Hit / stand are open (play phase, hand still live). */
  canAct: boolean;
  /** First two cards and enough chips to match the bet. */
  canDouble: boolean;
  /** Your one Peek for the game is still unspent. */
  peekLeft: boolean;
  canPeek: boolean;
  /** You peeked this hand: `dealer` shows you the hole card. Nobody else's view does. */
  peeked: boolean;
  outcome: BjOutcome | null;
  delta: number | null;
  /** Chips won or lost on the last settled hand (standings / podium). */
  lastDelta: number;
  rank: number;
}

export type BjInput =
  | { type: "bet"; amount: number }
  /** `cards` = how many cards the phone was showing, so a laggy double-tap can't hit twice. */
  | { type: "hit"; cards?: number }
  | { type: "stand"; cards?: number }
  | { type: "double"; cards?: number }
  | { type: "peek" };
