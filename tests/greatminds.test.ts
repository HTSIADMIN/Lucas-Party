import { describe, expect, it } from "vitest";
import type { GmPlayer, GmTv } from "@party/shared";
import { computeGroups, greatminds, matchKeys } from "../src/shared/engine/games/greatminds";
import { QUESTIONS } from "../src/shared/engine/games/greatminds/content";
import { harness } from "./harness";

type H = ReturnType<typeof harness<ReturnType<typeof greatminds.create>>>;

/** Plays one question: everyone in `answers` answers, then the reveal and the commit. */
function playRound(h: H, answers: Record<string, string>, beforeCommit?: () => void) {
  if (h.state.phase === "intro" || h.state.phase === "standings") h.fire();
  expect(h.state.phase).toBe("answer");
  for (const [id, text] of Object.entries(answers)) h.input(id, { type: "answer", text });
  if (h.state.phase === "answer") h.fire();
  expect(h.state.phase).toBe("reveal");
  beforeCommit?.();
  h.fire();
  expect(h.state.phase).toBe("standings");
}

describe("Great Minds", () => {
  it("matches answers that only differ in case, punctuation, articles and plurals", () => {
    const same = (a: string, b: string) => matchKeys(a).some((k) => matchKeys(b).includes(k));
    expect(same("Pepperoni!", "pepperoni")).toBe(true);
    expect(same("The Cherries", "cherry")).toBe(true);
    expect(same("tomatoes", "Tomato")).toBe(true);
    expect(same("Shoes", "a shoe")).toBe(true);
    expect(same("hot dog", "Hot-dogs")).toBe(true);
    expect(same("cat", "dog")).toBe(false);
    expect(same("glass", "glas")).toBe(false);
  });

  it("pays the single biggest group", () => {
    const h = harness(greatminds, 5);
    playRound(h, { p0: "Pepperoni", p1: "pepperoni ", p2: "PEPPERONI!", p3: "mushrooms", p4: "Mushroom" });
    expect(h.state.scores).toMatchObject({ p0: 100, p1: 100, p2: 100, p3: 0, p4: 0 });
    const tv = h.tv() as GmTv;
    expect(tv.groups.map((g) => g.playerIds.length)).toEqual([3, 2]);
    expect(tv.groups[0]!.herd).toBe(true);
    expect(h.state.dunceId).toBeNull();
  });

  it("pays half on a tie for biggest", () => {
    const h = harness(greatminds, 4);
    playRound(h, { p0: "cat", p1: "cats", p2: "dog", p3: "Dog" });
    expect(h.state.scores).toEqual({ p0: 50, p1: 50, p2: 50, p3: 50 });
  });

  it("hands the Dunce Cap to the one lonely answer and charges it at the end", () => {
    const h = harness(greatminds, 4, { options: { rounds: 2 } });
    playRound(h, { p0: "red", p1: "Red", p2: "red", p3: "chartreuse" });
    expect(h.state.dunceId).toBe("p3");
    expect(h.events.some((e) => e.kind === "dunce" && e.playerId === "p3")).toBe(true);
    playRound(h, { p0: "blue", p1: "blue", p2: "teal", p3: "blue" });
    expect(h.state.dunceId).toBe("p2");
    // 100 for round two's herd, minus the cap at the end.
    expect(h.state.scores.p2).toBe(100 - 150);
    h.fire();
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });

  it("keeps the cap where it is when several players are alone", () => {
    const h = harness(greatminds, 5, { options: { rounds: 2 } });
    playRound(h, { p0: "a1", p1: "a1", p2: "a1", p3: "a1", p4: "zz" });
    expect(h.state.dunceId).toBe("p4");
    playRound(h, { p0: "b", p1: "b", p2: "b", p3: "x", p4: "y" });
    expect(h.state.dunceId).toBe("p4");
  });

  it("lets only the host merge groups during the reveal", () => {
    const h = harness(greatminds, 4, { hostId: "p0" });
    playRound(h, { p0: "soda", p1: "Soda", p2: "pop", p3: "pop" }, () => {
      const keys = computeGroups(h.state).groups.map((g) => g.key);
      h.input("p1", { type: "merge", keys });
      expect(computeGroups(h.state).groups).toHaveLength(2);
      expect((h.view("p1") as GmPlayer).canMerge).toBe(false);
      expect((h.view("p0") as GmPlayer).canMerge).toBe(true);
      h.input("p0", { type: "merge", keys });
      expect(computeGroups(h.state).groups).toHaveLength(1);
    });
    expect(h.state.scores).toEqual({ p0: 100, p1: 100, p2: 100, p3: 100 });
  });

  it("moves on as soon as everyone has answered, and ignores blank or repeat answers", () => {
    const h = harness(greatminds, 3);
    h.fire();
    h.input("p0", { type: "answer", text: "   " });
    h.input("p0", { type: "answer", text: "!!!" });
    expect(h.state.answers.p0).toBeUndefined();
    h.input("p0", { type: "answer", text: "apple" });
    h.input("p0", { type: "answer", text: "banana" });
    expect(h.state.answers.p0).toBe("apple");
    h.input("p1", { type: "answer", text: "apple" });
    expect(h.deadline! - h.ctx.now()).toBeGreaterThan(5000);
    h.input("p2", { type: "answer", text: "pear" });
    expect(h.deadline! - h.ctx.now()).toBeLessThanOrEqual(900);
  });

  it("hides answers until the reveal and skips spicy questions in Family Mode", () => {
    const h = harness(greatminds, 3, { options: { rounds: 10 } });
    const spicy = new Set(QUESTIONS.filter((q) => q.spicy).map((q) => q.text));
    expect(h.state.questions.some((q) => spicy.has(q))).toBe(false);
    h.fire();
    h.input("p0", { type: "answer", text: "secret-answer" });
    expect(JSON.stringify(h.tv())).not.toContain("secret-answer");
    expect(JSON.stringify(h.view("p1"))).not.toContain("secret-answer");
  });
});
