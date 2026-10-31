// Best-hand evaluator for Texas Hold'em, carried over from the casino. Scores
// compare lexicographically (higher wins). Works on 1–7 cards so phones can show
// "you have: Pair of 8s" before the river; straights and flushes need 5.

import type { Card, Rank } from "./cards";

const RANK_VALUE: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13, A: 14,
};

export type HandCategory = "high_card" | "pair" | "two_pair" | "trips" | "straight" | "flush" | "full_house" | "quads" | "straight_flush";

const CATEGORY_RANK: Record<HandCategory, number> = {
  high_card: 0, pair: 1, two_pair: 2, trips: 3, straight: 4, flush: 5, full_house: 6, quads: 7, straight_flush: 8,
};

const CATEGORY_LABEL: Record<HandCategory, string> = {
  high_card: "High Card",
  pair: "Pair",
  two_pair: "Two Pair",
  trips: "Three of a Kind",
  straight: "Straight",
  flush: "Flush",
  full_house: "Full House",
  quads: "Four of a Kind",
  straight_flush: "Straight Flush",
};

export interface HandScore {
  category: HandCategory;
  /** Tiebreakers, high to low. */
  ranks: number[];
  /** [categoryRank, ...ranks] — compare with `compareScores`. */
  scoreKey: number[];
  best: Card[];
}

export function categoryLabel(category: HandCategory): string {
  return CATEGORY_LABEL[category];
}

function make(category: HandCategory, ranks: number[], best: Card[]): HandScore {
  return { category, ranks, scoreKey: [CATEGORY_RANK[category], ...ranks], best };
}

/** Scores up to 5 cards exactly as given. */
function scoreFive(cards: Card[]): HandScore {
  const vals = cards.map((c) => RANK_VALUE[c.rank]).sort((a, b) => b - a);
  const freq = new Map<number, number>();
  for (const v of vals) freq.set(v, (freq.get(v) ?? 0) + 1);
  const groups = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const [top, second] = groups;
  const count = (g: [number, number] | undefined) => g?.[1] ?? 0;

  const five = cards.length === 5;
  const isFlush = five && cards.every((c) => c.suit === cards[0]!.suit);
  let straightHigh = 0;
  if (five && groups.length === 5) {
    if (vals[0]! - vals[4]! === 4) straightHigh = vals[0]!;
    else if (vals.join(",") === "14,5,4,3,2") straightHigh = 5; // the wheel
  }

  if (isFlush && straightHigh) return make("straight_flush", [straightHigh], cards);
  if (count(top) === 4) return make("quads", [top![0], ...vals.filter((v) => v !== top![0])], cards);
  if (count(top) === 3 && count(second) >= 2) return make("full_house", [top![0], second![0]], cards);
  if (isFlush) return make("flush", vals, cards);
  if (straightHigh) return make("straight", [straightHigh], cards);
  if (count(top) === 3) return make("trips", [top![0], ...vals.filter((v) => v !== top![0])], cards);
  if (count(top) === 2 && count(second) === 2) {
    const high = Math.max(top![0], second![0]);
    const low = Math.min(top![0], second![0]);
    return make("two_pair", [high, low, ...vals.filter((v) => v !== high && v !== low)], cards);
  }
  if (count(top) === 2) return make("pair", [top![0], ...vals.filter((v) => v !== top![0])], cards);
  return make("high_card", vals, cards);
}

/** The best hand from any number of cards (every 5-card combination when there are more than 5). */
export function bestHand(cards: Card[]): HandScore {
  if (cards.length <= 5) return scoreFive(cards);
  let best: HandScore | null = null;
  const n = cards.length;
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++) {
            const score = scoreFive([cards[a]!, cards[b]!, cards[c]!, cards[d]!, cards[e]!]);
            if (!best || compareScores(score.scoreKey, best.scoreKey) > 0) best = score;
          }
  return best!;
}

export function compareScores(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
