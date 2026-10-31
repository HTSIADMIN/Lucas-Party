# Lucas Games: Party Night — the plan

*Written 2026-10-31, alongside the first build of this repo.*

## What we're building

A party-game site for friends, built around one screen everyone watches and one phone each:

- **The TV** (a smart-TV browser, a laptop on HDMI, or a screen-share) opens a room and shows a 4-letter code + QR.
- **Up to 8 players** join on their phones — no app install. The phone is the controller *and* the private hand (secret words, your prompts, your bet).
- **The host** runs the show from their own phone: pick the game, theme, timer pace, start, pause, skip, add time, kick, lock, end.
- **Only promoted accounts can host.** Anyone can make an account (or join as a guest); the admin promotes friends to Host on `/admin`. Hosting is what costs server compute, so it's the thing we gate.

## Decision 1 — a new repo and new projects, same stack

The old Lucas Games is a Next.js casino on Vercel + Supabase with HTTP polling every 10 s, and it keeps running untouched at lucas.team. The party platform is a fresh GitHub repo, a fresh Vercel project and a fresh Supabase project — still **Next.js + Vercel + Supabase**, but wired very differently:

| Need | Old casino | Party platform |
|---|---|---|
| Live rooms with timers | Serverless functions + DB rows + polling | The **TV's browser** runs the room and every game timer |
| Instant input → TV | HTTP round trip + Postgres + poll | One Supabase Realtime broadcast (phone → TV) |
| Private info per phone | Per-request auth + queries | Per-recipient snapshots, one private channel per phone |
| Host-only compute | n/a | Role-gated room creation + caps; the server does almost nothing per room |

Why not run rooms in a serverless function? Vercel functions can't hold a room in memory for a 15-minute game (connections are cut at the function's max duration, with no room affinity — [tech-stack.md §2.4](research/tech-stack.md)). Jackbox has the same shape: the game runs on the console/PC, phones are thin web controllers. Here the "console" is the TV's browser tab.

The product changed too: the wallet ledger, cosmetics, clans and Penny Pinchers don't belong in a party game, and the auth model (PIN → password + roles) and design system are both new. So: clean repo, carry over what's genuinely reusable.

**Carried over:** the crash curve + crash-point distribution (→ Rocket Riot), small UI sound files, the "one poll per concern" lesson (now zero polls), and the casino games as roadmap items (Hold'em can reuse the poker hand evaluator; Blackjack, Roulette, Liar's Dice).

## Decision 2 — TypeScript everywhere, not Rust

