import { describe, expect, it } from "vitest";
import {
  SHADE_CELLS,
  SHADE_COLS,
  SHADE_ROWS,
  shadeCell,
  shadeColor,
  shadeCueGiverPoints,
  shadeCueProblem,
  shadeDistance,
  shadeLabel,
  shadePoints,
  type ShadePlayer,
  type ShadeTv,
} from "@party/shared";
import { shadespotter } from "../src/shared/engine/games/shadespotter";
import { harness } from "./harness";

type H = ReturnType<typeof harness<ReturnType<typeof shadespotter.create>>>;

const F4 = shadeCell(5, 3);

/** Perceived brightness of a #rrggbb colour, 0–255. */
function luma(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
}

/** Fires into the next round's first cue and pins its secret cell. */
function startRound(h: H, target = F4) {
  h.fire();
  expect(h.state.phase).toBe("cue1");
  h.state.target = target;
}

function guessersOf(h: H): string[] {
  return h.roster.map((p) => p.id).filter((id) => id !== h.state.cueGiverId);
}

describe("Shade Spotter", () => {
  it("paints the same 180 distinct colours everywhere, pastel on top and deep at the bottom", () => {
    const colors = Array.from({ length: SHADE_CELLS }, (_, i) => shadeColor(i));
    expect(new Set(colors).size).toBe(SHADE_CELLS);
    for (const c of colors) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    expect(Array.from({ length: SHADE_CELLS }, (_, i) => shadeColor(i))).toEqual(colors);
    const rowLuma = Array.from({ length: SHADE_ROWS }, (_, row) => {
      let sum = 0;
      for (let col = 0; col < SHADE_COLS; col++) sum += luma(shadeColor(shadeCell(col, row)));
      return sum / SHADE_COLS;
    });
    for (let row = 1; row < SHADE_ROWS; row++) expect(rowLuma[row]!).toBeLessThan(rowLuma[row - 1]!);
    for (let col = 0; col < SHADE_COLS; col++) {
      expect(luma(shadeColor(shadeCell(col, 0))) - luma(shadeColor(shadeCell(col, SHADE_ROWS - 1)))).toBeGreaterThan(100);
    }
  });

  it("labels cells like the board and scores by distance, diagonals included", () => {
    expect(shadeLabel(0)).toBe("A1");
    expect(shadeLabel(SHADE_CELLS - 1)).toBe("R10");
    expect(shadeLabel(F4)).toBe("F4");
    expect(shadeDistance(F4, shadeCell(7, 4))).toBe(2);
    expect(shadePoints(F4, F4)).toBe(100);
    expect(shadePoints(shadeCell(6, 4), F4)).toBe(60);
    expect(shadePoints(shadeCell(3, 1), F4)).toBe(30);
    expect(shadePoints(shadeCell(8, 3), F4)).toBe(0);
    expect(shadeCueGiverPoints(3)).toBe(60);
    expect(shadeCueGiverPoints(40)).toBe(300);
  });

  it("takes one word, then up to two, and refuses coordinates", () => {
    expect(shadeCueProblem("berry", 1)).toBeNull();
    expect(shadeCueProblem("sky-blue", 1)).toBeNull();
    expect(shadeCueProblem("ripe strawberry", 1)).not.toBeNull();
    expect(shadeCueProblem("ripe strawberry", 2)).toBeNull();
    expect(shadeCueProblem("very ripe strawberry", 2)).not.toBeNull();
    expect(shadeCueProblem("x".repeat(21), 1)).not.toBeNull();
    for (const coords of ["F4", "f4", "4F", "R10", "f-4"]) expect(shadeCueProblem(coords, 1)).not.toBeNull();
    expect(shadeCueProblem("f 4", 2)).not.toBeNull();
    expect(shadeCueProblem("B12", 1)).toBeNull(); // no row 12, so it's just a word
  });

  it("shows the secret cell only to the cue-giver until the reveal", () => {
    const h = harness(shadespotter, 4);
    startRound(h);
    const giver = h.state.cueGiverId;
    const [a, b, c] = guessersOf(h) as [string, string, string];
    const hidden = () => {
      expect((h.view(giver) as ShadePlayer).target).toBe(F4);
      expect((h.view(a) as ShadePlayer).target).toBeNull();
      expect((h.tv() as ShadeTv).target).toBeNull();
    };
    hidden();
    h.input(giver, { type: "cue", text: "Mustard" });
    expect(h.state.phase).toBe("guess1");
    hidden();
    for (const id of [a, b, c]) h.input(id, { type: "pick", cell: 0 });
    h.fire(); // grace → second cue
    expect(h.state.phase).toBe("cue2");
    hidden();
    h.input(giver, { type: "cue", text: "hot dog" });
    expect(h.state.phase).toBe("guess2");
    hidden();
    h.fire();
    expect(h.state.phase).toBe("reveal");
    expect((h.tv() as ShadeTv).target).toBe(F4);
    expect((h.view(a) as ShadePlayer).target).toBe(F4);
  });

  it("keeps picks hidden until the room is meant to see them", () => {
    const h = harness(shadespotter, 4);
    startRound(h);
    const giver = h.state.cueGiverId;
    const [a, b] = guessersOf(h) as [string, string];
    h.input(giver, { type: "cue", text: "lemon" });
    h.input(a, { type: "pick", cell: 7 });
    const tv = h.tv() as ShadeTv;
    expect(tv.picks).toEqual([]);
    expect(tv.lockedIds).toEqual([a]);
    expect((h.view(b) as ShadePlayer).picks).toEqual([]);
    expect((h.view(a) as ShadePlayer).myPicks).toEqual([7, null]);
    h.fire(); // guess timer → second cue: first picks go up
    expect((h.tv() as ShadeTv).picks).toEqual([{ playerId: a, step: 1, cell: 7, points: 0 }]);
    h.input(giver, { type: "cue", text: "lemon zest" });
    h.input(a, { type: "pick", cell: 8 });
    expect((h.tv() as ShadeTv).picks.some((p) => p.step === 2)).toBe(false);
    expect((h.view(b) as ShadePlayer).picks.some((p) => p.step === 2)).toBe(false);
    h.fire();
    expect((h.tv() as ShadeTv).picks.filter((p) => p.playerId === a).map((p) => p.cell)).toEqual([7, 8]);
  });

  it("pays every pick by distance and the cue-giver for each pick next door or better", () => {
    const h = harness(shadespotter, 4);
    startRound(h);
    const giver = h.state.cueGiverId;
    const [a, b, c] = guessersOf(h) as [string, string, string];
    h.input(giver, { type: "cue", text: "banana" });
    h.input(a, { type: "pick", cell: F4 }); // 100
    h.input(b, { type: "pick", cell: shadeCell(7, 5) }); // 30
    h.input(c, { type: "pick", cell: 0 }); // 0
    h.fire();
    h.input(giver, { type: "cue", text: "banana peel" });
    h.input(a, { type: "pick", cell: shadeCell(6, 4) }); // 60
    h.input(b, { type: "pick", cell: shadeCell(5, 4) }); // 60
    h.fire(); // c never makes a second pick
    expect(h.state.phase).toBe("reveal");
    expect(h.state.scores[a]).toBe(160);
    expect(h.state.scores[b]).toBe(90);
    expect(h.state.scores[c]).toBe(0);
    expect(h.state.scores[giver]).toBe(60); // three picks within one cell
    const tv = h.tv() as ShadeTv;
    expect(tv.picks).toHaveLength(5);
    expect(tv.cueGiverPoints).toBe(60);
    expect((h.view(a) as ShadePlayer).myPoints).toBe(160);
    expect((h.view(giver) as ShadePlayer).myPoints).toBe(60);
  });

  it("ignores picks out of turn, off the grid, repeated, or on the first pick's cell", () => {
    const h = harness(shadespotter, 3);
    startRound(h);
    const giver = h.state.cueGiverId;
    const [a, b] = guessersOf(h) as [string, string];
    h.input(a, { type: "pick", cell: 5 });
    expect(h.state.firstPicks[a]).toBeUndefined(); // no picking before the cue
    h.input(a, { type: "cue", text: "sneaky" });
    expect(h.state.cues).toEqual([]); // only the cue-giver gives cues
    h.input(giver, { type: "cue", text: "grass" });
    h.input(giver, { type: "pick", cell: 5 });
    expect(h.state.firstPicks[giver]).toBeUndefined();
    for (const cell of [-1, SHADE_CELLS, 2.5, "3", null]) h.input(a, { type: "pick", cell });
    expect(h.state.firstPicks[a]).toBeUndefined();
    h.input(a, { type: "pick", cell: 5 });
    h.input(a, { type: "pick", cell: 6 });
    expect(h.state.firstPicks[a]).toBe(5);
    expect((h.view(a) as ShadePlayer).canPick).toBe(false);
    expect((h.view(b) as ShadePlayer).canPick).toBe(true);
    h.fire();
    h.input(giver, { type: "cue", text: "wet grass" });
    h.input(a, { type: "pick", cell: 5 });
    expect(h.state.secondPicks[a]).toBeUndefined();
    h.input(a, { type: "pick", cell: 6 });
    expect(h.state.secondPicks[a]).toBe(6);
  });

  it("turns a bad cue away privately and keeps waiting", () => {
    const h = harness(shadespotter, 3);
    startRound(h);
    const giver = h.state.cueGiverId;
    h.input(giver, { type: "cue", text: "light blue" });
    h.input(giver, { type: "cue", text: "F4" });
    expect(h.state.phase).toBe("cue1");
    const rejected = h.events.filter((e) => e.kind === "cueRejected");
    expect(rejected).toHaveLength(2);
    expect(rejected.every((e) => e.tv === false && e.to?.length === 1 && e.to[0] === giver)).toBe(true);
    h.input(giver, { type: "cue", text: "  Ocean  " });
    expect(h.state.cues).toEqual(["Ocean"]);
  });

  it("moves on as soon as every connected guesser has picked", () => {
    const h = harness(shadespotter, 4);
    startRound(h);
    const giver = h.state.cueGiverId;
    const [a, b, c] = guessersOf(h) as [string, string, string];
    h.input(giver, { type: "cue", text: "plum" });
    h.connected.delete(c);
    shadespotter.onConnectionChange!(h.state, h.ctx, c, false);
    h.input(a, { type: "pick", cell: 1 });
    expect(h.deadline! - h.ctx.now()).toBeGreaterThan(5000);
    h.input(b, { type: "pick", cell: 2 });
    expect(h.deadline! - h.ctx.now()).toBeLessThanOrEqual(900);
  });

  it("skips the round when the cue-giver never gives a cue", () => {
    const h = harness(shadespotter, 3);
    startRound(h);
    h.fire(); // cue timer
    expect(h.state.phase).toBe("reveal");
    expect(h.state.skipped).toBe(true);
    expect((h.tv() as ShadeTv).picks).toEqual([]);
    expect(Object.values(h.state.scores).every((s) => s === 0)).toBe(true);
    h.fire();
    expect(h.state.phase).toBe("standings");
  });

  it("scores first picks alone when the second cue never comes", () => {
    const h = harness(shadespotter, 3);
    startRound(h);
    const giver = h.state.cueGiverId;
    const [a] = guessersOf(h) as [string];
    h.input(giver, { type: "cue", text: "wheat" });
    h.input(a, { type: "pick", cell: F4 });
    h.fire(); // guess timer
    h.fire(); // second cue timer
    expect(h.state.phase).toBe("reveal");
    expect(h.state.noSecondCue).toBe(true);
    expect(h.state.scores[a]).toBe(100);
    expect(h.state.scores[giver]).toBe(20);
  });

  it("hurries along when the cue-giver's phone drops mid-cue", () => {
    const h = harness(shadespotter, 3);
    startRound(h);
    const giver = h.state.cueGiverId;
    expect(h.deadline! - h.ctx.now()).toBeGreaterThan(30_000);
    h.connected.delete(giver);
    shadespotter.onConnectionChange!(h.state, h.ctx, giver, false);
    expect(h.deadline! - h.ctx.now()).toBeLessThanOrEqual(8000);
  });

  it("gives everyone one turn as cue-giver by default", () => {
    const h = harness(shadespotter, 3);
    expect(h.state.totalRounds).toBe(3);
    const givers: string[] = [];
    for (let round = 0; round < 3; round++) {
      startRound(h);
      givers.push(h.state.cueGiverId);
      h.fire(); // no cue → skipped
      h.fire(); // reveal → standings
    }
    expect(new Set(givers).size).toBe(3);
    h.fire();
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
    expect(h.deadline).toBeNull();
  });

  it("plays the chosen number of rounds, rotating the cue-giver", () => {
    const h = harness(shadespotter, 3, { options: { rounds: 4 } });
    expect(h.state.totalRounds).toBe(4);
    const givers: string[] = [];
    for (let round = 0; round < 4; round++) {
      startRound(h);
      givers.push(h.state.cueGiverId);
      h.fire();
      h.fire();
    }
    expect(new Set(givers.slice(0, 3)).size).toBe(3);
    expect(givers[3]).toBe(givers[0]);
  });

  it("passes over an absent cue-giver and hands them the role once they're back", () => {
    const h = harness(shadespotter, 3);
    const [first, second, third] = h.state.order as [string, string, string];
    h.connected.delete(first);
    startRound(h);
    expect(h.state.cueGiverId).toBe(second);
    h.fire();
    h.fire();
    h.connected.add(first);
    startRound(h);
    expect(h.state.cueGiverId).toBe(third);
    h.fire();
    h.fire();
    startRound(h);
    expect(h.state.cueGiverId).toBe(first);
  });
});
