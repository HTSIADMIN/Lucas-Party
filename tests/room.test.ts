// The TV-side RoomHost with fake channels and fake timers: phones join with
// tickets, say hello, play a whole game, get kicked, and survive a TV refresh.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PunchlinePlayer, RoomView, SeatMessage, SeatTicket, ServerMessage } from "@party/shared";
import { RoomHost, type FinishedGame, type RoomSnapshot } from "../src/shared/engine/room";

interface Rig {
  host: RoomHost;
  inbox: Map<string, ServerMessage[]>;
  tv: () => RoomView | null;
  finished: FinishedGame[];
  snapshots: RoomSnapshot[];
}

function rig(snapshot: RoomSnapshot | null = null): Rig {
  const inbox = new Map<string, ServerMessage[]>();
  let tvView: RoomView | null = null;
  const finished: FinishedGame[] = [];
  const snapshots: RoomSnapshot[] = [];
  const host = new RoomHost(
    "TEST",
    {
      link: (secret) => {
        if (!inbox.has(secret)) inbox.set(secret, []);
        return { send: (m) => inbox.get(secret)!.push(m) };
      },
      unlink: () => undefined,
      onTvView: (v) => {
        tvView = v;
      },
      onTvEvent: () => undefined,
      onSnapshot: (s) => snapshots.push(s),
      onGameFinished: (r) => finished.push(r),
    },
    { owner: null, snapshot },
  );
  host.start();
  return { host, inbox, tv: () => tvView, finished, snapshots };
}

let n = 0;
function ticket(name: string, opts: Partial<SeatTicket> = {}): SeatTicket {
  n++;
  return { seatId: `p${n}`, secret: `secret-${n}`, userId: null, name, character: null, owner: false, issuedAt: Date.now(), ...opts };
}

function last(r: Rig, secret: string, t: ServerMessage["t"]) {
  return [...(r.inbox.get(secret) ?? [])].reverse().find((m) => m.t === t);
}

function viewOf(r: Rig, secret: string) {
  const m = last(r, secret, "room") as Extract<ServerMessage, { t: "room" }> | undefined;
  return m?.room;
}

function say(r: Rig, secret: string, msg: SeatMessage) {
  r.host.handleSeatMessage(secret, msg);
}

