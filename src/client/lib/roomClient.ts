// A phone's connection to a room. Joins through /api (which hands the TV a
// ticket), then talks to the TV over the seat's private Supabase channel:
// says hello until welcomed, pings to keep the seat alive and to sync its
// clock with the TV's, and resumes the same seat after a refresh via a per-tab
// token in sessionStorage.

import {
  SEAT_PING_MS,
  TOPIC,
  type CharacterId,
  type ErrorCode,
  type HostAction,
  type LobbyAction,
  type RoomEvent,
  type RoomView,
  type SeatMessage,
  type ServerMessage,
} from "@party/shared";
import { Channel } from "../realtime/supabase";
import { ApiError, api } from "./api";
import { KEYS, session } from "./storage";

export type ConnectionStatus = "connecting" | "open" | "reconnecting" | "closed";

export interface JoinDetails {
  name?: string;
  character?: CharacterId;
}

export interface RoomClientOptions {
  code: string;
  join: JoinDetails;
  onChange(): void;
  onEvent?(event: RoomEvent): void;
}

interface SeatCredentials {
  seatId: string;
  secret: string;
}

const HELLO_EVERY_MS = 1500;
/** How long to wait for the TV to recognise a stored seat before joining afresh. */
const RESUME_GIVE_UP_MS = 9000;
/** How long to wait for the TV at all before telling the player. */
const TV_SILENT_MS = 20_000;

export class RoomClient {
  readonly role = "player" as const;
  status: ConnectionStatus = "connecting";
  room: RoomView | null = null;
  playerId: string | null = null;
  error: { code: ErrorCode; message: string; fatal: boolean } | null = null;
  closedReason: string | null = null;
  /** TV clock − Date.now(), in ms. */
  offset = 0;

  private channel: Channel<ServerMessage, SeatMessage> | null = null;
  private welcomed = false;
  private stopped = false;
  private version = 0;
  private bestRtt = Number.POSITIVE_INFINITY;
  private helloTimer: ReturnType<typeof setInterval> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private waitTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onPageHide = () => this.channel?.send({ t: "bye" });

  constructor(private readonly opts: RoomClientOptions) {
    void this.start(false);
    window.addEventListener("pagehide", this.onPageHide);
  }

  get code(): string {
    return this.opts.code;
  }

  serverNow(): number {
    return Date.now() + this.offset;
  }

  private notify() {
    this.opts.onChange();
  }

  private stored(): SeatCredentials | null {
    try {
      const raw = session.get(KEYS.seat(this.opts.code));
      return raw ? (JSON.parse(raw) as SeatCredentials) : null;
    } catch {
      return null;
    }
  }

  private fail(code: ErrorCode, message: string) {
    this.error = { code, message, fatal: true };
    this.status = "closed";
    this.stop();
    this.notify();
  }

  private async start(fresh: boolean): Promise<void> {
    if (this.stopped) return;
    let seat = fresh ? null : this.stored();
    const resuming = Boolean(seat);
    if (!seat) {
      try {
        const res = await api<SeatCredentials>(`/api/rooms/${this.opts.code}/join`, { body: { name: this.opts.join.name, character: this.opts.join.character } });
        seat = { seatId: res.seatId, secret: res.secret };
        session.set(KEYS.seat(this.opts.code), JSON.stringify(seat));
      } catch (error) {
        const code = error instanceof ApiError && typeof error.data.code === "string" ? (error.data.code as ErrorCode) : "bad_request";
        const message = error instanceof Error ? error.message : "Couldn't join the room.";
        return this.fail(code, message);
      }
    }
    if (this.stopped) return;
    this.playerId = seat.seatId;
    this.welcomed = false;
    this.channel?.close();
    this.channel = new Channel<ServerMessage, SeatMessage>(
      TOPIC.seat(this.opts.code, seat.secret),
      (msg) => this.handle(msg),
      (state) => {
        if (this.stopped) return;
        if (state === "error" && this.welcomed) {
          this.status = "reconnecting";
          this.notify();
        }
      },
    );
    this.sayHello();
    if (this.helloTimer) clearInterval(this.helloTimer);
    this.helloTimer = setInterval(() => this.sayHello(), HELLO_EVERY_MS);
    if (this.waitTimer) clearTimeout(this.waitTimer);
    this.waitTimer = setTimeout(() => {
      if (this.welcomed || this.stopped) return;
      if (resuming) {
        // The TV doesn't know this seat any more (it restarted) — join again.
        session.remove(KEYS.seat(this.opts.code));
        void this.start(true);
      } else {
        this.status = "reconnecting";
        this.error = { code: "room_not_found", message: "The TV isn't answering. Is the room still open on the TV?", fatal: false };
        this.notify();
      }
    }, resuming ? RESUME_GIVE_UP_MS : TV_SILENT_MS);
  }

