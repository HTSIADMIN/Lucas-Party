// Builds the API once per server instance. On Vercel that means once per warm
// function; locally once per dev server.

import path from "node:path";
import { createApp } from "./app";
import { MemoryBroadcaster, supabaseBroadcaster, type Broadcaster } from "./broadcast";
import { ON_VERCEL, loadConfig, type Config } from "./config";
import { SupabaseStore } from "./db/supabase";
import type { Store } from "./db/types";

export interface ServerContext {
  config: Config;
  store: Store;
  broadcast: Broadcaster;
  app: ReturnType<typeof createApp>;
}

let instance: Promise<ServerContext> | null = null;

async function openStore(config: Config): Promise<Store> {
  if (config.supabaseUrl && config.supabaseServiceKey) return new SupabaseStore(config.supabaseUrl, config.supabaseServiceKey);
  if (ON_VERCEL) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.");
  }
  // Local development without secrets: SQLite in DATA_DIR. Loaded lazily so
  // production bundles never touch node:sqlite.
  const { SqliteStore } = await import("./db/sqlite");
  return new SqliteStore(path.join(config.dataDir, "party.db"));
}

export function getServer(): Promise<ServerContext> {
  instance ??= (async () => {
    const config = loadConfig();
    const store = await openStore(config);
    const broadcast =
      config.supabaseUrl && config.supabaseAnonKey ? supabaseBroadcaster(config.supabaseUrl, config.supabaseAnonKey) : new MemoryBroadcaster();
    return { config, store, broadcast, app: createApp({ config, store, broadcast }) };
  })().catch((error) => {
    instance = null;
    throw error;
  });
  return instance;
}
