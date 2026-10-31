// One Supabase client per browser tab, used only for Realtime broadcast
// channels (all data goes through our /api). The anon key is public by design.

import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { BROADCAST_EVENT } from "@party/shared";

let client: SupabaseClient | null = null;

export function realtimeConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function supabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Realtime isn't configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 50 } },
    });
  }
  return client;
}

export type ChannelState = "joining" | "joined" | "error" | "closed";

/** A broadcast channel that queues sends until it has joined. */
export class Channel<In = unknown, Out = unknown> {
  state: ChannelState = "joining";
  private readonly channel: RealtimeChannel;
  private queue: Out[] = [];
  private closed = false;

  constructor(
    readonly topic: string,
    onMessage: (message: In) => void,
    private readonly onState?: (state: ChannelState) => void,
  ) {
    this.channel = supabase().channel(topic, { config: { broadcast: { self: false, ack: false } } });
    this.channel.on("broadcast", { event: BROADCAST_EVENT }, ({ payload }) => onMessage(payload as In));
    this.channel.subscribe((status) => {
      if (this.closed) return;
      if (status === "SUBSCRIBED") {
        this.setState("joined");
        const pending = this.queue;
        this.queue = [];
        for (const message of pending) void this.push(message);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        // realtime-js keeps retrying on its own; surface it so the UI can say "reconnecting".
        this.setState("error");
      } else if (status === "CLOSED") {
        this.setState("closed");
      }
    });
  }

  private setState(state: ChannelState) {
    this.state = state;
    this.onState?.(state);
  }

  private push(message: Out) {
    return this.channel.send({ type: "broadcast", event: BROADCAST_EVENT, payload: message as Record<string, unknown> });
  }

  send(message: Out): void {
    if (this.closed) return;
    if (this.state !== "joined") {
      // Bound the queue so a dead channel can't grow forever.
      if (this.queue.length > 50) this.queue.shift();
      this.queue.push(message);
      return;
    }
    void this.push(message);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.queue = [];
    void supabase().removeChannel(this.channel);
  }
}
