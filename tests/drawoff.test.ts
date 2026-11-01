import { describe, expect, it } from "vitest";
import type { DoPlayer, DoTv } from "@party/shared";
import { drawoff } from "../src/shared/engine/games/drawoff";
import { harness } from "./harness";

const ART = [{ c: 2, w: 0, p: [50, 50, 950, 950] }];

describe("Draw Off", () => {
  it("hangs everyone's drawing anonymously and pays votes plus a favourite bonus", () => {
    const h = harness(drawoff, 4);
    h.fire(); // intro → draw
    for (const p of h.roster.slice(0, 3)) h.input(p.id, { type: "drawing", strokes: ART });
    h.fire(); // draw → gallery (p3 hands in a blank canvas)
    expect(h.state.phase).toBe("gallery");
    expect(h.state.entries).toHaveLength(4);
    expect(h.state.drawings.p3).toEqual([]);
    const tv = h.tv() as DoTv;
    expect(tv.entries.every((e) => e.playerId === "")).toBe(true);
    const numberOf = (id: string) => h.state.entries.find((e) => e.playerId === id)!.number;
    const v0 = h.view("p0") as DoPlayer;
    expect(v0.choices).not.toContain(numberOf("p0"));
    h.input("p0", { type: "vote", number: numberOf("p0") }); // not your own
    expect(h.state.votes.p0).toBeUndefined();
    h.input("p0", { type: "vote", number: numberOf("p1") });
    h.input("p2", { type: "vote", number: numberOf("p1") });
    h.input("p3", { type: "vote", number: numberOf("p2") });
    h.input("p1", { type: "vote", number: numberOf("p2") });
    h.fire(); // gallery → reveal (early finish)
    // p1 and p2 tie on two votes each: no favourite bonus.
    expect(h.state.scores).toEqual({ p0: 0, p1: 200, p2: 200, p3: 0 });
    expect((h.tv() as DoTv).entries.find((e) => e.number === numberOf("p1"))!.playerId).toBe("p1");
  });

  it("gives the single crowd favourite a bonus and ends on the podium", () => {
    const h = harness(drawoff, 3, { options: { rounds: 1 } });
    h.fire();
    h.fire(); // nobody drew
    const n1 = h.state.entries.find((e) => e.playerId === "p1")!.number;
    h.input("p0", { type: "vote", number: n1 });
    h.input("p2", { type: "vote", number: n1 });
    h.fire();
    expect(h.state.scores.p1).toBe(300);
    h.fire(); // reveal → standings
    h.fire(); // standings → podium
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });
});
