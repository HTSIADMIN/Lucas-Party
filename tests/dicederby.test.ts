import { describe, expect, it } from "vitest";
import { DD_RACERS, DD_TRACK, type DdRacer, type DdTv } from "@party/shared";
import { dicederby } from "../src/shared/engine/games/dicederby";
import { harness } from "./harness";

type H = ReturnType<typeof harness<ReturnType<typeof dicederby.create>>>;

/** Puts racers on exact spaces (bottom of each stack first). */
function setTrack(h: H, layout: Partial<Record<number, DdRacer[]>>) {
  h.state.stacks = Array.from({ length: DD_TRACK + 1 }, (_, i) => [...(layout[i] ?? [])]);
}

describe("Dice Derby", () => {
  it("starts every racer near the gate and every player with 100 chips", () => {
    const h = harness(dicederby, 3);
    const placed = h.state.stacks.flat();
    expect([...placed].sort()).toEqual([...DD_RACERS].sort());
    expect(h.state.stacks.slice(3).flat()).toEqual([]);
    expect(Object.values(h.state.chips)).toEqual([100, 100, 100]);
  });

  it("carries the riders on top of a moving racer", () => {
    const h = harness(dicederby, 2, { random: () => 0 });
    setTrack(h, { 0: ["blip", "splash", "sprout"], 1: ["sunny", "wisp"] });
    h.fire(); // intro → pick
    h.fire(); // pick → bet
    h.fire(); // bet → roll
    h.state.toRoll = ["splash"];
    // ctx.randomInt is crypto in the harness, so check the stacking rule rather than the distance.
    h.fire();
    const at = h.state.stacks.findIndex((s) => s.includes("splash"));
    expect(h.state.stacks[at]!.slice(-2)).toEqual(["splash", "sprout"]);
    expect(h.state.stacks[0]).toEqual(["blip"]);
  });

  it("pays the leader's odds, refunds second place, and keeps bets secret until the roll", () => {
    const h = harness(dicederby, 3);
    setTrack(h, { 5: ["blip"], 4: ["splash"], 3: ["sprout", "sunny"], 2: ["wisp"] });
    h.fire(); // intro → pick
    h.fire(); // pick → bet
    expect(h.state.odds.blip).toBe(2);
    expect(h.state.odds.splash).toBe(3);
    h.input("p0", { type: "bet", racer: "blip", amount: 20 });
    h.input("p1", { type: "bet", racer: "splash", amount: 30 });
    h.input("p2", { type: "bet", racer: "wisp", amount: 999 }); // all in, clamped to 100
    expect(h.state.chips.p2).toBe(0);
    expect((h.tv() as DdTv).bets).toEqual([]);
    h.fire(); // bet → roll
    // Skip the dice: settle the leg on this exact layout.
    h.state.toRoll = [];
    h.fire();
    expect(h.state.phase).toBe("legResult");
    expect(h.state.chips.p0).toBe(80 + 40);
    expect(h.state.chips.p1).toBe(70 + 30);
    expect(h.state.chips.p2).toBe(0);
  });

  it("ends the race when a racer crosses the line and pays the winner pick", () => {
    const h = harness(dicederby, 2);
    h.fire(); // intro → pick
    h.input("p0", { type: "pick", racer: "sunny" });
    h.input("p1", { type: "pick", racer: "wisp" });
    h.fire(); // pick → bet
    h.fire(); // bet → roll (nobody bet)
    setTrack(h, { [DD_TRACK - 1]: ["sunny"], 2: ["blip", "splash", "sprout", "wisp"] });
    h.state.toRoll = ["sunny"];
    h.fire(); // sunny moves 1–3 → crosses the finish
    expect(h.state.toRoll).toEqual([]);
    h.fire(); // settle → finish
    expect(h.state.phase).toBe("finish");
    expect(h.state.winner).toBe("sunny");
    expect(h.state.chips.p0).toBe(200);
    expect(h.state.chips.p1).toBe(100);
    h.fire();
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });

  it("gives broke players some pocket lint", () => {
    const h = harness(dicederby, 2);
    h.state.chips.p0 = 0;
    h.fire();
    h.fire(); // pick → bet
    expect(h.state.chips.p0).toBe(20);
  });
});
