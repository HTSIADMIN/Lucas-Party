# Lucas Games: Party Night — notes for Claude

Jackbox-style party platform: a TV shows the game, up to 8 phones are controllers, a host runs it from their phone. Rebuilt from scratch on 2026-10-31 (the old casino lives in the separate `Lucas-Games` repo and still runs at lucas.team — never touch it from here). Read `docs/PLAN.md` for the why.

Stack: **Next.js 16 (App Router, Turbopack) on Vercel + Supabase** (Postgres + Realtime). Supabase project `jvzowsniphluptpbpkvg` ("Lucas Party", us-east-1).

## Layout

| Path | What |
|---|---|
| `src/app/` | Routes. Every page is a thin `"use client"` wrapper around a component in `src/client/pages/`; `providers.tsx` mounts auth + toasts after hydration. `api/[[...route]]/route.ts` hands every `/api/*` request to Hono. |
| `src/server/` | `app.ts` Hono API (auth, rooms, admin) · `rooms.ts` room registry + caps · `index.ts` picks the store · `db/` `Store` interface, `SupabaseStore` (prod), `SqliteStore` (local + tests) · `broadcast.ts` server → TV messages · `auth/` scrypt + session tokens |
| `src/shared/` | Imported as `@party/shared`: protocol, catalog, characters, themes, text cleaning, `realtime.ts` (topics + seat messages), per-game view/input types (`games/*.ts`) |
| `src/shared/engine/` | `room.ts` **RoomHost** (runs in the TV's browser) · `games/` the pure game state machines · `random.ts` crypto randomness |
| `src/client/` | `pages/` · `site/` chrome · `phone/` controller lobby · `games/` TV + phone views · `art/` SVG characters/backdrops · `ui/` components · `realtime/` Supabase channels, `HostSession` (TV), `ViewerSession` · `lib/` api, auth, `roomClient` (phone), hooks, router shim, sfx · `styles/` |
| `supabase/migrations/` | Schema. Append-only. |

## How a party runs

- **The TV is the game server.** `HostSession` creates a `RoomHost` in the TV tab; games are pure state machines (`engine/types.ts`: `create`, `onInput`, `onDeadline`, optional `onSkip/onConnectionChange/onResume`, plus `tvView`, `playerView`, `scores`). The room owns the single phase deadline (pause/resume/skip/extend) — games only call `ctx.setDeadline(ms)`.
- **Transport is Supabase Realtime Broadcast**, public channels with capability names (`src/shared/realtime.ts`): `party:<CODE>` public mirror for extra screens, `party:<CODE>:s:<seatSecret>` one per phone, `party:<CODE>:tv:<screenKey>` server → TV. One event name, `msg`.
- **Joining:** phone `POST /api/rooms/:code/join` → server checks the room + guest rules, mints a seat secret, sends the TV a `{ t: "seat", ticket }` over its private channel (REST `httpSend`) → phone subscribes to its seat channel and says `hello` until the TV answers `welcome`.
- After any change the room flushes once: full per-recipient snapshots (`{ t: "room" }`, deduped per seat), then queued events (`{ t: "event" }` for SFX/haptics/toasts). TV view is public — never put secrets in `tvView`.
- Phones ping every 4 s (clock sync to the TV's clock + version check → `sync`). Seats time out after 13 s of silence. Seat tokens live in per-tab `sessionStorage`; guests can reclaim a seat by name, accounts by user id.
- The TV saves a room snapshot to `sessionStorage` (throttled 400 ms), so refreshing the TV resumes mid-game. It heartbeats `POST /api/rooms/:code/heartbeat` every 45 s with a summary; 3 min without one and the room counts as dead.
- Host powers: a seat ticket carries `owner: true` when the joining account owns the room (or is a host claiming a pending TV).
- Compute guard rails live in `src/server/rooms.ts`: only hosts/admins open *active* rooms; anyone else gets a *pending* room until a host joins; per-host / global / per-IP caps.

## Conventions

- API: `{ error }` with a real status. Writes must be JSON; cross-origin writes are refused. `runtime = "nodejs"` on the route.
- All outcome randomness goes through `src/shared/engine/random.ts` (crypto), never `Math.random`.
- Untrusted input: `asRecord()` + `cleanText()`; games ignore malformed input silently. Inputs reach the TV from phones over public channels — the seat secret is the only authentication, so never trust a seat to speak for another.
- Styling: tokens only (`var(--…)`), class-based components. TV layouts use **em**. Phone cards are `display: grid` with `minmax(0, 1fr)`.
- Navigation goes through `src/client/lib/router.tsx` (a small shim over `next/navigation`), not `next/link` directly.
- Art: the user generates raster art with ChatGPT; we write prompts (`docs/design/image-prompts.md`) and wire files in via `art/manifest.ts`. Don't hand-draw new SVG scenery.

## Gotchas (learned the hard way)

- **Versions are newer than you may expect:** Next 16.4 (async params, Turbopack by default, `allowedDevOrigins` enforced), React 19, Vitest 4, supabase-js 2.118. TypeScript is pinned to 5.9 for Next's type-check. Read `node_modules/next/dist/docs/` before using a Next API.
- **`node:sqlite`:** Node 26.11 renamed `DatabaseSync` → `Database`; `db/sqlite.ts` uses whichever exists. It's only loaded locally (dynamic import).
- **Keep `path.resolve(process.cwd(), …)` behind `/*turbopackIgnore: true*/`** or the build traces the whole repo into the function.
- **`crypto.randomInt` caps its range at 2^48 − 1.** `randomFloat()` uses `getRandomValues` instead.
- **Don't write `\uXXXX` escapes in source with the file-writing tool** — they can land as literal characters. Use `\p{…}` classes or `String.fromCharCode`.
- **Browser testing:** background tabs don't run CSS animations or `requestAnimationFrame`, so front a tab before screenshots. To be several players in one browser, use different origins (`localhost`, `127.0.0.1`, the LAN IP): cookies are per origin and seat tokens are per tab. Ties are real: rank with `rankOf()` semantics (1, 1, 3).

## Testing

- `npm test` — engines via `tests/harness.ts` (manual clock), `room.test.ts` (RoomHost with fake links + fake timers: joins, kicks, 8-seat cap, a full Punchline game, TV-refresh resume), `api.test.ts` (Hono app + in-memory SQLite + capturing broadcaster).
- `npm run typecheck`, `npm run build`.
- `npm run dev:seed` makes local test accounts (random passwords in `data/dev-accounts.json`).
