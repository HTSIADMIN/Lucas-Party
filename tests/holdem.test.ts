import { describe, expect, it } from "vitest";
import { HE_HAND_CAP, type HePlayer, type HeTv } from "@party/shared";
import type { Card, Rank, Suit } from "../src/shared/engine/casino/cards";
import { holdem, type HoldemState } from "../src/shared/engine/games/holdem";
import { evaluate, handName } from "../src/shared/engine/games/holdem/hands";
import { buildPots, splitPot } from "../src/shared/engine/games/holdem/pots";
import { harness } from "./harness";

type H = ReturnType<typeof harness<HoldemState>>;

const SUITS: Record<string, Suit> = { s: "spades", h: "hearts", d: "diamonds", c: "clubs" };

/** "As" = ace of spades, "Td" = ten of diamonds. */
function card(code: string): Card {
  return { rank: code.slice(0, -1).replace("T", "10") as Rank, suit: SUITS[code.slice(-1)]! };
}
const cards = (codes: string) => codes.split(" ").map(card);

/** A fresh table with the button on `button` and optional custom stacks. */
function table(n: number, opts: { button?: string; chips?: number[]; options?: Record<string, number> } = {}): H {
  const h = harness(holdem, n, { options: opts.options });
  h.state.buttonId = opts.button ?? "p0";
  opts.chips?.forEach((chips, i) => {
    const seat = h.state.seats[`p${i}`]!;
    seat.chips = chips;
    seat.startChips = chips;
  });
  return h;
}

/** Intro → deal → the first turn, optionally rigging the hole cards and the next board cards. */
function deal(h: H, rig: { hole?: Record<string, string>; board?: string } = {}) {
  h.fire();
  expect(h.state.phase).toBe("deal");
  for (const [id, codes] of Object.entries(rig.hole ?? {})) h.state.seats[id]!.hole = cards(codes);
  if (rig.board) h.state.deck = cards(rig.board);
  h.fire();
}

const send = (h: H, id: string, action: string, amount?: number) => h.input(id, { type: "act", action, amount });

/** Asserts it's `id`'s turn, then acts. */
function play(h: H, id: string, action: string, amount?: number) {
  expect(h.state.actorId).toBe(id);
  send(h, id, action, amount);
}

const chips = (h: H) => Object.fromEntries(h.state.ids.map((id) => [id, h.state.seats[id]!.chips]));
const view = (h: H, id: string) => h.view(id) as HePlayer;
const tv = (h: H) => h.tv() as HeTv;
const runOut = (h: H) => {
  while (h.state.phase === "street") h.fire();
};

