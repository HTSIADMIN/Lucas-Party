// Supabase (Postgres) store — production. Uses the service-role key, so it
// only ever runs on the server. Tables are defined in
// supabase/migrations/0001_party_platform.sql (RLS on, no policies: nothing
// is reachable with the public anon key).

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CharacterId, Role } from "@party/shared";
import { DEFAULT_SETTINGS, type GameResult, type RoomRow, type SiteSettings, type Store, type User, type UserPatch } from "./types";

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  password_hash?: string;
  role: Role;
  character: CharacterId;
  disabled: boolean;
  created_at: number;
  last_login_at: number | null;
}

interface RoomDbRow {
  code: string;
  screen_secret_hash: string;
  screen_key: string;
  owner_user_id: string | null;
  owner_name: string | null;
  status: RoomRow["status"];
  created_at: number;
  last_seen_at: number;
  created_ip: string;
  phase: RoomRow["phase"];
  players: number;
  connected: number;
  characters: CharacterId[];
  game_id: string | null;
  locked: boolean;
  closed_reason: string | null;
}

const USER_COLUMNS = "id, username, display_name, role, character, disabled, created_at, last_login_at";

function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    character: row.character,
    disabled: row.disabled,
    createdAt: Number(row.created_at),
    lastLoginAt: row.last_login_at === null ? null : Number(row.last_login_at),
  };
}

function toRoom(row: RoomDbRow): RoomRow {
  return {
    code: row.code,
    screenSecretHash: row.screen_secret_hash,
    screenKey: row.screen_key,
    ownerUserId: row.owner_user_id,
    ownerName: row.owner_name,
    status: row.status,
    createdAt: Number(row.created_at),
    lastSeenAt: Number(row.last_seen_at),
    createdIp: row.created_ip,
    phase: row.phase,
    players: row.players,
    connected: row.connected,
    characters: row.characters ?? [],
    gameId: row.game_id,
    locked: row.locked,
    closedReason: row.closed_reason,
  };
}

const ROOM_COLUMNS: Record<keyof RoomRow, string> = {
  code: "code",
  screenSecretHash: "screen_secret_hash",
  screenKey: "screen_key",
  ownerUserId: "owner_user_id",
  ownerName: "owner_name",
  status: "status",
  createdAt: "created_at",
  lastSeenAt: "last_seen_at",
  createdIp: "created_ip",
  phase: "phase",
  players: "players",
  connected: "connected",
  characters: "characters",
  gameId: "game_id",
  locked: "locked",
  closedReason: "closed_reason",
};

function roomRecord(patch: Partial<RoomRow>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) out[ROOM_COLUMNS[key as keyof RoomRow]] = value;
  }
  return out;
}

function must<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(`supabase: ${result.error.message}`);
  return result.data;
}

export class SupabaseStore implements Store {
  private readonly db: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  // ── Users ──────────────────────────────────────────────────────────────

  async createUser(input: { username: string; displayName: string; passwordHash: string; role: Role; character: CharacterId }): Promise<User> {
    const row = must(
      await this.db
        .from("users")
        .insert({
          id: randomUUID(),
          username: input.username,
          username_lower: input.username.toLowerCase(),
          display_name: input.displayName,
          password_hash: input.passwordHash,
          role: input.role,
          character: input.character,
          created_at: Date.now(),
        })
        .select(USER_COLUMNS)
        .single(),
    ) as UserRow;
    return toUser(row);
  }

  async getUserById(id: string): Promise<User | null> {
    const row = must(await this.db.from("users").select(USER_COLUMNS).eq("id", id).maybeSingle()) as UserRow | null;
    return row ? toUser(row) : null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const row = must(await this.db.from("users").select(USER_COLUMNS).eq("username_lower", username.toLowerCase()).maybeSingle()) as UserRow | null;
    return row ? toUser(row) : null;
  }

  async getAuthByUsername(username: string): Promise<{ user: User; passwordHash: string } | null> {
    const row = must(
      await this.db.from("users").select(`${USER_COLUMNS}, password_hash`).eq("username_lower", username.toLowerCase()).maybeSingle(),
    ) as UserRow | null;
    return row ? { user: toUser(row), passwordHash: row.password_hash ?? "" } : null;
  }

  async getPasswordHash(userId: string): Promise<string | null> {
    const row = must(await this.db.from("users").select("password_hash").eq("id", userId).maybeSingle()) as { password_hash: string } | null;
    return row?.password_hash ?? null;
  }

  async listUsers(query = ""): Promise<User[]> {
    const q = query.toLowerCase().replace(/[^a-z0-9_ ]/g, "").trim();
    let req = this.db.from("users").select(USER_COLUMNS).order("created_at", { ascending: false }).limit(500);
    if (q) req = req.or(`username_lower.ilike.%${q}%,display_name.ilike.%${q}%`);
    const rows = must(await req) as UserRow[];
    const rank: Record<Role, number> = { admin: 0, host: 1, player: 2 };
    return rows.map(toUser).sort((a, b) => rank[a.role] - rank[b.role] || b.createdAt - a.createdAt);
  }

  async updateUser(id: string, patch: UserPatch): Promise<User | null> {
    const update: Record<string, unknown> = {};
    if (patch.displayName !== undefined) update.display_name = patch.displayName;
    if (patch.role !== undefined) update.role = patch.role;
    if (patch.character !== undefined) update.character = patch.character;
    if (patch.disabled !== undefined) update.disabled = patch.disabled;
    if (patch.passwordHash !== undefined) update.password_hash = patch.passwordHash;
    if (Object.keys(update).length) must(await this.db.from("users").update(update).eq("id", id));
    return this.getUserById(id);
  }

