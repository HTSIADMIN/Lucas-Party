import { describe, expect, it } from "vitest";
import type { FibPlayer, FibTv } from "@party/shared";
import { fibfactory } from "../src/shared/engine/games/fibfactory";
import { harness } from "./harness";

describe("Fib Factory", () => {
  it("scores the truth, the spotlight player, and fooled friends", () => {
    const h = harness(fibfactory, 4);
    h.fire(); // intro → write
    const subject = h.state.subjectId;
    const [a, b, c] = h.roster.map((p) => p.id).filter((id) => id !== subject) as [string, string, string];
    h.input(subject, { type: "answer", text: "Juggling oranges" });
    h.input(a, { type: "answer", text: "juggling oranges!" }); // too close to the truth — rejected
    expect(h.state.answers[a]).toBeUndefined();
    h.input(a, { type: "answer", text: "Yodeling" });
    h.input(b, { type: "answer", text: "YODELING" }); // same lie merges
    h.input(c, { type: "answer", text: "Knitting" });
    h.fire(); // write → pick
    expect(h.state.phase).toBe("pick");
    expect(h.state.options).toHaveLength(3);
    const truth = h.state.options.find((o) => o.truth)!;
    const yodel = h.state.options.find((o) => o.authorIds.length === 2)!;
    const knit = h.state.options.find((o) => o.authorIds.includes(c))!;
    expect((h.view(a) as FibPlayer).options.some((o) => o.key === yodel.key)).toBe(false);
    h.input(subject, { type: "pick", key: truth.key }); // the spotlight player doesn't pick
    expect(h.state.picks[subject]).toBeUndefined();
    h.input(a, { type: "pick", key: truth.key });
    h.input(b, { type: "pick", key: knit.key });
    h.input(c, { type: "pick", key: yodel.key });
    h.fire(); // pick → reveal
    expect(h.state.scores[a]).toBe(100 + 50); // truth + fooled c
    expect(h.state.scores[b]).toBe(50); // fooled c
    expect(h.state.scores[c]).toBe(50); // fooled b
    expect(h.state.scores[subject]).toBe(50); // a found them
    expect((h.view(b) as FibPlayer).truth).toBe("Juggling oranges");
  });

  it("keeps the truth secret until the reveal", () => {
    const h = harness(fibfactory, 3);
    h.fire();
    h.input(h.state.subjectId, { type: "answer", text: "secret-truth-xyz" });
    expect(JSON.stringify(h.tv())).not.toContain("secret-truth-xyz");
    const other = h.roster.find((p) => p.id !== h.state.subjectId)!.id;
    expect(JSON.stringify(h.view(other))).not.toContain("secret-truth-xyz");
  });

  it("rewards a mind reader whose lie was secretly the truth", () => {
    const h = harness(fibfactory, 3);
    h.fire();
    const subject = h.state.subjectId;
    const other = h.roster.find((p) => p.id !== subject)!.id;
    h.input(other, { type: "answer", text: "Pizza" }); // written before the truth came in
    h.input(subject, { type: "answer", text: "pizza" });
    h.fire();
    expect(h.state.scores[other]).toBe(50);
    expect(h.state.options.filter((o) => !o.truth).some((o) => o.authorIds.includes(other))).toBe(false);
  });

  it("skips a round with no truth and puts everyone in the spotlight once", () => {
    const h = harness(fibfactory, 3);
    expect(h.state.totalRounds).toBe(3);
    h.fire();
    const subjects = [h.state.subjectId];
    h.fire(); // write deadline with no truth → skipped
    expect(h.state.skipped).toBe(true);
    expect((h.tv() as FibTv).skipped).toBe(true);
    h.fire(); // reveal → standings
    for (let round = 2; round <= 3; round++) {
      h.fire(); // standings → write
      subjects.push(h.state.subjectId);
      h.fire();
      h.fire();
    }
    expect(new Set(subjects).size).toBe(3);
    h.fire();
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });
});
