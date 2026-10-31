// Room registry + the compute guard rails. Rooms run on the TV; the server
// only decides who may open one, hands out seats, and keeps a heartbeat so the
// admin page and room lookups know what's live.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  MAX_PLAYERS,
  NAME_MAX,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_STALE_MS,
  TOPIC,
  canHost,
  cleanText,
  isCharacterId,
  type RoomSummary,
  type ScreenMessage,
  type SeatTicket,
  type ServerMessage,
} from "@party/shared";
import type { Broadcaster } from "./broadcast";
import type { Config } from "./config";
import type { RoomRow, Store, User } from "./db/types";

const PENDING_PER_IP = 3;
const PENDING_GLOBAL = 100;
const CODE_REUSE_COOLDOWN_MS = 10 * 60_000;

function token(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function newCode(): string {
  let code = "";
  const bytes = randomBytes(ROOM_CODE_LENGTH * 2);
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[bytes.readUInt16BE(i * 2) % ROOM_CODE_ALPHABET.length];
  return code;
}

export function isLive(room: RoomRow, now = Date.now()): boolean {
  return room.status !== "closed" && now - room.lastSeenAt < ROOM_STALE_MS;
}

export type Fail = { ok: false; status: 400 | 403 | 404 | 409 | 429 | 503; error: string; code?: string; codes?: string[] };

export class RoomService {
  constructor(private readonly deps: { store: Store; config: Config; broadcast: Broadcaster }) {}

  verifyScreen(room: RoomRow, screenSecret: unknown): boolean {
    if (typeof screenSecret !== "string" || !screenSecret) return false;
    const a = Buffer.from(sha256(screenSecret));
    const b = Buffer.from(room.screenSecretHash);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /** Hosts get an active room; anyone else a "pending" room that waits for a host to join it. */
  async create(user: User | null, ip: string): Promise<{ ok: true; room: RoomRow; screenSecret: string } | Fail> {
    const { store, config } = this.deps;
    const now = Date.now();
    const live = await store.listLiveRooms(now - ROOM_STALE_MS);
    const host = user && canHost(user.role) ? user : null;
    if (host) {
      const mine = live.filter((r) => r.ownerUserId === host.id);
      if (host.role !== "admin" && mine.length >= config.maxRoomsPerHost) {
        return { ok: false, status: 409, error: `You already have ${mine.length} rooms open. Close one first.`, codes: mine.map((r) => r.code) };
      }
      if (host.role !== "admin" && live.filter((r) => r.status === "active").length >= config.maxActiveRooms) {
        return { ok: false, status: 503, error: "Every party table is full right now. Try again in a bit." };
      }
    } else {
      const pending = live.filter((r) => r.status === "pending");
      if (pending.filter((r) => r.createdIp === ip).length >= PENDING_PER_IP) {
        return { ok: false, status: 429, error: "Too many screens waiting for a host from here." };
      }
      if (pending.length >= PENDING_GLOBAL) return { ok: false, status: 503, error: "Too many screens are waiting for hosts right now." };
    }

    const screenSecret = token(24);
    for (let attempt = 0; attempt < 40; attempt++) {
      const code = newCode();
      const existing = await store.getRoom(code);
      if (existing && (isLive(existing, now) || now - existing.lastSeenAt < CODE_REUSE_COOLDOWN_MS)) continue;
      const row: RoomRow = {
        code,
        screenSecretHash: sha256(screenSecret),
        screenKey: token(18),
        ownerUserId: host?.id ?? null,
        ownerName: host?.displayName ?? null,
        status: host ? "active" : "pending",
        createdAt: now,
        lastSeenAt: now,
        createdIp: ip,
        phase: host ? "lobby" : "pending",
        players: 0,
        connected: 0,
        characters: [],
        gameId: null,
        locked: false,
        closedReason: null,
      };
      if (existing) await store.updateRoom(code, row);
      else await store.createRoom(row);
      return { ok: true, room: row, screenSecret };
    }
    return { ok: false, status: 503, error: "Couldn't find a free room code. Try again." };
  }

  /** Issues a seat and hands its ticket to the TV over the TV's private channel. */
  async join(code: string, user: User | null, input: { name?: unknown; character?: unknown }): Promise<{ ok: true; ticket: SeatTicket } | Fail> {
    const { store, broadcast } = this.deps;
    const room = await store.getRoom(code);
    if (!room || !isLive(room)) return { ok: false, status: 404, error: "That room doesn't exist (or it already closed).", code: "room_not_found" };
    if (!user && !(await store.getSettings()).guestsAllowed) {
      return { ok: false, status: 403, error: "Guests can't join right now — log in to play.", code: "guests_disabled" };
    }
    const name = user ? cleanText(user.displayName, NAME_MAX) : cleanText(input.name, NAME_MAX);
    if (!name) return { ok: false, status: 400, error: "Pick a name first.", code: "name_required" };
    if (!user && room.players >= MAX_PLAYERS && room.connected >= MAX_PLAYERS) {
      return { ok: false, status: 409, error: `This party is full (${MAX_PLAYERS} players).`, code: "room_full" };
    }

    let owner = Boolean(user && room.ownerUserId === user.id);
    if (user && !room.ownerUserId && canHost(user.role)) {
      // A host walking up to a waiting TV takes it over.
      await store.updateRoom(code, { ownerUserId: user.id, ownerName: user.displayName, status: "active" });
      owner = true;
    }

    const ticket: SeatTicket = {
      seatId: `p_${token(8)}`,
      secret: token(24),
      userId: user?.id ?? null,
      name,
      character: isCharacterId(input.character) ? input.character : (user?.character ?? null),
      owner,
      issuedAt: Date.now(),
    };
    await broadcast.send(TOPIC.screen(code, room.screenKey), { t: "seat", ticket } satisfies ScreenMessage);
    return { ok: true, ticket };
  }

  async heartbeat(code: string, screenSecret: unknown, summary: Partial<RoomSummary>): Promise<{ ok: true; closed: string | null } | Fail> {
    const { store } = this.deps;
    const room = await store.getRoom(code);
    if (!room || !this.verifyScreen(room, screenSecret)) return { ok: false, status: 403, error: "Not this room's screen." };
    if (room.status === "closed") return { ok: true, closed: room.closedReason ?? "This room has closed." };
    await store.updateRoom(code, {
      lastSeenAt: Date.now(),
      phase: summary.status === "playing" || summary.status === "lobby" || summary.status === "pending" ? summary.status : room.phase,
      players: Math.max(0, Math.min(MAX_PLAYERS, Number(summary.players) || 0)),
      connected: Math.max(0, Math.min(MAX_PLAYERS, Number(summary.connected) || 0)),
      characters: Array.isArray(summary.characters) ? summary.characters.filter(isCharacterId).slice(0, MAX_PLAYERS) : room.characters,
      gameId: typeof summary.gameId === "string" ? summary.gameId.slice(0, 40) : null,
      locked: Boolean(summary.locked),
    });
    return { ok: true, closed: null };
  }

  async close(room: RoomRow, reason: string): Promise<void> {
    const { store, broadcast } = this.deps;
    await store.updateRoom(room.code, { status: "closed", closedReason: reason });
    await Promise.allSettled([
      broadcast.send(TOPIC.screen(room.code, room.screenKey), { t: "close", reason } satisfies ScreenMessage),
      broadcast.send(TOPIC.room(room.code), { t: "closed", reason } satisfies ServerMessage),
    ]);
  }

  /** Closes rooms owned by a user (disabled/deleted accounts). */
  async closeOwnedBy(userId: string, reason: string): Promise<void> {
    const live = await this.deps.store.listLiveRooms(Date.now() - ROOM_STALE_MS);
    await Promise.all(live.filter((r) => r.ownerUserId === userId).map((r) => this.close(r, reason)));
  }
}
