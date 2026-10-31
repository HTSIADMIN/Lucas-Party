# Deploying — Vercel + Supabase

The site is a Next.js app on Vercel. Supabase provides **Postgres** (accounts, sessions, site settings, the room registry, game history) and **Realtime** (all live traffic between the TV and the phones). The game itself runs in the TV's browser, so Vercel only serves pages and short API calls: log in, open a room, join, and one heartbeat per room every 45 seconds.

## 1. Supabase

1. Create a project (pick the region closest to your Vercel functions; this repo pins Vercel to `iad1`, next to Supabase `us-east-1`).
2. Run [`supabase/migrations/0001_party_platform.sql`](../supabase/migrations/0001_party_platform.sql) in the SQL editor (or `supabase db push`). RLS is on with no policies: only the server's secret key can touch the tables.
3. Realtime needs no setup. The app uses public Broadcast channels whose names contain unguessable secrets; keep **Realtime → Settings → Allow public access** on.
4. Note down, from **Project Settings → API Keys**: the project URL, the **publishable** key, and the **secret** key (or the legacy `anon` / `service_role` pair).

## 2. Vercel

1. Import the GitHub repo (framework preset: Next.js — no build settings to change).
2. **Settings → Environment Variables** (Production, and Preview if you use previews):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable (or anon) key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Secret (or service_role) key — mark it **Sensitive** |
   | `BOOTSTRAP_ADMIN` | Your username |
   | `PUBLIC_URL` | Optional: a custom domain for the TV's QR code (defaults to the production domain) |

3. Redeploy after changing variables — `NEXT_PUBLIC_*` values are baked into the browser bundle at build time.
4. Without `SUPABASE_SERVICE_ROLE_KEY` the API answers `503` with a message saying so (it never falls back to SQLite on Vercel).

## 3. First run

Open the production URL, sign up with your `BOOTSTRAP_ADMIN` username (you're admin immediately), then promote friends to **Host** on `/admin`.

Preview deployments sit behind Vercel's login by default (Deployment Protection); the production domain is public.

## What it costs

- **Vercel:** a party is a few hundred short function calls (joins, heartbeats, results). Pages are static.
- **Supabase Realtime:** each phone pings every 4 s and gets a fresh view whenever its screen changes, so a busy 8-player room is on the order of 10–20 messages a second. Watch **Supabase → Usage → Realtime messages** and the caps in `/admin` (`MAX_ACTIVE_ROOMS`, `MAX_ROOMS_PER_HOST`) if you open hosting to more people.

## Local development against the same project

Put the two `NEXT_PUBLIC_SUPABASE_*` values in `.env.local` and leave out the secret key: accounts then live in `./data/party.db` (SQLite) while parties use the real Realtime service. Add the secret key locally only if you want to share production accounts.
