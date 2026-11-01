import { describe, expect, it } from "vitest";
import { SPY_AGENT_POINTS, SPY_END_TURN, SPY_WIN_POINTS, spyClueProblem, textKey, type SpyCard, type SpyCardKind, type SpyPlayer, type SpyTeam, type SpyTv } from "@party/shared";
import { spygrid, type SpyState } from "../src/shared/engine/games/spygrid";
import { WORDS } from "../src/shared/engine/games/spygrid/content";
import { harness } from "./harness";

type H = ReturnType<typeof harness<SpyState>>;

/** A clue that can't clash with any word in the bank. */
const SAFE = "Qzx";

const other = (team: SpyTeam): SpyTeam => (team === "red" ? "blue" : "red");

/** Starts a game and runs it to the first clue phase. */
function setup(n: number, options: Record<string, number> = {}): H {
  const h = harness(spygrid, n, { options });
  h.fire(); // intro → teams
  h.fire(); // teams → first clue
  expect(h.state.phase).toBe("clue");
  return h;
}

const spymaster = (h: H, team: SpyTeam = h.state.activeTeam) => h.state.spymasters[team][0]!;
const operatives = (h: H, team: SpyTeam = h.state.activeTeam) => h.state.members[team].filter((id) => !h.state.spymasters[team].includes(id));

/** The nth unflipped card of a kind. */
function cardOf(h: H, kind: SpyCardKind, nth = 0): number {
  return h.state.key.map((k, i) => (k === kind && !h.state.flipped[i] ? i : -1)).filter((i) => i >= 0)[nth]!;
}

function clue(h: H, count = 2, word = SAFE) {
  h.input(spymaster(h), { type: "clue", word, count });
}

/** Every operative on the guessing team votes for the same target. */
function voteAll(h: H, index: number) {
  for (const id of operatives(h)) if (h.state.phase === "guess") h.input(id, { type: "vote", index });
}

function setConnected(h: H, id: string, connected: boolean) {
  if (connected) h.connected.add(id);
  else h.connected.delete(id);
  spygrid.onConnectionChange!(h.state, h.ctx, id, connected);
}

const keyHidden = (cards: SpyCard[]) => cards.every((c) => c.flipped || c.kind === null);

