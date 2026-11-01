// Friendly names for poker hands: the casino evaluator's category label plus
// the ranks that matter ("Pair of Kings", "Full House · 8s full of 3s").

import type { Card } from "../../casino/cards";
import { bestHand, categoryLabel, type HandScore } from "../../casino/poker";

const FACE: Record<number, string> = { 14: "Ace", 13: "King", 12: "Queen", 11: "Jack" };

function one(rank: number): string {
  return FACE[rank] ?? String(rank);
}

function many(rank: number): string {
  return FACE[rank] ? `${FACE[rank]}s` : `${rank}s`;
}

export function handName(score: HandScore): string {
  const [a = 0, b = 0] = score.ranks;
  const label = categoryLabel(score.category);
  switch (score.category) {
    case "straight_flush":
      return a === 14 ? "Royal Flush" : `${label} · ${one(a)} high`;
    case "quads":
    case "trips":
      return `${label} · ${many(a)}`;
    case "full_house":
      return `${label} · ${many(a)} full of ${many(b)}`;
    case "flush":
    case "straight":
      return `${label} · ${one(a)} high`;
    case "two_pair":
      return `${label} · ${many(a)} & ${many(b)}`;
    case "pair":
      return `${label} of ${many(a)}`;
    case "high_card":
      return `${label} · ${one(a)}`;
  }
}

/** Best hand from hole cards + whatever board is out (2–7 cards). */
export function evaluate(hole: Card[], board: Card[]): HandScore | null {
  const cards = [...hole, ...board];
  return cards.length ? bestHand(cards) : null;
}
