import path from "node:path";

// Spelled out in full (not via an alias) so bundlers can constant-fold it.
export const IS_PROD = process.env.NODE_ENV === "production";
export const ON_VERCEL = Boolean(process.env.VERCEL);

/** Scripts run outside Next.js, so they load .env.local / .env themselves. */
export function loadLocalEnv(): void {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(path.resolve(/*turbopackIgnore: true*/ process.cwd(), file));
    } catch {
      // optional
    }
  }
}

function int(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function list(value: string | undefined): string[] {
  return (value ?? "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
}

export interface Config {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  /** Server-only. Without it (local dev) the app uses SQLite in DATA_DIR. */
  supabaseServiceKey: string | null;
  dataDir: string;
  bootstrapAdmin: string | null;
  publicUrl: string | null;
  /** Extra origins allowed to send API writes (same-host is always allowed). */
  allowedOrigins: string[];
  maxActiveRooms: number;
  maxRoomsPerHost: number;
  trustProxy: boolean;
  sessionTtlMs: number;
  secureCookies: boolean;
}

export function loadConfig(overrides: Partial<Config> = {}): Config {
  const env = process.env;
  const publicUrl =
    env.PUBLIC_URL?.trim().replace(/\/$/, "") ||
    (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : null);
  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null,
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null,
    supabaseServiceKey: env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null,
    // Local SQLite only; turbopackIgnore keeps the deploy from tracing the whole repo.
    dataDir: path.resolve(/*turbopackIgnore: true*/ process.cwd(), env.DATA_DIR?.trim() || "data"),
    bootstrapAdmin: env.BOOTSTRAP_ADMIN?.trim().toLowerCase() || null,
    publicUrl,
    allowedOrigins: list(env.ALLOWED_ORIGINS),
    maxActiveRooms: int(env.MAX_ACTIVE_ROOMS, 25),
    maxRoomsPerHost: int(env.MAX_ROOMS_PER_HOST, 2),
    trustProxy: ON_VERCEL || env.TRUST_PROXY === "1" || env.TRUST_PROXY === "true",
    sessionTtlMs: 30 * 24 * 60 * 60_000,
    secureCookies: env.COOKIE_SECURE ? env.COOKIE_SECURE === "1" : ON_VERCEL || Boolean(publicUrl?.startsWith("https://")),
    ...overrides,
  };
}
