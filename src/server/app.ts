// HTTP API (mounted at /api by the Next.js route handler): accounts, the admin
// console, and the room registry. JSON in, JSON out, `{ error }` with a real
// status on failure. Runs as a Vercel function — no in-memory state matters
// beyond best-effort rate limits.

import os from "node:os";
import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { secureHeaders } from "hono/secure-headers";
import {
  NAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  ROOM_STALE_MS,
  TOPIC,
  USERNAME_RE,
  canHost,
  cleanText,
  isCharacterId,
  isRole,
  normalizeRoomCode,
  type MeResponse,
  type RoomInfoResponse,
} from "@party/shared";
import { burnPasswordCheck, hashPassword, verifyPassword } from "./auth/password";
import { SESSION_COOKIE, hashToken, newSessionToken } from "./auth/session";
import { IS_PROD, type Config } from "./config";
import type { Store, User } from "./db/types";
import { RateLimiter } from "./lib/rateLimit";
import { RoomService, isLive } from "./rooms";
import type { Broadcaster } from "./broadcast";

type Env = { Variables: { user: User | null; sessionHash: string | null; ip: string } };
type C = Context<Env>;

export interface AppDeps {
  config: Config;
  store: Store;
  broadcast: Broadcaster;
}

function publicUser(user: User): NonNullable<MeResponse["user"]> {
  return { id: user.id, username: user.username, displayName: user.displayName, role: user.role, character: user.character };
}

function adminUser(user: User) {
  return { ...publicUser(user), disabled: user.disabled, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt };
}

async function body(c: C): Promise<Record<string, unknown>> {
  try {
    const data = await c.req.json();
    return typeof data === "object" && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

const VIRTUAL_ADAPTER = /vethernet|vpn|virtualbox|vmware|wsl|hyper-v|docker|tailscale|zerotier|hamachi|radmin|loopback/i;

/** LAN IPv4 addresses, most likely "the Wi-Fi your phone is on" first. Dev only. */
function lanAddresses(): string[] {
  const found: { address: string; score: number }[] = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const addr of list ?? []) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      let score = VIRTUAL_ADAPTER.test(name) ? 0 : 10;
      if (addr.address.startsWith("192.168.")) score += 3;
      else if (addr.address.startsWith("10.")) score += 2;
      else if (/^172\.(1[6-9]|2\d|3[01])\./.test(addr.address)) score += 1;
      found.push({ address: addr.address, score });
    }
  }
  return found.sort((a, b) => b.score - a.score).map((f) => f.address);
}

