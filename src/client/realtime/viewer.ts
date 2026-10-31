// An extra screen (or the admin's "Watch"): mirrors the hosting TV's view from
// the room's public channel. Can't control anything.

import { TOPIC, type RoomView, type ServerMessage } from "@party/shared";
import type { ConnectionStatus } from "../lib/roomClient";
import { Channel } from "./supabase";

export class ViewerSession {
  readonly role = "viewer" as const;
  status: ConnectionStatus = "connecting";
  room: RoomView | null = null;
  closedReason: string | null = null;
  error = null;
  private offset = 0;
  private readonly channel: Channel<ServerMessage, never>;

  constructor(code: string, onChange: () => void) {
    this.channel = new Channel<ServerMessage, never>(
      TOPIC.room(code),
      (msg) => {
        if (msg?.t === "room") {
          this.room = msg.room;
          this.offset = msg.serverNow - Date.now();
          this.status = "open";
        } else if (msg?.t === "closed") {
          this.status = "closed";
          this.closedReason = msg.reason;
        }
        onChange();
      },
      (state) => {
        if (this.status === "closed") return;
        if (state === "error") this.status = "reconnecting";
        onChange();
      },
    );
  }

  serverNow(): number {
    return Date.now() + this.offset;
  }

  dispose(): void {
    this.channel.close();
  }
}
