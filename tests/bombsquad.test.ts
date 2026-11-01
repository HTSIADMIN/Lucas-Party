import { describe, expect, it } from "vitest";
import type { BsPlayer, BsTv, BsWireColor } from "@party/shared";
import { bombsquad } from "../src/shared/engine/games/bombsquad";
import { KEYPAD_COLUMNS, WORD_PARTNERS, columnsWith, wireToCut } from "../src/shared/engine/games/bombsquad/manual";
import { harness } from "./harness";

type H = ReturnType<typeof harness<ReturnType<typeof bombsquad.create>>>;

function arm(h: H) {
  h.fire(); // intro → brief
  h.fire(); // brief → defuse
  expect(h.state.phase).toBe("defuse");
}

function solveAll(h: H) {
  const p = h.state.puzzle!;
  const d = h.state.defuserId;
  h.input(d, { type: "cut", wire: p.wireAnswer });
  for (const symbol of p.keypadAnswer) h.input(d, { type: "key", symbol });
  for (let i = 0; i < 3; i++) h.input(d, { type: "word", label: WORD_PARTNERS[p.words[h.state.puzzle!.wordStage]!.display]! });
}

describe("Bomb Squad", () => {
  it("follows the wire rules", () => {
    const w = (s: string) => s.split(" ") as BsWireColor[];
    expect(wireToCut(w("red blue yellow black"))).toBe(2); // no white → 3rd
    expect(wireToCut(w("black white red red"))).toBe(3); // first black → last
    expect(wireToCut(w("white blue red blue"))).toBe(3); // two blues → last blue
    expect(wireToCut(w("white red red yellow red"))).toBe(3); // last red → 4th
    expect(wireToCut(w("yellow yellow red white blue"))).toBe(0); // more yellow → first yellow
    expect(wireToCut(w("white red blue white blue"))).toBe(1); // no black → 2nd
    expect(wireToCut(w("red blue yellow white white black"))).toBe(4); // one yellow → 5th
    expect(wireToCut(w("red blue white white black black"))).toBe(5); // 2nd blue → last
  });

  it("only ever builds keypads with exactly one matching column", () => {
    for (let i = 0; i < 40; i++) {
      const h = harness(bombsquad, 3);
      arm(h);
      const p = h.state.puzzle!;
      expect(columnsWith(p.keypad)).toHaveLength(1);
      const column = KEYPAD_COLUMNS[columnsWith(p.keypad)[0]!]!;
      expect(p.keypadAnswer).toEqual([...p.keypad].sort((a, b) => column.indexOf(a) - column.indexOf(b)));
    }
  });

  it("shows the bomb only to the defuser and the manual only to experts", () => {
    const h = harness(bombsquad, 4);
    arm(h);
    const d = h.state.defuserId;
    const experts = h.roster.map((p) => p.id).filter((id) => id !== d);
    expect((h.view(d) as BsPlayer).bomb).not.toBeNull();
    expect((h.view(d) as BsPlayer).manual).toBeNull();
    for (const id of experts) {
      expect((h.view(id) as BsPlayer).bomb).toBeNull();
      expect((h.view(id) as BsPlayer).manual).not.toBeNull();
    }
    // Every module's pages are with at least one expert, and the TV has neither.
    const manuals = experts.map((id) => (h.view(id) as BsPlayer).manual!);
    expect(manuals.some((m) => m.wires) && manuals.some((m) => m.keypad) && manuals.some((m) => m.words)).toBe(true);
    expect(JSON.stringify(h.tv())).not.toContain('"wires":[');
  });

  it("defuses when every module is solved and pays everyone", () => {
    const h = harness(bombsquad, 3);
    arm(h);
    h.advance(60_000);
    solveAll(h);
    expect(h.state.phase).toBe("result");
    expect(h.state.outcome).toBe("defused");
    const left = h.state.secondsLeft!;
    expect(left).toBe(120);
    for (const p of h.roster) expect(h.state.scores[p.id]).toBe(200 + left * 2 + (p.id === h.state.defuserId ? 100 : 0));
  });

  it("explodes on the third strike or when time runs out, and ignores experts", () => {
    const h = harness(bombsquad, 3);
    arm(h);
    const d = h.state.defuserId;
    const expert = h.roster.find((p) => p.id !== d)!.id;
    const p = h.state.puzzle!;
    h.input(expert, { type: "cut", wire: p.wireAnswer });
    expect(p.solved.wires).toBe(false);
    const wrongWire = p.wireAnswer === 0 ? 1 : 0;
    h.input(d, { type: "cut", wire: wrongWire });
    const wrongWord = p.words[0]!.buttons.find((b) => b !== WORD_PARTNERS[p.words[0]!.display])!;
    h.input(d, { type: "word", label: wrongWord });
    expect(h.state.strikes).toBe(2);
    const wrongKey = p.keypad.find((s) => s !== p.keypadAnswer[0])!;
    h.input(d, { type: "key", symbol: wrongKey });
    expect(h.state.outcome).toBe("exploded");
    expect((h.tv() as BsTv).outcome).toBe("exploded");

    const late = harness(bombsquad, 2);
    arm(late);
    late.fire(); // the timer runs out
    expect(late.state.outcome).toBe("exploded");
  });

  it("rotates the defuser each bomb and ends on the podium", () => {
    const h = harness(bombsquad, 3);
    expect(h.state.totalRounds).toBe(3);
    const defusers: string[] = [];
    h.fire();
    for (let round = 0; round < 3; round++) {
      defusers.push(h.state.defuserId);
      h.fire(); // brief → defuse
      solveAll(h);
      h.fire(); // result → standings
      h.fire(); // standings → next / podium
    }
    expect(new Set(defusers).size).toBe(3);
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });
});
