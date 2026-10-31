import { describe, expect, it } from "vitest";
import type { PunchlinePlayer, PunchlineTv } from "@party/shared";
import { punchline } from "../src/shared/engine/games/punchline";
import { harness } from "./harness";

type Writing = Extract<PunchlinePlayer, { phase: "write" }>;
type Voting = Extract<PunchlinePlayer, { phase: "vote" }>;

describe("Punchline Panic", () => {
  it.each([3, 4, 5, 6, 7, 8])("gives each of %i players exactly two prompts, never paired with themselves", (n) => {
    const h = harness(punchline, n);
    h.fire(); // intro → write
    expect(h.state.phase).toBe("write");
    expect(h.state.matchups).toHaveLength(n);
    for (const p of h.roster) {
      const mine = h.state.matchups.filter((m) => m.authors.includes(p.id));
      expect(mine).toHaveLength(2);
    }
    for (const m of h.state.matchups) expect(m.authors[0]).not.toBe(m.authors[1]);
    expect(new Set(h.state.matchups.map((m) => m.prompt)).size).toBe(n);
  });

  it("advances early once everyone has answered, then scores votes by round", () => {
    const h = harness(punchline, 4);
    h.fire();
    for (const p of h.roster) {
      for (const prompt of (h.view(p.id) as Writing).prompts) h.input(p.id, { type: "answer", promptId: prompt.id, text: `${p.name} on ${prompt.id}` });
    }
    // Everyone answered → the deadline collapses to the short grace period.
    expect(h.deadline! - h.ctx.now()).toBeLessThanOrEqual(1200);
    h.fire();
    expect(h.state.phase).toBe("vote");

    const m = h.state.matchups[0]!;
    const voters = h.roster.filter((p) => !m.authors.includes(p.id));
    for (const v of voters) h.input(v.id, { type: "vote", matchupId: m.id, choice: "A" });
    h.fire(); // grace → reveal
    expect(h.state.phase).toBe("reveal");
    const tv = h.tv() as PunchlineTv;
    expect(tv.reveal?.outcome).toBe("zinger");
    const winner = m.ab[0];
    // 2 votes × 100 (round 1) + 250 zinger bonus
    expect(h.state.scores[winner]).toBe(2 * 100 + 250);
  });

  it("calls a jinx when both answers match, and a forfeit when one is missing", () => {
    const h = harness(punchline, 3);
    h.fire();
    const [m0, m1] = h.state.matchups;
    for (const id of m0!.authors) h.input(id, { type: "answer", promptId: m0!.id, text: "Same Thing!" });
    // m1: only one author answers.
    h.input(m1!.authors[0], { type: "answer", promptId: m1!.id, text: "Lonely answer" });
    h.fire(); // writing deadline
    expect(h.state.phase).toBe("reveal");
    expect(h.state.matchups[0]!.reveal?.outcome).toBe("jinx");
    h.fire(); // → m1
    expect(h.state.phase).toBe("reveal");
    expect(h.state.matchups[1]!.reveal?.outcome).toBe("forfeit");
    expect(h.state.scores[m1!.authors[0]]).toBeGreaterThan(0);
  });

  it("hides authors from voters until the reveal", () => {
    const h = harness(punchline, 4);
    h.fire();
    let n = 0;
    for (const p of h.roster) for (const pr of (h.view(p.id) as Writing).prompts) h.input(p.id, { type: "answer", promptId: pr.id, text: `joke number ${n++}` });
    h.fire();
    const m = h.state.matchups[0]!;
    const voter = h.roster.find((p) => !m.authors.includes(p.id))!;
    const v = h.view(voter.id) as Voting;
    expect(v.role).toBe("voter");
    expect(JSON.stringify(v)).not.toContain(m.authors[0]);
    expect(JSON.stringify(h.tv())).not.toContain(`"authorId"`);
  });

  it("plays all the way to the podium", () => {
    const h = harness(punchline, 3);
    let guard = 0;
    while (!h.finished && guard++ < 200) {
      const s = h.state;
      if (s.phase === "write") {
        for (const p of h.roster) for (const pr of (h.view(p.id) as Writing).prompts) if (!pr.answer) h.input(p.id, { type: "panic", promptId: pr.id });
      }
      if (s.phase === "finalWrite") for (const p of h.roster) h.input(p.id, { type: "finalAnswer", text: `final ${p.id}` });
      if (s.phase === "finalVote") {
        for (const p of h.roster) {
          const v = h.view(p.id) as Extract<PunchlinePlayer, { phase: "finalVote" }>;
          const pickable = v.entries.find((e) => !e.mine);
          if (pickable) h.input(p.id, { type: "finalVote", key: pickable.key });
        }
      }
      if (h.deadline !== null) h.fire();
    }
    expect(h.finished).toBe(true);
    expect(h.state.phase).toBe("podium");
    const total = Object.values(h.state.scores).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
  });
});
