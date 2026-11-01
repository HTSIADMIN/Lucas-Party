// Dice Derby — five racers, one dice tower, a lot of yelling. Each leg you bet
// chips on which racer will lead when the leg ends; then every racer rolls a
// 1–3 and moves, carrying anyone stacked on top of it. Underdogs pay more.
// Pick the overall winner before the start for a big bonus. Most chips wins.

export const DD_TRACK = 16;
export const DD_START_CHIPS = 100;
export const DD_RACERS = ["blip", "splash", "sprout", "sunny", "wisp"] as const;
export type DdRacer = (typeof DD_RACERS)[number];
/** Leg payout multiplier by the racer's rank when bets open (leader pays least). */
export const DD_ODDS = [2, 3, 4, 6, 6] as const;
export const DD_WINNER_BONUS = 100;
export const DD_POCKET_LINT = 20;

export type DdPhase = "intro" | "pick" | "bet" | "roll" | "legResult" | "finish" | "podium";

export interface DdRoll { racer: DdRacer; value: number }

export interface DdBet { playerId: string; racer: DdRacer; amount: number; payout: number | null }

export interface DdScoreLine { playerId: string; score: number; gained: number }

export interface DdTv {
  phase: DdPhase;
  leg: number;
  /** Space (0–16) and stack order for each racer: index 0 is the bottom of its stack. */
  positions: Record<DdRacer, number>;
  stacks: DdRacer[][];
  /** Racers from first to last. */
  standings: DdRacer[];
  odds: Record<DdRacer, number>;
  rolls: DdRoll[];
  doneIds: string[];
  bets: DdBet[];
  winner: DdRacer | null;
  /** Revealed at the finish. */
  picks: Record<string, DdRacer> | null;
  scores: DdScoreLine[];
}

export interface DdPlayer {
  phase: DdPhase;
  leg: number;
  chips: number;
  odds: Record<DdRacer, number>;
  standings: DdRacer[];
  myPick: DdRacer | null;
  myBet: DdBet | null;
  winner: DdRacer | null;
  score: number;
  gained: number;
  rank: number;
}

export type DdInput = { type: "pick"; racer: DdRacer } | { type: "bet"; racer: DdRacer; amount: number };

export function ddIsRacer(value: unknown): value is DdRacer {
  return typeof value === "string" && (DD_RACERS as readonly string[]).includes(value);
}