describe("Hold'em Night", () => {
  it("posts the blinds left of the button and opens the action left of the big blind", () => {
    const h = table(4);
    h.fire();
    expect(h.state.sbId).toBe("p1");
    expect(h.state.bbId).toBe("p2");
    expect(h.state.seats.p1!.streetBet).toBe(10);
    expect(h.state.seats.p2!.streetBet).toBe(20);
    expect(h.state.seats.p2!.chips).toBe(980);
    expect(Object.values(h.state.seats).every((s) => s.hole.length === 2)).toBe(true);
    h.fire();
    expect(h.state.phase).toBe("betting");
    play(h, "p3", "call");
    play(h, "p0", "call");
    play(h, "p1", "call");
    // Everyone limped: the big blind still has the option.
    expect(view(h, "p2").canCheck).toBe(true);
    expect(view(h, "p2").canRaise).toBe(true);
    play(h, "p2", "check");
    expect(h.state.phase).toBe("street");
    expect(h.state.street).toBe("flop");
    expect(h.state.board).toHaveLength(3);
    h.fire();
    // After the flop the first player left of the button acts.
    expect(h.state.actorId).toBe("p1");
    play(h, "p1", "bet", 40);
    play(h, "p2", "fold");
    play(h, "p3", "fold");
    play(h, "p0", "fold");
    expect(h.state.phase).toBe("result");
    h.fire();
    // The button moves one seat; so do the blinds.
    expect(h.state.buttonId).toBe("p1");
    expect(h.state.sbId).toBe("p2");
    expect(h.state.bbId).toBe("p3");
    h.fire();
    expect(h.state.actorId).toBe("p0");
  });

  it("plays heads-up with the button on the small blind", () => {
    const h = table(2);
    deal(h);
    expect(h.state.sbId).toBe("p0");
    expect(h.state.bbId).toBe("p1");
    expect(tv(h).headsUp).toBe(true);
    // The button acts first preflop…
    play(h, "p0", "call");
    play(h, "p1", "check");
    h.fire();
    // …and last after the flop.
    expect(h.state.actorId).toBe("p1");
    play(h, "p1", "check");
    play(h, "p0", "check");
    expect(h.state.street).toBe("turn");
    h.fire();
    play(h, "p1", "bet", 40);
    play(h, "p0", "fold");
    expect(chips(h)).toEqual({ p0: 980, p1: 1020 });
    h.fire();
    expect(h.state.buttonId).toBe("p1");
    expect(h.state.sbId).toBe("p1");
    expect(h.state.bbId).toBe("p0");
    h.fire();
    expect(h.state.actorId).toBe("p1");
  });

  it("keeps the betting open until everyone has answered the last full raise", () => {
    const h = table(4);
    deal(h);
    play(h, "p3", "raise", 60);
    play(h, "p0", "call");
    play(h, "p1", "fold");
    play(h, "p2", "raise", 200);
    // The original raiser and the caller both have to answer the re-raise.
    play(h, "p3", "call");
    expect(h.state.phase).toBe("betting");
    play(h, "p0", "call");
    expect(h.state.phase).toBe("street");
    expect(tv(h).potTotal).toBe(610);
    expect(tv(h).pots).toEqual([{ amount: 610, eligibleIds: ["p0", "p2", "p3"], winnerIds: [], handLabel: null }]);
    // Checks all the way round close a street too.
    h.fire();
    play(h, "p2", "check");
    play(h, "p3", "check");
    play(h, "p0", "check");
    expect(h.state.street).toBe("turn");
  });

  it("enforces the minimum bet and raise sizes", () => {
    const h = table(4);
    deal(h);
    expect(view(h, "p3")).toMatchObject({ canRaise: true, minRaiseTo: 40, maxRaiseTo: 1000, isBet: false, toCall: 20 });
    play(h, "p3", "raise", 25); // too small: bumped to the minimum
    expect(h.state.currentBet).toBe(40);
    play(h, "p0", "raise", 100); // a raise of 60…
    expect(view(h, "p1").minRaiseTo).toBe(160); // …so the next raise is at least 60 more
    play(h, "p1", "raise", 120);
    expect(h.state.currentBet).toBe(160);
    play(h, "p2", "call");
    play(h, "p3", "call");
    play(h, "p0", "call");
    h.fire();
    // A new street: the minimum opening bet is the big blind.
    expect(view(h, "p1")).toMatchObject({ canCheck: true, isBet: true, minRaiseTo: 20, maxRaiseTo: 840 });
    play(h, "p1", "bet", 5);
    expect(h.state.currentBet).toBe(20);
    play(h, "p2", "raise", 70);
    expect(view(h, "p3").minRaiseTo).toBe(120);
    // Garbage is ignored.
    send(h, "p3", "raise", Number.NaN);
    send(h, "p3", "dance");
    send(h, "p0", "call");
    expect(h.state.actorId).toBe("p3");
    expect(h.state.currentBet).toBe(70);
  });

  it("doesn't reopen the betting after a short all-in", () => {
    const h = table(3, { chips: [1000, 1000, 130] });
    deal(h);
    play(h, "p0", "raise", 100);
    play(h, "p1", "call");
    play(h, "p2", "allin"); // 130: only 30 more, short of a full raise
    expect(h.state.currentBet).toBe(130);
    expect(h.state.minRaise).toBe(80);
    // Both already acted, so they may only call or fold.
    expect(view(h, "p0")).toMatchObject({ myTurn: true, canCall: true, canRaise: false, toCall: 30 });
    send(h, "p0", "raise", 400);
    send(h, "p0", "allin");
    expect(h.state.actorId).toBe("p0");
    expect(h.state.currentBet).toBe(130);
    play(h, "p0", "call");
    play(h, "p1", "call");
    expect(h.state.phase).toBe("street");
    expect(h.state.street).toBe("flop");
  });

  it("lets a player who hasn't acted raise over a short all-in", () => {
    const h = table(4, { chips: [150, 1000, 1000, 1000] });
    deal(h);
    play(h, "p3", "raise", 100);
    play(h, "p0", "allin"); // to 150: a short raise of 50
    expect(view(h, "p1")).toMatchObject({ canRaise: true, minRaiseTo: 230 });
    play(h, "p1", "call");
    play(h, "p2", "call");
    // The original raiser only faces the short raise: call or fold.
    expect(view(h, "p3")).toMatchObject({ canRaise: false, canCall: true, toCall: 50 });
  });

  it("makes everyone match the full big blind even when it was posted short", () => {
    const h = table(3, { chips: [1000, 1000, 15] });
    deal(h, { hole: { p0: "2c 3d", p1: "Ah Ad", p2: "Kh Kd" }, board: "9s 8s 4c Jd 5h" });
    expect(h.state.seats.p2).toMatchObject({ streetBet: 15, allIn: true });
    expect(view(h, "p0").toCall).toBe(20);
    play(h, "p0", "call");
    play(h, "p1", "call");
    expect(h.state.phase).toBe("street");
    expect(tv(h).pots).toEqual([
      { amount: 45, eligibleIds: ["p0", "p1", "p2"], winnerIds: [], handLabel: null },
      { amount: 10, eligibleIds: ["p0", "p1"], winnerIds: [], handLabel: null },
    ]);
    h.fire();
    play(h, "p1", "bet", 100);
    // A fold here doesn't end the hand: the all-in big blind is still live.
    play(h, "p0", "fold");
    expect(h.state.runout).toBe(true);
    // p1's unmatched bet came back before the board ran out.
    expect(h.state.seats.p1!.chips).toBe(980);
    runOut(h);
    expect(h.state.phase).toBe("result");
    expect(h.state.results.map((p) => [p.amount, p.winnerIds])).toEqual([
      [45, ["p1"]],
      [10, ["p1"]],
    ]);
    expect(chips(h)).toEqual({ p0: 980, p1: 1035, p2: 0 });
  });

  it("never asks a heads-up player to cover more than a short big blind put in", () => {
    // The big blind can only post 5: the small blind already covers it, so nobody acts.
    const h = table(2, { chips: [1000, 5] });
    deal(h, { hole: { p0: "As Ah", p1: "7c 2d" }, board: "Kd Qs 9c 4h 3d" });
    expect(h.state.phase).toBe("street");
    expect(h.state.runout).toBe(true);
    expect(h.state.seats.p0!.chips).toBe(995);
    runOut(h);
    expect(chips(h)).toEqual({ p0: 1005, p1: 0 });

    // Posted 15 of a 20 blind against a 10 small blind: the small blind owes 5, not 10.
    const g = table(2, { chips: [1000, 15] });
    deal(g);
    expect(view(g, "p0")).toMatchObject({ myTurn: true, toCall: 5, canRaise: false });
    play(g, "p0", "call");
    expect(g.state.runout).toBe(true);
  });

  it("cuts side pots from a three-way all-in with different stacks", () => {
    const h = table(3, { chips: [100, 300, 600] });
    deal(h, { hole: { p0: "As Ah", p1: "Ks Kh", p2: "Qs Qh" }, board: "2c 7d 9h Jc 3s" });
    play(h, "p0", "allin");
    play(h, "p1", "allin");
    // Everyone else is all in: the big stack can only call (or fold).
    expect(view(h, "p2")).toMatchObject({ canRaise: false, canCall: true, toCall: 280 });
    send(h, "p2", "allin");
    expect(h.state.actorId).toBe("p2");
    play(h, "p2", "call");
    // Nobody left to bet: the hands are tabled and the board runs out.
    expect(h.state.phase).toBe("street");
    expect(h.state.runout).toBe(true);
    expect(tv(h).seats.map((s) => s.cards?.length)).toEqual([2, 2, 2]);
    expect(h.state.seats.p2!.chips).toBe(300);
    expect(tv(h).pots.map((p) => [p.amount, p.eligibleIds])).toEqual([
      [300, ["p0", "p1", "p2"]],
      [400, ["p1", "p2"]],
    ]);
    runOut(h);
    expect(h.state.board).toEqual(cards("2c 7d 9h Jc 3s"));
    expect(h.state.phase).toBe("result");
    expect(h.state.results.map((p) => [p.amount, p.winnerIds, p.handLabel])).toEqual([
      [300, ["p0"], "Pair of Aces"],
      [400, ["p1"], "Pair of Kings"],
    ]);
    expect(chips(h)).toEqual({ p0: 300, p1: 400, p2: 300 });
    expect(tv(h).seats.map((s) => s.delta)).toEqual([200, 100, -300]);
  });

  it("splits a tie evenly and gives the odd chip to the first winner left of the button", () => {
    const h = table(3, { chips: [55, 1000, 1000] });
    deal(h, { hole: { p0: "3d 4s", p1: "As Qd", p2: "Ah Qc" }, board: "2c 7d 9h Js Kc" });
    play(h, "p0", "allin");
    play(h, "p1", "call");
    play(h, "p2", "call");
    // Two players can still bet, so the betting goes on around the all-in.
    for (let street = 0; street < 3; street++) {
      expect(h.state.phase).toBe("street");
      h.fire();
      play(h, "p1", "check");
      play(h, "p2", "check");
    }
    expect(h.state.phase).toBe("result");
    expect(h.state.results).toEqual([{ amount: 165, eligibleIds: ["p0", "p1", "p2"], winnerIds: ["p1", "p2"], handLabel: "High Card · Ace" }]);
    expect(chips(h)).toEqual({ p0: 0, p1: 1028, p2: 1027 });
    expect(splitPot(101, ["a", "b", "c"])).toEqual({ a: 34, b: 34, c: 33 });
  });

  it("hands the pot to the last player standing without showing anyone's cards", () => {
    const h = table(3);
    deal(h);
    play(h, "p0", "fold");
    play(h, "p1", "fold");
    expect(h.state.phase).toBe("result");
    expect(chips(h)).toEqual({ p0: 1000, p1: 990, p2: 1010 });
    const t = tv(h);
    expect(t.showdown).toBe(false);
    expect(t.seats.every((s) => s.cards === null && s.handLabel === null)).toBe(true);
    expect(t.pots).toEqual([{ amount: 20, eligibleIds: ["p2"], winnerIds: ["p2"], handLabel: null }]);
    expect(view(h, "p2")).toMatchObject({ won: 20, delta: 10 });
  });

  it("ends when one player holds every chip", () => {
    const h = table(2);
    deal(h, { hole: { p0: "As Ah", p1: "7c 2d" }, board: "Kd Qs 9c 4h 3d" });
    play(h, "p0", "allin");
    play(h, "p1", "call");
    runOut(h);
    expect(chips(h)).toEqual({ p0: 2000, p1: 0 });
    expect(view(h, "p1")).toMatchObject({ status: "out", place: 2 });
    expect(h.events.some((e) => e.kind === "bust" && e.playerId === "p1")).toBe(true);
    h.fire();
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
    expect(h.deadline).toBeNull();
    expect(holdem.scores(h.state)).toEqual({ p0: 2000, p1: 0 });
  });

  it("deals busted players out and carries on heads-up", () => {
    const h = table(3, { chips: [100, 1000, 1000] });
    deal(h, { hole: { p0: "7c 2d", p1: "As Ah", p2: "9s 8h" }, board: "Kd Qs 9c 4h 3d" });
    play(h, "p0", "allin");
    play(h, "p1", "call");
    play(h, "p2", "fold");
    runOut(h);
    expect(h.state.seats.p0!.chips).toBe(0);
    h.fire();
    // p0 is out: the button skips them and heads-up rules kick in.
    expect(h.state.phase).toBe("deal");
    expect(h.state.seats.p0!.inHand).toBe(false);
    expect(h.state.buttonId).toBe("p1");
    expect(h.state.sbId).toBe("p1");
    expect(h.state.bbId).toBe("p2");
    expect(view(h, "p0")).toMatchObject({ status: "out", place: 3 });
    expect(tv(h).seats[0]).toMatchObject({ status: "out", holding: false });
    expect(tv(h).standings.map((s) => s.playerId)).toEqual(["p1", "p2", "p0"]);
  });

  it("stops after the hand limit", () => {
    const h = table(3, { options: { hands: 12 } });
    let guard = 0;
    while (!h.finished && guard++ < 2000) h.fire();
    expect(h.finished).toBe(true);
    expect(h.state.hand).toBe(12);
    expect(h.state.phase).toBe("podium");
    expect(Object.values(chips(h)).reduce((a, b) => a + b, 0)).toBe(3000);
    // Blinds doubled after six hands.
    expect(h.state.bigBlind).toBe(40);
    expect(h.events.filter((e) => e.kind === "hand").at(-1)?.sfx).toBe("round.final");
  });

  it("plays last-stack games to a winner, never past the hand cap", () => {
    const h = table(2);
    let guard = 0;
    while (!h.finished && guard++ < 5000) h.fire();
    expect(h.finished).toBe(true);
    expect(h.state.hand).toBeLessThanOrEqual(HE_HAND_CAP);
    expect(Object.values(chips(h)).reduce((a, b) => a + b, 0)).toBe(2000);
  });

  it("checks or folds for a player whose clock runs out", () => {
    const h = table(3);
    deal(h);
    expect(h.deadline! - h.ctx.now()).toBe(30_000);
    h.fire(); // p0 faces the big blind: fold
    expect(h.state.seats.p0!.folded).toBe(true);
    expect(h.state.log).toMatchObject({ playerId: "p0", kind: "fold", auto: true });
    play(h, "p1", "call");
    h.fire(); // the big blind can check: check
    expect(h.state.log).toMatchObject({ playerId: "p2", kind: "check", auto: true });
    expect(h.state.phase).toBe("street");
  });

  it("gives a dropped phone a short grace before acting for it", () => {
    const h = table(3);
    h.fire();
    h.connected.delete("p0");
    h.fire();
    expect(h.state.actorId).toBe("p0");
    expect(h.deadline! - h.ctx.now()).toBe(2000);
    h.fire();
    expect(h.state.seats.p0!.folded).toBe(true);

    // Dropping mid-turn cuts the clock to the grace; coming back restores it.
    expect(h.state.actorId).toBe("p1");
    h.advance(4000);
    h.connected.delete("p1");
    holdem.onConnectionChange!(h.state, h.ctx, "p1", false);
    expect(h.deadline! - h.ctx.now()).toBe(2000);
    h.connected.add("p1");
    holdem.onConnectionChange!(h.state, h.ctx, "p1", true);
    expect(h.deadline! - h.ctx.now()).toBe(26_000);
  });

  it("waits the full clock when every phone is away (the TV probably refreshed)", () => {
    const h = table(3);
    h.fire();
    h.connected.clear();
    h.fire();
    expect(h.deadline! - h.ctx.now()).toBe(30_000);
  });

  it("never shows hole cards to the TV or to other players before a showdown", () => {
    const h = table(3);
    deal(h, { hole: { p0: "As Ah", p1: "Ks Kh", p2: "7c 2d" }, board: "2c 7d 9h Jc 3s" });
    const ids = ["p0", "p1", "p2"];
    const hole = (id: string) => h.state.seats[id]!.hole.map((c) => JSON.stringify(c));
    const check = (onTv: string[]) => {
      const screen = JSON.stringify(h.tv());
      expect(screen).not.toContain("deck");
      for (const id of ids) {
        for (const c of hole(id)) {
          if (onTv.includes(id)) expect(screen).toContain(c);
          else expect(screen).not.toContain(c);
        }
        for (const viewer of ids) {
          const mine = JSON.stringify(h.view(viewer));
          for (const c of hole(id)) {
            if (viewer === id) expect(mine).toContain(c);
            else expect(mine).not.toContain(c);
          }
        }
      }
    };
    check([]);
    play(h, "p0", "raise", 100);
    check([]);
    play(h, "p1", "call");
    play(h, "p2", "fold");
    check([]);
    // Read through a function: TS would otherwise narrow the phase across the mutating calls.
    const phase = (): string => h.state.phase;
    while (phase() !== "result") {
      if (phase() === "street") h.fire();
      else send(h, h.state.actorId!, "check");
      if (phase() !== "result") check([]);
    }
    // Showdown: the two live hands are revealed, the folded one never is.
    check(["p0", "p1"]);
    const seats = tv(h).seats;
    expect(seats[0]).toMatchObject({ handLabel: "Pair of Aces", won: 220, delta: 120 });
    expect(seats[2]).toMatchObject({ cards: null, handLabel: null, status: "folded" });
    h.fire();
    check([]);
  });

  it("builds pots and names hands", () => {
    expect(
      buildPots([
        { id: "a", amount: 50, live: true },
        { id: "b", amount: 200, live: true },
        { id: "c", amount: 200, live: false },
        { id: "d", amount: 120, live: true },
      ]),
    ).toEqual([
      { amount: 200, eligibleIds: ["a", "b", "d"] },
      { amount: 210, eligibleIds: ["b", "d"] },
      { amount: 160, eligibleIds: ["b"] },
    ]);
    const name = (hole: string, board: string) => handName(evaluate(cards(hole), board ? cards(board) : [])!);
    expect(name("As Kd", "")).toBe("High Card · Ace");
    expect(name("8s 8d", "")).toBe("Pair of 8s");
    expect(name("As Ad", "Ks Kd 2c")).toBe("Two Pair · Aces & Kings");
    expect(name("9s 9d", "9c 4h 4d")).toBe("Full House · 9s full of 4s");
    expect(name("Ts Js", "Qs Ks As 2d 3c")).toBe("Royal Flush");
    expect(name("5h 6h", "7c 8d 9s")).toBe("Straight · 9 high");
  });

  it("never loses a chip or stalls through random play", () => {
    let seed = 20261031;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let game = 0; game < 40; game++) {
      const n = 2 + (game % 7);
      // From cagey check-downs to shove-fests.
      const aggro = 0.05 + (0.45 * (game % 4)) / 3;
      const h = harness(holdem, n, { random: rnd, options: { hands: game % 3 === 0 ? 0 : 24 } });
      let guard = 0;
      while (!h.finished && guard++ < 20_000) {
        if (h.state.phase === "betting" && rnd() < 0.92) {
          const id = h.state.actorId!;
          const v = view(h, id);
          expect(v.myTurn).toBe(true);
          const r = rnd();
          if (r < 0.12) send(h, id, v.canCheck ? "check" : "fold");
          else if (r < 0.12 + aggro && v.canRaise) send(h, id, "raise", v.minRaiseTo + Math.floor((v.maxRaiseTo - v.minRaiseTo) * rnd() ** 4));
          else if (r < 0.14 + aggro && v.canRaise) send(h, id, "allin");
          else send(h, id, v.canCheck ? "check" : "call");
        } else h.fire();
        const settled = h.state.phase === "result" || h.state.phase === "podium";
        const total = Object.values(h.state.seats).reduce((sum, s) => sum + s.chips + (settled ? 0 : s.committed), 0);
        expect(total).toBe(n * 1000);
        expect(Object.values(h.state.seats).every((s) => s.chips >= 0 && s.streetBet >= 0)).toBe(true);
        if (h.state.phase !== "podium") expect(h.deadline).not.toBeNull();
        if (h.state.phase === "betting") expect(h.state.actorId).not.toBeNull();
        if (guard % 7 === 0) {
          h.tv();
          for (const id of h.state.ids) h.view(id);
        }
      }
      expect(h.finished).toBe(true);
      expect(h.state.hand).toBeLessThanOrEqual(game % 3 === 0 ? HE_HAND_CAP : 24);
    }
  });
});
