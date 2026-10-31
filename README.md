# Lucas Games — Party Night

Party games for the big screen. Open the site on a TV, everyone joins from their phone with a 4-letter code, and the host runs the show from theirs. Up to 8 players per party; hosting is invite-only so randoms can't burn your compute.

**Games so far:** Punchline Panic (write the funniest answer, the room votes) · Rocket Riot (bet, ride, bail before it blows) · Odd One Out (everyone knows the secret word except the faker) — with more on the roadmap.

Runs on **Next.js 16 on Vercel + Supabase** (Postgres for accounts, Realtime for the live party traffic).

## Quick start

Needs Node 22.13+ (Node 24 LTS recommended).

```bash
npm install
cp .env.example .env.local   # fill in the two NEXT_PUBLIC_SUPABASE_* values
npm run dev
```

- Site: <http://localhost:3000>
- Phones on the same Wi-Fi: the TV screen shows your computer's LAN address automatically.
- Without `SUPABASE_SERVICE_ROLE_KEY`, local accounts live in a SQLite file under `./data` while the party traffic still runs over your Supabase project's Realtime.

### Make yourself admin

Set `BOOTSTRAP_ADMIN=<your username>` and sign up (or log in) with that username. Or: `npm run user:role -- <username> admin`.

Throwaway local accounts: `npm run dev:seed` creates `dev_admin`, `dev_host` and `dev_player` with random passwords saved to `data/dev-accounts.json` (local only, gitignored).

### Host a party

1. Log in as a host/admin → **Host a party** (this screen becomes the TV). Or open `/tv` on the TV and log in on your phone to claim it.
2. Friends join at the site with the code (or scan the QR).
3. Join on your own phone too — your account gets the host controls: pick a game, theme, timer pace, then **Start**. In-game, the 👑 Host button opens pause / skip / +15 s / end / kick.

Testing alone? Use separate origins so each "phone" has its own login: `http://localhost:3000` for the host, `http://127.0.0.1:3000` (and your LAN IP) for guests. Each tab is its own player.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm test` | Vitest: game engines, the TV-side room host, and the HTTP API |
| `npm run typecheck` | TypeScript |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run user:role -- <name> <player\|host\|admin>` | Change a user's role |
| `npm run user:create -- <name> <password> [role]` | Create a user |
| `npm run dev:seed` | Create local test accounts |

## How it fits together

```
src/app/              Next.js routes — every page is a client component; /api/* is one catch-all route
src/server/           Hono API (auth, admin, room registry), stores (Supabase / SQLite), broadcast
src/shared/           Protocol, catalog, characters, themes, realtime topics, game view types
src/shared/engine/    RoomHost + the game state machines — these run in the TV's browser
src/client/           Pages, site chrome, TV screen, phone controller, game views, design system
supabase/migrations/  Database schema
docs/                 Plan, research, design system, image prompts, deploy guide
```

- [docs/PLAN.md](docs/PLAN.md) — why we rebuilt, architecture, permissions, roadmap
- [docs/research/](docs/research/README.md) — every Jackbox game, the wider party-game landscape, the realtime tech stack, our game ideas
- [docs/design/design-system.md](docs/design/design-system.md) — the design system (also live at `/design`)
- [docs/design/image-prompts.md](docs/design/image-prompts.md) — ChatGPT image prompts + how to drop the art in
- [docs/DEPLOY.md](docs/DEPLOY.md) — Vercel + Supabase setup

## Adding a game

1. `src/shared/games/<id>.ts` — view + input types. Add the id to `LIVE_GAME_IDS` and a `GAME_CATALOG` entry (`status: "live"`).
2. `src/shared/engine/games/<id>/index.ts` — implement `GameDefinition` (see `engine/types.ts`), register it in `engine/games/index.ts`.
3. `src/client/games/<id>/` — a TV view and a phone view, registered in `games/registry.ts`. Reuse `games/shared.tsx` (scoreboard, podium, progress rows).
4. Add a test next to the others in `tests/` using the `harness()` helper.
