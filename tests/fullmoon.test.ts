import { describe, expect, it } from "vitest";
import { FM_MAX_DAYS, FM_SKIP, type FmPlayer, type FmRole, type FmTv } from "@party/shared";
import { fullmoon, roleCountsFor, type FmState } from "../src/shared/engine/games/fullmoon";
import { harness } from "./harness";

type H = ReturnType<typeof harness<FmState>>;

const FIVE: FmRole[] = ["wolf", "seer", "doctor", "villager", "villager"];
const SIX: FmRole[] = ["wolf", "seer", "doctor", "villager", "villager", "villager"];
const EIGHT: FmRole[] = ["wolf", "wolf", "seer", "doctor", "villager", "villager", "villager", "villager"];

/** A fresh game with roles dealt by hand: `roles[i]` belongs to p<i>. */
function setup(roles: FmRole[]): H {
  const h = harness(fullmoon, roles.length);
  roles.forEach((role, i) => {
    h.state.roles[`p${i}`] = role;
  });
  return h;
}

const tv = (h: H) => h.tv() as FmTv;
const view = (h: H, id: string) => h.view(id) as FmPlayer;
const left = (h: H) => h.deadline! - h.ctx.now();
const livingIds = (h: H) => h.state.ids.filter((id) => !h.state.deaths[id]);

/** intro → roles → night 1. */
function toNight(h: H) {
  h.fire();
  h.fire();
  expect(h.state.phase).toBe("night");
}

/** Taps every pick, then lets the night run out → dawn. */
function playNight(h: H, picks: Record<string, string>) {
  expect(h.state.phase).toBe("night");
  for (const [id, targetId] of Object.entries(picks)) h.input(id, { type: "pick", targetId });
  h.fire();
  expect(h.state.phase).toBe("dawn");
}

/** dawn → discussion → vote. */
function toVote(h: H) {
  h.fire();
  expect(h.state.phase).toBe("discuss");
  h.fire();
  expect(h.state.phase).toBe("vote");
}

/** Casts every ballot, then closes the vote → verdict. */
function playVote(h: H, votes: Record<string, string>) {
  expect(h.state.phase).toBe("vote");
  for (const [id, targetId] of Object.entries(votes)) h.input(id, { type: "vote", targetId });
  h.fire();
  expect(h.state.phase).toBe("verdict");
}

/** From dawn: the whole village skips the vote, on to the next night. */
function skipDay(h: H) {
  toVote(h);
  playVote(h, Object.fromEntries(livingIds(h).map((id) => [id, FM_SKIP])));
  expect(h.state.verdict).toBe("skipped");
  h.fire();
  expect(h.state.phase).toBe("night");
}

