// Persistence contract. Two implementations: SupabaseStore (production, on
// Vercel) and SqliteStore (local dev with no secrets, and tests).

import type { CharacterId, Role } from "@party/shared";

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  character: CharacterId;
  disabled: boolean;
  createdAt: number;
  lastLoginAt: number | null;
}

export interface SiteSettings {
  signupsOpen: boolean;
  guestsAllowed: boolean;
}

export const DEFAULT_SETTINGS: SiteSettings = { signupsOpen: true, guestsAllowed: true };

export interface GameResultPlayer { name: string; character: CharacterId; userId: string | null; score: number }

export interface GameResult {
  id: string;
  roomCode: string;
  gameId: string;
  hostUserId: string | null;
  startedAt: number;
  endedAt: number;
  players: GameResultPlayer[];
}

export type RoomStatusDb = "pending" | "active" | "closed";

export interface RoomRow {
  code: string;
  /** SHA-256 of the secret only the hosting TV holds. */
  screenSecretHash: string;
  /** Capability for the TV's private channel (server → TV). */
  screenKey: string;
  ownerUserId: string | null;
  ownerName: string | null;
  status: RoomStatusDb;
  createdAt: number;
  lastSeenAt: number;
  createdIp: string;
  /** Live shape reported by the TV. */
  phase: "pending" | "lobby" | "playing";
  players: number;
  connected: number;
  characters: CharacterId[];
  gameId: string | null;
  locked: boolean;
  closedReason: string | null;
}

export interface UserPatch {
  displayName?: string;
  role?: Role;
  character?: CharacterId;
  disabled?: boolean;
  passwordHash?: string;
}

export interface Store {
  // users
  createUser(input: { username: string; displayName: string; passwordHash: string; role: Role; character: CharacterId }): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getAuthByUsername(username: string): Promise<{ user: User; passwordHash: string } | null>;
  getPasswordHash(userId: string): Promise<string | null>;
  listUsers(query?: string): Promise<User[]>;
  updateUser(id: string, patch: UserPatch): Promise<User | null>;
  deleteUser(id: string): Promise<void>;
  touchLogin(id: string): Promise<void>;
  countByRole(): Promise<Record<Role, number>>;
  // sessions
  createSession(tokenHash: string, userId: string, ttlMs: number, userAgent: string | null): Promise<void>;
  getSessionUser(tokenHash: string, ttlMs: number): Promise<User | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteUserSessions(userId: string, exceptTokenHash?: string): Promise<void>;
  purgeExpiredSessions(): Promise<void>;
  // settings
  getSettings(): Promise<SiteSettings>;
  updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings>;
  // rooms
  createRoom(row: RoomRow): Promise<void>;
  getRoom(code: string): Promise<RoomRow | null>;
  updateRoom(code: string, patch: Partial<RoomRow>): Promise<void>;
  /** Not closed and seen since `liveSince`. */
  listLiveRooms(liveSince: number): Promise<RoomRow[]>;
  // history
  recordGameResult(result: Omit<GameResult, "id">): Promise<void>;
  recentGameResults(limit?: number): Promise<GameResult[]>;
  countGamesSince(since: number): Promise<number>;
}
