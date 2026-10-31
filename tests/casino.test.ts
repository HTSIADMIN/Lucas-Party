// The card / poker / blackjack / roulette helpers carried over from the casino.
import { describe, expect, it } from "vitest";
import { freshDeck, type Card, type Rank, type Suit } from "../src/shared/engine/casino/cards";
import { bestHand, compareScores } from "../src/shared/engine/casino/poker";
import { dealerShouldHit, handValue, outcomeOf } from "../src/shared/engine/casino/blackjack";
import { betReturn, colorOf, isValidBet, spinWheel, WHEEL_ORDER } from "../src/shared/engine/casino/roulette";

const SUIT: Record<string, Suit> = { s: "spades", h: "hearts", d: "diamonds", c: "clubs" };
/** "As Kd 10h" → cards */
function cards(spec: string): Card[] {
  return spec.split(" ").map((t) => ({ rank: t.slice(0, -1) as Rank, suit: SUIT[t.slice(-1)]! }));
}

describe("cards", () => {
  it("builds full shuffled shoes", () => {
    const deck = freshDeck(2);
    expect(deck).toHaveLength(104);
    expect(new Set(deck.map((c) => `${c.rank}${c.suit}`)).size).toBe(52);
  });
});

describe("poker", () => {
  it("finds the best five of seven", () => {
    expect(bestHand(cards("Ah Kh Qh Jh 10h 2c 3d")).category).toBe("straight_flush");
    expect(bestHand(cards("As 2d 3c 4h 5s Kd Kc")).category).toBe("straight");
    expect(bestHand(cards("9s 9d 9c 4h 4s 2d 7c")).category).toBe("full_house");
    expect(bestHand(cards("2h 7h 9h Jh Kh Ks Kd")).category).toBe("flush");
  });

  it("treats the wheel as a five-high straight", () => {
    const wheel = bestHand(cards("As 2d 3c 4h 5s"));
    const sixHigh = bestHand(cards("2d 3c 4h 5s 6d"));
    expect(wheel.ranks).toEqual([5]);
    expect(compareScores(sixHigh.scoreKey, wheel.scoreKey)).toBeGreaterThan(0);
  });

  it("breaks ties on kickers", () => {
    const aceKicker = bestHand(cards("8s 8d As 7c 4h"));
    const kingKicker = bestHand(cards("8h 8c Ks 7d 4s"));
    expect(compareScores(aceKicker.scoreKey, kingKicker.scoreKey)).toBeGreaterThan(0);
    expect(compareScores(bestHand(cards("8s 8d As 7c 4h")).scoreKey, bestHand(cards("8h 8c Ah 7d 4s")).scoreKey)).toBe(0);
  });

  it("scores partial hands before the river", () => {
    expect(bestHand(cards("Qs Qd")).category).toBe("pair");
    expect(bestHand(cards("Qs Jd")).category).toBe("high_card");
    expect(bestHand(cards("Qs Qd Qc 2h")).category).toBe("trips");
  });
});

describe("blackjack", () => {
  it("softens aces", () => {
    expect(handValue(cards("As 6d"))).toEqual({ total: 17, soft: true });
    expect(handValue(cards("As 6d 9c"))).toEqual({ total: 16, soft: false });
    expect(handValue(cards("As Ad 9c"))).toEqual({ total: 21, soft: true });
  });

  it("stands on soft 17 and settles hands", () => {
    expect(dealerShouldHit(cards("As 6d"))).toBe(false);
    expect(dealerShouldHit(cards("10s 6d"))).toBe(true);
    expect(outcomeOf(cards("As Kd"), cards("10s 9d"))).toBe("blackjack");
    expect(outcomeOf(cards("10s 9d"), cards("10h 6d 8c"))).toBe("win");
    expect(outcomeOf(cards("10s 6d 8c"), cards("10h 6c 9d"))).toBe("lose");
    expect(outcomeOf(cards("10s 8d"), cards("9h 9c"))).toBe("push");
  });
});

describe("roulette", () => {
  it("pays the right multiples", () => {
    expect(betReturn({ type: "straight", value: 17, amount: 10 }, 17)).toBe(36);
    expect(betReturn({ type: "red", amount: 10 }, 0)).toBe(0);
    expect(betReturn({ type: "red", amount: 10 }, 1)).toBe(2);
    expect(betReturn({ type: "dozen", value: 3, amount: 10 }, 36)).toBe(3);
    expect(betReturn({ type: "column", value: 1, amount: 10 }, 34)).toBe(3);
    expect(isValidBet({ type: "straight", value: 37, amount: 10 })).toBe(false);
  });

  it("has a complete wheel", () => {
    expect([...WHEEL_ORDER].sort((a, b) => a - b)).toEqual(Array.from({ length: 37 }, (_, i) => i));
    expect(WHEEL_ORDER.filter((n) => colorOf(n) === "red")).toHaveLength(18);
    for (let i = 0; i < 200; i++) expect(spinWheel()).toBeLessThanOrEqual(36);
  });
});