export function createApp(deps: AppDeps) {
  const { config, store } = deps;
  const limiter = new RateLimiter();
  const rooms = new RoomService(deps);
  const app = new Hono<Env>().basePath("/api");

  app.use("*", secureHeaders({ crossOriginEmbedderPolicy: false }));

  app.onError((error, c) => {
    console.error("[api]", error);
    return c.json({ error: "Something went wrong on our side. Try again in a moment." }, 500);
  });

  // Who's asking: client IP + session user.
  app.use("*", async (c, next) => {
    const forwarded = config.trustProxy ? (c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip")) : undefined;
    c.set("ip", forwarded || "local");
    const token = getCookie(c, SESSION_COOKIE);
    const hash = token ? hashToken(token) : null;
    c.set("sessionHash", hash);
    c.set("user", hash ? await store.getSessionUser(hash, config.sessionTtlMs) : null);
    await next();
  });

  // Writes must be same-origin JSON, which blocks cross-site form posts riding the cookie.
  app.use("*", async (c, next) => {
    if (c.req.method === "GET" || c.req.method === "HEAD") return next();
    const origin = c.req.header("origin");
    if (origin) {
      let ok = false;
      try {
        const url = new URL(origin);
        const host = c.req.header("x-forwarded-host") ?? c.req.header("host");
        ok = url.host === host || config.allowedOrigins.includes(url.origin);
      } catch {
        ok = false;
      }
      if (!ok) return c.json({ error: "Cross-site request blocked." }, 403);
    }
    if (c.req.method !== "DELETE" && !(c.req.header("content-type") ?? "").includes("application/json")) {
      return c.json({ error: "Expected a JSON body." }, 415);
    }
    await next();
  });

  async function startSession(c: C, user: User) {
    const { token, hash } = newSessionToken();
    await store.createSession(hash, user.id, config.sessionTtlMs, c.req.header("user-agent") ?? null);
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: config.secureCookies,
      path: "/",
      maxAge: Math.floor(config.sessionTtlMs / 1000),
    });
  }

  // ── Meta ───────────────────────────────────────────────────────────────

  app.get("/health", (c) => c.json({ ok: true, store: config.supabaseServiceKey ? "supabase" : "sqlite" }));

  app.get("/meta", (c) =>
    c.json({
      publicUrl: config.publicUrl,
      // Dev convenience: lets the TV show a join URL phones on the same Wi-Fi can reach.
      lanAddresses: IS_PROD ? [] : lanAddresses(),
    }),
  );

  // ── Auth ───────────────────────────────────────────────────────────────

  app.get("/auth/me", (c) => {
    const user = c.get("user");
    return c.json({ user: user ? publicUser(user) : null } satisfies MeResponse);
  });

  app.post("/auth/signup", async (c) => {
    if (!limiter.hit(`signup:${c.get("ip")}`, 6, 60 * 60_000)) {
      return c.json({ error: "Too many sign-ups from this network. Try again later." }, 429);
    }
    const b = await body(c);
    const username = str(b.username).trim();
    const password = str(b.password);
    if (!USERNAME_RE.test(username)) return c.json({ error: "Usernames are 3–20 letters, numbers or underscores." }, 400);
    if (password.length < PASSWORD_MIN) return c.json({ error: `Passwords need at least ${PASSWORD_MIN} characters.` }, 400);
    if (password.length > PASSWORD_MAX) return c.json({ error: "That password is a little too long." }, 400);
    const isBootstrap = config.bootstrapAdmin === username.toLowerCase();
    if (!(await store.getSettings()).signupsOpen && !isBootstrap) return c.json({ error: "Sign-ups are closed right now." }, 403);
    if (await store.getUserByUsername(username)) return c.json({ error: "That username is taken." }, 409);

    const displayName = cleanText(b.displayName, NAME_MAX) || username.slice(0, NAME_MAX);
    let user: User;
    try {
      user = await store.createUser({
        username,
        displayName,
        passwordHash: await hashPassword(password),
        role: isBootstrap ? "admin" : "player",
        character: isCharacterId(b.character) ? b.character : "blip",
      });
    } catch {
      return c.json({ error: "That username is taken." }, 409);
    }
    await startSession(c, user);
    return c.json({ user: publicUser(user) }, 201);
  });

  app.post("/auth/login", async (c) => {
    const b = await body(c);
    const username = str(b.username).trim();
    const password = str(b.password);
    const userKey = `login:user:${username.toLowerCase()}`;
    if (!limiter.hit(`login:ip:${c.get("ip")}`, 30, 10 * 60_000) || !limiter.hit(userKey, 10, 10 * 60_000)) {
      return c.json({ error: "Too many attempts. Wait a few minutes and try again." }, 429);
    }
    const auth = username ? await store.getAuthByUsername(username) : null;
    if (!auth) {
      await burnPasswordCheck(password);
      return c.json({ error: "Wrong username or password." }, 401);
    }
    if (!(await verifyPassword(password, auth.passwordHash))) return c.json({ error: "Wrong username or password." }, 401);
    if (auth.user.disabled) return c.json({ error: "This account has been disabled." }, 403);
    limiter.reset(userKey);
    // BOOTSTRAP_ADMIN also promotes an existing account on its next login.
    let user = auth.user;
    if (config.bootstrapAdmin === user.username.toLowerCase() && user.role !== "admin") user = (await store.updateUser(user.id, { role: "admin" }))!;
    await store.touchLogin(user.id);
    await startSession(c, user);
    return c.json({ user: publicUser(user) });
  });

  app.post("/auth/logout", async (c) => {
    const hash = c.get("sessionHash");
    if (hash) await store.deleteSession(hash);
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  app.patch("/auth/me", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Log in first." }, 401);
    const b = await body(c);
    const patch: { displayName?: string; character?: User["character"] } = {};
    if (b.displayName !== undefined) {
      const name = cleanText(b.displayName, NAME_MAX);
      if (!name) return c.json({ error: "Display names can't be empty." }, 400);
      patch.displayName = name;
    }
    if (b.character !== undefined) {
      if (!isCharacterId(b.character)) return c.json({ error: "Unknown character." }, 400);
      patch.character = b.character;
    }
    const updated = (await store.updateUser(user.id, patch))!;
    return c.json({ user: publicUser(updated) });
  });

  app.post("/auth/password", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Log in first." }, 401);
    if (!limiter.hit(`pw:${user.id}`, 10, 10 * 60_000)) return c.json({ error: "Too many attempts. Try again later." }, 429);
    const b = await body(c);
    const current = str(b.currentPassword);
    const next = str(b.newPassword);
    const hash = await store.getPasswordHash(user.id);
    if (!hash || !(await verifyPassword(current, hash))) return c.json({ error: "Your current password is wrong." }, 400);
    if (next.length < PASSWORD_MIN || next.length > PASSWORD_MAX) return c.json({ error: `Passwords need at least ${PASSWORD_MIN} characters.` }, 400);
    await store.updateUser(user.id, { passwordHash: await hashPassword(next) });
    // Sign out every other device.
    await store.deleteUserSessions(user.id, c.get("sessionHash") ?? undefined);
    return c.json({ ok: true });
  });

  // ── Rooms ──────────────────────────────────────────────────────────────

  app.post("/rooms", async (c) => {
    if (!limiter.hit(`room:${c.get("ip")}`, 20, 10 * 60_000)) return c.json({ error: "Slow down — too many new rooms." }, 429);
    const result = await rooms.create(c.get("user"), c.get("ip"));
    if (!result.ok) return c.json({ error: result.error, codes: result.codes ?? [] }, result.status);
    const { room, screenSecret } = result;
    return c.json(
      {
        code: room.code,
        status: room.status,
        screenSecret,
        screenKey: room.screenKey,
        owner: room.ownerUserId ? { userId: room.ownerUserId, name: room.ownerName ?? "Host" } : null,
      },
      201,
    );
  });

  app.get("/rooms/mine", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ rooms: [] });
    const live = await store.listLiveRooms(Date.now() - ROOM_STALE_MS);
    return c.json({
      rooms: live
        .filter((r) => r.ownerUserId === user.id)
        .map((r) => ({ code: r.code, status: r.phase, players: r.players, connected: r.connected, screens: 1, gameId: r.gameId })),
    });
  });

  app.get("/rooms/:code", async (c) => {
    const room = await store.getRoom(normalizeRoomCode(c.req.param("code")));
    if (!room || !isLive(room)) return c.json({ error: "That room doesn't exist (or it already closed)." }, 404);
    const info: RoomInfoResponse = {
      code: room.code,
      status: room.phase,
      hostName: room.ownerName,
      players: room.players,
      maxPlayers: 8,
      locked: room.locked,
      takenCharacters: room.characters,
      guestsAllowed: (await store.getSettings()).guestsAllowed,
    };
    return c.json(info);
  });

  app.post("/rooms/:code/join", async (c) => {
    if (!limiter.hit(`join:${c.get("ip")}`, 40, 60_000)) return c.json({ error: "Slow down a little." }, 429);
    const b = await body(c);
    const result = await rooms.join(normalizeRoomCode(c.req.param("code")), c.get("user"), { name: b.name, character: b.character });
    if (!result.ok) return c.json({ error: result.error, code: result.code }, result.status);
    return c.json({ seatId: result.ticket.seatId, secret: result.ticket.secret, topic: TOPIC.seat(normalizeRoomCode(c.req.param("code")), result.ticket.secret) });
  });

  app.post("/rooms/:code/heartbeat", async (c) => {
    const b = await body(c);
    const result = await rooms.heartbeat(normalizeRoomCode(c.req.param("code")), b.screenSecret, (b.summary ?? {}) as Record<string, never>);
    if (!result.ok) return c.json({ error: result.error }, result.status);
    return c.json({ ok: true, closed: result.closed });
  });

  app.post("/rooms/:code/results", async (c) => {
    const b = await body(c);
    const room = await store.getRoom(normalizeRoomCode(c.req.param("code")));
    if (!room || !rooms.verifyScreen(room, b.screenSecret)) return c.json({ error: "Not this room's screen." }, 403);
    const players = Array.isArray(b.players) ? b.players.slice(0, 8) : [];
    await store.recordGameResult({
      roomCode: room.code,
      gameId: str(b.gameId).slice(0, 40),
      hostUserId: room.ownerUserId,
      startedAt: Number(b.startedAt) || Date.now(),
      endedAt: Date.now(),
      players: players.map((p: Record<string, unknown>) => ({
        name: cleanText(p.name, NAME_MAX) || "Someone",
        character: isCharacterId(p.character) ? p.character : "blip",
        userId: typeof p.userId === "string" ? p.userId : null,
        score: Number(p.score) || 0,
      })),
    });
    return c.json({ ok: true });
  });

  /** The hosting TV closing its own room. */
  app.post("/rooms/:code/close", async (c) => {
    const b = await body(c);
    const room = await store.getRoom(normalizeRoomCode(c.req.param("code")));
    if (!room || !rooms.verifyScreen(room, b.screenSecret)) return c.json({ error: "Not this room's screen." }, 403);
    await rooms.close(room, str(b.reason).slice(0, 120) || "The host closed the room.");
    return c.json({ ok: true });
  });

  /** The owner (from any device) or an admin closing a room. */
  app.delete("/rooms/:code", async (c) => {
    const user = c.get("user");
    const room = await store.getRoom(normalizeRoomCode(c.req.param("code")));
    if (!room || room.status === "closed") return c.json({ error: "Room not found." }, 404);
    if (!user || (user.role !== "admin" && room.ownerUserId !== user.id)) return c.json({ error: "Only the host can close this room." }, 403);
    await rooms.close(room, user.role === "admin" && room.ownerUserId !== user.id ? "An admin closed this room." : "The host closed the room.");
    return c.json({ ok: true });
  });

  // ── Admin ──────────────────────────────────────────────────────────────

  app.use("/admin/*", async (c, next) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Log in first." }, 401);
    if (user.role !== "admin") return c.json({ error: "Admins only." }, 403);
    await next();
  });

  app.get("/admin/stats", async (c) => {
    const now = Date.now();
    const [users, live, gamesToday, recentGames] = await Promise.all([
      store.countByRole(),
      store.listLiveRooms(now - ROOM_STALE_MS),
      store.countGamesSince(now - 24 * 60 * 60_000),
      store.recentGameResults(12),
    ]);
    return c.json({
      users,
      rooms: { active: live.filter((r) => r.status === "active").length, pending: live.filter((r) => r.status === "pending").length },
      connections: live.reduce((sum, r) => sum + r.connected, 0),
      gamesToday,
      limits: { maxActiveRooms: config.maxActiveRooms, maxRoomsPerHost: config.maxRoomsPerHost },
      recentGames,
    });
  });

  app.get("/admin/users", async (c) => c.json({ users: (await store.listUsers(c.req.query("q") ?? "")).map(adminUser) }));

  app.patch("/admin/users/:id", async (c) => {
    const me = c.get("user")!;
    const target = await store.getUserById(c.req.param("id"));
    if (!target) return c.json({ error: "User not found." }, 404);
    const b = await body(c);
    if (b.role !== undefined && !isRole(b.role)) return c.json({ error: "Unknown role." }, 400);
    if (b.disabled !== undefined && typeof b.disabled !== "boolean") return c.json({ error: "disabled must be true or false." }, 400);
    const role = b.role as User["role"] | undefined;
    const disabled = b.disabled as boolean | undefined;
    if (target.id === me.id && (disabled === true || (role && role !== "admin"))) {
      return c.json({ error: "You can't demote or disable your own account." }, 400);
    }
    const losingAdmin = target.role === "admin" && ((role && role !== "admin") || disabled === true);
    if (losingAdmin && (await store.countByRole()).admin <= 1) return c.json({ error: "You can't remove the last admin." }, 400);

    const updated = (await store.updateUser(target.id, { role, disabled }))!;
    if (disabled === true) {
      await store.deleteUserSessions(target.id);
      await rooms.closeOwnedBy(target.id, "The host's account was disabled.");
    } else if (role && !canHost(role) && canHost(target.role)) {
      // Demoted hosts keep running games until they end; new rooms are blocked.
    }
    return c.json({ user: adminUser(updated) });
  });

  app.post("/admin/users/:id/password", async (c) => {
    const target = await store.getUserById(c.req.param("id"));
    if (!target) return c.json({ error: "User not found." }, 404);
    const password = str((await body(c)).password);
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      return c.json({ error: `Passwords need at least ${PASSWORD_MIN} characters.` }, 400);
    }
    await store.updateUser(target.id, { passwordHash: await hashPassword(password) });
    await store.deleteUserSessions(target.id);
    return c.json({ ok: true });
  });

  app.delete("/admin/users/:id", async (c) => {
    const me = c.get("user")!;
    const target = await store.getUserById(c.req.param("id"));
    if (!target) return c.json({ error: "User not found." }, 404);
    if (target.id === me.id) return c.json({ error: "You can't delete your own account here." }, 400);
    if (target.role === "admin" && (await store.countByRole()).admin <= 1) return c.json({ error: "You can't delete the last admin." }, 400);
    await rooms.closeOwnedBy(target.id, "The host's account was removed.");
    await store.deleteUser(target.id);
    return c.json({ ok: true });
  });

  app.get("/admin/rooms", async (c) => {
    const live = await store.listLiveRooms(Date.now() - ROOM_STALE_MS);
    return c.json({
      rooms: live.map((r) => ({
        code: r.code,
        status: r.phase,
        hostName: r.ownerName,
        players: r.players,
        connected: r.connected,
        screens: 1,
        gameId: r.gameId,
        createdAt: r.createdAt,
        lastActivityAt: r.lastSeenAt,
      })),
    });
  });

  app.delete("/admin/rooms/:code", async (c) => {
    const room = await store.getRoom(normalizeRoomCode(c.req.param("code")));
    if (!room || room.status === "closed") return c.json({ error: "Room not found." }, 404);
    await rooms.close(room, "An admin closed this room.");
    return c.json({ ok: true });
  });

  app.get("/admin/settings", async (c) => c.json({ settings: await store.getSettings() }));

  app.patch("/admin/settings", async (c) => {
    const b = await body(c);
    const patch: { signupsOpen?: boolean; guestsAllowed?: boolean } = {};
    if (typeof b.signupsOpen === "boolean") patch.signupsOpen = b.signupsOpen;
    if (typeof b.guestsAllowed === "boolean") patch.guestsAllowed = b.guestsAllowed;
    return c.json({ settings: await store.updateSettings(patch) });
  });

  app.all("*", (c) => c.json({ error: "Not found." }, 404));

  return app;
}
