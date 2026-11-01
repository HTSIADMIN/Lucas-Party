import { describe, expect, it } from "vitest";
import type { SdTv } from "@party/shared";
import { showdown } from "../src/shared/engine/games/showdown";
import { harness } from "./harness";

type H = ReturnType<typeof harness<ReturnType<typeof showdown.create>>>;

/** Fires deadlines until the game reaches `phase` (fake-outs included). */
function until(h: H, phase: string, limit = 10) {
  for (let i = 0; i < limit && h.state.phase !== phase; i++) h.fire();
  expect(h.state.phase).toBe(phase);
}

describe("Saloon Showdown", () => {
  it("ranks the fastest draws and punishes flinches", () => {
    const h = harness(showdown, 4, { random: () => 0.9 }); // 0.9 → no fake-out
    until(h, "steady");
    h.input("p3", { type: "early" });
    until(h, "draw");
    h.input("p0", { type: "shot", ms: 312 });
    h.input("p1", { type: "shot", ms: 245 });
    h.input("p2", { type: "shot", ms: 40 }); // inhumanly fast → flinch
    h.input("p3", { type: "shot", ms: 200 }); // already flinched — ignored
    h.fire();
    expect(h.state.phase).toBe("result");
    expect(h.state.scores).toEqual({ p0: 60, p1: 100, p2: -20, p3: -20 });
    const tv = h.tv() as SdTv;
    expect(tv.results.map((r) => r.playerId)).toEqual(["p1", "p0", "p2", "p3"]);
  });

  it("ignores taps during the ready phase and DRAW shots before the draw", () => {
    const h = harness(showdown, 2, { random: () => 0.9 });
    h.fire(); // intro → ready
    h.input("p0", { type: "early" });
    h.input("p0", { type: "shot", ms: 300 });
    expect(h.state.shots.p0).toBeUndefined();
  });

  it("scores Stop the Clock by distance with a bullseye bonus", () => {
    const h = harness(showdown, 3, { random: () => 0.9 });
    // Round 1 is a draw; play it out quickly.
    until(h, "draw");
    h.fire();
    until(h, "standings");
    h.fire();
    expect(h.state.kind).toBe("clock");
    until(h, "clock");
    const target = h.state.target!;
    h.input("p0", { type: "stop", ms: target + 30 });
    h.input("p1", { type: "stop", ms: target - 400 });
    h.input("p2", { type: "stop", ms: target + 900 });
    expect(h.deadline! - h.ctx.now()).toBeLessThanOrEqual(600);
    h.fire();
    expect(h.state.gained).toEqual({ p0: 150, p1: 60, p2: 30 });
  });

  it("makes the last round a double-points draw and ends on the podium", () => {
    const h = harness(showdown, 2, { options: { rounds: 2 }, random: () => 0.9 });
    until(h, "draw");
    h.fire();
    until(h, "standings");
    h.fire();
    expect(h.state.round).toBe(2);
    expect(h.state.kind).toBe("draw");
    until(h, "draw");
    h.input("p0", { type: "shot", ms: 250 });
    h.fire();
    expect(h.state.gained.p0).toBe(200);
    until(h, "podium");
    expect(h.finished).toBe(true);
  });

  it("sometimes throws in a fake-out that baits flinches", () => {
    const h = harness(showdown, 2, { random: () => 0.1 }); // 0.1 → fake-out
    until(h, "steady");
    h.fire();
    expect(h.state.phase).toBe("fake");
    expect((h.tv() as SdTv).fake).toBeTruthy();
    h.input("p1", { type: "early" });
    expect(h.state.shots.p1).toEqual({ ms: null, foul: true });
    h.fire();
    expect(h.state.phase).toBe("steady");
    h.fire();
    expect(h.state.phase).toBe("draw");
  });
});
