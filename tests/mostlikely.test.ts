import { describe, expect, it } from "vitest";
import type { MlPlayer, MlTv } from "@party/shared";
import { mostlikely } from "../src/shared/engine/games/mostlikely";
import { harness } from "./harness";

describe("Most Likely To…", () => {
  it("won't let you vote for yourself or vote twice", () => {
    const h = harness(mostlikely, 3);
    h.fire();
    h.input("p0", { type: "vote", targetId: "p0" });
    expect(h.state.votes.p0).toBeUndefined();
    h.input("p0", { type: "vote", targetId: "p1" });
    h.input("p0", { type: "vote", targetId: "p2" });
    expect(h.state.votes.p0).toBe("p1");
  });

  it("pays everyone who sided with the room and gives the pick a title", () => {
    const h = harness(mostlikely, 4);
    h.fire();
    h.input("p1", { type: "vote", targetId: "p0" });
    h.input("p2", { type: "vote", targetId: "p0" });
    h.input("p3", { type: "vote", targetId: "p0" });
    h.input("p0", { type: "vote", targetId: "p1" });
    h.fire();
    expect(h.state.phase).toBe("reveal");
    expect(h.state.scores).toEqual({ p0: 0, p1: 100, p2: 100, p3: 100 });
    expect(h.state.awards).toEqual([{ playerId: "p0", prompt: h.state.prompts[0], votes: 3 }]);
    const v = h.view("p0") as MlPlayer;
    expect(v.topIds).toEqual(["p0"]);
    expect(v.votesForMe).toBe(3);
    expect(v.matched).toBe(false);
  });

  it("pays half when the room ties", () => {
    const h = harness(mostlikely, 4);
    h.fire();
    h.input("p0", { type: "vote", targetId: "p1" });
    h.input("p1", { type: "vote", targetId: "p0" });
    h.input("p2", { type: "vote", targetId: "p1" });
    h.input("p3", { type: "vote", targetId: "p0" });
    h.fire();
    expect(h.state.topIds.sort()).toEqual(["p0", "p1"]);
    expect(h.state.scores).toEqual({ p0: 50, p1: 50, p2: 50, p3: 50 });
  });

  it("keeps votes off the TV until the reveal", () => {
    const h = harness(mostlikely, 3);
    h.fire();
    h.input("p0", { type: "vote", targetId: "p2" });
    const tv = h.tv() as MlTv;
    expect(tv.votes).toBeNull();
    expect(tv.votedIds).toEqual(["p0"]);
  });

  it("ends with the awards ceremony, then the podium", () => {
    const h = harness(mostlikely, 3, { options: { rounds: 2 } });
    h.fire();
    for (let round = 0; round < 2; round++) {
      h.input("p0", { type: "vote", targetId: "p1" });
      h.input("p1", { type: "vote", targetId: "p2" });
      h.input("p2", { type: "vote", targetId: "p1" });
      h.fire(); // vote → reveal
      h.fire(); // reveal → standings (or awards after the last)
      if (round === 0) {
        expect(h.state.phase).toBe("standings");
        h.fire();
      }
    }
    expect(h.state.phase).toBe("awards");
    expect((h.tv() as MlTv).awards).toHaveLength(2);
    h.fire();
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });
});
