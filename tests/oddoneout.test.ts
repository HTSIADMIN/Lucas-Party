import { describe, expect, it } from "vitest";
import type { OddPlayer } from "@party/shared";
import { oddoneout } from "../src/shared/engine/games/oddoneout";
import { harness } from "./harness";

function toClues(h: ReturnType<typeof harness<ReturnType<typeof oddoneout.create>>>) {
  h.fire(); // intro → reveal
  h.fire(); // reveal → first clue turn
  while (h.state.phase === "clue") {
    const id = h.state.turnOrder[h.state.turn]!;
    h.input(id, { type: "clue", text: `clue-${id}` });
  }
}

describe("Odd One Out", () => {
  it("shows the secret word to everyone except the faker", () => {
    const h = harness(oddoneout, 4);
    h.fire();
    const secret = h.state.topic!.words[h.state.secretIndex];
    for (const p of h.roster) {
      const v = h.view(p.id) as OddPlayer;
      if (p.id === h.state.oddId) {
        expect(v.isOdd).toBe(true);
        expect(v.secretWord).toBeNull();
        expect(v.secretIndex).toBeNull();
      } else {
        expect(v.secretWord).toBe(secret);
      }
    }
    expect(JSON.stringify(h.tv())).not.toContain(`"oddId":"`);
  });

  it("never makes the faker clue first", () => {
    for (let i = 0; i < 25; i++) {
      const h = harness(oddoneout, 5);
      h.fire();
      expect(h.state.turnOrder[0]).not.toBe(h.state.oddId);
    }
  });

  it("rejects a clue that is the secret word", () => {
    const h = harness(oddoneout, 3);
    h.fire();
    h.fire();
    const current = h.state.turnOrder[h.state.turn]!;
    if (current !== h.state.oddId) {
      h.input(current, { type: "clue", text: h.state.topic!.words[h.state.secretIndex] });
      expect(h.state.clues[current]).toBeUndefined();
      expect(h.events.some((e) => e.kind === "clueRejected")).toBe(true);
    }
  });

  it("awards the catchers when the faker is voted out and guesses wrong", () => {
    const h = harness(oddoneout, 4);
    toClues(h);
    expect(h.state.phase).toBe("discuss");
    h.fire(); // → vote
    const odd = h.state.oddId;
    for (const p of h.roster) {
      const target = p.id === odd ? h.roster.find((x) => x.id !== odd)!.id : odd;
      h.input(p.id, { type: "vote", suspectId: target });
    }
    h.fire(); // → voteReveal
    expect(h.state.accusedId).toBe(odd);
    h.fire(); // → guess
    expect(h.state.phase).toBe("guess");
    const wrong = (h.state.secretIndex + 1) % 16;
    h.input(odd, { type: "guess", index: wrong });
    expect(h.state.outcome).toBe("caught");
    for (const p of h.roster) expect(h.state.scores[p.id]).toBe(p.id === odd ? 0 : 200);
  });

  it("lets the faker steal the round with the right guess", () => {
    const h = harness(oddoneout, 3);
    toClues(h);
    h.fire();
    const odd = h.state.oddId;
    for (const p of h.roster) if (p.id !== odd) h.input(p.id, { type: "vote", suspectId: odd });
    h.fire();
    h.fire();
    h.input(odd, { type: "guess", index: h.state.secretIndex });
    expect(h.state.outcome).toBe("stolen");
    expect(h.state.scores[odd]).toBe(200);
  });

  it("gives everyone a turn as the faker before repeating", () => {
    const h = harness(oddoneout, 3, { options: { rounds: 3 } });
    const fakers = new Set<string>();
    let guard = 0;
    while (!h.finished && guard++ < 200) {
      if (h.state.phase === "reveal") fakers.add(h.state.oddId);
      h.fire();
    }
    expect(fakers.size).toBe(3);
  });
});
