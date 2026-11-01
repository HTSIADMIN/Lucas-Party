import { describe, expect, it } from "vitest";
import type { CcPlayer, CcTv } from "@party/shared";
import { court } from "../src/shared/engine/games/court";
import { harness } from "./harness";

describe("Character Court", () => {
  it("drafts two lawyers who aren't the defendant and keeps arguments off the TV until the trial", () => {
    const h = harness(court, 5);
    h.fire(); // intro → charge
    const { defendantId, prosecutorId, defenderId } = h.state;
    expect(new Set([defendantId, prosecutorId, defenderId]).size).toBe(3);
    expect((h.view(prosecutorId) as CcPlayer).role).toBe("prosecutor");
    h.input(prosecutorId, { type: "argue", text: "Secret prosecution text" });
    expect(JSON.stringify(h.tv())).not.toContain("Secret prosecution text");
    const juror = h.roster.find((p) => ![defendantId, prosecutorId, defenderId].includes(p.id))!.id;
    h.input(juror, { type: "argue", text: "I'm not a lawyer" });
    expect(h.state.arguments[juror]).toBeUndefined();
  });

  it("pays lawyers per vote, acquits on a tie, and pays an acquitted defendant", () => {
    const h = harness(court, 5);
    h.fire();
    const { defendantId, prosecutorId, defenderId } = h.state;
    h.input(prosecutorId, { type: "argue", text: "They did it." });
    h.input(defenderId, { type: "argue", text: "They were at the zoo." });
    h.fire(); // charge → trial (early finish)
    expect(h.state.phase).toBe("trial");
    expect((h.tv() as CcTv).prosecution).toBe("They did it.");
    const jury = h.roster.map((p) => p.id).filter((id) => id !== prosecutorId && id !== defenderId);
    expect(jury).toHaveLength(3);
    h.input(prosecutorId, { type: "vote", verdict: "guilty" }); // lawyers can't vote
    expect(h.state.votes[prosecutorId]).toBeUndefined();
    h.input(jury[0]!, { type: "vote", verdict: "guilty" });
    h.input(jury[1]!, { type: "vote", verdict: "innocent" });
    h.fire(); // trial deadline with one juror silent → 1–1 tie
    expect(h.state.verdict).toBe("innocent");
    expect(h.state.scores[prosecutorId]).toBe(100);
    expect(h.state.scores[defenderId]).toBe(100);
    expect(h.state.scores[defendantId]).toBe(100);
  });

  it("sentences the guilty and fills in silent lawyers", () => {
    const h = harness(court, 4);
    h.fire();
    h.fire(); // nobody argued
    expect(h.state.arguments[h.state.prosecutorId]).toMatch(/stares at the ceiling/);
    const jury = h.roster.map((p) => p.id).filter((id) => id !== h.state.prosecutorId && id !== h.state.defenderId);
    for (const id of jury) h.input(id, { type: "vote", verdict: "guilty" });
    h.fire();
    expect(h.state.verdict).toBe("guilty");
    expect(h.state.sentence).toBeTruthy();
    expect((h.tv() as CcTv).sentence).toBe(h.state.sentence);
  });

  it("puts everyone on trial once and rotates the lawyers", () => {
    const h = harness(court, 4);
    expect(h.state.totalRounds).toBe(4);
    h.fire();
    const defendants: string[] = [];
    for (let round = 1; round <= 4; round++) {
      defendants.push(h.state.defendantId);
      h.fire(); // charge → trial
      h.fire(); // trial → verdict
      h.fire(); // verdict → standings
      h.fire(); // standings → next / podium
    }
    expect(new Set(defendants).size).toBe(4);
    expect(Math.max(...Object.values(h.state.lawyerCounts))).toBeLessThanOrEqual(3);
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });
});