describe("Full Moon", () => {
  it("deals 1 werewolf to 5–6 players and 2 to 7–8, plus a seer and a doctor", () => {
    for (const [n, wolves] of [[5, 1], [6, 1], [7, 2], [8, 2]] as const) {
      expect(roleCountsFor(n)).toEqual({ wolf: wolves, seer: 1, doctor: 1, villager: n - wolves - 2 });
      const dealt = Object.values(harness(fullmoon, n).state.roles);
      expect(dealt).toHaveLength(n);
      expect(dealt.filter((r) => r === "wolf")).toHaveLength(wolves);
      expect(dealt.filter((r) => r === "seer")).toHaveLength(1);
      expect(dealt.filter((r) => r === "doctor")).toHaveLength(1);
      expect(dealt.filter((r) => r === "villager")).toHaveLength(n - wolves - 2);
      expect((harness(fullmoon, n).tv() as FmTv).roleCounts.wolf).toBe(wolves);
    }
  });

  it("deals the roles at random", () => {
    const wolfSeats = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const roles = harness(fullmoon, 5).state.roles;
      wolfSeats.add(Object.keys(roles).find((id) => roles[id] === "wolf")!);
    }
    expect(wolfSeats.size).toBeGreaterThan(1);
  });

  it("shows each phone only its own role, and the werewolves their pack", () => {
    const h = setup(EIGHT);
    expect(view(h, "p0").role).toBeNull(); // nothing is dealt during the intro
    h.fire();
    expect(h.state.phase).toBe("roles");
    for (const p of h.roster) {
      const v = view(h, p.id);
      expect(v.role).toBe(EIGHT[Number(p.id.slice(1))]);
      expect([...v.packIds].sort()).toEqual(v.role === "wolf" ? ["p0", "p1"] : []);
      expect(v.seats.every((s) => s.role === null)).toBe(true);
      expect(v.visions).toEqual([]);
      expect(v.lastProtectedId).toBeNull();
      expect(v.ghost).toBeNull();
    }
  });

  it("finishes the role reveal early once everyone taps Got it", () => {
    const h = setup(FIVE);
    h.fire();
    for (const id of ["p0", "p1", "p2", "p3"]) h.input(id, { type: "ready" });
    expect(left(h)).toBe(12_000);
    expect(tv(h).doneIds).toEqual(["p0", "p1", "p2", "p3"]);
    h.input("p4", { type: "ready" });
    expect(left(h)).toBe(900);
    h.fire();
    expect(h.state.phase).toBe("night");
    expect(left(h)).toBe(30_000);
  });

  it("lets the werewolves watch each other's picks, and nobody else", () => {
    const h = setup(EIGHT);
    toNight(h);
    h.input("p0", { type: "pick", targetId: "p4" });
    expect(view(h, "p0").myPick).toBe("p4");
    expect(view(h, "p0").packPicks).toEqual({});
    expect(view(h, "p1").packPicks).toEqual({ p0: "p4" });
    for (const id of ["p2", "p3", "p4", "p5", "p6", "p7"]) {
      expect(view(h, id).packPicks).toEqual({});
      expect(view(h, id).packIds).toEqual([]);
    }
    // A werewolf can't hunt a werewolf, but can switch to match the pack.
    h.input("p1", { type: "pick", targetId: "p0" });
    expect(h.state.picks.p1).toBeUndefined();
    h.input("p1", { type: "pick", targetId: "p5" });
    h.input("p1", { type: "pick", targetId: "p4" });
    expect(view(h, "p0").packPicks).toEqual({ p1: "p4" });
    // Only first picks tick on the TV, and they never say who.
    const ticks = h.events.filter((e) => e.kind === "picked");
    expect(ticks).toHaveLength(2);
    expect(ticks.every((e) => e.playerId === undefined)).toBe(true);
  });

  it("kills the werewolves' victim and reveals their role at dawn", () => {
    const h = setup(FIVE);
    toNight(h);
    playNight(h, { p0: "p3", p1: "p0", p2: "p4", p3: "p0", p4: "p1" });
    expect(h.state.deaths).toEqual({ p3: { day: 1, cause: "wolves" } });
    const t = tv(h);
    expect(t.victimId).toBe("p3");
    expect(t.seats.find((s) => s.id === "p3")).toEqual({ id: "p3", alive: false, role: "villager", death: { day: 1, cause: "wolves" } });
    expect(t.seats.filter((s) => s.alive).every((s) => s.role === null)).toBe(true);
    expect(view(h, "p3").alive).toBe(false);
  });

  it("saves the doctor's guard, and the TV can't tell a save from a quiet night", () => {
    const saved = setup(FIVE);
    toNight(saved);
    playNight(saved, { p0: "p3", p1: "p4", p2: "p3", p3: "p1", p4: "p1" });
    expect(saved.state.deaths).toEqual({});
    expect(tv(saved).victimId).toBeNull();

    const quiet = setup(FIVE);
    toNight(quiet);
    playNight(quiet, { p1: "p2", p2: "p4", p3: "p1", p4: "p1" }); // the werewolf never picks
    expect(quiet.state.deaths).toEqual({});
    expect(JSON.stringify(tv(saved))).toBe(JSON.stringify(tv(quiet)));
  });

  it("won't let the doctor guard the same player two nights running", () => {
    const h = setup(SIX);
    toNight(h);
    playNight(h, { p2: "p4" });
    skipDay(h);
    const doc = view(h, "p2");
    expect(doc.lastProtectedId).toBe("p4");
    expect(doc.nightTargets).not.toContain("p4");
    expect(doc.nightTargets).toContain("p2"); // guarding yourself is fine
    expect(view(h, "p3").lastProtectedId).toBeNull();
    h.input("p2", { type: "pick", targetId: "p4" });
    expect(h.state.picks.p2).toBeUndefined();
    h.input("p2", { type: "pick", targetId: "p2" });
    playNight(h, { p0: "p2" });
    expect(h.state.deaths.p2).toBeUndefined();
    expect(h.state.lastProtectedId).toBe("p2");
  });

  it("shows the seer's vision at dawn, on the seer's phone only", () => {
    const h = setup(FIVE);
    toNight(h);
    h.input("p1", { type: "pick", targetId: "p0" });
    expect(view(h, "p1").visions).toEqual([]); // not until dawn
    playNight(h, { p0: "p3", p2: "p4", p3: "p1", p4: "p1" });
    expect(view(h, "p1").visions).toEqual([{ day: 1, targetId: "p0", wolf: true }]);
    for (const id of ["p0", "p2", "p4"]) expect(view(h, id).visions).toEqual([]);
    expect(JSON.stringify(tv(h))).not.toContain("vision");
    skipDay(h);
    playNight(h, { p1: "p4" });
    expect(view(h, "p1").visions.at(-1)).toEqual({ day: 2, targetId: "p4", wolf: false });
  });

  it("breaks a tie between the werewolves' picks at random", () => {
    const victims = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const h = setup(EIGHT);
      toNight(h);
      playNight(h, { p0: "p4", p1: "p5" });
      const dead = Object.keys(h.state.deaths);
      expect(dead).toHaveLength(1);
      victims.add(dead[0]!);
    }
    expect([...victims].sort()).toEqual(["p4", "p5"]);
  });

  it("votes out the most-voted player and reveals their role", () => {
    const h = setup(SIX);
    toNight(h);
    playNight(h, {});
    h.fire(); // → discussion
    for (const id of h.state.ids) h.input(id, { type: "ready" });
    expect(left(h)).toBe(900);
    h.fire();
    expect(h.state.phase).toBe("vote");
    h.input("p0", { type: "vote", targetId: FM_SKIP });
    h.input("p1", { type: "vote", targetId: "p3" });
    h.input("p2", { type: "vote", targetId: "p3" });
    h.input("p3", { type: "vote", targetId: "p0" });
    h.input("p4", { type: "vote", targetId: "p3" });
    expect(tv(h).votes).toBeNull(); // ballots stay sealed until the verdict
    expect(tv(h).doneIds).toEqual(["p0", "p1", "p2", "p3", "p4"]);
    h.input("p5", { type: "vote", targetId: "p0" });
    expect(left(h)).toBe(900);
    h.fire();
    const t = tv(h);
    expect(t.verdict).toBe("eliminated");
    expect(t.eliminatedId).toBe("p3");
    expect(t.votes).toEqual({ p0: FM_SKIP, p1: "p3", p2: "p3", p3: "p0", p4: "p3", p5: "p0" });
    expect(t.seats.find((s) => s.id === "p3")).toMatchObject({ alive: false, role: "villager", death: { day: 1, cause: "vote" } });
    expect(h.state.wolfVotes).toEqual({ p3: 1, p5: 1 });
  });

  it("spares everyone on a tie, a Skip win, a tie with Skip, or no votes at all", () => {
    function verdictFor(votes: Record<string, string>) {
      const h = setup(SIX);
      toNight(h);
      playNight(h, {});
      toVote(h);
      playVote(h, votes);
      return h;
    }
    const cases: [Record<string, string>, string][] = [
      [{ p0: "p1", p1: "p0", p2: "p1", p3: "p0" }, "tie"],
      [{ p0: FM_SKIP, p1: FM_SKIP, p2: FM_SKIP, p3: "p0", p4: "p0" }, "skipped"],
      [{ p0: FM_SKIP, p1: FM_SKIP, p2: "p0", p3: "p0" }, "tie"],
      [{}, "none"],
    ];
    for (const [votes, verdict] of cases) {
      const h = verdictFor(votes);
      expect(h.state.verdict).toBe(verdict);
      expect(h.state.eliminatedId).toBeNull();
      expect(h.state.deaths).toEqual({});
      h.fire();
      expect(h.state.phase).toBe("night");
      expect(h.state.day).toBe(2);
    }
    // A single vote is enough when nobody else votes.
    expect(verdictFor({ p1: "p4" }).state.eliminatedId).toBe("p4");
  });

  it("rejects bad ballots: yourself, the dead, junk, or a second vote", () => {
    const h = setup(FIVE);
    toNight(h);
    playNight(h, { p0: "p3" });
    toVote(h);
    for (const bad of [{ type: "vote", targetId: "p1" }, { type: "vote", targetId: "p3" }, { type: "vote", targetId: "nobody" }, { type: "vote" }, "vote", null, [1]]) {
      h.input("p1", bad);
    }
    expect(h.state.votes.p1).toBeUndefined();
    h.input("p1", { type: "vote", targetId: "p0" });
    h.input("p1", { type: "vote", targetId: "p2" });
    expect(h.state.votes.p1).toBe("p0");
    h.input("p9", { type: "vote", targetId: "p0" }); // not in this game
    expect(h.state.votes.p9).toBeUndefined();
  });

  it("turns the dead into ghosts: they can't act, but see every role and move", () => {
    const h = setup(FIVE);
    toNight(h);
    playNight(h, { p0: "p3" });
    h.fire(); // → discussion
    h.input("p3", { type: "ready" });
    expect(h.state.ready).not.toContain("p3");
    expect(tv(h).doneIds).not.toContain("p3");
    for (const id of ["p0", "p1", "p2", "p4"]) h.input(id, { type: "ready" });
    expect(left(h)).toBe(900); // the ghost doesn't hold up the day
    h.fire();
    h.input("p3", { type: "vote", targetId: "p0" });
    expect(h.state.votes.p3).toBeUndefined();
    playVote(h, { p0: FM_SKIP, p1: FM_SKIP, p2: FM_SKIP, p4: FM_SKIP });
    h.fire();
    expect(h.state.phase).toBe("night");

    h.input("p3", { type: "pick", targetId: "p1" });
    expect(h.state.picks.p3).toBeUndefined();
    h.input("p0", { type: "pick", targetId: "p4" });
    h.input("p1", { type: "pick", targetId: "p0" });
    h.input("p2", { type: "pick", targetId: "p1" });
    const ghost = view(h, "p3");
    expect(ghost.seats.map((s) => s.role)).toEqual(FIVE);
    expect(ghost.ghost).toEqual({ wolfPicks: { p0: "p4" }, seerPick: "p0", doctorPick: "p1", votes: {} });
    expect(ghost.nightTargets).toEqual([]);
    expect(view(h, "p4").ghost).toBeNull();
    expect(view(h, "p4").seats.filter((s) => s.alive).every((s) => s.role === null)).toBe(true);
    // The night ends once every *living* player has picked.
    h.input("p4", { type: "pick", targetId: "p1" });
    expect(left(h)).toBe(2000);
    expect(tv(h).nightDone).toBe(4);
    expect(tv(h).aliveCount).toBe(4);
  });

  it("lets the village win by voting out the last werewolf — points land only at the end", () => {
    const h = setup(FIVE);
    toNight(h);
    playNight(h, { p0: "p3", p1: "p0", p2: "p4", p4: "p1" });
    toVote(h);
    playVote(h, { p0: "p4", p1: "p0", p2: "p0", p4: "p0" });
    expect(h.state.eliminatedId).toBe("p0");
    // The TV's score strip is public: nothing moves before the finale.
    expect(fullmoon.scores(h.state)).toEqual({ p0: 0, p1: 0, p2: 0, p3: 0, p4: 0 });
    h.fire();
    expect(h.state.phase).toBe("finale");
    const t = tv(h);
    expect(t.winner).toBe("village");
    expect(t.ending).toBe("cleared");
    expect(t.seats.map((s) => s.role)).toEqual(FIVE);
    expect(fullmoon.scores(h.state)).toEqual({
      p0: 0, // the werewolf: lost and dead
      p1: 500 + 100 + 50 + 50, // the seer: win, alive, a wolf vote, a wolf found
      p2: 500 + 100 + 50,
      p3: 500, // dead villagers still share the win
      p4: 500 + 100 + 50,
    });
    expect(view(h, "p1").breakdown).toEqual({ team: 500, survived: 100, wolfVotes: 50, visions: 50, total: 700 });
    expect(view(h, "p3").winner).toBe("village");
    h.fire();
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
    expect(h.deadline).toBeNull();
    expect(h.events.at(-1)?.sfx).toBe("win.big");
  });

  it("lets the werewolves win once they match the villagers", () => {
    const h = setup(FIVE);
    toNight(h);
    playNight(h, { p0: "p1" }); // the seer goes first
    toVote(h);
    playVote(h, { p0: "p3", p2: "p3", p4: "p3" }); // the village votes out a villager
    h.fire();
    expect(h.state.phase).toBe("night");
    expect(h.state.day).toBe(2);
    playNight(h, { p0: "p4", p2: "p2" }); // one werewolf, one doctor left
    h.fire(); // the win check after dawn
    expect(h.state.phase).toBe("finale");
    expect(h.state.winner).toBe("wolves");
    expect(h.state.ending).toBe("overrun");
    expect(fullmoon.scores(h.state)).toEqual({ p0: 600, p1: 0, p2: 100, p3: 0, p4: 0 });
  });

  it("runs on timers alone and still ends, even if nobody ever taps", () => {
    const h = harness(fullmoon, 6);
    const phases: string[] = [];
    let guard = 0;
    while (!h.finished && guard++ < 200) {
      phases.push(h.state.phase);
      h.fire();
    }
    expect(h.finished).toBe(true);
    expect(h.state.phase).toBe("podium");
    expect(phases.slice(0, 8)).toEqual(["intro", "roles", "night", "dawn", "discuss", "vote", "verdict", "night"]);
    expect(phases.at(-1)).toBe("finale");
    expect(h.state.day).toBe(FM_MAX_DAYS);
    expect(h.state.deaths).toEqual({});
    expect(h.state.winner).toBe("wolves");
    expect(h.state.ending).toBe("outlasted");
  });

  it("never lets a dropped phone hold up a phase", () => {
    const h = setup(FIVE);
    h.fire();
    for (const id of ["p0", "p1", "p2", "p3"]) h.input(id, { type: "ready" });
    expect(left(h)).toBe(12_000);
    h.connected.delete("p4");
    fullmoon.onConnectionChange!(h.state, h.ctx, "p4", false);
    expect(left(h)).toBe(900);
    h.fire();
    // Night: the werewolf is away too. Everyone else picks; the night wraps up.
    h.connected.delete("p0");
    fullmoon.onConnectionChange!(h.state, h.ctx, "p0", false);
    const picks: [string, string][] = [["p1", "p2"], ["p2", "p1"], ["p3", "p1"]];
    for (const [id, targetId] of picks) h.input(id, { type: "pick", targetId });
    expect(left(h)).toBe(2000);
    h.fire();
    expect(h.state.deaths).toEqual({}); // no werewolf pick, no victim
    h.fire(); // → discussion
    for (const id of ["p1", "p2", "p3"]) h.input(id, { type: "ready" });
    expect(left(h)).toBe(900);
  });

  it("keeps the TV and bystanders' phones blind to every secret", () => {
    // Same public story, different secrets: who holds which role, and every night tap.
    const a = setup(["wolf", "seer", "doctor", "villager", "villager", "villager"]);
    const b = setup(["villager", "doctor", "wolf", "seer", "villager", "villager"]);
    const publicEvents = (h: H) => JSON.stringify(h.events.filter((e) => e.tv !== false));
    const same = () => {
      expect(JSON.stringify(tv(a))).toBe(JSON.stringify(tv(b)));
      expect(JSON.stringify(view(a, "p5"))).toBe(JSON.stringify(view(b, "p5"))); // a villager in both
      expect(publicEvents(a)).toBe(publicEvents(b));
      for (const h of [a, b]) expect(tv(h).seats.filter((s) => s.alive).every((s) => s.role === null)).toBe(true);
    };
    for (const h of [a, b]) h.fire();
    same();
    for (const id of ["p0", "p1", "p2", "p3", "p4", "p5"]) {
      for (const h of [a, b]) h.input(id, { type: "ready" });
      same();
    }
    for (const h of [a, b]) h.fire();
    same();
    // Both p0s tap, then switch — a werewolf in game A, a villager in game B.
    const nightA: [string, string][] = [["p0", "p5"], ["p0", "p4"], ["p1", "p0"], ["p2", "p3"], ["p3", "p1"], ["p4", "p2"], ["p5", "p0"]];
    const nightB: [string, string][] = [["p0", "p3"], ["p0", "p2"], ["p1", "p1"], ["p2", "p4"], ["p3", "p2"], ["p4", "p3"], ["p5", "p0"]];
    for (let i = 0; i < nightA.length; i++) {
      a.input(nightA[i]![0], { type: "pick", targetId: nightA[i]![1] });
      b.input(nightB[i]![0], { type: "pick", targetId: nightB[i]![1] });
      same();
    }
    for (const h of [a, b]) h.fire(); // → dawn: p4 (a villager in both) was found
    expect(a.state.deaths).toEqual({ p4: { day: 1, cause: "wolves" } });
    expect(b.state.deaths).toEqual(a.state.deaths);
    same();
    for (const h of [a, b]) toVote(h);
    same();
    for (const id of ["p0", "p1", "p2", "p3", "p5"]) {
      for (const h of [a, b]) h.input(id, { type: "vote", targetId: FM_SKIP });
      same();
    }
    for (const h of [a, b]) h.fire(); // → verdict
    same();
    for (const h of [a, b]) h.fire(); // → night 2
    same();
    // Meanwhile each secret did reach its owner, and only its owner.
    expect(view(a, "p1").visions).toEqual([{ day: 1, targetId: "p0", wolf: true }]);
    expect(view(b, "p3").visions).toEqual([{ day: 1, targetId: "p2", wolf: true }]);
    expect(view(a, "p0").visions).toEqual([]);
    expect(view(a, "p0").lastProtectedId).toBeNull();
    expect(view(a, "p2").lastProtectedId).toBe("p3");
    expect(view(b, "p1").lastProtectedId).toBe("p1");
  });
});