  private sayHello() {
    if (!this.welcomed) this.channel?.send({ t: "hello" });
  }

  private ping() {
    this.channel?.send({ t: "ping", at: Date.now(), v: this.version });
  }

  private handle(msg: ServerMessage) {
    if (this.stopped || !msg || typeof msg !== "object") return;
    switch (msg.t) {
      case "welcome":
        if (!this.welcomed) {
          this.welcomed = true;
          if (this.helloTimer) clearInterval(this.helloTimer);
          if (this.waitTimer) clearTimeout(this.waitTimer);
          if (this.pingTimer) clearInterval(this.pingTimer);
          this.pingTimer = setInterval(() => this.ping(), SEAT_PING_MS);
          this.ping();
        }
        this.status = "open";
        this.error = null;
        this.playerId = msg.playerId;
        if (!Number.isFinite(this.bestRtt)) this.offset = msg.serverNow - Date.now();
        break;
      case "room":
        this.room = msg.room;
        if (typeof msg.v === "number") this.version = msg.v;
        if (!Number.isFinite(this.bestRtt)) this.offset = msg.serverNow - Date.now();
        if (this.status !== "closed") this.status = "open";
        break;
      case "pong": {
        const rtt = Date.now() - msg.at;
        // Trust the lowest-latency samples most; they bound the clock error best.
        if (rtt <= this.bestRtt + 25) {
          this.bestRtt = Math.min(this.bestRtt, rtt);
          this.offset = msg.serverNow - (msg.at + rtt / 2);
        }
        if (this.status === "reconnecting") this.status = "open";
        if (typeof msg.v === "number" && msg.v > this.version) this.channel?.send({ t: "sync" });
        return;
      }
      case "event":
        this.opts.onEvent?.(msg.event);
        return;
      case "error":
        if (msg.fatal) {
          session.remove(KEYS.seat(this.opts.code));
          return this.fail(msg.code, msg.message);
        }
        this.error = { code: msg.code, message: msg.message, fatal: false };
        break;
      case "closed":
        this.closedReason = msg.reason;
        this.status = "closed";
        session.remove(KEYS.seat(this.opts.code));
        this.stop();
        break;
    }
    this.notify();
  }

  send(message: SeatMessage): void {
    this.channel?.send(message);
  }

  input(data: unknown): void {
    this.send({ t: "input", data });
  }

  host(action: HostAction): void {
    this.send({ t: "host", action });
  }

  lobby(action: LobbyAction): void {
    this.send({ t: "lobby", action });
  }

  private stop() {
    this.stopped = true;
    for (const t of [this.helloTimer, this.pingTimer]) if (t) clearInterval(t);
    if (this.waitTimer) clearTimeout(this.waitTimer);
    window.removeEventListener("pagehide", this.onPageHide);
  }

  close(): void {
    this.channel?.send({ t: "bye" });
    this.stop();
    const channel = this.channel;
    setTimeout(() => channel?.close(), 300);
  }
}
