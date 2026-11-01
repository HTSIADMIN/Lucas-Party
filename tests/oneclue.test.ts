import { describe, expect, it } from "vitest";
import { ocClueProblem, ocSameWord, textKey, type OcPlayer, type OcTv } from "@party/shared";
import { duplicateGroups, oneclue } from "../src/shared/engine/games/oneclue";
import { WORDS } from "../src/shared/engine/games/oneclue/content";
import { harness } from "./harness";

type H = ReturnType<typeof harness<ReturnType<typeof oneclue.create>>>;

/** A game whose first mystery word is `word`, moved on to the clue phase. */
function start(n: number, word = "Penguin", also: string[] = [], opts: { options?: Record<string, number>; hostId?: string } = {}): H {
  const h = harness(oneclue, n, opts);
  h.state.words[0] = { word, also };
  h.fire(); // intro → clue
  expect(h.state.phase).toBe("clue");
  return h;
}

function writers(h: H): string[] {
  return h.state.ids.filter((id) => id !== h.state.guesserId);
}

/** Each writer, in seat order, sends the clue at the same index. */
function clue(h: H, clues: string[]) {
  writers(h).forEach((id, i) => {
    const text = clues[i];
    if (text !== undefined) h.input(id, { type: "clue", text });
  });
}

const lower = (value: unknown) => JSON.stringify(value).toLowerCase();

