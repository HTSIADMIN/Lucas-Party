import { describe, expect, it } from "vitest";
import { LD_CALL_POINTS, LD_OUTLAST_POINTS, LD_WINNER_POINTS, ldIsRaise, ldMinQuantity, ldMinRaise, type LdPlayer, type LdTv } from "@party/shared";
import { liarsdice, type LdState } from "../src/shared/engine/games/liarsdice";
import { harness } from "./harness";

type H = ReturnType<typeof harness<LdState>>;

/** intro (or last result) → roll → the opener's turn. */
function toBidding(h: H) {
  if (h.state.phase === "intro" || h.state.phase === "result") h.fire();
  expect(h.state.phase).toBe("roll");
  h.fire();
  expect(h.state.phase).toBe("bid");
}

/** Swaps in known dice for this round (each player keeps their dice count). */
function rig(h: H, rolls: Record<string, number[]>) {
  for (const [id, dice] of Object.entries(rolls)) {
    expect(dice).toHaveLength(h.state.dice[id]!);
    h.state.rolls[id] = dice;
  }
}

/** The next seat round the table (ignores who's out). */
function seatAfter(h: H, id: string): string {
  const i = h.state.ids.indexOf(id);
  return h.state.ids[(i + 1) % h.state.ids.length]!;
}

function turn(h: H): string {
  expect(h.state.phase).toBe("bid");
  return h.state.turnId!;
}

