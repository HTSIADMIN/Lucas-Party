import { describe, expect, it } from "vitest";
import type { CpTv } from "@party/shared";
import { crowdpleaser } from "../src/shared/engine/games/crowdpleaser";
import { harness } from "./harness";

describe("Crowd Pleaser", () => {
  it("pays predictions by how close they land, plus a lone-wolf bonus", () => {
    const h = harness(crowdpleaser, 4);
    h.fire();
    h.input("p0", { type: "answer", choice: "a", guess: 3 }); // exact → 100
    h.input("p1", { type: "answer", choice: "a", guess: 2 }); // off by one → 50
    h.input("p2", { type: "answer", choice: "a", guess: 0 }); // off by three → 0
    h.input("p3", { type: "answer", choice: "b", guess: 1 }); // off by two → 20, alone on B → +50
    h.fire();
    expect(h.state.phase).toBe("reveal");
    expect(h.state.countA).toBe(3);
    expect(h.state.scores).toEqual({ p0: 100, p1: 50, p2: 0, p3: 70 });
    expect((h.tv() as CpTv).countA).toBe(3);
  });

  it("rejects bad answers and hides the split until the reveal", () => {
    const h = harness(crowdpleaser, 3);
    h.fire();
    h.input("p0", { type: "answer", choice: "c", guess: 1 });
    h.input("p0", { type: "answer", choice: "a", guess: 9 });
    h.input("p0", { type: "answer", choice: "a", guess: -1 });
    expect(h.state.answers.p0).toBeUndefined();
    h.input("p0", { type: "answer", choice: "a", guess: 2 });
    const tv = h.tv() as CpTv;
    expect(tv.countA).toBeNull();
    expect(tv.answers).toEqual([]);
    expect(tv.doneIds).toEqual(["p0"]);
  });

  it("runs every poll and ends on the podium", () => {
    const h = harness(crowdpleaser, 3, { options: { rounds: 2 } });
    h.fire();
    for (let i = 0; i < 2; i++) {
      h.fire(); // answer → reveal
      h.fire(); // reveal → standings
      h.fire(); // standings → next / podium
    }
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });
});
