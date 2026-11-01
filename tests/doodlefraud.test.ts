import { describe, expect, it } from "vitest";
import { sanitizeDrawing, type DfPlayer, type DfTv } from "@party/shared";
import { doodlefraud } from "../src/shared/engine/games/doodlefraud";
import { harness } from "./harness";

const SQUIGGLE = [{ c: 0, w: 0, p: [10, 10, 500, 500, 990, 20] }];

type H = ReturnType<typeof harness<ReturnType<typeof doodlefraud.create>>>;

function drawAll(h: H) {
  h.fire(); // intro → draw
  for (const p of h.roster) h.input(p.id, { type: "drawing", strokes: SQUIGGLE });
  h.fire(); // draw → title (early-finish deadline)
  expect(h.state.phase).toBe("title");
}

describe("Doodle Fraud", () => {
  it("validates drawings", () => {
    expect(sanitizeDrawing(SQUIGGLE)).toEqual(SQUIGGLE);
    expect(sanitizeDrawing([{ c: 99, w: 0, p: [1, 2] }])).toBeNull();
    expect(sanitizeDrawing([{ c: 0, w: 0, p: [1, 2, 3] }])).toBeNull();
    expect(sanitizeDrawing("nope")).toBeNull();
    expect(sanitizeDrawing([{ c: 0, w: 1, p: [-50, 2000] }])).toEqual([{ c: 0, w: 1, p: [0, 1000] }]);
  });

  it("keeps each prompt private to its artist", () => {
    const h = harness(doodlefraud, 3);
    h.fire();
    const v0 = h.view("p0") as DfPlayer;
    expect(v0.myPrompt).toBe(h.state.prompts.p0);
    expect(JSON.stringify(h.view("p1"))).not.toContain(h.state.prompts.p0!);
    expect(JSON.stringify(h.tv())).not.toContain(h.state.prompts.p0!);
  });

  it("scores the truth, the artist, and every fooled friend", () => {
    const h = harness(doodlefraud, 4);
    drawAll(h);
    const artist = h.state.order[0]!;
    const [a, b, c] = h.roster.map((p) => p.id).filter((id) => id !== artist) as [string, string, string];
    h.input(artist, { type: "title", text: "nope" }); // artists don't write lies
    expect(h.state.titles[artist]).toBeUndefined();
    h.input(a, { type: "title", text: "A sneaky lie" });
    h.input(b, { type: "title", text: "A SNEAKY LIE!" }); // same lie → one option, two authors
    h.input(c, { type: "title", text: h.state.prompts[artist]! }); // the real title — rejected
    expect(h.state.titles[c]).toBeUndefined();
    expect(h.events.some((e) => e.kind === "tooClose")).toBe(true);
    h.input(c, { type: "title", text: "Something else entirely" });
    h.fire(); // title → pick
    expect(h.state.phase).toBe("pick");
    const real = h.state.options.find((o) => o.real)!;
    const lie = h.state.options.find((o) => o.authorIds.includes(a))!;
    const other = h.state.options.find((o) => o.authorIds.includes(c))!;
    // You can't pick your own lie, and it isn't even offered to you.
    expect((h.view(a) as DfPlayer).options.some((o) => o.key === lie.key)).toBe(false);
    h.input(a, { type: "pick", key: lie.key });
    expect(h.state.picks[a]).toBeUndefined();
    h.input(a, { type: "pick", key: real.key });
    h.input(b, { type: "pick", key: other.key });
    h.input(c, { type: "pick", key: lie.key });
    h.fire(); // pick → reveal
    expect(h.state.phase).toBe("reveal");
    // a: truth 100 + fooled c with the shared lie 50; b: fooled c 50; c: fooled b 50; artist: 50 for a.
    expect(h.state.scores[a]).toBe(150);
    expect(h.state.scores[b]).toBe(50);
    expect(h.state.scores[c]).toBe(50);
    expect(h.state.scores[artist]).toBe(50);
    const tv = h.tv() as DfTv;
    expect(tv.realPrompt).toBe(h.state.prompts[artist]);
    expect(tv.reveal.find((o) => o.real)!.pickerIds).toEqual([a]);
  });

  it("pads a thin lineup with house lies and shows a blank canvas for no-shows", () => {
    const h = harness(doodlefraud, 3);
    h.fire();
    h.input("p0", { type: "drawing", strokes: SQUIGGLE });
    h.fire(); // draw deadline: p1 and p2 never drew
    expect(h.state.drawings.p1).toEqual([]);
    h.fire(); // title deadline with no lies
    expect(h.state.options.length).toBeGreaterThanOrEqual(3);
    expect(h.state.options.filter((o) => o.real)).toHaveLength(1);
  });

  it("shows every drawing once and ends on the podium", () => {
    const h = harness(doodlefraud, 3);
    drawAll(h);
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      seen.push(h.state.order[h.state.round - 1]!);
      h.fire(); // title → pick
      h.fire(); // pick → reveal
      h.fire(); // reveal → standings
      h.fire(); // standings → next / podium
    }
    expect(new Set(seen).size).toBe(3);
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });
});
