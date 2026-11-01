import { describe, expect, it } from "vitest";
import type { QzPlayer, QzTv } from "@party/shared";
import { trivia } from "../src/shared/engine/games/trivia";
import { QUESTIONS } from "../src/shared/engine/games/trivia/content";
import { harness } from "./harness";

describe("Telly Trivia", () => {
  it("has four distinct options for every question", () => {
    for (const q of QUESTIONS) expect(new Set(q.options).size).toBe(4);
    expect(new Set(QUESTIONS.map((q) => q.text)).size).toBe(QUESTIONS.length);
  });

  it("shuffles options but keeps track of the right one", () => {
    const h = harness(trivia, 2);
    for (const q of h.state.questions) {
      const original = QUESTIONS.find((x) => x.text === q.text)!;
      expect(q.options[q.answer]).toBe(original.options[0]);
    }
  });

  it("pays right answers with a speed bonus and hides the answer until the reveal", () => {
    const h = harness(trivia, 3);
    h.fire(); // intro → question
    const q = h.state.questions[0]!;
    expect((h.tv() as QzTv).answer).toBeNull();
    expect((h.view("p0") as QzPlayer).answer).toBeNull();
    h.input("p0", { type: "answer", choice: q.answer }); // instant → 200
    h.advance(10_000);
    h.input("p1", { type: "answer", choice: q.answer }); // halfway → 150
    h.input("p2", { type: "answer", choice: (q.answer + 1) % 4 }); // wrong → 0
    h.input("p2", { type: "answer", choice: q.answer }); // no second chances
    h.fire();
    expect(h.state.scores).toEqual({ p0: 200, p1: 150, p2: 0 });
    expect((h.tv() as QzTv).answer).toBe(q.answer);
  });

  it("doubles the final question and shows standings every third question", () => {
    const h = harness(trivia, 2, { options: { rounds: 3 } });
    h.fire();
    for (let round = 1; round <= 3; round++) {
      expect(h.state.round).toBe(round);
      const q = h.state.questions[round - 1]!;
      if (round === 3) h.input("p0", { type: "answer", choice: q.answer });
      h.fire(); // question → reveal
      if (round === 3) expect(h.state.gained.p0).toBe(400);
      h.fire(); // reveal → next question or standings
    }
    expect(h.state.phase).toBe("standings");
    h.fire();
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });
});
