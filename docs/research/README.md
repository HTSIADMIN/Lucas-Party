# Research

Snapshot taken 2026-10-31. Three deep-dive reports (every non-obvious claim has a source link; anything unverified is labelled) plus our own ideas.

| File | What's in it |
|---|---|
| [jackbox-catalog.md](jackbox-catalog.md) | **Every Jackbox game** — all 12 Party Packs (2014 → Pack 12, Oct 2026), standalones, compilations, the 2025–26 release log, Jackbox's tech stack, and the mechanics that recur across the catalog. Each game has player count, core loop, phone input, content needs and a 1–5 build difficulty. |
| [party-landscape.md](party-landscape.md) | The wider landscape: phone-controller platforms (AirConsole, Netflix TV games, Amazon Luna GameNight, Kahoot-style, Discord Activities), couch console/PC hits, browser party games, and tabletop games that translate to phones + a TV — with fit ratings, engines/languages, licensing caveats and a "best fits" shortlist. |
| [tech-stack.md](tech-stack.md) | What party games run on, realtime server options and their 2026 limits/pricing (Node, uWS, Colyseus, Cloudflare Durable Objects, Supabase Realtime, Vercel, Elixir, Go, Rust), WebSocket vs WebRTC latency, benchmarks, `node:sqlite` status, and cheap hosting. |
| [game-ideas.md](game-ideas.md) | Our own game ideas and the combined build order. |

## The short version

- **Easiest Jackbox family to clone:** "write an answer, the room votes" (Quiplash and friends) — difficulty 1. We built ours first: **Punchline Panic**.
- **Best fit for TV + phones:** private information on each phone, shared reveal on the TV (Codenames, Chameleon/Spyfall, Wavelength, Werewolf, Liar's Dice). We built **Odd One Out** (Chameleon-style) first.
- **Big TV companies piled in during 2025–26:** Netflix (Party Crashers, Codenames Party, Jackbox Party Essentials…) and Amazon Luna GameNight all use phone-as-controller with QR join. The format is mainstream now.
- **A gap we can own:** casino-style bluffing/betting party games (Liar's Dice, Skull, Camel Up-style betting) didn't show up on those platforms' lists. That's literally our old site's DNA — see Rocket Riot, and Phase 3 of the roadmap.
- **Tech:** every phone-controller platform relays JSON over WebSockets; the language isn't the bottleneck. PartyKit's hosted platform shut down on 2026-10-23, Vercel WebSockets cut out after 5–13 minutes, Supabase Realtime Free caps at 100 msgs/s — so one small always-on Node process is the simple, cheap answer.

## IP note

Game *mechanics* aren't copyrightable, but names, art, and written content (prompts, trivia, card text) are. Everything in this repo is original: our own names, characters, prompt banks and topic cards. Keep it that way when adding games — reference the genre ("Wavelength-style") in docs, never ship their text or art.
