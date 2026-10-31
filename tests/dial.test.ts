import { describe, expect, it } from "vitest";
import { dialPoints, type DialPlayer, type DialTv } from "@party/shared";
import { dial } from "../src/shared/engine/games/dial";
import { harness } from "./harness";

describe("Dial It In", () => {
  it("scores by distance", () => {
    expect(dialPoints(50, 50)).toBe(100);
    expect(dialPoints(53, 50)).toBe(100);
    expect(dialPoints(42, 50)).toBe(60);
    expect(dialPoints(64, 50)).toBe(30);
    expect(dialPoints(65, 50)).toBe(0);
  });

  it("shows the target only to the psychic until the reveal", () => {
    const h = harness(dial, 3);
    h.fire();
    const psychic = h.state.psychicId;
    const other = h.roster.find((p) => p.id !== psychic)!.id;
    expect((h.view(psychic) as DialPlayer).target).toBe(h.state.target);
    expect((h.view(other) as DialPlayer).target).toBeNull();
    expect((h.tv() as DialTv).target).toBeNull();
    expect(h.state.target).toBeGreaterThanOrEqual(4);
    expect(h.state.target).toBeLessThanOrEqual(96);
  });

  it("pays guessers by distance and the psychic the average", () => {
    const h = harness(dial, 4);
    h.fire();
    const psychic = h.state.psychicId;
    const [a, b, c] = h.roster.map((p) => p.id).filter((id) => id !== psychic) as [string, string, string];
    h.input(a, { type: "guess", value: 10 });
    expect(h.state.guesses[a]).toBeUndefined(); // no guessing before the clue
    h.input(psychic, { type: "clue", text: "Lukewarm tea" });
    expect(h.state.phase).toBe("guess");
    h.input(psychic, { type: "guess", value: 50 });
    expect(h.state.guesses[psychic]).toBeUndefined();
    const t = h.state.target;
    h.input(a, { type: "guess", value: t });
    h.input(b, { type: "guess", value: t > 50 ? t - 5 : t + 5 });
    h.input(c, { type: "guess", value: t > 50 ? t - 40 : t + 40 });
    h.fire();
    expect(h.state.phase).toBe("reveal");
    expect(h.state.scores[a]).toBe(100);
    expect(h.state.scores[b]).toBe(60);
    expect(h.state.scores[c]).toBe(0);
    expect(h.state.scores[psychic]).toBe(55); // (100 + 60 + 0) / 3 ≈ 53 → nearest 5
    expect((h.tv() as DialTv).guesses).toHaveLength(3);
  });

  it("skips the round when the psychic never gives a clue", () => {
    const h = harness(dial, 3);
    h.fire();
    h.fire(); // clue deadline
    expect(h.state.phase).toBe("reveal");
    expect(h.state.skipped).toBe(true);
    expect(Object.values(h.state.scores).every((s) => s === 0)).toBe(true);
  });

  it("gives everyone one turn as psychic by default", () => {
    const h = harness(dial, 3);
    expect(h.state.totalRounds).toBe(3);
    const psychics: string[] = [];
    h.fire();
    for (let round = 0; round < 3; round++) {
      psychics.push(h.state.psychicId);
      h.input(h.state.psychicId, { type: "clue", text: "hmm" });
      h.fire(); // guess → reveal
      h.fire(); // reveal → standings
      h.fire(); // standings → next round / podium
    }
    expect(new Set(psychics).size).toBe(3);
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });

  it("clamps guesses onto the dial", () => {
    const h = harness(dial, 2);
    h.fire();
    h.input(h.state.psychicId, { type: "clue", text: "clue" });
    const guesser = h.roster.find((p) => p.id !== h.state.psychicId)!.id;
    h.input(guesser, { type: "guess", value: 250 });
    expect(h.state.guesses[guesser]).toBe(100);
  });
});
