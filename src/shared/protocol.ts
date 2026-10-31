// Wire protocol between the room server and its clients (TV screens + phones).
// JSON over one WebSocket per device at /ws. The server always sends full,
// per-recipient snapshots (`room`), never diffs — party-game state is a few
// KB, and full snapshots make reconnects trivially correct.

import type { CharacterId } from "./characters";
import type { GameId } from "./catalog";
import type { Role } from "./roles";
import type { ThemeId } from "./themes";

export type ClientRole = "tv" | "player";

/** pending = nobody with hosting rights has arrived yet; games can't start. */
export type RoomStatus = "pending" | "lobby" | "playing";

export type Pace = "relaxed" | "normal" | "speedy";
export const PACE_SCALE: Record<Pace, number> = { relaxed: 1.5, normal: 1, speedy: 0.7 };

export interface RoomSettings {
  theme: ThemeId;
  /** Filters prompts tagged as cheeky. On by default. */
  familyMode: boolean;
  /** Scales answer/vote timers. */
  pace: Pace;
  /** Game the host has highlighted in the lobby. */
  gameId: GameId | null;
  /** Per-game option values keyed by game id, e.g. { rocket: { rounds: 7 } }. */
  gameOptions: Partial<Record<GameId, Record<string, number>>>;
}

export interface PlayerPublic {
  id: string;
  name: string;
  character: CharacterId;
  connected: boolean;
  isHost: boolean;
  isGuest: boolean;
  /** False for players who joined mid-game: they watch until the next game. */
  inGame: boolean;
  /** Score in the current game (null in the lobby). */
  score: number | null;
}

export interface GameEnvelope<V = unknown> {
  id: GameId;
  /** True once the game reached its final podium; the host picks what's next. */
  over: boolean;
  /** Game-specific view, projected for the recipient (TV view or this player's view). */
  view: V;
}

export interface RoomView<V = unknown> {
  code: string;
  status: RoomStatus;
  hostName: string | null;
  hostOnline: boolean;
  players: PlayerPublic[];
  maxPlayers: number;
  locked: boolean;
  settings: RoomSettings;
  paused: boolean;
  /** Server epoch ms when the current phase times out. Null when paused or untimed. */
  deadline: number | null;
  /** While paused: how long was left on the clock. */
  pausedRemainingMs: number | null;
  game: GameEnvelope<V> | null;
  screens: number;
}

// ── Client → server ──────────────────────────────────────────────────────

export interface HelloTv { t: "hello"; role: "tv"; code: string }
export interface HelloPlayer {
  t: "hello";
  role: "player";
  code: string;
  /** Resume token from a previous `welcome` (survives phone sleep / refresh). */
  token?: string;
  name?: string;
  character?: CharacterId;
}

export type LobbyAction = { type: "setCharacter"; character: CharacterId };

export type HostAction =
  | { type: "selectGame"; gameId: GameId }
  | { type: "setSettings"; theme?: ThemeId; familyMode?: boolean; pace?: Pace }
  | { type: "setGameOption"; gameId: GameId; key: string; value: number }
  | { type: "start" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "skip" }
  | { type: "extend"; ms: number }
  | { type: "endGame" }
  | { type: "playAgain" }
  | { type: "kick"; playerId: string }
  | { type: "lock"; locked: boolean }
  | { type: "closeRoom" };

export type ClientMessage =
  | HelloTv
  | HelloPlayer
  | { t: "input"; data: unknown }
  | { t: "lobby"; action: LobbyAction }
  | { t: "host"; action: HostAction }
  | { t: "ping"; at: number };

// ── Server → client ──────────────────────────────────────────────────────

export type ErrorCode =
  | "bad_request"
  | "room_not_found"
  | "room_full"
  | "room_locked"
  | "name_required"
  | "name_taken"
  | "guests_disabled"
  | "not_host"
  | "not_allowed"
  | "rate_limited"
  | "game_error";

export interface RoomEvent {
  /** Free-form tag the clients switch on, e.g. "joined", "zinger", "boom". */
  kind: string;
  /** Logical SFX name. The TV plays it; phones stay quiet. */
  sfx?: string;
  /** Short line for a toast on the TV. */
  text?: string;
  playerId?: string;
  /** Vibration pattern for phones (ms). */
  haptic?: number | number[];
  /** Restricts which phones receive the event. Omitted = every phone. */
  to?: string[];
  /** Set false for private events the TV must not show. */
  tv?: boolean;
}

export type ServerMessage =
  | { t: "welcome"; role: ClientRole; playerId: string | null; token: string | null; serverNow: number }
  /** `v` counts snapshots sent to this seat, so a phone can spot one it missed. */
  | { t: "room"; room: RoomView; serverNow: number; v?: number }
  | { t: "event"; event: RoomEvent }
  | { t: "error"; code: ErrorCode; message: string; fatal?: boolean }
  | { t: "pong"; at: number; serverNow: number; v?: number }
  | { t: "closed"; reason: string };

// ── HTTP shapes ──────────────────────────────────────────────────────────

export interface MeResponse {
  user: {
    id: string;
    username: string;
    displayName: string;
    role: Role;
    character: CharacterId;
  } | null;
}

export interface RoomInfoResponse {
  code: string;
  status: RoomStatus;
  hostName: string | null;
  players: number;
  maxPlayers: number;
  locked: boolean;
  takenCharacters: CharacterId[];
  guestsAllowed: boolean;
}
