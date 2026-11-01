import { describe, expect, it } from "vitest";
import type { LiePlayer, LieTv } from "@party/shared";
import { liedetector } from "../src/shared/engine/games/liedetector";
import { harness } from "./harness";

describe("Lie Detector", () => {
  it("pays correct voters and the speaker for everyone fooled", () => {
    const h = harness(liedetector, 4);
    h.fire(); // intro → choose
    const speaker = h.state.speakerId;
    const [a, b, c] = h.roster.map((p) => p.id).filter((id) => id !== speaker) as [string, string, string];
    h.input(a, { type: "choose", choice: "lie" }); // only the speaker chooses
    expect(h.state.choice).toBeNull();
    h.input(speaker, { type: "choose", choice: "lie" });
    expect(h.state.phase).toBe("talk");
    h.input(speaker, { type: "doneTalking" });
    expect(h.state.phase).toBe("vote");
    h.input(speaker, { type: "vote", verdict: "truth" });
    expect(h.state.votes[speaker]).toBeUndefined();
    h.input(a, { type: "vote", verdict: "lie" });
    h.input(b, { type: "vote", verdict: "truth" });
    h.input(c, { type: "vote", verdict: "truth" });
    h.fire(); // early finish → reveal
    expect(h.state.phase).toBe("reveal");
    expect(h.state.scores[a]).toBe(100);
    expect(h.state.scores[b]).toBe(0);
    expect(h.state.scores[speaker]).toBe(120);
    expect((h.tv() as LieTv).verdict).toBe("lie");
  });

  it("keeps the speaker's choice and question secret until the right moments", () => {
    const h = harness(liedetector, 3);
    h.fire();
    const speaker = h.state.speakerId;
    const other = h.roster.find((p) => p.id !== speaker)!.id;
    expect((h.view(speaker) as LiePlayer).question).toBeTruthy();
    expect((h.view(other) as LiePlayer).question).toBeNull();
    expect((h.tv() as LieTv).question).toBeNull();
    h.input(speaker, { type: "choose", choice: "truth" });
    expect((h.view(speaker) as LiePlayer).myChoice).toBe("truth");
    expect((h.view(other) as LiePlayer).myChoice).toBeNull();
    expect((h.tv() as LieTv).verdict).toBeNull();
    expect((h.tv() as LieTv).question).toBeTruthy();
  });

  it("flips a coin for a speaker who never chooses, and rotates every player once", () => {
    const h = harness(liedetector, 3);
    expect(h.state.totalRounds).toBe(3);
    h.fire();
    const speakers = [h.state.speakerId];
    h.fire(); // choose timeout → coin flip
    expect(["truth", "lie"]).toContain(h.state.choice);
    h.fire(); // talk → vote
    h.fire(); // vote → reveal
    h.fire(); // reveal → standings
    for (let round = 2; round <= 3; round++) {
      h.fire(); // standings → choose
      speakers.push(h.state.speakerId);
      h.fire();
      h.fire();
      h.fire();
      h.fire();
    }
    expect(new Set(speakers).size).toBe(3);
    h.fire();
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });
});
