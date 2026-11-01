import { describe, expect, it } from "vitest";
import type { MbGame, MbTv } from "@party/shared";
import { mashbash } from "../src/shared/engine/games/mashbash";
import { harness } from "./harness";

type H = ReturnType<typeof harness<ReturnType<typeof mashbash.create>>>;

/** Starts the next round as a specific minigame and fires up to its play window. */
function play(h: H, game: MbGame) {
  if (h.state.phase === "intro" || h.state.phase === "board") h.fire();
  h.state.queue = [];
  h.state.game = game;
  if (game === "memory") h.state.sequence = [0, 1, 2, 3];
  if (game === "clock") h.state.target = 5000;
  h.fire(); // ready → play / steady / show
  if (game === "draw") h.fire(); // steady → draw
  if (game === "memory") h.fire(); // show → play
}

describe("Mash Bash", () => {
  it("ranks a tap race and moves players by place", () => {
    const h = harness(mashbash, 4);
    play(h, "tap");
    h.input("p0", { type: "taps", count: 30 });
    h.input("p1", { type: "taps", count: 42 });
    h.input("p2", { type: "taps", count: 30 });
    h.fire(); // → result (p3 never tapped)
    expect(h.state.phase).toBe("result");
    const places = Object.fromEntries(h.state.results.map((r) => [r.playerId, [r.place, r.move]]));
    expect(places).toEqual({ p1: [1, 5], p0: [2, 4], p2: [2, 4], p3: [null, 1] });
    // p0 and p2 land on space 4: a boost space (+3).
    expect(h.state.positions).toEqual({ p0: 7, p1: 5, p2: 7, p3: 1 });
    h.fire(); // → board
    expect((h.tv() as MbTv).events.filter((e) => e.kind === "boost")).toHaveLength(2);
  });

  it("scores lowest unique number, flinches and memory correctly", () => {
    const h = harness(mashbash, 3);
    play(h, "unique");
    h.input("p0", { type: "pick", value: 1 });
    h.input("p1", { type: "pick", value: 1 });
    h.input("p2", { type: "pick", value: 3 });
    h.fire();
    expect(h.state.results[0]!.playerId).toBe("p2");
    expect(h.state.results[0]!.place).toBe(1);

    h.fire(); // → board
    play(h, "draw");
    // p0 flinched during steady? Fire straight to draw instead: send a fast fake shot.
    h.input("p0", { type: "shot", ms: 50 });
    h.input("p1", { type: "shot", ms: 300 });
    h.fire();
    expect(h.state.results.find((r) => r.playerId === "p0")!.move).toBe(0);
    expect(h.state.results.find((r) => r.playerId === "p1")!.place).toBe(1);

    h.fire();
    play(h, "memory");
    h.input("p0", { type: "memory", pads: [0, 1, 2, 3], ms: 4000 });
    h.input("p1", { type: "memory", pads: [0, 1, 3, 3], ms: 1000 });
    h.input("p2", { type: "memory", pads: [0, 1, 2, 3], ms: 2500 });
    h.fire();
    expect(h.state.results.map((r) => r.playerId)).toEqual(["p2", "p0", "p1"]);
  });

  it("ends as soon as someone crosses the finish line", () => {
    const h = harness(mashbash, 2, { options: { rounds: 10 } });
    play(h, "tap");
    h.state.positions.p0 = 28;
    h.input("p0", { type: "taps", count: 50 });
    h.input("p1", { type: "taps", count: 10 });
    h.fire(); // result
    expect(h.state.positions.p0).toBe(30);
    h.fire(); // board
    h.fire(); // finish → podium
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });

  it("never repeats a minigame back to back and only shows the memory pattern while it's shown", () => {
    const h = harness(mashbash, 2, { options: { rounds: 12 } });
    h.fire();
    let last = h.state.game;
    for (let round = 0; round < 11; round++) {
      while (h.state.phase !== "board") {
        if (h.state.phase === "show") expect((h.tv() as MbTv).sequence).toEqual(h.state.sequence);
        if (h.state.phase === "play") expect((h.tv() as MbTv).sequence).toBeNull();
        h.fire();
      }
      h.fire(); // board → next round
      expect(h.state.game).not.toBe(last);
      last = h.state.game;
    }
  });
});
