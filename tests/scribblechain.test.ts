import { describe, expect, it } from "vitest";
import type { ScPlayer, ScTv } from "@party/shared";
import { scribblechain } from "../src/shared/engine/games/scribblechain";
import { harness } from "./harness";

const DOODLE = [{ c: 1, w: 1, p: [100, 100, 900, 900] }];

type H = ReturnType<typeof harness<ReturnType<typeof scribblechain.create>>>;

/** Everyone does their task for the current step. */
function doStep(h: H) {
  for (const p of h.roster) {
    const v = h.view(p.id) as ScPlayer;
    if (v.task === "draw") h.input(p.id, { type: "drawing", strokes: DOODLE });
    else h.input(p.id, { type: "text", text: `${p.id} at step ${v.step}` });
  }
  h.fire();
}

describe("Scribble Chain", () => {
  it("passes every chain through every player, alternating draw and describe", () => {
    const h = harness(scribblechain, 4);
    h.fire(); // intro → write
    for (let s = 0; s < 4; s++) {
      expect(h.state.phase).toBe(s === 0 ? "write" : s % 2 === 1 ? "draw" : "describe");
      doStep(h);
    }
    expect(h.state.phase).toBe("reveal");
    for (const chain of h.state.chains) {
      expect(chain.entries.map((e) => e.kind)).toEqual(["text", "drawing", "text", "drawing"]);
      expect(new Set(chain.entries.map((e) => e.authorId)).size).toBe(4);
      expect(chain.entries[0]!.authorId).toBe(chain.ownerId);
    }
  });

  it("hands each drawer the previous sentence and each describer the previous drawing", () => {
    const h = harness(scribblechain, 3);
    h.fire();
    doStep(h);
    const drawer = h.view("p1") as ScPlayer;
    expect(drawer.task).toBe("draw");
    expect(drawer.prompt).toMatch(/^p\d at step 0$/);
    expect(drawer.prompt).not.toBe("p1 at step 0");
    doStep(h);
    const describer = h.view("p2") as ScPlayer;
    expect(describer.task).toBe("describe");
    expect(describer.drawing).toEqual(DOODLE);
  });

  it("fills gaps when someone runs out of time", () => {
    const h = harness(scribblechain, 3);
    h.fire();
    h.fire(); // nobody wrote anything
    expect(h.state.chains.every((c) => c.entries[0]!.kind === "text")).toBe(true);
    h.fire(); // nobody drew anything
    expect(h.state.chains.every((c) => c.entries[1]!.kind === "drawing")).toBe(true);
  });

  it("scores votes for the best moment, never your own, and ends on the podium", () => {
    const h = harness(scribblechain, 3);
    h.fire();
    for (let s = 0; s < 3; s++) doStep(h);
    expect(h.state.phase).toBe("reveal");
    h.fire(); // reveal → vote
    expect(h.state.phase).toBe("vote");
    const entries = h.state.chains[0]!.entries;
    const own = entries.findIndex((e) => e.authorId === "p0");
    h.input("p0", { type: "vote", index: own });
    expect(h.state.votes.p0).toBeUndefined();
    const target = entries.findIndex((e) => e.authorId === "p1");
    h.input("p0", { type: "vote", index: target });
    h.input("p2", { type: "vote", index: target });
    h.fire(); // vote → standings
    expect(h.state.scores.p1).toBe(200);
    expect((h.tv() as ScTv).voteCounts![target]).toBe(2);
    for (let chain = 1; chain < 3; chain++) {
      h.fire(); // standings → reveal
      h.fire(); // reveal → vote
      h.fire(); // vote → standings
    }
    h.fire();
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });
});