describe("One Clue", () => {
  it("matches words that only differ in case, punctuation, articles and plurals", () => {
    expect(ocSameWord("The Cherries", "cherry")).toBe(true);
    expect(ocSameWord("PENGUINS!", "penguin")).toBe(true);
    expect(ocSameWord("a Kitten", "kittens")).toBe(true);
    expect(ocSameWord("hide and seek", "Hide-and-seek")).toBe(true);
    expect(ocSameWord("cat", "dog")).toBe(false);
    expect(ocSameWord("glass", "glas")).toBe(false);
  });

  it("only allows one-word clues that don't give the word away", () => {
    const penguin = ["Penguin"];
    expect(ocClueProblem("Ice", penguin)).toBeNull();
    expect(ocClueProblem("T-Rex", ["Dinosaur"])).toBeNull();
    expect(ocClueProblem("Penguin", penguin)).toBe("obvious");
    expect(ocClueProblem("penguins!", penguin)).toBe("obvious");
    expect(ocClueProblem("Superpenguin", penguin)).toBe("obvious");
    expect(ocClueProblem("Cherries", ["Cherry"])).toBe("obvious");
    expect(ocClueProblem("Snow", ["Snowman"])).toBe("obvious");
    expect(ocClueProblem("Donuts", ["Doughnut", "Donut"])).toBe("obvious");
    expect(ocClueProblem("ice cold", penguin)).toBe("words");
    expect(ocClueProblem("ice/cold", penguin)).toBe("words");
    expect(ocClueProblem("!!!", penguin)).toBe("empty");
  });

  it("turns obvious or multi-word clues away with a private nudge", () => {
    const h = start(3);
    const [a] = writers(h) as [string];
    h.input(a, { type: "clue", text: "Penguins" });
    h.input(a, { type: "clue", text: "South pole" });
    expect(h.state.clues[a]).toBeUndefined();
    const nudges = h.events.filter((e) => e.kind === "clueRejected");
    expect(nudges).toHaveLength(2);
    for (const e of nudges) {
      expect(e.to).toEqual([a]);
      expect(e.tv).toBe(false);
    }
    h.input(a, { type: "clue", text: "  Antarctica  " });
    expect(h.state.clues[a]).toBe("Antarctica");
  });

  it("keeps the word and cancelled clues off the TV and away from the guesser until the result", () => {
    const h = start(5);
    const guesser = h.state.guesserId;
    expect(lower(h.tv())).not.toContain("penguin");
    expect(lower(h.view(guesser))).not.toContain("penguin");
    for (const id of writers(h)) expect((h.view(id) as OcPlayer).word).toBe("Penguin");

    clue(h, ["Tuxedo", "tuxedos", "Waddle", "Antarctica"]);
    expect(lower(h.tv())).not.toContain("waddle"); // clues stay hidden while they're written
    h.fire();
    expect(h.state.phase).toBe("guess");
    for (const view of [h.tv(), h.view(guesser)]) {
      const json = lower(view);
      expect(json).not.toContain("penguin");
      expect(json).not.toContain("tuxedo");
      expect(json).toContain("waddle");
    }
    const blanks = (h.tv() as OcTv).cards.filter((c) => c.cancelled);
    expect(blanks).toEqual([
      { playerId: null, text: null, cancelled: true },
      { playerId: null, text: null, cancelled: true },
    ]);
    expect(h.events.some((e) => lower(e).includes("penguin"))).toBe(false);

    h.input(guesser, { type: "pass" });
    expect(h.state.phase).toBe("result");
    const tv = h.tv() as OcTv;
    expect(tv.word).toBe("Penguin");
    expect(tv.cards.filter((c) => c.cancelled).map((c) => c.text)).toEqual(["Tuxedo", "tuxedos"]);
    expect((h.view(guesser) as OcPlayer).word).toBe("Penguin");
  });

  it("cancels every copy of a matching clue", () => {
    const h = start(5);
    const [a, b, c, d] = writers(h) as [string, string, string, string];
    clue(h, ["Tuxedo", "TUXEDOS!", "tuxedo", "Waddle"]);
    h.fire();
    expect([...h.state.cancelled].sort()).toEqual([a, b, c].sort());
    const cards = (h.tv() as OcTv).cards;
    expect(cards).toHaveLength(4);
    expect(cards[0]).toEqual({ playerId: d, text: "Waddle", cancelled: false });
    expect(cards.slice(1).every((card) => card.cancelled && card.text === null && card.playerId === null)).toBe(true);
    expect((h.view(a) as OcPlayer).myClueCancelled).toBe(true);
    expect((h.view(d) as OcPlayer).myClueCancelled).toBe(false);
  });

  it("groups matching clues side by side", () => {
    const groups = duplicateGroups([
      { id: "a", text: "Ice" },
      { id: "b", text: "cold" },
      { id: "c", text: "ICE!" },
      { id: "d", text: "Colds" },
      { id: "e", text: "Bird" },
    ]);
    expect(groups).toEqual([
      ["a", "c"],
      ["b", "d"],
    ]);
  });

  it("pays the guesser and every surviving clue for a right guess", () => {
    const h = start(4);
    const [a, b, c] = writers(h) as [string, string, string];
    clue(h, ["Tuxedo", "tuxedo", "Waddle"]);
    h.fire();
    const g = h.state.guesserId;
    h.input(a, { type: "guess", text: "penguin" }); // only the guesser guesses
    expect(h.state.phase).toBe("guess");
    h.input(g, { type: "guess", text: "The Penguins!" });
    expect(h.state.outcome).toBe("correct");
    expect(h.state.scores).toEqual({ [g]: 200, [a]: 0, [b]: 0, [c]: 100 });
    const tv = h.tv() as OcTv;
    expect(tv.teamRight).toBe(1);
    expect(tv.roundsPlayed).toBe(1);
    expect((h.view(c) as OcPlayer).gained).toBe(100);
  });

  it("accepts other spellings of the word", () => {
    const h = start(3, "Doughnut", ["Donut"]);
    clue(h, ["Sprinkles", "Glazed"]);
    h.fire();
    h.input(h.state.guesserId, { type: "guess", text: "donuts" });
    expect(h.state.outcome).toBe("correct");
  });

  it("scores nothing for a wrong guess, a pass or running out of time", () => {
    const h = harness(oneclue, 3, { options: { rounds: 3 } });
    h.state.words = ["Penguin", "Pizza", "Rocket"].map((word) => ({ word, also: [] }));
    const outcomes: string[] = [];
    h.fire(); // intro → clue
    for (const act of ["wrong", "pass", "timeout"] as const) {
      clue(h, ["Zqxa", "Zqxb"]);
      h.fire(); // → guess
      const g = h.state.guesserId;
      if (act === "wrong") h.input(g, { type: "guess", text: "Walrus" });
      if (act === "pass") h.input(g, { type: "pass" });
      if (act === "timeout") h.fire();
      outcomes.push(h.state.outcome ?? "none");
      h.fire(); // → standings
      h.fire(); // → next round, or the podium
    }
    expect(outcomes).toEqual(["wrong", "pass", "timeout"]);
    expect(Object.values(h.state.scores).every((s) => s === 0)).toBe(true);
    expect(h.state.teamRight).toBe(0);
    expect(h.state.roundsPlayed).toBe(3);
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });

  it("skips the guess when every clue cancels out", () => {
    const h = start(3);
    clue(h, ["Tuxedo", "tuxedos"]);
    h.fire();
    expect(h.state.phase).toBe("result");
    expect(h.state.outcome).toBe("noClues");
    const tv = h.tv() as OcTv;
    expect(tv.cards.every((c) => c.cancelled && c.text !== null)).toBe(true);
    expect(tv.roundsPlayed).toBe(1);
    expect(tv.teamRight).toBe(0);
  });

  it("moves on once every connected writer is in, without waiting on dropped phones", () => {
    const h = start(4);
    const [a, b, c] = writers(h) as [string, string, string];
    h.connected.delete(c);
    oneclue.onConnectionChange!(h.state, h.ctx, c, false);
    h.input(a, { type: "clue", text: "Tuxedo" });
    expect(h.deadline! - h.ctx.now()).toBeGreaterThan(5000);
    h.input(b, { type: "clue", text: "Waddle" });
    expect(h.deadline! - h.ctx.now()).toBeLessThanOrEqual(900);
    h.fire();
    expect(h.state.phase).toBe("guess");
    h.input(h.state.guesserId, { type: "pass" });
    expect((h.tv() as OcTv).missingIds).toEqual([c]);
  });

  it("doesn't let a guesser who dropped out stall the round", () => {
    const h = start(3);
    clue(h, ["Tuxedo", "Waddle"]);
    h.fire();
    expect(h.deadline! - h.ctx.now()).toBeGreaterThan(30_000);
    const g = h.state.guesserId;
    h.connected.delete(g);
    oneclue.onConnectionChange!(h.state, h.ctx, g, false);
    expect(h.deadline! - h.ctx.now()).toBeLessThanOrEqual(10_000);
    h.fire();
    expect(h.state.outcome).toBe("timeout");
  });

  it("lets only the host count a near miss, once", () => {
    const h = start(4, "Penguin", [], { hostId: "p0" });
    const [, waddler] = writers(h) as [string, string, string];
    clue(h, ["Tuxedo", "Waddle", "tuxedo"]);
    h.fire();
    const g = h.state.guesserId;
    h.input(g, { type: "guess", text: "Pengiun" });
    expect(h.state.outcome).toBe("wrong");
    const notHost = h.state.ids.find((id) => id !== "p0")!;
    expect((h.view(notHost) as OcPlayer).canAccept).toBe(false);
    expect((h.view("p0") as OcPlayer).canAccept).toBe(true);
    h.input(notHost, { type: "accept" });
    expect(h.state.outcome).toBe("wrong");
    h.input("p0", { type: "accept" });
    h.input("p0", { type: "accept" });
    expect(h.state.outcome).toBe("correct");
    expect((h.tv() as OcTv).accepted).toBe(true);
    expect(h.state.scores[g]).toBe(200);
    expect(h.state.scores[waddler]).toBe(100);
    expect(Object.values(h.state.scores).reduce((sum, s) => sum + s, 0)).toBe(300);
    expect(h.state.teamRight).toBe(1);
  });

  it("ignores input from the wrong player or at the wrong time", () => {
    const h = start(3);
    const g = h.state.guesserId;
    const [a] = writers(h) as [string];
    h.input(g, { type: "clue", text: "Tuxedo" }); // the guesser doesn't write clues
    h.input(a, { type: "guess", text: "penguin" }); // nobody guesses yet
    h.input("stranger", { type: "clue", text: "Waddle" });
    h.input(a, null);
    h.input(a, { type: "clue", text: 42 });
    expect(h.state.clueOrder).toEqual([]);
    h.input(a, { type: "clue", text: "Waddle" });
    h.input(a, { type: "clue", text: "Tuxedo" }); // locked in
    expect(h.state.clues[a]).toBe("Waddle");
    expect(h.state.phase).toBe("clue");
  });

  it("makes everyone the guesser once by default", () => {
    const h = harness(oneclue, 4);
    expect(h.state.totalRounds).toBe(4);
    const guessers: string[] = [];
    let guard = 0;
    while (!h.finished && guard++ < 100) {
      if (h.state.phase === "clue" && guessers.length < h.state.round) guessers.push(h.state.guesserId);
      h.fire();
    }
    expect(new Set(guessers).size).toBe(4);
    expect(h.state.phase).toBe("podium");
  });

  it("skips players who are away when passing the guesser role on", () => {
    const h = harness(oneclue, 4);
    h.fire();
    const first = h.state.guesserId;
    const next = h.state.order[(h.state.order.indexOf(first) + 1) % 4]!;
    h.connected.delete(next);
    h.fire(); // no clues → result
    h.fire(); // → standings
    h.fire(); // → round 2
    expect(h.state.round).toBe(2);
    expect([first, next]).not.toContain(h.state.guesserId);
    h.connected.add(next);
    const seen = new Set<string>();
    let guard = 0;
    while (!h.finished && guard++ < 100) {
      if (h.state.phase === "clue") seen.add(h.state.guesserId);
      h.fire();
    }
    seen.add(first);
    expect(seen.size).toBe(4);
  });

  it("has a big bank of single words and keeps spicy ones out of Family Mode", () => {
    expect(WORDS.filter((w) => !w.spicy).length).toBeGreaterThanOrEqual(250);
    const keys = WORDS.flatMap((w) => [w.word, ...(w.also ?? [])]).map(textKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const w of WORDS) expect(w.word).not.toMatch(/\s/);
    const spicy = new Set(WORDS.filter((w) => w.spicy).map((w) => w.word));
    const h = harness(oneclue, 8, { options: { rounds: 10 }, familyMode: true });
    expect(h.state.words).toHaveLength(10);
    expect(h.state.words.some((w) => spicy.has(w.word))).toBe(false);
  });
});