You asked whether the big party games are written in something like Rust. What they actually use ([full sources](research/tech-stack.md), [Jackbox tech](research/jackbox-catalog.md#3-tech-stack)):

| Product | TV / game | Phone controller | Room server |
|---|---|---|---|
| Jackbox | Adobe AIR → in-house engine → Unreal Engine 5 (Trivia Murder Party 3) | **Web app** (Backbone → Vue 3) at jackbox.tv | "ecast": JSON over a plain WebSocket |
| AirConsole | HTML5/JS (+ Unity plugin) | Web app | Relay; WebRTC where supported |
| Discord Activities | Web app in an iframe | — | WebSocket only |
| Among Us, Fall Guys, Overcooked | Unity (C#) | — | Custom |
| Fish Folk: Jumpy | Rust + Bevy | — (local couch) | — |

Two takeaways:

1. **Every TV + phones party game uses web tech on the phone** — that's the only way to avoid an app install. So the client is the web regardless.
2. **The language isn't the bottleneck.** One room is 9 devices and a handful of messages per second. The old site felt slow because of polling and serverless round trips, not JavaScript. Moving the game loop into the TV removed the server hop entirely.

**Where Rust would pay off:** real-time movement games (sumo push-out, platformer knock-offs). There the plan is Rust compiled to WebAssembly *inside the TV's browser* — the [Rapier](https://rapier.rs) physics engine via `@dimforge/rapier3d`, rendered with Three.js — with phone inputs over WebRTC data channels (Supabase Realtime as the signalling layer) for the lowest latency. Same stack, no new servers.

## Architecture

```
                     Supabase Realtime (Broadcast, public channels with secret names)
  Phones ×8 ◀──── party:CODE:s:<seat secret> ────▶  TV browser = RoomHost + game engines
  Extra screens ◀── party:CODE (public mirror) ◀──   (timers, rules, scores, snapshots)
                                                          ▲            │ heartbeat 45 s,
              Vercel: Next.js pages + /api (Hono)  ── party:CODE:tv:<key> ┘ results
              auth, admin, room registry, seat tickets ─▶ Supabase Postgres
```

- **The TV runs the game.** `RoomHost` (`src/shared/engine/room.ts`) owns seats, the phase clock (with pause/resume), host permissions and liveness. Games are pure state machines (`create / onInput / onDeadline / tvView / playerView`) — see `src/shared/engine/types.ts`.
- **The server only admits people.** Joining goes through the API (room open? guests allowed? who's the host?), which mints a seat secret and hands the TV a ticket over its private channel. Phones then talk to the TV directly over their own channel. Per room, the server sees one request per join and one heartbeat every 45 s.
- **Per-recipient snapshots.** After any change the room sends each device a full snapshot of what *it* may see: the TV shows the public view, each phone gets its own. Secret words and authorship stay in the TV until reveal. Full snapshots (not diffs) make reconnects trivially correct.
- **Clock sync.** Phones estimate the TV's clock offset from ping/pong, so countdowns and the Rocket Riot curve match on every screen.
- **Reconnects.** Phones resume their seat with a per-tab token; guests who lose it can reclaim their seat by typing the same name; accounts reclaim automatically. Refreshing the TV resumes from a snapshot in `sessionStorage`.
- **Shared types.** `src/shared` holds the protocol, catalog, characters, themes and every game's view/input types.

## Accounts, roles, and compute

| Role | Can |
|---|---|
| Guest (no account) | Join a room with a code (admin can turn guests off) |
| Player | Same, plus keep a name/character across parties |
| Host | Open rooms and run games |
| Admin | Everything + `/admin`: promote/demote, disable, reset passwords, delete, close rooms, toggle sign-ups/guests |

Passwords are hashed with scrypt; sessions are random tokens stored hashed (SHA-256) with an HttpOnly, SameSite=Lax cookie. Login/sign-up are rate-limited, and login timing doesn't reveal which usernames exist.

**Guard rails** (in `src/server/rooms.ts`, limits in env vars):

- Only hosts/admins create *active* rooms. Anyone else opening `/tv` gets a *pending* room that can't start a game until a host joins it; pending rooms are capped per IP (3) and overall (100).
- `MAX_ROOMS_PER_HOST` (default 2) and `MAX_ACTIVE_ROOMS` (default 25); admins are exempt.
- A room is live only while its TV heartbeats; 3 min of silence and it's dead. Closing the TV tab ends the party.
- 8 seats max, login/sign-up rate limits, JSON-only writes with origin checks. Game compute is the TV's own CPU, so a party costs the server almost nothing.

## What shipped in this first build

- Front page (join with code or log in, the game lineup, how it works), `/games`, sign-up/login with character pick, profile, host page, admin console, `/design` living style guide.
- TV screen (code + QR + 8 seats + Telly, then the game stage), phone controller (join, lobby, host lobby, in-game host sheet).
- Three games:
  - **Punchline Panic** — head-to-head joke writing + voting, 3 rounds, Zinger/Jinx/Forfeit, panic button. *(Quiplash-style, difficulty 1.)*
  - **Rocket Riot** — the old Crash game as a couch game: bets, Double Down, Autopilot, Daredevil bonus, Moonshot finale.
  - **Odd One Out** — hidden-word bluffing; the faker can steal the round by guessing the word. *(Chameleon-style.)*
- Five themes (Showtime, Neon Arcade, Picnic, Spooky, Cosmos), eight characters with seven moods, Telly the host.
- 38 tests: game state machines, the TV-side room host (joins, kicks, caps, a full game, TV refresh) and the HTTP API.

## Roadmap

Ordered by "fun per hour of work", using the difficulty ratings in [research](research/README.md).

**Phase 1 — quick wins (text + voting, no new tech)**
1. Great Minds (match the majority) · 2. Most Likely To… · 3. Dial It In (Wavelength-style dial) · 4. Liar's Dice (hidden dice on phones) · 5. Spy Grid (Codenames-style, spymaster key on phone)

**Phase 2 — drawing pipeline** (phone canvas → compressed strokes → TV)
6. Doodle Fraud (Drawful-style) · 7. Scribble Chain (Telestrations-style) · 8. Fib Factory (needs a verified fact bank — or a "facts about your friends" mode with player-supplied content)

**Phase 3 — casino party pack** (our niche: research found no casino-style bluffing/betting party games on Netflix or Luna)
9. Hold'em Night (reuse the poker evaluator) · 10. Blackjack Bash · 11. Dice Derby (Camel Up-style betting race — see [game ideas](research/game-ideas.md))

**Phase 4 — real-time + big games**
12. Mash Bash minigames · 13. Word Bomb · 14. Full Moon (Werewolf) · 15. Bomb Squad (Keep Talking-style)

**Phase 5 — movement games** (Rapier physics in the TV, see Decision 2)
16. Sumo Smash (push everyone off a shrinking ring) · 17. Ledge Wars (platformer knock-offs) — using the movement-ready character spec in [characters-in-motion.md](design/characters-in-motion.md).

**Platform backlog:** audience mode (watchers beyond 8 vote), custom prompt packs per host, optional profanity filter, TV hand-off (move a running party to another screen), PWA install for the TV, music beds per theme, generated art via [the prompt pack](design/image-prompts.md), achievements carried over from the old site.

## Decided

- **Hosting:** Vercel + Supabase, new projects alongside the casino. See [DEPLOY.md](DEPLOY.md).
- **Admin:** `BOOTSTRAP_ADMIN=lucas`.
- **Art:** ChatGPT generates the raster art; prompts live in [image-prompts.md](design/image-prompts.md).

## Still open

- **Guests:** allowed by default — turn off in `/admin → Settings` if you want accounts only.
- **Game names** are working titles; rename freely in `src/shared/catalog.ts`.
