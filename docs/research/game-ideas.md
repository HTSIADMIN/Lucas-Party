# Game ideas

Original concepts for Lucas Games, plus how they rank against the research shortlist. Difficulty uses the same 1–5 scale as the catalogs (1 = text + voting, 5 = heavy real-time/art/audio).

## Built

| Game | Pitch | Why it's first |
|---|---|---|
| **Punchline Panic** | Two players get the same weird prompt; the room votes on the funnier answer. Round 2 is double points; the final "Last Laugh" is everyone vs everyone. A panic button fills a canned answer for half points. | The proven Jackbox core loop at difficulty 1. |
| **Rocket Riot** | Our old Crash game as a couch game. Everyone bets party chips, the rocket climbs, smash BAIL OUT before it explodes. Double Down once per game, Autopilot targets, 🔥 Daredevil bonus for the last one off, Moonshot finale. | Reuses our crash engine; shows off real-time play; casino niche. |
| **Odd One Out** | Everyone's phone shows the secret word from a 16-word topic card — except the faker's. One-word clues go round, then everyone votes. A caught faker steals the round by guessing the word. | Private-info-on-phone format, tiny content needs. |

## Original ideas

| # | Idea | Pitch | Diff | Reuses |
|---|---|---|---|---|
| 1 | **Dice Derby** | The Party Crew race across the TV (Camel Up-style). Each lap, players secretly bet chips on phones; dice rolls move racers; one-time "banana peel" sabotage cards. Odds shift as the race unfolds. | 3 | Chips + odds UI from Rocket Riot; characters as racers |
| 2 | **Saloon Showdown** | Quick-draw duels. Everyone holds their thumb on the phone; Telly says "Steady…" — tap the moment "DRAW!" flashes. Too early = disqualified. Reaction times measured on the phone so Wi-Fi lag doesn't matter. | 2 | Nod to the old saloon theme; great as a Mash Bash minigame |
| 3 | **Lie Detector Telly** | One player answers a personal question out loud — truth or lie, chosen secretly on their phone. Everyone votes; Telly's screen becomes a polygraph needle for the reveal. Points for fooling people / spotting lies. | 1 | Voting UI; Telly's screen face |
| 4 | **Crowd Pleaser** | Everyone answers a quick poll ("pineapple on pizza?"), then guesses how many said yes. Closest guess wins. Data comes from your own players, so no survey bank needed. | 1 | Voting + number input |
| 5 | **Emoji Pitch** | Pitch a movie, band, or invention in exactly three emoji. Others guess the prompt or vote for the best pitch. | 2 | Punchline's prompt/vote engine |
| 6 | **Heist Night** | Co-op: the vault code is split across phones — each player sees one clue, nobody sees the code. Talk it out before the guard (timer) returns. Escalating vaults. | 3 | Odd One Out's private-info routing |
| 7 | **Bid or Bust** | Mystery-box auction. Players bid chips on boxes shown on the TV; some hold jackpots, some hold rubber chickens. Hints are dealt privately to different phones. | 3 | Chips, private hints |
| 8 | **Character Court** | One player is "on trial" for a silly crime ("ate the last slice"). Two lawyers write their best argument; the jury votes. Rotate roles each round. | 2 | Punchline's duel + vote |
| 9 | **Stop the Clock** | A hidden timer counts on the TV; stop it on your phone as close to 10.00 seconds as you can — after the display goes dark at 3 seconds. | 1 | Mash Bash minigame |
| 10 | **Telly's Talk Show** | One player is the celebrity guest; everyone else writes interview questions, the room votes the best ones onto the TV, and the guest answers aloud. Pure social glue. | 1 | Prompt + vote |
| 11 | **Pass the Pumpkin** | Hot potato with words: the pumpkin lands on your phone with a category; type an answer to pass it on before the fuse runs out. (Seasonal skin of Word Bomb.) | 2 | Word Bomb engine |
| 12 | **Mash Bash** | A dice-board night on the TV where every turn ends in a 15-second phone minigame: Saloon Showdown, Stop the Clock, tap races, memory flips, secret picks. | 4 | Everything above |

## Build order (research + ideas combined)

1. **Great Minds** (match the majority) — difficulty 1, research's fastest win
2. **Crowd Pleaser** / **Lie Detector Telly** — difficulty 1, no content bank needed
3. **Most Likely To…** — difficulty 1
4. **Dial It In** (Wavelength-style) — difficulty 2, just spectrum cards
5. **Liar's Dice** — difficulty 2, casino niche
6. **Spy Grid** (Codenames-style) — difficulty 2, needs a word list
7. **Saloon Showdown + Stop the Clock** — the first two Mash Bash minigames
8. **Dice Derby** — difficulty 3, our own casino-party flagship
9. **Drawing pipeline** → Doodle Fraud, Scribble Chain
10. **Hold'em Night**, **Blackjack Bash** — reuse the old engines
11. **Full Moon**, **Heist Night**, **Bomb Squad** — bigger co-op/deduction games
