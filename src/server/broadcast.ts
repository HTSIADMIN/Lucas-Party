// Server → realtime. Seat tickets and "room closed" notices reach the TV (and
// phones) through Supabase Realtime's HTTP broadcast endpoint — no socket
// needed, which suits short-lived Vercel functions.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { BROADCAST_EVENT } from "@party/shared";

export interface Broadcaster {
  send(topic: string, payload: unknown): Promise<void>;
}

export function supabaseBroadcaster(url: string, anonKey: string): Broadcaster {
  let client: SupabaseClient | null = null;
  return {
    async send(topic, payload) {
      client ??= createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const channel = client.channel(topic);
      try {
        await channel.httpSend(BROADCAST_EVENT, payload as Record<string, unknown>);
      } finally {
        void client.removeChannel(channel);
      }
    },
  };
}

/** Collects messages instead of sending them (tests, or no Supabase configured). */
export class MemoryBroadcaster implements Broadcaster {
  readonly sent: { topic: string; payload: unknown }[] = [];
  listener: ((topic: string, payload: unknown) => void) | null = null;
  async send(topic: string, payload: unknown): Promise<void> {
    this.sent.push({ topic, payload });
    this.listener?.(topic, payload);
  }
}
