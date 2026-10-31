// The HTTP API against an in-memory SQLite store and a capturing broadcaster.
import { beforeEach, describe, expect, it } from "vitest";
import { TOPIC, type ScreenMessage } from "@party/shared";
import { createApp } from "../src/server/app";
import { MemoryBroadcaster } from "../src/server/broadcast";
import { loadConfig } from "../src/server/config";
import { SqliteStore } from "../src/server/db/sqlite";

let app: ReturnType<typeof createApp>;
let broadcast: MemoryBroadcaster;

beforeEach(() => {
  broadcast = new MemoryBroadcaster();
  app = createApp({
    config: loadConfig({ bootstrapAdmin: "boss", supabaseServiceKey: null, secureCookies: false, trustProxy: false }),
    store: new SqliteStore(":memory:"),
    broadcast,
  });
});

async function call(path: string, opts: { method?: string; body?: unknown; cookie?: string } = {}) {
  const method = opts.method ?? (opts.body === undefined ? "GET" : "POST");
  const res = await app.request(`/api${path}`, {
    method,
    headers: { "content-type": "application/json", ...(opts.cookie ? { cookie: opts.cookie } : {}) },
    body: method === "GET" || method === "DELETE" ? undefined : JSON.stringify(opts.body ?? {}),
  });
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  return { status: res.status, data: (await res.json().catch(() => ({}))) as Record<string, any>, cookie };
}

async function signup(username: string) {
  const res = await call("/auth/signup", { body: { username, password: "correct-horse-battery" } });
  expect(res.status).toBe(201);
  return res;
}

describe("accounts", () => {
  it("makes BOOTSTRAP_ADMIN an admin and everyone else a player", async () => {
    expect((await signup("boss")).data.user.role).toBe("admin");
    const alice = await signup("alice");
    expect(alice.data.user.role).toBe("player");
    expect((await call("/auth/me", { cookie: alice.cookie })).data.user.username).toBe("alice");
  });

  it("rejects wrong passwords, duplicates and short passwords", async () => {
    await signup("alice");
    expect((await call("/auth/login", { body: { username: "alice", password: "nope-nope-nope" } })).status).toBe(401);
    expect((await call("/auth/signup", { body: { username: "ALICE", password: "another-password" } })).status).toBe(409);
    expect((await call("/auth/signup", { body: { username: "shorty", password: "short" } })).status).toBe(400);
  });

  it("keeps the admin API to admins and protects the last admin", async () => {
    const boss = await signup("boss");
    const alice = await signup("alice");
    expect((await call("/admin/users", { cookie: alice.cookie })).status).toBe(403);
    expect((await call("/admin/users")).status).toBe(401);
    const users = (await call("/admin/users", { cookie: boss.cookie })).data.users as { id: string; username: string }[];
    const bossId = users.find((u) => u.username === "boss")!.id;
    expect((await call(`/admin/users/${bossId}`, { method: "PATCH", body: { role: "player" }, cookie: boss.cookie })).status).toBe(400);
  });

  it("blocks cross-site writes", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://evil.example", host: "party.example" },
      body: "{}",
    });
    expect(res.status).toBe(403);
  });
});

describe("rooms", () => {
  it("gives hosts active rooms and everyone else pending ones", async () => {
    const boss = await signup("boss");
    const alice = await signup("alice");
    expect((await call("/rooms", { body: {}, cookie: alice.cookie })).data.status).toBe("pending");
    const users = (await call("/admin/users", { cookie: boss.cookie })).data.users as { id: string; username: string }[];
    await call(`/admin/users/${users.find((u) => u.username === "alice")!.id}`, { method: "PATCH", body: { role: "host" }, cookie: boss.cookie });
    const room = await call("/rooms", { body: {}, cookie: alice.cookie });
    expect(room.data.status).toBe("active");
    expect(room.data.screenSecret).toBeTruthy();
    expect(room.data.owner.name).toBe("alice");
  });

  it("hands the TV a seat ticket when a phone joins, and marks the owner", async () => {
    const boss = await signup("boss");
    const room = (await call("/rooms", { body: {}, cookie: boss.cookie })).data;
    const guest = await call(`/rooms/${room.code}/join`, { body: { name: "Bob", character: "splash" } });
    expect(guest.status).toBe(200);
    const sent = broadcast.sent.at(-1)!;
    expect(sent.topic).toBe(TOPIC.screen(room.code, room.screenKey));
    const ticket = (sent.payload as Extract<ScreenMessage, { t: "seat" }>).ticket;
    expect(ticket).toMatchObject({ name: "Bob", character: "splash", owner: false, secret: guest.data.secret });

    await call(`/rooms/${room.code}/join`, { body: {}, cookie: boss.cookie });
    expect((broadcast.sent.at(-1)!.payload as Extract<ScreenMessage, { t: "seat" }>).ticket.owner).toBe(true);
  });

  it("lets a host take over a TV that was waiting for one", async () => {
    await signup("boss");
    const pending = (await call("/rooms", { body: {} })).data;
    expect(pending.status).toBe("pending");
    const boss = await call("/auth/login", { body: { username: "boss", password: "correct-horse-battery" } });
    await call(`/rooms/${pending.code}/join`, { body: {}, cookie: boss.cookie });
    expect((broadcast.sent.at(-1)!.payload as Extract<ScreenMessage, { t: "seat" }>).ticket.owner).toBe(true);
    expect((await call(`/rooms/${pending.code}`)).data.hostName).toBe("boss");
  });

  it("only the screen can heartbeat, and closing tells everyone", async () => {
    const boss = await signup("boss");
    const room = (await call("/rooms", { body: {}, cookie: boss.cookie })).data;
    expect((await call(`/rooms/${room.code}/heartbeat`, { body: { screenSecret: "wrong", summary: {} } })).status).toBe(403);
    const ok = await call(`/rooms/${room.code}/heartbeat`, {
      body: { screenSecret: room.screenSecret, summary: { status: "lobby", players: 3, connected: 3, characters: ["blip", "wisp"], gameId: null, locked: false } },
    });
    expect(ok.data).toMatchObject({ ok: true, closed: null });
    expect((await call(`/rooms/${room.code}`)).data).toMatchObject({ players: 3, takenCharacters: ["blip", "wisp"] });

    await call(`/rooms/${room.code}`, { method: "DELETE", cookie: boss.cookie });
    expect(broadcast.sent.some((m) => m.topic === TOPIC.room(room.code))).toBe(true);
    expect((await call(`/rooms/${room.code}`)).status).toBe(404);
    expect((await call(`/rooms/${room.code}/heartbeat`, { body: { screenSecret: room.screenSecret, summary: {} } })).data.closed).toBeTruthy();
  });

  it("refuses to seat guests when the admin turns guests off", async () => {
    const boss = await signup("boss");
    const room = (await call("/rooms", { body: {}, cookie: boss.cookie })).data;
    await call("/admin/settings", { method: "PATCH", body: { guestsAllowed: false }, cookie: boss.cookie });
    const guest = await call(`/rooms/${room.code}/join`, { body: { name: "Bob" } });
    expect(guest.status).toBe(403);
    expect(guest.data.code).toBe("guests_disabled");
  });
});
