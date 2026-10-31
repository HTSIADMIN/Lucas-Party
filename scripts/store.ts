// Scripts talk to the same database the app would: Supabase when the service
// key is configured (.env.local), otherwise the local SQLite file.
import path from "node:path";
import { loadConfig, loadLocalEnv } from "../src/server/config";
import { SupabaseStore } from "../src/server/db/supabase";
import type { Store } from "../src/server/db/types";

export async function openStore(): Promise<{ store: Store; kind: "supabase" | "sqlite"; dataDir: string; close(): void }> {
  loadLocalEnv();
  const config = loadConfig();
  if (config.supabaseUrl && config.supabaseServiceKey) {
    return { store: new SupabaseStore(config.supabaseUrl, config.supabaseServiceKey), kind: "supabase", dataDir: config.dataDir, close() {} };
  }
  const { SqliteStore } = await import("../src/server/db/sqlite");
  const store = new SqliteStore(path.join(config.dataDir, "party.db"));
  return { store, kind: "sqlite", dataDir: config.dataDir, close: () => store.close() };
}
