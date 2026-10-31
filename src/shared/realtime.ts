// Realtime transport contract. The TV hosts each room in its browser; phones
// and extra screens reach it through Supabase Realtime broadcast channels:
//
//   party:<CODE>                 public  — TV view for extra screens, "closed" notices
//   party:<CODE>:s:<seatSecret>  private — one phone <-> the TV (inputs, that player's view)
//   party:<CODE>:tv:<screenKey>  private — server -> TV (new seat tickets, owner, close)
//
// "Private" channels are capability URLs: the random secret in the topic is
// only ever handed out over HTTPS to the two parties that need it.

import type { CharacterId } from "./characters";
import type { HostAction, LobbyAction } from "./protocol";

export const TOPIC = {
  room: (code: string) => `party:${code}`,
  seat: (code: string, secret: string) => `party:${code}:s:${secret}`,
  screen: (code: string, screenKey: string) => `party:${code}:tv:${screenKey}`,
};

/** Every broadcast uses this one event name; the payload carries the message. */
export const BROADCAST_EVENT = "msg";

/** Issued by the server when a phone joins; delivered to the TV on its screen channel. */
export interface SeatTicket {
  seatId: string;
  secret: string;
  userId: string | null;
  name: string;
  character: CharacterId | null;
  /** True when this account hosts the room (it owns it, or just claimed a pending room). */
  owner: boolean;
  issuedAt: number;
}

export type ScreenMessage =
  | { t: "seat"; ticket: SeatTicket }
  | { t: "close"; reason: string };

/** Phone -> TV on its seat channel. */
export type SeatMessage =
  | { t: "hello" }
  | { t: "input"; data: unknown; at?: number }
  | { t: "lobby"; action: LobbyAction }
  | { t: "host"; action: HostAction }
  | { t: "ping"; at: number; v: number }
  | { t: "sync" }
  | { t: "bye" };

/** Phones ping this often; a seat that's silent for SEAT_TIMEOUT_MS counts as disconnected. */
export const SEAT_PING_MS = 4000;
export const SEAT_TIMEOUT_MS = 13_000;
/** The TV reports to the server this often (and on seat changes) so the admin page and room lookups stay current. */
export const HEARTBEAT_MS = 45_000;
/** Rooms whose TV hasn't checked in for this long are considered gone. */
export const ROOM_STALE_MS = 3 * 60_000;

export interface RoomSummary {
  status: "pending" | "lobby" | "playing";
  players: number;
  connected: number;
  characters: CharacterId[];
  gameId: string | null;
  locked: boolean;
}
