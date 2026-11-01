import { describe, expect, it } from "vitest";
import type { WbPlayer, WbTv } from "@party/shared";
import { wordbomb } from "../src/shared/engine/games/wordbomb";
import { harness } from "./harness";

type H = ReturnType<typeof harness<ReturnType<typeof wordbomb.create>>>;

/** A word that passes the checks for the current syllable. */
function wordFor(h: H, n = 0) {
  return `${h.state.syllable}${"XYZQW".slice(0, 2 + n)}`;
}

describe("Word Bomb", () => {
  it("passes the bomb on a valid word and rejects bad ones privately", () => {
    const h = harness(wordbomb, 3);
    h.fire(); // intro → first bomb
    const holder = h.state.holderId;
    h.input(holder, { type: "word", text: "a1" });
    h.input(holder, { type: "word", text: "zz" });
    h.input(holder, { type: "word", text: "qqqqq" });
    expect(h.state.holderId).toBe(holder);
    expect(h.events.filter((e) => e.kind === "badWord")).toHaveLength(3);
    const someoneElse = h.roster.find((p) => p.id !== holder)!.id;
    h.input(someoneElse, { type: "word", text: wordFor(h) }); // not their turn
    expect(h.state.used).toEqual([]);
    const word = wordFor(h);
    h.input(holder, { type: "word", text: word.toLowerCase() });
    expect(h.state.used).toEqual([word]);
    expect(h.state.holderId).not.toBe(holder);
    expect(h.state.scores[holder]).toBe(10);
    // The same word can't be used twice.
    h.state.syllable = word.slice(0, 2);
    h.input(h.state.holderId, { type: "word", text: word });
    expect(h.state.used).toHaveLength(1);
  });

  it("explodes on whoever holds it when the fuse runs out", () => {
    const h = harness(wordbomb, 3);
    h.fire();
    const holder = h.state.holderId;
    h.advance(h.state.fuseAt - h.ctx.now());
    h.fire();
    expect(h.state.phase).toBe("boom");
    expect(h.state.lives[holder]).toBe(1);
    expect((h.tv() as WbTv).boomId).toBe(holder);
    h.fire(); // boom → next bomb
    expect(h.state.phase).toBe("play");
  });

  it("lets the room rule a word fake", () => {
    const h = harness(wordbomb, 3);
    h.fire();
    const writer = h.state.holderId;
    const word = wordFor(h);
    h.input(writer, { type: "word", text: word });
    const at = h.state.words[0]!.at;
    const judges = h.roster.map((p) => p.id).filter((id) => id !== writer);
    expect((h.view(judges[0]!) as WbPlayer).challengeable).toHaveLength(1);
    expect((h.view(writer) as WbPlayer).challengeable).toHaveLength(0);
    h.input(writer, { type: "challenge", at }); // can't challenge yourself
    h.input(judges[0]!, { type: "challenge", at });
    expect(h.state.words[0]!.challengers).toEqual([judges[0]]);
    h.advance(5000);
    h.fire(); // challenge window closes (1 of 2 judges = half → rejected)
    expect(h.state.words[0]!.verdict).toBe("rejected");
    expect(h.state.lives[writer]).toBe(1);
    expect(h.state.scores[writer]).toBe(0);
  });

  it("passes the bomb along when the holder's phone is away", () => {
    const h = harness(wordbomb, 3);
    h.fire();
    const holder = h.state.holderId;
    h.connected.delete(holder);
    wordbomb.onConnectionChange!(h.state, h.ctx, holder, false);
    h.advance(3000);
    h.fire();
    expect(h.state.holderId).not.toBe(holder);
    expect(h.state.lives[holder]).toBe(2);
  });

  it("ends when one player is left and pays the survivor most", () => {
    const h = harness(wordbomb, 2, { options: { lives: 1 } });
    h.fire();
    const loser = h.state.holderId;
    h.advance(h.state.fuseAt - h.ctx.now());
    h.fire();
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
    const winner = h.roster.find((p) => p.id !== loser)!.id;
    expect(h.state.scores[winner]).toBeGreaterThan(h.state.scores[loser]!);
  });
});
