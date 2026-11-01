// Roulette Royale — the whole room at one European roulette table. Bet party
// chips from your phone, watch the wheel spin on the TV. Each spin has a hot
// number: a straight-up bet on it pays 50:1 instead of 35:1. Most chips after
// the last spin wins.

export const RO_START_CHIPS = 1000;
export const RO_POCKET_LINT = 100;
export const RO_MAX_BETS = 6;
/** Gross return (stake included) of a straight bet on the hot number. */
export const RO_HOT_RETURN = 51;

export type RoPhase = "intro" | "bet" | "spin" | "result" | "standings" | "podium";
export type RoBetType = "straight" | "red" | "black" | "even" | "odd" | "low" | "high" | "dozen" | "column";

export interface RoBet { type: RoBetType; value?: number; amount: number }

export interface RoPlacedBet extends RoBet { playerId: string; payout: number | null }

export interface RoScoreLine { playerId: string; score: number; gained: number }

export interface RoTv {
  phase: RoPhase;
  round: number;
  totalRounds: number;
  hot: number;
  bets: RoPlacedBet[];
  doneIds: string[];
  /** The winning pocket, from the spin on. */
  result: number | null;
  /** Room time the spin started (for the wheel animation). */
  spunAt: number | null;
  scores: RoScoreLine[];
}

export interface RoPlayer {
  phase: RoPhase;
  round: number;
  totalRounds: number;
  hot: number;
  chips: number;
  myBets: RoPlacedBet[];
  done: boolean;
  result: number | null;
  score: number;
  gained: number;
  rank: number;
}

export type RoInput = { type: "bet"; bet: RoBet } | { type: "clear" } | { type: "done" };

/** "Red", "17", "2nd dozen"… */
export function roBetLabel(bet: RoBet): string {
  switch (bet.type) {
    case "straight":
      return `#${bet.value}`;
    case "dozen":
      return `${["1st", "2nd", "3rd"][(bet.value ?? 1) - 1]} 12`;
    case "column":
      return `Column ${bet.value}`;
    case "low":
      return "1–18";
    case "high":
      return "19–36";
    default:
      return bet.type[0]!.toUpperCase() + bet.type.slice(1);
  }
}