describe("Liar's Dice", () => {
  it("knows what a legal raise is", () => {
    expect(ldIsRaise(null, { quantity: 1, face: 2 }, 10)).toBe(true);
    expect(ldIsRaise(null, { quantity: 1, face: 1 }, 10)).toBe(false);
    expect(ldIsRaise(null, { quantity: 0, face: 3 }, 10)).toBe(false);
    expect(ldIsRaise(null, { quantity: 11, face: 3 }, 10)).toBe(false);
    expect(ldIsRaise(null, { quantity: 2.5, face: 3 }, 10)).toBe(false);
    const prev = { quantity: 3, face: 4 };
    expect(ldIsRaise(prev, { quantity: 3, face: 5 }, 10)).toBe(true);
    expect(ldIsRaise(prev, { quantity: 3, face: 4 }, 10)).toBe(false);
    expect(ldIsRaise(prev, { quantity: 3, face: 3 }, 10)).toBe(false);
    expect(ldIsRaise(prev, { quantity: 4, face: 2 }, 10)).toBe(true);
    expect(ldIsRaise(prev, { quantity: 2, face: 6 }, 10)).toBe(false);
    expect(ldMinQuantity(prev, 5)).toBe(3);
    expect(ldMinQuantity(prev, 4)).toBe(4);
    expect(ldMinRaise(null, 10)).toEqual({ quantity: 1, face: 2 });
    expect(ldMinRaise(prev, 10)).toEqual({ quantity: 3, face: 5 });
    expect(ldMinRaise({ quantity: 3, face: 6 }, 10)).toEqual({ quantity: 4, face: 2 });
    expect(ldMinRaise({ quantity: 10, face: 6 }, 10)).toBeNull();
  });

  it("rolls secret dice: each phone sees only its own, the TV sees none until a call", () => {
    const h = harness(liarsdice, 4, { options: { dice: 3 } });
    h.fire();
    expect(h.state.phase).toBe("roll");
    for (const p of h.roster) {
      const v = h.view(p.id) as LdPlayer;
      expect(v.myDice).toEqual(h.state.rolls[p.id]);
      expect(v.myDice).toHaveLength(3);
      for (const d of v.myDice) expect(d >= 1 && d <= 6).toBe(true);
      expect(v.totalDice).toBe(12);
      expect(Object.keys(v)).not.toContain("rolls");
    }
    h.fire();
    const tv = h.tv() as LdTv;
    expect(tv.seats.map((s) => s.dice)).toEqual([3, 3, 3, 3]);
    expect(tv.seats.every((s) => s.shown === null)).toBe(true);
    expect(JSON.stringify(tv)).not.toContain("rolls");

    const a = turn(h);
    h.input(a, { type: "bid", quantity: 2, face: 3 });
    h.input(turn(h), { type: "liar" });
    const revealed = h.tv() as LdTv;
    for (const s of revealed.seats) expect(s.shown).toEqual(h.state.rolls[s.playerId]);
  });

  it("goes round the table and ignores bad or out-of-turn input", () => {
    const h = harness(liarsdice, 3);
    toBidding(h);
    const a = turn(h);
    const b = seatAfter(h, a);
    h.input(b, { type: "bid", quantity: 2, face: 3 });
    h.input(a, { type: "liar" });
    h.input(a, { type: "spotOn" });
    h.input(a, { type: "bid", quantity: 2, face: 1 });
    h.input(a, { type: "bid", quantity: 16, face: 3 });
    h.input(a, { type: "bid", quantity: "lots", face: 3 });
    h.input(a, null);
    h.input(a, "bid");
    expect(h.state.bids).toHaveLength(0);
    expect(h.state.phase).toBe("bid");
    expect((h.view(a) as LdPlayer).canCall).toBe(false);

    h.input(a, { type: "bid", quantity: 2, face: 3 });
    expect(turn(h)).toBe(b);
    h.input(b, { type: "bid", quantity: 2, face: 3 });
    h.input(b, { type: "bid", quantity: 1, face: 6 });
    expect(h.state.bids).toHaveLength(1);
    h.input(b, { type: "bid", quantity: 2, face: 4 });
    const c = seatAfter(h, b);
    expect(turn(h)).toBe(c);
    const view = h.view(c) as LdPlayer;
    expect(view.myTurn).toBe(true);
    expect(view.canCall).toBe(true);
    expect(view.minRaise).toEqual({ quantity: 2, face: 5 });
    expect((h.view(a) as LdPlayer).minRaise).toBeNull();
  });

  it("LIAR on a short bid costs the bidder a die, and the loser opens next round", () => {
    const h = harness(liarsdice, 3);
    toBidding(h);
    // Counting twos: p0 holds a wild one + two twos, p1 one two → 4.
    rig(h, { p0: [1, 2, 2, 3, 4], p1: [2, 5, 5, 6, 6], p2: [3, 3, 4, 4, 6] });
    const a = turn(h);
    h.input(a, { type: "bid", quantity: 5, face: 2 });
    const b = turn(h);
    h.input(b, { type: "liar" });
    expect(h.state.phase).toBe("reveal");
    expect(h.state.call).toMatchObject({ kind: "liar", callerId: b, bidderId: a, count: 4, correct: true, loserId: a });
    expect(h.state.dice[a]).toBe(5);
    h.fire();
    expect(h.state.phase).toBe("result");
    expect(h.state.dice[a]).toBe(4);
    expect(h.state.scores[b]).toBe(LD_CALL_POINTS);
    expect((h.view(b) as LdPlayer).gained).toBe(LD_CALL_POINTS);
    h.fire();
    expect(h.state.phase).toBe("roll");
    expect(h.state.openerId).toBe(a);
    expect(h.state.rolls[a]).toHaveLength(4);
    expect((h.view(a) as LdPlayer).totalDice).toBe(14);
  });

  it("LIAR on a bid that holds costs the caller a die", () => {
    const h = harness(liarsdice, 3);
    toBidding(h);
    rig(h, { p0: [1, 2, 2, 3, 4], p1: [2, 5, 5, 6, 6], p2: [3, 3, 4, 4, 6] });
    const a = turn(h);
    h.input(a, { type: "bid", quantity: 4, face: 2 });
    const b = turn(h);
    h.input(b, { type: "liar" });
    expect(h.state.call).toMatchObject({ count: 4, correct: false, loserId: b });
    h.fire();
    expect(h.state.dice[b]).toBe(4);
    expect(h.state.dice[a]).toBe(5);
    expect(h.state.scores[b]).toBe(0);
    h.fire();
    expect(h.state.openerId).toBe(b);
  });

  it("SPOT ON wins a die back when exact (never past the start) and costs one when not", () => {
    const exact = harness(liarsdice, 2, { options: { dice: 3 } });
    toBidding(exact);
    const a = turn(exact);
    const b = seatAfter(exact, a);
    exact.state.dice[b] = 2;
    // Counting fours: a's wild one + two fours, b's single four → 4.
    rig(exact, { [a]: [1, 4, 4], [b]: [4, 6] });
    exact.input(a, { type: "bid", quantity: 4, face: 4 });
    exact.input(b, { type: "spotOn" });
    expect(exact.state.call).toMatchObject({ kind: "spotOn", count: 4, correct: true, loserId: null, gainedDie: true });
    exact.fire();
    expect(exact.state.dice[b]).toBe(3);
    expect(exact.state.dice[a]).toBe(3);
    expect(exact.state.scores[b]).toBe(LD_CALL_POINTS);
    exact.fire();
    expect(exact.state.openerId).toBe(b);

    // A full cup stays full, but the call still scores.
    const full = harness(liarsdice, 2, { options: { dice: 3 } });
    toBidding(full);
    const c = turn(full);
    const d = seatAfter(full, c);
    rig(full, { [c]: [1, 4, 4], [d]: [4, 6, 6] });
    full.input(c, { type: "bid", quantity: 4, face: 4 });
    full.input(d, { type: "spotOn" });
    expect(full.state.call).toMatchObject({ correct: true, gainedDie: false });
    full.fire();
    expect(full.state.dice[d]).toBe(3);
    expect(full.state.scores[d]).toBe(LD_CALL_POINTS);

    const wrong = harness(liarsdice, 2, { options: { dice: 3 } });
    toBidding(wrong);
    const e = turn(wrong);
    const f = seatAfter(wrong, e);
    rig(wrong, { [e]: [1, 4, 4], [f]: [4, 6, 6] });
    wrong.input(e, { type: "bid", quantity: 3, face: 4 });
    wrong.input(f, { type: "spotOn" });
    expect(wrong.state.call).toMatchObject({ count: 4, correct: false, loserId: f });
    wrong.fire();
    expect(wrong.state.dice[f]).toBe(2);
    expect(wrong.state.scores[f]).toBe(0);
  });

  it("plays for a bidder who runs out of time: opens 1 × 2, otherwise calls LIAR", () => {
    const h = harness(liarsdice, 3);
    toBidding(h);
    const a = turn(h);
    expect(h.deadline! - h.ctx.now()).toBe(30_000);
    h.fire();
    expect(h.state.bids).toEqual([{ playerId: a, quantity: 1, face: 2, auto: true }]);
    const b = turn(h);
    expect(b).toBe(seatAfter(h, a));
    h.fire();
    expect(h.state.phase).toBe("reveal");
    expect(h.state.call).toMatchObject({ kind: "liar", callerId: b, bidderId: a, auto: true });
  });

  it("never lets a dropped phone hold up the table", () => {
    const h = harness(liarsdice, 3);
    toBidding(h);
    const a = turn(h);
    // Drops mid-turn: the clock jumps to a short grace…
    h.advance(5000);
    h.connected.delete(a);
    liarsdice.onConnectionChange!(h.state, h.ctx, a, false);
    expect(h.deadline! - h.ctx.now()).toBe(2000);
    // …and coming back in time hands back the rest of the turn.
    h.advance(1000);
    h.connected.add(a);
    liarsdice.onConnectionChange!(h.state, h.ctx, a, true);
    expect(h.deadline! - h.ctx.now()).toBe(24_000);
    // A pause doesn't eat into the turn either.
    liarsdice.onResume!(h.state, h.ctx, 10_000);
    expect(h.state.turnEndsAt! - h.ctx.now()).toBe(34_000);

    // A seat that's already away only gets the grace when its turn comes.
    const b = seatAfter(h, a);
    h.connected.delete(b);
    h.input(a, { type: "bid", quantity: 2, face: 5 });
    expect(turn(h)).toBe(b);
    expect(h.deadline! - h.ctx.now()).toBe(2000);
    h.fire();
    expect(h.state.call).toMatchObject({ kind: "liar", callerId: b, auto: true });
  });

  it("scores 100 per opponent outlasted, 300 for the winner and 50 per correct call", () => {
    const h = harness(liarsdice, 3, { options: { dice: 1 } });
    toBidding(h);
    const a = turn(h);
    const b = seatAfter(h, a);
    const c = seatAfter(h, b);
    // Round 1: a overbids, b catches it and a is out.
    rig(h, { [a]: [3], [b]: [5], [c]: [6] });
    h.input(a, { type: "bid", quantity: 2, face: 3 });
    h.input(b, { type: "liar" });
    h.fire();
    expect(h.state.call?.eliminatedId).toBe(a);
    expect(h.state.outOrder).toEqual([a]);
    expect((h.view(a) as LdPlayer).out).toBe(true);
    expect(h.state.scores).toEqual({ [a]: 0, [b]: LD_CALL_POINTS + LD_OUTLAST_POINTS, [c]: LD_OUTLAST_POINTS });

    // Round 2: a is out, so the next seat along (b) opens. Heads-up!
    toBidding(h);
    expect(h.state.openerId).toBe(b);
    expect(h.events.some((e) => e.kind === "roll" && e.sfx === "round.final")).toBe(true);
    expect((h.view(a) as LdPlayer).myDice).toEqual([]);
    expect((h.tv() as LdTv).totalDice).toBe(2);
    rig(h, { [b]: [2], [c]: [4] });
    h.input(b, { type: "bid", quantity: 1, face: 4 });
    expect(turn(h)).toBe(c);
    h.input(c, { type: "liar" });
    h.fire();
    expect(h.state.winnerId).toBe(b);
    expect(h.state.outOrder).toEqual([a, c]);
    expect(h.state.scores).toEqual({
      [a]: 0,
      [b]: LD_CALL_POINTS + 2 * LD_OUTLAST_POINTS + LD_WINNER_POINTS,
      [c]: LD_OUTLAST_POINTS,
    });

    h.fire();
    expect(h.state.phase).toBe("standings");
    expect((h.tv() as LdTv).scores[0]!.playerId).toBe(b);
    h.fire();
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
    expect(h.deadline).toBeNull();
  });

  it("finishes a full table even if every phone is away", () => {
    const h = harness(liarsdice, 8);
    for (const p of h.roster) h.connected.delete(p.id);
    let guard = 0;
    while (!h.finished && guard++ < 3000) h.fire();
    expect(h.finished).toBe(true);
    expect(h.state.outOrder).toHaveLength(7);
    const winner = h.state.winnerId!;
    expect(h.state.dice[winner]).toBeGreaterThan(0);
    // Everyone's score is their outlast points (+ the winner bonus) plus whole correct calls.
    h.state.ids.forEach((id) => {
      const place = h.state.outOrder.indexOf(id);
      const base = id === winner ? 7 * LD_OUTLAST_POINTS + LD_WINNER_POINTS : place * LD_OUTLAST_POINTS;
      const extra = h.state.scores[id]! - base;
      expect(extra).toBeGreaterThanOrEqual(0);
      expect(extra % LD_CALL_POINTS).toBe(0);
    });
  });

  it("clamps the dice option and handles a lone player", () => {
    const h = harness(liarsdice, 1, { options: { dice: 99 } });
    expect(h.state.startDice).toBeLessThanOrEqual(6);
    h.fire();
    expect(h.state.phase).toBe("standings");
    expect(h.state.winnerId).toBe("p0");
    h.fire();
    expect(h.finished).toBe(true);
  });
});
