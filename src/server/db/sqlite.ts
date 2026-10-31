// SQLite store on Node's built-in driver — for local development without any
// secrets, and for tests (":memory:"). Production uses SupabaseStore.

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import * as sqlite from "node:sqlite";
import type { CharacterId, Role } from "@party/shared";
import { DEFAULT_SETTINGS, type GameResult, type GameResultPlayer, type RoomRow, type SiteSettings, type Store, type User, type UserPatch } from "./types";

// Node 26.11 renamed DatabaseSync → Database (old name kept as an alias).
type SqliteDb = InstanceType<typeof sqlite.DatabaseSync>;
const DatabaseCtor: typeof sqlite.DatabaseSync =
  (sqlite as unknown as { Database?: typeof sqlite.DatabaseSync }).Database ?? sqlite.DatabaseSync;

const MIGRATIONS: string[] = [
  `
  create table users (
    id text primary key,
    username text not null,
    username_lower text not null unique,
    display_name text not null,
    password_hash text not null,
    role text not null default 'player' check (role in ('player', 'host', 'admin')),
    character text not null default 'blip',
    disabled integer not null default 0,
    created_at integer not null,
    last_login_at integer
  );
  create table sessions (
    token_hash text primary key,
    user_id text not null references users(id) on delete cascade,
    created_at integer not null,
    expires_at integer not null,
    last_seen_at integer not null,
    user_agent text
  );
  create index sessions_user on sessions(user_id);
  create table settings (key text primary key, value text not null);
  create table game_results (
    id text primary key,
    room_code text not null,
    game_id text not null,
    host_user_id text,
    started_at integer not null,
    ended_at integer not null,
    players_json text not null
  );
  create index game_results_ended on game_results(ended_at desc);
  create table rooms (
    code text primary key,
    screen_secret_hash text not null,
    screen_key text not null,
    owner_user_id text,
    owner_name text,
    status text not null,
    created_at integer not null,
    last_seen_at integer not null,
    created_ip text not null,
    phase text not null default 'pending',
    players integer not null default 0,
    connected integer not null default 0,
    characters text not null default '[]',
    game_id text,
    locked integer not null default 0,
    closed_reason text
  );
  `,
];

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: Role;
  character: CharacterId;
  disabled: number;
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
  characters: string;
  game_id: string | null;
  locked: number;
  closed_reason: string | null;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    character: row.character,
    disabled: row.disabled === 1,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
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
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    createdIp: row.created_ip,
    phase: row.phase,
    players: row.players,
    connected: row.connected,
    characters: JSON.parse(row.characters) as CharacterId[],
    gameId: row.game_id,
    locked: row.locked === 1,
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

function roomValue(key: keyof RoomRow, value: unknown): string | number | null {
  if (key === "characters") return JSON.stringify(value ?? []);
  if (key === "locked") return value ? 1 : 0;
  return (value ?? null) as string | number | null;
}

export class SqliteStore implements Store {
  private readonly db: SqliteDb;

  /** `file` = path to the .db file, or ":memory:" for tests. */
  constructor(file: string) {
    if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseCtor(file);
    this.db.exec("pragma journal_mode = wal; pragma foreign_keys = on; pragma busy_timeout = 3000;");
    const row = this.db.prepare("pragma user_version").get() as { user_version: number };
    for (let v = row.user_version; v < MIGRATIONS.length; v++) {
      this.db.exec("begin");
      try {
        this.db.exec(MIGRATIONS[v]!);
        this.db.exec(`pragma user_version = ${v + 1}`);
        this.db.exec("commit");
      } catch (error) {
        this.db.exec("rollback");
        throw error;
      }
    }
  }

  close(): void {
    this.db.close();
  }

  // ── Users ──────────────────────────────────────────────────────────────

