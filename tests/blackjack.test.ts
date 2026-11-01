import { describe, expect, it } from "vitest";
import { BJ_POCKET_LINT, BJ_START_CHIPS, bjMinBet, type BjPlayer, type BjTv } from "@party/shared";
import { blackjack } from "../src/shared/engine/games/blackjack";
import type { Card, Rank, Suit } from "../src/shared/engine/casino/cards";
import { harness } from "./harness";

type H = ReturnType<typeof harness<ReturnType<typeof blackjack.create>>>;

const SUIT: Record<string, Suit> = { s: "spades", h: "hearts", d: "diamonds", c: "clubs" };
/** "As Kd 10h" → cards */
function cards(spec: string): Card[] {
  return spec
    .split(" ")
    .filter(Boolean)
    .map((t) => ({ rank: t.slice(0, -1) as Rank, suit: SUIT[t.slice(-1)]! }));
}

/**
 * Stacks the shoe for the next deal: `hands` in seat order, then the dealer's
 * up + hole card, then `extra` for the hits and dealer draws that follow.
 * Padded with 2♣ so the deal doesn't reshuffle.
 */
function stackDeal(h: H, hands: Record<string, string>, dealer: string, extra = "") {
  const ids = Object.keys(hands);
  const per = ids.map((id) => cards(hands[id]!));
  const d = cards(dealer);
  const order = [...per.map((c) => c[0]!), d[0]!, ...per.map((c) => c[1]!), d[1]!, ...cards(extra)];
  const filler = cards(Array.from({ length: 60 }, () => "2c").join(" "));
  h.state.shoe = [...filler, ...order.reverse()];
}

const tv = (h: H) => h.tv() as BjTv;
const view = (h: H, id: string) => h.view(id) as BjPlayer;
const left = (h: H) => h.deadline! - h.ctx.now();

/** intro → bet phase, with these bets placed. */
function bet(h: H, bets: Record<string, number>) {
  if (h.state.phase === "intro" || h.state.phase === "standings") h.fire();
  expect(h.state.phase).toBe("bet");
  for (const [id, amount] of Object.entries(bets)) h.input(id, { type: "bet", amount });
}

/** Fires deadlines until the hand is settled. */
function toResults(h: H) {
  let guard = 0;
  while (h.state.phase !== "results" && guard++ < 30) h.fire();
  expect(h.state.phase).toBe("results");
}