const tick = (ms = 60) => vi.advanceTimersByTime(ms);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("RoomHost", () => {
  it("admits phones, welcomes them, and makes the owner the host", () => {
    const r = rig();
    const lucas = ticket("Lucas", { userId: "u-lucas", owner: true });
    const bob = ticket("Bob");
    r.host.admit(lucas);
    r.host.admit(bob);
    say(r, lucas.secret, { t: "hello" });
    say(r, bob.secret, { t: "hello" });
    tick();
    expect(last(r, bob.secret, "welcome")).toMatchObject({ playerId: bob.seatId });
    const tv = r.tv()!;
    expect(tv.status).toBe("lobby");
    expect(tv.hostName).toBe("Lucas");
    expect(tv.players.find((p) => p.id === lucas.seatId)?.isHost).toBe(true);
    expect(viewOf(r, bob.secret)?.players).toHaveLength(2);
  });

  it("ignores host actions from non-hosts", () => {
    const r = rig();
    const lucas = ticket("Lucas", { userId: "u1", owner: true });
    const bob = ticket("Bob");
    for (const t of [lucas, bob]) {
      r.host.admit(t);
      say(r, t.secret, { t: "hello" });
    }
    say(r, bob.secret, { t: "host", action: { type: "lock", locked: true } });
    tick();
    expect(last(r, bob.secret, "error")).toMatchObject({ code: "not_host" });
    expect(r.tv()!.locked).toBe(false);
  });

  it("caps the room at 8 and rejects the 9th phone", () => {
    const r = rig();
    const tickets = Array.from({ length: 9 }, (_, i) => ticket(`P${i}`));
    for (const t of tickets) {
      r.host.admit(t);
      say(r, t.secret, { t: "hello" });
    }
    tick();
    expect(r.tv()!.players).toHaveLength(8);
    expect(last(r, tickets[8]!.secret, "error")).toMatchObject({ code: "room_full", fatal: true });
  });

  it("marks silent phones as disconnected and lets a guest reclaim their seat by name", () => {
    const r = rig();
    const bob = ticket("Bob");
    r.host.admit(bob);
    say(r, bob.secret, { t: "hello" });
    tick();
    expect(r.tv()!.players[0]!.connected).toBe(true);
    tick(15_000);
    expect(r.tv()!.players[0]!.connected).toBe(false);
    const again = ticket("bob");
    r.host.admit(again);
    say(r, again.secret, { t: "hello" });
    tick();
    expect(r.tv()!.players).toHaveLength(1);
    expect(last(r, again.secret, "welcome")).toMatchObject({ playerId: bob.seatId });
  });

  it("kicks a player and keeps them out", () => {
    const r = rig();
    const lucas = ticket("Lucas", { userId: "u1", owner: true });
    const bob = ticket("Bob", { userId: "u-bob" });
    for (const t of [lucas, bob]) {
      r.host.admit(t);
      say(r, t.secret, { t: "hello" });
    }
    say(r, lucas.secret, { t: "host", action: { type: "kick", playerId: bob.seatId } });
    tick();
    expect(last(r, bob.secret, "closed")).toBeTruthy();
    const back = ticket("Bob", { userId: "u-bob" });
    r.host.admit(back);
    expect(last(r, back.secret, "error")).toMatchObject({ code: "not_allowed" });
    expect(r.tv()!.players).toHaveLength(1);
  });

  it("plays a full game of Punchline Panic with three phones", () => {
    const r = rig();
    const players = [ticket("Lucas", { userId: "u1", owner: true }), ticket("Bob"), ticket("Cara")];
    for (const t of players) {
      r.host.admit(t);
      say(r, t.secret, { t: "hello" });
    }
    const [lucas] = players;
    say(r, lucas!.secret, { t: "host", action: { type: "selectGame", gameId: "punchline" } });
    say(r, lucas!.secret, { t: "host", action: { type: "start" } });
    tick();
    expect(r.tv()!.status).toBe("playing");

    const sent = new Set<string>();
    for (let step = 0; step < 400 && !r.tv()!.game?.over; step++) {
      for (const t of players) {
        const view = viewOf(r, t.secret)?.game?.view as PunchlinePlayer | null | undefined;
        if (!view) continue;
        const once = (key: string, data: unknown) => {
          if (sent.has(`${t.secret}:${key}`)) return;
          sent.add(`${t.secret}:${key}`);
          say(r, t.secret, { t: "input", data });
        };
        if (view.phase === "write") for (const p of view.prompts) if (!p.answer) once(`a${p.id}`, { type: "answer", promptId: p.id, text: `${t.name} on ${p.id}` });
        if (view.phase === "vote" && view.role === "voter" && !view.myVote) once(`v${view.matchupId}`, { type: "vote", matchupId: view.matchupId, choice: "A" });
        if (view.phase === "finalWrite" && !view.answer) once("fa", { type: "finalAnswer", text: `final ${t.name}` });
        if (view.phase === "finalVote" && !view.myVote) {
          const pick = view.entries.find((e) => !e.mine);
          if (pick) once("fv", { type: "finalVote", key: pick.key });
        }
      }
      // Phones keep pinging so nobody times out while the clock runs.
      for (const t of players) say(r, t.secret, { t: "ping", at: Date.now(), v: 0 });
      tick(1000);
    }
    expect(r.tv()!.game?.over).toBe(true);
    expect(r.finished).toHaveLength(1);
    expect(r.finished[0]!.players.reduce((sum, p) => sum + p.score, 0)).toBeGreaterThan(0);
  });

  it("resumes mid-game from a snapshot after a TV refresh", () => {
    const r = rig();
    const players = [ticket("Lucas", { userId: "u1", owner: true }), ticket("Bob"), ticket("Cara")];
    for (const t of players) {
      r.host.admit(t);
      say(r, t.secret, { t: "hello" });
    }
    say(r, players[0]!.secret, { t: "host", action: { type: "selectGame", gameId: "oddoneout" } });
    say(r, players[0]!.secret, { t: "host", action: { type: "start" } });
    tick(1000);
    const snap = r.snapshots.at(-1)!;
    r.host.dispose();

    // JSON round-trip, as sessionStorage would do.
    const restored = rig(JSON.parse(JSON.stringify(snap)) as RoomSnapshot);
    for (const t of players) say(restored, t.secret, { t: "hello" });
    tick();
    const tv = restored.tv()!;
    expect(tv.status).toBe("playing");
    expect(tv.game?.id).toBe("oddoneout");
    expect(tv.players.every((p) => p.connected)).toBe(true);
    // The intro deadline carries over and the game moves on by itself.
    tick(10_000);
    expect((restored.tv()!.game?.view as { phase: string }).phase).not.toBe("intro");
  });
});
