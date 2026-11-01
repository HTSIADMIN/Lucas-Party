import { describe, expect, it } from "vitest";
import { epCleanPitch, type EpPlayer, type EpTv } from "@party/shared";
import { emojipitch } from "../src/shared/engine/games/emojipitch";
import { harness } from "./harness";

describe("Emoji Pitch", () => {
  it("only accepts one to three emoji", () => {
    expect(epCleanPitch("👻🏚️")).toBe("👻🏚️");
    expect(epCleanPitch(" 🦈  🏖️ ")).toBe("🦈🏖️");
    expect(epCleanPitch("👨‍👩‍👧")).toBe("👨‍👩‍👧"); // one family emoji, one character
    expect(epCleanPitch("🇫🇷🗼")).toBe("🇫🇷🗼");
    expect(epCleanPitch("ghost")).toBeNull();
    expect(epCleanPitch("👻 house")).toBeNull();
    expect(epCleanPitch("👻👻👻👻")).toBeNull();
    expect(epCleanPitch("")).toBeNull();
  });

  it("keeps prompts private and scores guesses for guesser and pitcher", () => {
    const h = harness(emojipitch, 3);
    h.fire(); // intro → pitch
    const p0 = h.view("p0") as EpPlayer;
    expect(p0.myPrompt).toBe(h.state.prompts.p0);
    expect(JSON.stringify(h.view("p1"))).not.toContain(h.state.prompts.p0!);
    h.input("p0", { type: "pitch", emoji: "not emoji" });
    expect(h.state.pitches.p0).toBeUndefined();
    expect(h.events.some((e) => e.kind === "badPitch")).toBe(true);
    for (const p of h.roster) h.input(p.id, { type: "pitch", emoji: "🎉" });
    h.fire(); // pitch → guess (early finish)
    expect(h.state.phase).toBe("guess");
    const showing = h.state.queue[0]!;
    expect(showing.options).toHaveLength(4);
    expect(showing.options[showing.answer]).toBe(h.state.prompts[showing.pitcherId]);
    const guessers = h.roster.map((p) => p.id).filter((id) => id !== showing.pitcherId);
    h.input(showing.pitcherId, { type: "pick", index: showing.answer }); // pitchers don't guess
    expect(h.state.picks[showing.pitcherId]).toBeUndefined();
    h.input(guessers[0]!, { type: "pick", index: showing.answer });
    h.input(guessers[1]!, { type: "pick", index: (showing.answer + 1) % 4 });
    expect((h.tv() as EpTv).answer).toBeNull();
    h.fire(); // guess → reveal
    expect(h.state.scores[guessers[0]!]).toBe(100);
    expect(h.state.scores[guessers[1]!]).toBe(0);
    expect(h.state.scores[showing.pitcherId]).toBe(50);
    expect((h.tv() as EpTv).answer).toBe(showing.answer);
  });

  it("skips players who never pitched and ends on the podium", () => {
    const h = harness(emojipitch, 4);
    h.fire();
    h.input("p0", { type: "pitch", emoji: "🌋" });
    h.input("p2", { type: "pitch", emoji: "🎂🎈" });
    h.fire(); // pitch deadline
    expect(h.state.totalRounds).toBe(2);
    for (let i = 0; i < 2; i++) {
      h.fire(); // guess → reveal
      h.fire(); // reveal → standings
      h.fire(); // standings → next / podium
    }
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });
});