describe("Blackjack Bash", () => {
  it("pays 3:2 on blackjack, 1:1 on a win and takes a losing bet", () => {
    const h = harness(blackjack, 3);
    bet(h, { p0: 100, p1: 200, p2: 100 });
    stackDeal(h, { p0: "As Kd", p1: "10h 9c", p2: "10s 6d" }, "10c 7h");
    h.fire(); // deal
    expect(h.state.phase).toBe("play");
    expect(h.state.hands.p0!.status).toBe("blackjack");
    expect(view(h, "p0").canAct).toBe(false);
    h.input("p1", { type: "stand", cards: 2 });
    h.input("p2", { type: "stand", cards: 2 });
    expect(left(h)).toBeLessThanOrEqual(1000);
    h.fire(); // the dealer flips: 17, stands
    expect(h.state.phase).toBe("dealer");
    toResults(h);
    expect(h.state.dealer).toHaveLength(2);
    expect(h.state.chips).toEqual({ p0: 1150, p1: 1200, p2: 900 });
    expect(h.state.deltas).toEqual({ p0: 150, p1: 200, p2: -100 });
    const seats = tv(h).seats;
    expect(seats.map((s) => s.outcome)).toEqual(["blackjack", "win", "lose"]);
  });

  it("auto-stands on 21 and on a bust, and a double takes exactly one card", () => {
    const h = harness(blackjack, 3);
    bet(h, { p0: 100, p1: 100, p2: 100 });
    // p0 doubles 11 into 21; p1 hits 16 into a bust; p2 hits 4 + 7 + 10 = 21.
    stackDeal(h, { p0: "5h 6d", p1: "10c 6s", p2: "2h 2d" }, "10d 8c", "10s Kh 7c 10h");
    h.fire();
    h.input("p0", { type: "double", cards: 2 });
    expect(h.state.hands.p0).toMatchObject({ bet: 200, doubled: true, status: "stood" });
    expect(h.state.hands.p0!.cards).toHaveLength(3);
    expect(h.state.chips.p0).toBe(BJ_START_CHIPS - 200);
    h.input("p0", { type: "hit", cards: 3 }); // already done
    expect(h.state.hands.p0!.cards).toHaveLength(3);

    h.input("p1", { type: "hit", cards: 2 });
    expect(h.state.hands.p1!.status).toBe("bust");
    h.input("p2", { type: "hit", cards: 2 });
    h.input("p2", { type: "hit", cards: 3 });
    expect(h.state.hands.p2!.status).toBe("stood");
    expect(h.events.some((e) => e.kind === "bust" && e.playerId === "p1")).toBe(true);

    toResults(h);
    expect(h.state.chips).toEqual({ p0: 1200, p1: 900, p2: 1100 });
  });

  it("only doubles on the first two cards, and only when you can cover it", () => {
    const h = harness(blackjack, 2);
    bet(h, { p0: 600, p1: 100 });
    stackDeal(h, { p0: "5h 6d", p1: "2c 3d" }, "10d 8c", "2s 2h");
    h.fire();
    expect(view(h, "p0").canDouble).toBe(false); // 400 left can't match 600
    h.input("p0", { type: "double", cards: 2 });
    expect(h.state.hands.p0!.doubled).toBe(false);
    h.input("p1", { type: "hit", cards: 2 });
    expect(view(h, "p1").canDouble).toBe(false);
    h.input("p1", { type: "double", cards: 3 });
    expect(h.state.hands.p1!.doubled).toBe(false);
  });

  it("deals the dealer one card per beat and stands on every 17, soft ones included", () => {
    const h = harness(blackjack, 1);
    bet(h, { p0: 100 });
    stackDeal(h, { p0: "10h 9c" }, "6s 5d", "3c 3h");
    h.fire();
    h.input("p0", { type: "stand" });
    h.fire(); // reveal: 11
    expect(h.state.phase).toBe("dealer");
    expect(tv(h).dealerTotal).toBe(11);
    h.fire();
    expect(h.state.dealer).toHaveLength(3); // 14
    expect(left(h)).toBe(900);
    h.fire();
    expect(h.state.dealer).toHaveLength(4); // 17
    h.fire();
    expect(h.state.phase).toBe("results");
    expect(h.state.chips.p0).toBe(1100);

    const soft = harness(blackjack, 1);
    bet(soft, { p0: 100 });
    stackDeal(soft, { p0: "10h 7c" }, "As 6d");
    soft.fire();
    soft.input("p0", { type: "stand" });
    toResults(soft);
    expect(soft.state.dealer).toHaveLength(2);
    expect(soft.state.hands.p0!.outcome).toBe("push");
  });

  it("doesn't draw for the dealer when nobody is left to beat", () => {
    const h = harness(blackjack, 1);
    bet(h, { p0: 100 });
    stackDeal(h, { p0: "10h 6c" }, "6s 5d", "Kd");
    h.fire();
    h.input("p0", { type: "hit", cards: 2 });
    expect(h.state.hands.p0!.status).toBe("bust");
    toResults(h);
    expect(h.state.dealer).toHaveLength(2);
    expect(h.state.chips.p0).toBe(900);
  });

  it("settles a dealer blackjack before anyone plays: naturals push, everyone else loses", () => {
    const h = harness(blackjack, 2);
    bet(h, { p0: 100, p1: 100 });
    stackDeal(h, { p0: "As Kd", p1: "10h 10c" }, "Ah Qs");
    h.fire();
    expect(h.state.phase).toBe("dealer");
    expect(tv(h).dealerBlackjack).toBe(true);
    expect(tv(h).dealer.every((c) => c !== null)).toBe(true);
    h.input("p1", { type: "hit", cards: 2 }); // too late to play
    expect(h.state.hands.p1!.cards).toHaveLength(2);
    h.fire();
    expect(h.state.phase).toBe("results");
    expect(h.state.chips).toEqual({ p0: 1000, p1: 900 });
    expect(h.state.hands.p0!.outcome).toBe("push");
  });

  it("keeps the hole card off the TV and every phone except the one that peeked", () => {
    const h = harness(blackjack, 3);
    bet(h, { p0: 100, p1: 100, p2: 100 });
    stackDeal(h, { p0: "10h 2c", p1: "9h 3c", p2: "8h 4c" }, "7d Qs");
    h.fire();
    const hidden = (v: BjTv | BjPlayer) => v.dealer[1] === null && v.dealerTotal === null;
    expect(hidden(tv(h))).toBe(true);
    expect(tv(h).dealerShows).toBe(7);
    expect(JSON.stringify(tv(h))).not.toContain("shoe");

    h.input("p0", { type: "peek" });
    expect(view(h, "p0").dealer[1]).toEqual({ rank: "Q", suit: "spades" });
    expect(view(h, "p0").dealerTotal).toBe(17);
    expect(view(h, "p0").peekLeft).toBe(false);
    expect(hidden(view(h, "p1"))).toBe(true);
    expect(hidden(view(h, "p2"))).toBe(true);
    expect(hidden(tv(h))).toBe(true);
    // The table only learns *that* p0 peeked.
    expect(tv(h).seats.find((s) => s.playerId === "p0")!.peeked).toBe(true);
    expect(h.events.find((e) => e.kind === "peek")!.text).toBeUndefined();

    // One Peek per game.
    toResults(h);
    expect(view(h, "p1").dealer[1]).toEqual({ rank: "Q", suit: "spades" });
    h.fire(); // standings
    bet(h, { p0: 100, p1: 100, p2: 100 });
    stackDeal(h, { p0: "10h 2c", p1: "9h 3c", p2: "8h 4c" }, "7d Qs");
    h.fire();
    expect(view(h, "p0").canPeek).toBe(false);
    h.input("p0", { type: "peek" });
    expect(hidden(view(h, "p0"))).toBe(true);
    expect(tv(h).seats.find((s) => s.playerId === "p0")!.peeked).toBe(false);
    expect(view(h, "p1").canPeek).toBe(true);
  });

  it("clamps bets, bets the minimum for idle players and tops up the broke with pocket lint", () => {
    const h = harness(blackjack, 3);
    bet(h, { p0: 1, p1: 99_999 });
    h.input("p2", { type: "bet", amount: "lots" });
    h.input("p2", { type: "bet" });
    expect(h.state.slips.p2).toBeUndefined();
    h.fire();
    expect(h.state.hands.p0!.bet).toBe(bjMinBet(BJ_START_CHIPS));
    expect(h.state.hands.p1!.bet).toBe(BJ_START_CHIPS);
    expect(h.state.hands.p2!.bet).toBe(100);

    expect(bjMinBet(1234)).toBe(120);
    expect(bjMinBet(40)).toBe(10);
    expect(bjMinBet(12)).toBe(10);

    toResults(h);
    h.fire(); // standings
    h.state.chips.p1 = 3;
    h.fire(); // next hand
    expect(h.state.phase).toBe("bet");
    expect(h.state.chips.p1).toBe(3 + BJ_POCKET_LINT);
    expect(h.events.filter((e) => e.kind === "lint" && e.to?.includes("p1"))).toHaveLength(1);
    expect(view(h, "p1").minBet).toBe(10);
  });

  it("moves on once everyone has acted, and an away phone never holds up the table", () => {
    const h = harness(blackjack, 3);
    h.fire();
    h.input("p0", { type: "bet", amount: 100 });
    h.connected.delete("p2");
    blackjack.onConnectionChange!(h.state, h.ctx, "p2", false);
    expect(left(h)).toBeGreaterThan(5000);
    h.input("p1", { type: "bet", amount: 100 });
    expect(left(h)).toBeLessThanOrEqual(1000);

    stackDeal(h, { p0: "10h 2c", p1: "9h 3c" }, "7d Qs");
    h.fire();
    // p2 was away and never bet: they sit this one out with their chips intact.
    expect(h.state.hands.p2).toBeUndefined();
    expect(tv(h).seats.find((s) => s.playerId === "p2")!.sittingOut).toBe(true);
    expect(h.state.chips.p2).toBe(BJ_START_CHIPS);

    h.input("p0", { type: "stand", cards: 2 });
    expect(left(h)).toBeGreaterThan(5000);
    h.connected.delete("p1");
    blackjack.onConnectionChange!(h.state, h.ctx, "p1", false);
    expect(left(h)).toBeLessThanOrEqual(1000);
    h.fire();
    expect(h.state.phase).toBe("dealer");
    expect(h.state.hands.p1!.status).toBe("stood"); // out of time = stand
  });

  it("ignores stale, foreign and malformed input", () => {
    const h = harness(blackjack, 2);
    h.input("p0", { type: "hit" }); // intro
    bet(h, { p0: 100, p1: 100 });
    h.input("p0", { type: "hit" }); // still betting
    stackDeal(h, { p0: "2h 3c", p1: "9h 3c" }, "7d Qs", "4s 5s");
    h.fire();
    h.input("p0", { type: "hit", cards: 3 }); // a tap from a hand it hasn't seen
    h.input("p0", "hit");
    h.input("p0", null);
    h.input("p0", { type: "teleport" });
    h.input("p9", { type: "hit", cards: 2 });
    expect(h.state.hands.p0!.cards).toHaveLength(2);
    h.input("p0", { type: "hit", cards: 2 });
    h.input("p0", { type: "hit", cards: 2 }); // the double-tap
    expect(h.state.hands.p0!.cards).toHaveLength(3);
    h.input("p0", { type: "bet", amount: 500 }); // betting is over
    expect(h.state.hands.p0!.bet).toBe(100);
  });

  it("reshuffles a fresh 6-deck shoe when it runs low", () => {
    const h = harness(blackjack, 2);
    bet(h, { p0: 100, p1: 100 });
    h.state.shoe = cards(Array.from({ length: 40 }, () => "9c").join(" "));
    h.fire();
    expect(h.state.shoe.length).toBe(6 * 52 - 6);
  });

  it("plays the configured number of hands, then the podium with chips as scores", () => {
    const h = harness(blackjack, 4, { options: { rounds: 2 } });
    let guard = 0;
    while (!h.finished && guard++ < 200) h.fire();
    expect(h.finished).toBe(true);
    expect(h.state.phase).toBe("podium");
    expect(h.state.hand).toBe(2);
    expect(h.deadline).toBeNull();
    expect(blackjack.scores(h.state)).toEqual(h.state.chips);
    expect(h.events.some((e) => e.kind === "podium" && e.sfx === "win.big")).toBe(true);
  });
});
