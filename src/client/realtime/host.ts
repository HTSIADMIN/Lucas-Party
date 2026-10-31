// The TV's side of a room: runs the RoomHost (game logic lives here, in the
// browser) and wires it to Supabase Realtime — a private channel per phone, a
// private channel the server uses to hand over seat tickets, and a public
// channel mirroring the TV view for extra screens. Snapshots go to
// sessionStorage so a TV refresh resumes the room.

import {
  HEARTBEAT_MS,
  TOPIC,
  type ErrorCode,
  type RoomEvent,
  type RoomSummary,
  type RoomView,
  type ScreenMessage,
  type SeatMessage,
  type ServerMessage,
} from "@party/shared";
import { RoomHost, type RoomSnapshot } from "@party/shared/engine/room";
import { api } from "../lib/api";
import type { ConnectionStatus } from "../lib/roomClient";
import { KEYS, session } from "../lib/storage";
import { Channel } from "./supabase";

export interface ScreenCredentials {
  code: string;
  screenSecret: string;
  screenKey: string;
  owner: { userId: string; name: string } | null;
}

export function loadScreenCredentials(code: string): ScreenCredentials | null {
  try {
    const raw = session.get(KEYS.screen(code));
    const creds = raw ? (JSON.parse(raw) as ScreenCredentials) : null;
    return creds && creds.code === code ? creds : null;
  } catch {
    return null;
  }
}

export function saveScreenCredentials(creds: ScreenCredentials): void {
  session.set(KEYS.screen(creds.code), JSON.stringify(creds));
}

function loadSnapshot(code: string): RoomSnapshot | null {
  try {
    const raw = session.get(KEYS.screenSnapshot(code));
    return raw ? (JSON.parse(raw) as RoomSnapshot) : null;
  } catch {
    return null;
  }
}

const PUBLIC_MIRROR_GAP_MS = 250;

export class HostSession {
  readonly role = "tv" as const;
  status: ConnectionStatus = "connecting";
  room: RoomView | null = null;
  closedReason: string | null = null;
  error: { code: ErrorCode; message: string; fatal: boolean } | null = null;

  private readonly host: RoomHost;
  private readonly screen: Channel<ScreenMessage, never>;
  private readonly mirror: Channel<unknown, ServerMessage>;
  private readonly seats = new Map<string, Channel<SeatMessage, ServerMessage>>();
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private mirrorTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMirror = "";
  private lastMirrorAt = 0;
  private serverClosed = false;
  private disposed = false;

  constructor(
    private readonly creds: ScreenCredentials,
    private readonly opts: { onChange(): void; onEvent(event: RoomEvent): void; tvUserId: string | null },
  ) {
    const { code } = creds;
    this.host = new RoomHost(
      code,
      {
        link: (secret) => {
          let channel = this.seats.get(secret);
          if (!channel) {
            channel = new Channel<SeatMessage, ServerMessage>(TOPIC.seat(code, secret), (msg) => this.host.handleSeatMessage(secret, msg));
            this.seats.set(secret, channel);
          }
          const ch = channel;
          return { send: (message) => ch.send(message) };
        },
        unlink: (secret) => {
          // Give the last message (e.g. "you were removed") a moment to go out.
          const channel = this.seats.get(secret);
          this.seats.delete(secret);
          if (channel) setTimeout(() => channel.close(), 1500);
        },
        onTvView: (view) => {
          this.room = view;
          this.opts.onChange();
          this.scheduleMirror();
        },
        onTvEvent: (event) => this.opts.onEvent(event),
        onSnapshot: (snapshot) => session.set(KEYS.screenSnapshot(code), JSON.stringify(snapshot)),
        onSummary: (summary) => void this.sendHeartbeat(summary),
        onGameFinished: (result) => {
          void api(`/api/rooms/${code}/results`, { body: { screenSecret: creds.screenSecret, ...result } }).catch(() => undefined);
        },
        onClosed: (reason) => this.finish(reason),
      },
      {
        owner: creds.owner,
        snapshot: loadSnapshot(code),
        tvIsOwner: () => Boolean(this.opts.tvUserId && this.host?.owner?.userId === this.opts.tvUserId),
      },
    );

    this.screen = new Channel<ScreenMessage, never>(
      TOPIC.screen(code, creds.screenKey),
      (msg) => {
        if (msg?.t === "seat") this.host.admit(msg.ticket);
        else if (msg?.t === "close") this.closeFromServer(msg.reason);
      },
      (state) => {
        if (this.status === "closed") return;
        this.status = state === "joined" ? "open" : state === "error" ? "reconnecting" : this.status;
        this.opts.onChange();
      },
    );
    this.mirror = new Channel<unknown, ServerMessage>(TOPIC.room(code), () => undefined);
    this.host.start();
    this.heartbeat = setInterval(() => void this.sendHeartbeat(this.host.summary()), HEARTBEAT_MS);
    void this.sendHeartbeat(this.host.summary());
  }

  /** The TV's own clock is the room's clock. */
  serverNow(): number {
    return Date.now();
  }

  private scheduleMirror(): void {
    if (this.mirrorTimer || this.disposed) return;
    const wait = Math.max(0, PUBLIC_MIRROR_GAP_MS - (Date.now() - this.lastMirrorAt));
    this.mirrorTimer = setTimeout(() => {
      this.mirrorTimer = null;
      if (!this.room || this.disposed) return;
      const json = JSON.stringify(this.room);
      if (json === this.lastMirror) return;
      this.lastMirror = json;
      this.lastMirrorAt = Date.now();
      this.mirror.send({ t: "room", room: this.room, serverNow: Date.now() });
    }, wait);
  }

  private async sendHeartbeat(summary: RoomSummary): Promise<void> {
    if (this.disposed || this.status === "closed") return;
    try {
      const res = await api<{ ok: boolean; closed: string | null }>(`/api/rooms/${this.creds.code}/heartbeat`, {
        body: { screenSecret: this.creds.screenSecret, summary },
      });
      if (res.closed) this.closeFromServer(res.closed);
    } catch {
      // Offline for a moment; the next beat will catch up.
    }
  }

  private closeFromServer(reason: string): void {
    this.serverClosed = true;
    this.host.close(reason);
  }

  private finish(reason: string): void {
    if (!this.serverClosed) {
      void api(`/api/rooms/${this.creds.code}/close`, { body: { screenSecret: this.creds.screenSecret, reason } }).catch(() => undefined);
    }
    this.mirror.send({ t: "closed", reason });
    this.status = "closed";
    this.closedReason = reason;
    session.remove(KEYS.screen(this.creds.code));
    session.remove(KEYS.screenSnapshot(this.creds.code));
    this.opts.onChange();
    setTimeout(() => this.dispose(), 2000);
  }

  /** Host controls on the TV itself (when the TV is logged in as the host). */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.mirrorTimer) clearTimeout(this.mirrorTimer);
    this.host.dispose();
    this.screen.close();
    this.mirror.close();
    for (const channel of this.seats.values()) channel.close();
    this.seats.clear();
  }
}
