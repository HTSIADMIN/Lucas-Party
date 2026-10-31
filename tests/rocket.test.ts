import { describe, expect, it } from "vitest";
import { ROCKET_START_CHIPS, minBetFor, rocketPayout, rocketTimeFor } from "@party/shared";
import { rocket } from "../src/shared/engine/games/rocket";
import { harness } from "./harness";

/** Feeds random() a fixed value so the crash point is predictable. */
function crashAt(mult: number) {
  // pickCrashPoint: m = floor(0.97 / (1 - u) * 100) / 100  →  u = 1 - 0.97 / m
  return () => 1 - 0.97 / (mult + 0.001);
}

describe("Rocket Riot", () => {
  it("pays bet × multiplier for a manual bail and takes the bet from riders who explode", () => {
    const h = harness(rocket, 2, { random: crashAt(3), options: { rounds: 3 } });
    h.fire(); // intro → bet
    h.input("p0", { type: "bet", amount: 200, double: false, autoTarget: null });
    h.input("p1", { type: "bet", amount: 100, double: false, autoTarget: null });
    h.fire(); // lock → countdown
    expect(h.state.crashPoint).toBeCloseTo(3, 1);
    h.fire(); // launch → flight
    expect(h.state.phase).toBe("flight");

    h.advance(rocketTimeFor(2)); // multiplier 2.00
    h.input("p0", { type: "bail" });
    expect(h.state.riders.p0!.bailedAt).toBeCloseTo(2, 1);

    while (h.state.phase === "flight") h.fire();
    expect(h.state.phase).toBe("boom");
    // p0: 1000 - 200 + 400 (+10% daredevil, only rider to bail with 2 riders aboard)
    expect(h.state.chips.p0).toBe(ROCKET_START_CHIPS - 200 + 400 + 40);
    expect(h.state.chips.p1).toBe(ROCKET_START_CHIPS - 100);
  });

  it("auto-bails at the autopilot target", () => {
    const h = harness(rocket, 2, { random: crashAt(5) });
    h.fire();
    h.input("p0", { type: "bet", amount: 100, double: false, autoTarget: 1.5 });
    h.input("p1", { type: "bet", amount: 100, double: false, autoTarget: 2.5 });
    h.fire();
    h.fire();
    while (h.state.phase === "flight") h.fire();
    expect(h.state.riders.p0!.bailedAt).toBe(1.5);
    expect(h.state.riders.p1!.bailedAt).toBe(2.5);
    expect(h.state.riders.p1!.daredevil).toBe(true);
  });

  it("enforces the minimum bet and limits Double Down to once per game", () => {
    const h = harness(rocket, 2, { random: crashAt(2) });
    h.fire();
    h.input("p0", { type: "bet", amount: 1, double: true, autoTarget: null });
    h.fire();
    expect(h.state.riders.p0!.bet).toBe(minBetFor(ROCKET_START_CHIPS, false));
    expect(h.state.riders.p0!.doubled).toBe(true);
    expect(h.state.doubleUsed.p0).toBe(true);
  });

  it("doubles only the profit on Double Down", () => {
    expect(rocketPayout(100, 2, false)).toBe(200);
    expect(rocketPayout(100, 2, true)).toBe(300);
    expect(rocketPayout(100, 1, true)).toBe(100);
  });

  it("rejects a bail that arrives after the crash", () => {
    const h = harness(rocket, 2, { random: crashAt(1.2) });
    h.fire();
    h.fire();
    h.fire();
    h.advance(rocketTimeFor(1.5));
    h.input("p0", { type: "bail" });
    expect(h.state.riders.p0!.bailedAt).toBeNull();
  });

  it("finishes after the configured number of launches", () => {
    const h = harness(rocket, 3, { random: crashAt(2), options: { rounds: 2 } });
    let guard = 0;
    while (!h.finished && guard++ < 100) h.fire();
    expect(h.finished).toBe(true);
    expect(h.state.history).toHaveLength(2);
  });
});