describe("Spy Grid", () => {
  it("splits everyone into two even teams with one spymaster each", () => {
    for (let n = 4; n <= 8; n++) {
      const h = setup(n);
      const { red, blue } = h.state.members;
      expect(Math.abs(red.length - blue.length)).toBeLessThanOrEqual(1);
      expect([...red, ...blue].sort()).toEqual(h.roster.map((p) => p.id).sort());
      for (const team of ["red", "blue"] as const) {
        expect(h.state.spymasters[team]).toHaveLength(1);
        expect(h.state.members[team]).toContain(spymaster(h, team));
      }
      const tv = h.tv() as SpyTv;
      expect(tv.teams.map((t) => t.spymasterIds)).toEqual([h.state.spymasters.red, h.state.spymasters.blue]);
    }
  });

  it("deals 25 distinct words and a fair key, with no near-duplicates on a board", () => {
    for (let run = 0; run < 20; run++) {
      const h = setup(6);
      const { words, key, startingTeam } = h.state;
      expect(words).toHaveLength(25);
      expect(new Set(words.map(textKey)).size).toBe(25);
      const count = (k: SpyCardKind) => key.filter((x) => x === k).length;
      expect(count(startingTeam)).toBe(9);
      expect(count(other(startingTeam))).toBe(8);
      expect(count("bystander")).toBe(7);
      expect(count("assassin")).toBe(1);
      expect(h.state.activeTeam).toBe(startingTeam);
      for (const a of words) for (const b of words) if (a !== b) expect(textKey(a).includes(textKey(b))).toBe(false);
    }
  });

  it("shows the key only to spymasters until the board is over", () => {
    const h = setup(6);
    const tv = h.tv() as SpyTv;
    expect(keyHidden(tv.cards)).toBe(true);
    expect(JSON.stringify(tv)).not.toContain("assassin");
    for (const p of h.roster) {
      const v = h.view(p.id) as SpyPlayer;
      const holdsKey = h.state.spymasters[v.team].includes(p.id);
      expect(v.isSpymaster).toBe(holdsKey);
      if (holdsKey) {
        expect(v.cards.every((c) => c.kind !== null)).toBe(true);
      } else {
        expect(keyHidden(v.cards)).toBe(true);
        expect(JSON.stringify(v)).not.toContain("assassin");
      }
    }
    // Flipped cards are public; the rest stay hidden.
    clue(h);
    const bystander = cardOf(h, "bystander");
    voteAll(h, bystander);
    const after = h.tv() as SpyTv;
    expect(after.cards[bystander]).toMatchObject({ kind: "bystander", flipped: true });
    expect(keyHidden(after.cards)).toBe(true);
    // Flip the assassin: the board ends and the whole key goes public.
    clue(h);
    voteAll(h, cardOf(h, "assassin"));
    expect(h.state.phase).toBe("boardEnd");
    expect((h.tv() as SpyTv).cards.every((c) => c.kind !== null)).toBe(true);
  });

  it("explains why a clue isn't allowed", () => {
    expect(spyClueProblem("", [])).not.toBeNull();
    expect(spyClueProblem("two words", [])).not.toBeNull();
    expect(spyClueProblem("Ocean!", [])).not.toBeNull();
    expect(spyClueProblem("rock'n'roll", [])).toBeNull();
    expect(spyClueProblem("ice-cold", [])).toBeNull();
    expect(spyClueProblem("OCEAN", ["Ocean"])).toContain("Ocean");
    expect(spyClueProblem("Oceans", ["Ocean"])).not.toBeNull();
    expect(spyClueProblem("Sea", ["Seal"])).not.toBeNull();
    expect(spyClueProblem("Ocean", ["Seal", "Bark"])).toBeNull();
  });

  it("only takes valid clues from the guessing team's spymaster", () => {
    const h = setup(4);
    const sm = spymaster(h);
    const word = h.state.words[0]!;
    const before = h.events.length;
    for (const bad of ["two words", word, `${word}s`, word.slice(0, -1)]) h.input(sm, { type: "clue", word: bad, count: 1 });
    expect(h.state.phase).toBe("clue");
    const rejected = h.events.slice(before).filter((e) => e.kind === "clueRejected");
    expect(rejected).toHaveLength(4);
    expect(rejected.every((e) => e.tv === false && e.to?.length === 1 && e.to[0] === sm)).toBe(true);
    // Bad numbers and other players are ignored silently.
    for (const count of [0, 10, 2.5, "x"]) h.input(sm, { type: "clue", word: SAFE, count });
    for (const id of [...operatives(h), spymaster(h, other(h.state.activeTeam))]) h.input(id, { type: "clue", word: SAFE, count: 1 });
    h.input(sm, { type: "clue", word: 42, count: 1 });
    expect(h.state.phase).toBe("clue");
    expect(h.events.slice(before).filter((e) => e.kind === "clueRejected")).toHaveLength(4);
    h.input(sm, { type: "clue", word: SAFE, count: 2 });
    expect(h.state.phase).toBe("guess");
    expect(h.state.clue).toEqual({ team: h.state.activeTeam, word: SAFE, count: 2 });
    expect(h.state.guessesLeft).toBe(3);
    expect(h.deadline! - h.ctx.now()).toBe(120_000);
  });

  it("lets a flipped word be used as a clue", () => {
    const h = setup(4);
    clue(h);
    const index = cardOf(h, "bystander");
    voteAll(h, index);
    expect(h.state.phase).toBe("clue");
    clue(h, 1, h.state.words[index]!);
    expect(h.state.phase).toBe("guess");
  });

  it("flips a word the moment a lone operative votes", () => {
    const h = setup(4);
    clue(h);
    const index = cardOf(h, h.state.activeTeam);
    h.input(operatives(h)[0]!, { type: "vote", index });
    expect(h.state.flipped[index]).toBe(true);
    expect(h.state.votes).toEqual([]);
  });

  it("needs half the connected operatives (rounded up) to agree", () => {
    const h = setup(8); // teams of four: three operatives each
    clue(h);
    const [a, b, c] = operatives(h);
    const team = h.state.activeTeam;
    const first = cardOf(h, team);
    const second = cardOf(h, team, 1);
    h.input(a!, { type: "vote", index: first });
    h.input(b!, { type: "vote", index: second });
    expect(h.state.flipped[first]).toBe(false);
    expect((h.tv() as SpyTv).votes).toHaveLength(2);
    expect((h.view(a!) as SpyPlayer).votesNeeded).toBe(2);
    expect((h.view(a!) as SpyPlayer).myVote).toBe(first);
    h.input(c!, { type: "vote", index: first });
    expect(h.state.flipped[first]).toBe(true);
    expect(h.state.votes).toEqual([]);
    // A dropped phone stops counting: with two left, one vote is enough.
    setConnected(h, c!, false);
    h.input(a!, { type: "vote", index: second });
    expect(h.state.flipped[second]).toBe(true);
  });

  it("lets operatives change or take back a vote, and nobody else vote", () => {
    const h = setup(8);
    clue(h);
    const [a, b] = operatives(h);
    const team = h.state.activeTeam;
    const x = cardOf(h, team);
    const y = cardOf(h, team, 1);
    h.input(a!, { type: "vote", index: x });
    h.input(a!, { type: "vote", index: y });
    expect(h.state.votes).toEqual([{ playerId: a, index: y }]);
    h.input(a!, { type: "unvote" });
    expect(h.state.votes).toEqual([]);
    h.input(spymaster(h), { type: "vote", index: x });
    h.input(operatives(h, other(team))[0]!, { type: "vote", index: x });
    h.input(b!, { type: "vote", index: 99 });
    h.input(b!, { type: "vote", index: "nope" });
    expect(h.state.votes).toEqual([]);
  });

  it("keeps guessing on your own agents, up to the number + 1", () => {
    const h = setup(4);
    const team = h.state.activeTeam;
    clue(h, 1);
    expect(h.state.guessesLeft).toBe(2);
    voteAll(h, cardOf(h, team));
    expect(h.state.phase).toBe("guess");
    expect(h.state.guessesLeft).toBe(1);
    voteAll(h, cardOf(h, team));
    expect(h.state.phase).toBe("clue");
    expect(h.state.activeTeam).toBe(other(team));
    expect(h.state.turnEnd).toEqual({ team, reason: "outOfGuesses" });
  });

  it("tops the clock up after a correct guess", () => {
    const h = setup(4);
    clue(h, 3);
    h.advance(115_000);
    voteAll(h, cardOf(h, h.state.activeTeam));
    expect(h.deadline! - h.ctx.now()).toBe(20_000);
  });

  it("ends the turn on a bystander or the other team's agent, and pays agents to their own team", () => {
    const h = setup(4);
    const team = h.state.activeTeam;
    const rival = other(team);
    clue(h);
    voteAll(h, cardOf(h, "bystander"));
    expect(h.state.activeTeam).toBe(rival);
    expect(h.state.turnEnd?.reason).toBe("bystander");
    // The rival team flips one of the first team's agents by mistake.
    clue(h);
    voteAll(h, cardOf(h, team));
    expect(h.state.activeTeam).toBe(team);
    expect(h.state.turnEnd?.reason).toBe("opponent");
    for (const id of h.state.members[team]) expect(h.state.scores[id]).toBe(SPY_AGENT_POINTS);
    for (const id of h.state.members[rival]) expect(h.state.scores[id]).toBe(0);
  });

  it("lets the team vote to end its turn", () => {
    const h = setup(4);
    const team = h.state.activeTeam;
    clue(h);
    voteAll(h, SPY_END_TURN);
    expect(h.state.activeTeam).toBe(other(team));
    expect(h.state.turnEnd).toEqual({ team, reason: "endTurn" });
  });

  it("loses the board on the assassin", () => {
    const h = setup(6);
    const team = h.state.activeTeam;
    clue(h);
    voteAll(h, cardOf(h, "assassin"));
    expect(h.state.phase).toBe("boardEnd");
    expect(h.state.outcome).toBe("assassin");
    expect(h.state.winner).toBe(other(team));
    for (const id of h.state.members[other(team)]) expect(h.state.scores[id]).toBe(SPY_WIN_POINTS);
    for (const id of h.state.members[team]) expect(h.state.scores[id]).toBe(0);
    expect(h.events.some((e) => e.sfx === "rocket.boom")).toBe(true);
  });

  it("wins the board for the team whose last agent is flipped — whoever flips it", () => {
    const h = setup(4);
    const team = h.state.activeTeam;
    while (h.state.key.filter((k, i) => k === team && !h.state.flipped[i]).length > 1) h.state.flipped[cardOf(h, team)] = true;
    clue(h, 3);
    voteAll(h, cardOf(h, team));
    expect(h.state.phase).toBe("boardEnd");
    expect(h.state.outcome).toBe("agents");
    expect(h.state.winner).toBe(team);
    for (const id of h.state.members[team]) expect(h.state.scores[id]).toBe(SPY_AGENT_POINTS + SPY_WIN_POINTS);

    const g = setup(4);
    const rival = other(g.state.activeTeam);
    while (g.state.key.filter((k, i) => k === rival && !g.state.flipped[i]).length > 1) g.state.flipped[cardOf(g, rival)] = true;
    clue(g);
    voteAll(g, cardOf(g, rival));
    expect(g.state.outcome).toBe("agents");
    expect(g.state.winner).toBe(rival);
  });

  it("passes the turn when the clue clock runs out, and ends it when guessing time is up", () => {
    const h = setup(4);
    const team = h.state.activeTeam;
    expect(h.deadline! - h.ctx.now()).toBe(90_000);
    h.fire();
    expect(h.state.phase).toBe("clue");
    expect(h.state.activeTeam).toBe(other(team));
    expect(h.state.turnEnd).toEqual({ team, reason: "clueTimeout" });
    clue(h);
    h.fire();
    expect(h.state.phase).toBe("clue");
    expect(h.state.activeTeam).toBe(team);
    expect(h.state.turnEnd).toEqual({ team: other(team), reason: "guessTimeout" });
  });

  it("calls off a board nobody gives clues on", () => {
    const h = setup(4);
    for (let i = 0; i < 4; i++) h.fire();
    expect(h.state.phase).toBe("boardEnd");
    expect(h.state.outcome).toBe("stalled");
    expect(h.state.winner).toBeNull();
    expect(Object.values(h.state.scores).every((s) => s === 0)).toBe(true);
  });

  it("hands the key to a teammate when the spymaster's phone drops", () => {
    const h = setup(8);
    const team = h.state.activeTeam;
    const sm = spymaster(h);
    h.advance(60_000);
    setConnected(h, sm, false);
    const holders = h.state.spymasters[team];
    expect(holders).toHaveLength(2);
    const stand = holders[1]!;
    const v = h.view(stand) as SpyPlayer;
    expect(v.isSpymaster).toBe(true);
    expect(v.canClue).toBe(true);
    expect(v.cards.every((c) => c.kind !== null)).toBe(true);
    expect(h.deadline! - h.ctx.now()).toBe(90_000);
    // The old spymaster has seen the key, so they never turn into a guesser.
    setConnected(h, sm, true);
    h.input(stand, { type: "clue", word: SAFE, count: 1 });
    expect(h.state.phase).toBe("guess");
    expect(operatives(h)).not.toContain(sm);
    expect(operatives(h)).toHaveLength(2);
  });

  it("never waits on a team with nobody left to act", () => {
    // Lone operative drops mid-guess.
    const h = setup(4);
    const team = h.state.activeTeam;
    clue(h);
    setConnected(h, operatives(h)[0]!, false);
    expect(h.deadline! - h.ctx.now()).toBeLessThanOrEqual(900);
    h.fire();
    expect(h.state.activeTeam).toBe(other(team));
    // Their next turn passes straight away: nobody could act on a clue.
    clue(h);
    voteAll(h, SPY_END_TURN);
    expect(h.state.activeTeam).toBe(team);
    expect(h.deadline! - h.ctx.now()).toBeLessThanOrEqual(900);

    // Spymaster drops and there's nobody spare to take the key.
    const g = setup(4);
    setConnected(g, spymaster(g), false);
    expect(g.state.spymasters[g.state.activeTeam]).toHaveLength(1);
    expect(g.deadline! - g.ctx.now()).toBeLessThanOrEqual(900);
  });

  it("rotates spymasters, alternates who starts, and plays every board to the podium", () => {
    const h = harness(spygrid, 6, { options: { rounds: 3 } });
    const starters: SpyTeam[] = [];
    const masters: string[][] = [];
    const words: string[] = [];
    let guard = 0;
    while (!h.finished && guard++ < 200) {
      if (h.state.phase === "teams") {
        starters.push(h.state.startingTeam);
        masters.push([spymaster(h, "red"), spymaster(h, "blue")]);
        words.push(...h.state.words);
      }
      if (h.state.phase === "clue") {
        // Quickest way through a board: flip the assassin.
        clue(h);
        voteAll(h, cardOf(h, "assassin"));
        continue;
      }
      h.fire();
    }
    expect(h.finished).toBe(true);
    expect(h.state.phase).toBe("podium");
    expect(h.deadline).toBeNull();
    expect(starters).toEqual([starters[0], other(starters[0]!), starters[0]]);
    // Teams of three: a different spymaster on each team every board.
    for (const t of [0, 1]) expect(new Set(masters.map((m) => m[t])).size).toBe(3);
    // No word comes back within the night.
    expect(new Set(words).size).toBe(75);
    // Every board, the team that didn't flip the assassin won.
    expect(Object.values(h.state.scores).reduce((a, b) => a + b, 0)).toBe(3 * 3 * SPY_WIN_POINTS);
    expect(h.events.some((e) => e.kind === "podium" && e.sfx === "win.big")).toBe(true);
  });

  it("has an original bank of 300+ short single words", () => {
    const keys = WORDS.map(textKey);
    expect(WORDS.length).toBeGreaterThanOrEqual(300);
    expect(new Set(keys).size).toBe(WORDS.length);
    for (const w of WORDS) {
      expect(w).toMatch(/^[A-Z][a-z]+$/);
      expect(w.length).toBeLessThanOrEqual(9);
    }
    // Team names would make confusing cards.
    expect(keys).not.toContain("red");
    expect(keys).not.toContain("blue");
  });
});