  async createUser(input: { username: string; displayName: string; passwordHash: string; role: Role; character: CharacterId }): Promise<User> {
    const id = randomUUID();
    this.db
      .prepare(
        `insert into users (id, username, username_lower, display_name, password_hash, role, character, created_at)
         values (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.username, input.username.toLowerCase(), input.displayName, input.passwordHash, input.role, input.character, Date.now());
    return (await this.getUserById(id))!;
  }

  async getUserById(id: string): Promise<User | null> {
    const row = this.db.prepare("select * from users where id = ?").get(id) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const row = this.db.prepare("select * from users where username_lower = ?").get(username.toLowerCase()) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  async getAuthByUsername(username: string): Promise<{ user: User; passwordHash: string } | null> {
    const row = this.db.prepare("select * from users where username_lower = ?").get(username.toLowerCase()) as UserRow | undefined;
    return row ? { user: toUser(row), passwordHash: row.password_hash } : null;
  }

  async getPasswordHash(userId: string): Promise<string | null> {
    const row = this.db.prepare("select password_hash from users where id = ?").get(userId) as { password_hash: string } | undefined;
    return row?.password_hash ?? null;
  }

  async listUsers(query = ""): Promise<User[]> {
    const q = `%${query.toLowerCase().replace(/[%_]/g, "")}%`;
    const rows = this.db
      .prepare(
        `select * from users where username_lower like ? or lower(display_name) like ?
         order by case role when 'admin' then 0 when 'host' then 1 else 2 end, created_at desc limit 500`,
      )
      .all(q, q) as unknown as UserRow[];
    return rows.map(toUser);
  }

  async updateUser(id: string, patch: UserPatch): Promise<User | null> {
    const sets: string[] = [];
    const args: (string | number)[] = [];
    if (patch.displayName !== undefined) { sets.push("display_name = ?"); args.push(patch.displayName); }
    if (patch.role !== undefined) { sets.push("role = ?"); args.push(patch.role); }
    if (patch.character !== undefined) { sets.push("character = ?"); args.push(patch.character); }
    if (patch.disabled !== undefined) { sets.push("disabled = ?"); args.push(patch.disabled ? 1 : 0); }
    if (patch.passwordHash !== undefined) { sets.push("password_hash = ?"); args.push(patch.passwordHash); }
    if (sets.length) this.db.prepare(`update users set ${sets.join(", ")} where id = ?`).run(...args, id);
    return this.getUserById(id);
  }

  async deleteUser(id: string): Promise<void> {
    this.db.prepare("delete from users where id = ?").run(id);
  }

  async touchLogin(id: string): Promise<void> {
    this.db.prepare("update users set last_login_at = ? where id = ?").run(Date.now(), id);
  }

  async countByRole(): Promise<Record<Role, number>> {
    const rows = this.db.prepare("select role, count(*) as n from users where disabled = 0 group by role").all() as { role: Role; n: number }[];
    const out: Record<Role, number> = { player: 0, host: 0, admin: 0 };
    for (const r of rows) out[r.role] = r.n;
    return out;
  }

  // ── Sessions ───────────────────────────────────────────────────────────

  async createSession(tokenHash: string, userId: string, ttlMs: number, userAgent: string | null): Promise<void> {
    const now = Date.now();
    this.db
      .prepare("insert into sessions (token_hash, user_id, created_at, expires_at, last_seen_at, user_agent) values (?, ?, ?, ?, ?, ?)")
      .run(tokenHash, userId, now, now + ttlMs, now, userAgent?.slice(0, 200) ?? null);
  }

  async getSessionUser(tokenHash: string, ttlMs: number): Promise<User | null> {
    const row = this.db
      .prepare(
        `select u.*, s.expires_at as s_expires, s.last_seen_at as s_seen
         from sessions s join users u on u.id = s.user_id where s.token_hash = ?`,
      )
      .get(tokenHash) as (UserRow & { s_expires: number; s_seen: number }) | undefined;
    if (!row) return null;
    const now = Date.now();
    if (row.s_expires < now || row.disabled === 1) {
      await this.deleteSession(tokenHash);
      return null;
    }
    if (now - row.s_seen > 10 * 60_000) {
      this.db.prepare("update sessions set last_seen_at = ?, expires_at = ? where token_hash = ?").run(now, now + ttlMs, tokenHash);
    }
    return toUser(row);
  }

  async deleteSession(tokenHash: string): Promise<void> {
    this.db.prepare("delete from sessions where token_hash = ?").run(tokenHash);
  }

  async deleteUserSessions(userId: string, exceptTokenHash?: string): Promise<void> {
    if (exceptTokenHash) this.db.prepare("delete from sessions where user_id = ? and token_hash != ?").run(userId, exceptTokenHash);
    else this.db.prepare("delete from sessions where user_id = ?").run(userId);
  }

  async purgeExpiredSessions(): Promise<void> {
    this.db.prepare("delete from sessions where expires_at < ?").run(Date.now());
  }

  // ── Settings ───────────────────────────────────────────────────────────

  async getSettings(): Promise<SiteSettings> {
    const rows = this.db.prepare("select key, value from settings").all() as { key: string; value: string }[];
    const out: SiteSettings = { ...DEFAULT_SETTINGS };
    for (const { key, value } of rows) if (key === "signupsOpen" || key === "guestsAllowed") out[key] = value === "1";
    return out;
  }

  async updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
    const stmt = this.db.prepare("insert into settings (key, value) values (?, ?) on conflict(key) do update set value = excluded.value");
    for (const [key, value] of Object.entries(patch)) if (typeof value === "boolean") stmt.run(key, value ? "1" : "0");
    return this.getSettings();
  }

  // ── Rooms ──────────────────────────────────────────────────────────────

  async createRoom(row: RoomRow): Promise<void> {
    const keys = Object.keys(ROOM_COLUMNS) as (keyof RoomRow)[];
    this.db
      .prepare(`insert into rooms (${keys.map((k) => ROOM_COLUMNS[k]).join(", ")}) values (${keys.map(() => "?").join(", ")})`)
      .run(...keys.map((k) => roomValue(k, row[k])));
  }

  async getRoom(code: string): Promise<RoomRow | null> {
    const row = this.db.prepare("select * from rooms where code = ?").get(code) as RoomDbRow | undefined;
    return row ? toRoom(row) : null;
  }

  async updateRoom(code: string, patch: Partial<RoomRow>): Promise<void> {
    const keys = (Object.keys(patch) as (keyof RoomRow)[]).filter((k) => k !== "code" && patch[k] !== undefined);
    if (!keys.length) return;
    this.db
      .prepare(`update rooms set ${keys.map((k) => `${ROOM_COLUMNS[k]} = ?`).join(", ")} where code = ?`)
      .run(...keys.map((k) => roomValue(k, patch[k])), code);
  }

  async listLiveRooms(liveSince: number): Promise<RoomRow[]> {
    const rows = this.db
      .prepare("select * from rooms where status != 'closed' and last_seen_at >= ? order by created_at desc limit 200")
      .all(liveSince) as unknown as RoomDbRow[];
    return rows.map(toRoom);
  }

  // ── History ────────────────────────────────────────────────────────────

  async recordGameResult(result: Omit<GameResult, "id">): Promise<void> {
    this.db
      .prepare("insert into game_results (id, room_code, game_id, host_user_id, started_at, ended_at, players_json) values (?, ?, ?, ?, ?, ?, ?)")
      .run(randomUUID(), result.roomCode, result.gameId, result.hostUserId, result.startedAt, result.endedAt, JSON.stringify(result.players));
  }

  async recentGameResults(limit = 20): Promise<GameResult[]> {
    const rows = this.db.prepare("select * from game_results order by ended_at desc limit ?").all(limit) as {
      id: string; room_code: string; game_id: string; host_user_id: string | null; started_at: number; ended_at: number; players_json: string;
    }[];
    return rows.map((r) => ({
      id: r.id,
      roomCode: r.room_code,
      gameId: r.game_id,
      hostUserId: r.host_user_id,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      players: JSON.parse(r.players_json) as GameResultPlayer[],
    }));
  }

  async countGamesSince(since: number): Promise<number> {
    const row = this.db.prepare("select count(*) as n from game_results where ended_at >= ?").get(since) as { n: number };
    return row.n;
  }
}
