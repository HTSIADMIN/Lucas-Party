# Casino parts bin

Pure helpers carried over from the Lucas Games casino (`Lucas-Games/src/lib/games/`), rewritten to run in the TV's browser (Web Crypto instead of `node:crypto`, optional `random` argument so games can pass `ctx.random`). Nothing here is wired into a game yet — they're the starting point for the Phase 3 casino party pack in `docs/PLAN.md`:

| File | For |
|---|---|
| `cards.ts` | Decks/shoes, blackjack card values, labels |
| `poker.ts` | Best-hand evaluator (1–7 cards) → **Hold'em Night** |
| `blackjack.ts` | Hand totals, dealer rule (stands on all 17s), outcomes → **Blackjack Bash** |
| `roulette.ts` | European wheel order, colours, bet returns → a roulette party round |

Matching sounds copied into `public/sfx/`: `card-fan`, `card-shove`, `card-shuffle`, `card-slide`, `chips-collide`, `chips-handle`, `dice-throw`, `die-throw`, `ui-wood` (register them in `src/client/lib/sfx.ts` when a game uses them). Tests: `tests/casino.test.ts`.
