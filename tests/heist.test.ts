import { describe, expect, it } from "vitest";
import type { HeistPlayer, HeistTv } from "@party/shared";
import { heist } from "../src/shared/engine/games/heist";
import { allCodes, inPlace, solveSet, trueClues } from "../src/shared/engine/games/heist/clues";
import { shuffle } from "../src/shared/engine/random";
import { harness } from "./harness";

describe("Heist Night", () => {
  it("builds clue sets that pin down exactly one code", () => {
    for (let i = 0; i < 40; i++) {
      const length = i % 2 ? 3 : 4;
      const code = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, length);
      const clues = solveSet(code, shuffle);
      const fits = allCodes(length).filter((c) => clues.every((clue) => clue.test(c)));
      expect(fits).toEqual([code]);
      for (const clue of trueClues(code)) expect(clue.test(code)).toBe(true);
    }
  });

  it("counts digits in the right spot", () => {
    expect(inPlace([1, 2, 3], [1, 3, 2])).toBe(1);
    expect(inPlace([1, 2, 3, 4], [1, 2, 3, 4])).toBe(4);
  });

  it("deals every player at least one clue and keeps clues off the TV", () => {
    const h = harness(heist, 6);
    h.fire(); // intro → brief
    for (const p of h.roster) expect((h.view(p.id) as HeistPlayer).clues.length).toBeGreaterThan(0);
    const tv = h.tv() as HeistTv;
    expect(tv.code).toBeNull();
    const anyClue = (h.view("p0") as HeistPlayer).clues[0]!;
    expect(JSON.stringify(tv)).not.toContain(anyClue);
  });

  it("opens the vault on the right code and pays the crew", () => {
    const h = harness(heist, 3);
    h.fire();
    h.fire(); // brief → crack
    const code = h.state.code.join("");
    const cracker = h.state.crackerId;
    const other = h.roster.find((p) => p.id !== cracker)!.id;
    h.input(other, { type: "code", code }); // only the safecracker can type
    expect(h.state.attempts).toEqual([]);
    const wrong = code.split("").reverse().join("");
    if (wrong !== code) h.input(cracker, { type: "code", code: wrong });
    h.input(cracker, { type: "code", code });
    expect(h.state.phase).toBe("result");
    expect(h.state.opened).toBe(true);
    for (const p of h.roster) expect(h.state.scores[p.id]).toBeGreaterThan(0);
    expect(h.state.scores[cracker]).toBe(h.state.scores[other]! + 50);
  });

  it("sounds the alarm after three misses or when time runs out", () => {
    const h = harness(heist, 2);
    h.fire();
    h.fire();
    const cracker = h.state.crackerId;
    const code = h.state.code;
    const miss = code.map((d) => (d + 1) % 10).join("");
    for (let i = 0; i < 3; i++) h.input(cracker, { type: "code", code: miss });
    expect(h.state.opened).toBe(false);

    const late = harness(heist, 2);
    late.fire();
    late.fire();
    late.fire(); // the guards come back
    expect(late.state.opened).toBe(false);
  });

  it("uses 3 digits for the first two vaults, then 4, and ends on the podium", () => {
    const h = harness(heist, 2, { options: { rounds: 3 } });
    h.fire();
    const lengths: number[] = [];
    for (let round = 0; round < 3; round++) {
      lengths.push(h.state.code.length);
      h.fire(); // brief → crack
      h.input(h.state.crackerId, { type: "code", code: h.state.code.join("") });
      h.fire(); // result → standings
      h.fire(); // standings → next / podium
    }
    expect(lengths).toEqual([3, 3, 4]);
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });
});