  async deleteUser(id: string): Promise<void> {
    must(await this.db.from("users").delete().eq("id", id));
  }

  async touchLogin(id: string): Promise<void> {
    must(await this.db.from("users").update({ last_login_at: Date.now() }).eq("id", id));
  }

  async countByRole(): Promise<Record<Role, number>> {
    const rows = must(await this.db.from("users").select("role").eq("disabled", false)) as { role: Role }[];
    const out: Record<Role, number> = { player: 0, host: 0, admin: 0 };
    for (const r of rows) out[r.role]++;
    return out;
  }

  // ── Sessions ───────────────────────────────────────────────────────────

  async createSession(tokenHash: string, userId: string, ttlMs: number, userAgent: string | null): Promise<void> {
    const now = Date.now();
    must(
      await this.db.from("sessions").insert({
        token_hash: tokenHash,
        user_id: userId,
        created_at: now,
        expires_at: now + ttlMs,
        last_seen_at: now,
        user_agent: userAgent?.slice(0, 200) ?? null,
      }),
    );
  }

  async getSessionUser(tokenHash: string, ttlMs: number): Promise<User | null> {
    const session = must(
      await this.db.from("sessions").select("user_id, expires_at, last_seen_at").eq("token_hash", tokenHash).maybeSingle(),
    ) as { user_id: string; expires_at: number; last_seen_at: number } | null;
    if (!session) return null;
    const now = Date.now();
    const user = Number(session.expires_at) >= now ? await this.getUserById(session.user_id) : null;
    if (!user || user.disabled) {
      await this.deleteSession(tokenHash);
      return null;
    }
    if (now - Number(session.last_seen_at) > 10 * 60_000) {
      must(await this.db.from("sessions").update({ last_seen_at: now, expires_at: now + ttlMs }).eq("token_hash", tokenHash));
    }
    return user;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    must(await this.db.from("sessions").delete().eq("token_hash", tokenHash));
  }

  async deleteUserSessions(userId: string, exceptTokenHash?: string): Promise<void> {
    let req = this.db.from("sessions").delete().eq("user_id", userId);
    if (exceptTokenHash) req = req.neq("token_hash", exceptTokenHash);
    must(await req);
  }

  async purgeExpiredSessions(): Promise<void> {
    must(await this.db.from("sessions").delete().lt("expires_at", Date.now()));
  }

  // ── Settings ───────────────────────────────────────────────────────────

  async getSettings(): Promise<SiteSettings> {
    const rows = must(await this.db.from("settings").select("key, value")) as { key: string; value: string }[];
    const out: SiteSettings = { ...DEFAULT_SETTINGS };
    for (const { key, value } of rows) if (key === "signupsOpen" || key === "guestsAllowed") out[key] = value === "1";
    return out;
  }

  async updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
    const rows = Object.entries(patch)
      .filter(([, value]) => typeof value === "boolean")
      .map(([key, value]) => ({ key, value: value ? "1" : "0" }));
    if (rows.length) must(await this.db.from("settings").upsert(rows, { onConflict: "key" }));
    return this.getSettings();
  }

  // ── Rooms ──────────────────────────────────────────────────────────────

  async createRoom(row: RoomRow): Promise<void> {
    must(await this.db.from("rooms").insert(roomRecord(row)));
  }

  async getRoom(code: string): Promise<RoomRow | null> {
    const row = must(await this.db.from("rooms").select("*").eq("code", code).maybeSingle()) as RoomDbRow | null;
    return row ? toRoom(row) : null;
  }

  async updateRoom(code: string, patch: Partial<RoomRow>): Promise<void> {
    const { code: _ignored, ...rest } = patch;
    const update = roomRecord(rest);
    if (Object.keys(update).length) must(await this.db.from("rooms").update(update).eq("code", code));
  }

  async listLiveRooms(liveSince: number): Promise<RoomRow[]> {
    const rows = must(
      await this.db.from("rooms").select("*").neq("status", "closed").gte("last_seen_at", liveSince).order("created_at", { ascending: false }).limit(200),
    ) as RoomDbRow[];
    return rows.map(toRoom);
  }

  // ── History ────────────────────────────────────────────────────────────

  async recordGameResult(result: Omit<GameResult, "id">): Promise<void> {
    must(
      await this.db.from("game_results").insert({
        id: randomUUID(),
        room_code: result.roomCode,
        game_id: result.gameId,
        host_user_id: result.hostUserId,
        started_at: result.startedAt,
        ended_at: result.endedAt,
        players: result.players,
      }),
    );
  }

  async recentGameResults(limit = 20): Promise<GameResult[]> {
    const rows = must(await this.db.from("game_results").select("*").order("ended_at", { ascending: false }).limit(limit)) as {
      id: string; room_code: string; game_id: string; host_user_id: string | null; started_at: number; ended_at: number; players: GameResult["players"];
    }[];
    return rows.map((r) => ({
      id: r.id,
      roomCode: r.room_code,
      gameId: r.game_id,
      hostUserId: r.host_user_id,
      startedAt: Number(r.started_at),
      endedAt: Number(r.ended_at),
      players: r.players,
    }));
  }

  async countGamesSince(since: number): Promise<number> {
    const res = await this.db.from("game_results").select("id", { count: "exact", head: true }).gte("ended_at", since);
    if (res.error) throw new Error(`supabase: ${res.error.message}`);
    return res.count ?? 0;
  }
}
