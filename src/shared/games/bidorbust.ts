// Bid or Bust — four mystery boxes, sealed bids. Each box hides chips — or a
// rubber chicken that costs you. Everyone gets one private hint about one box,
// then secretly spreads bids across the boxes. Highest bid on a box buys it
// (ties: nobody does). Most chips after the last round wins.

export const BB_BOXES = 4;
export const BB_START_CHIPS = 500;
export const BB_CHICKEN = -150;
export const BB_BOX_LABELS = ["A", "B", "C", "D"] as const;

export type BbPhase = "intro" | "bid" | "reveal" | "standings" | "podium";

export interface BbBoxResult {
  index: number;
  value: number;
  winnerId: string | null;
  winningBid: number;
  /** Every bid on the box, revealed. */
  bids: { playerId: string; amount: number }[];
}

export interface BbScoreLine { playerId: string; score: number; gained: number }

export interface BbTv {
  phase: BbPhase;
  round: number;
  totalRounds: number;
  doneIds: string[];
  /** Filled in box by box during the reveal. */
  results: BbBoxResult[];
  scores: BbScoreLine[];
}

export interface BbPlayer {
  phase: BbPhase;
  round: number;
  totalRounds: number;
  chips: number;
  hint: string | null;
  myBids: number[] | null;
  results: BbBoxResult[];
  score: number;
  gained: number;
  rank: number;
}

export type BbInput = { type: "bids"; bids: number[] };
