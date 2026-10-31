# Jackbox catalog (snapshot taken 2026-10-31)

Scope: every numbered Party Pack (1-12), every standalone/other Jackbox release, announcements through 2026-10-31, tech stack, recurring mechanics.
Latest numbered pack: **The Jackbox Party Pack 12 (2026-10-15)**. Latest standalone: **Trivia Murder Party 3 (Early Access 2026-09-17)**. Next dated release: **Fakin' It XL (2026-11-12)**.

## 0. How to read this

**What is verified vs. what is my analysis**
- Line-ups, player counts, release dates: checked against the official pack pages (jackboxgames.com/games/packs/...), Wikipedia "The Jackbox Party Pack", and Jackboxpedia (jackbox.wiki). They agree unless a note says otherwise.
- "Audience" status: Jackbox's own Audience Kit table (Twitch extension compatibility, Dec 2020 post, later extended) + Wikipedia sentences + Jackboxpedia. For Packs 11-12 only Wikipedia states it per game. Details in notes under each table.
- "Core loop", "Phone input", "Content it needs", "Build difficulty" are **my analysis** built from those verified descriptions (plus the controller manifest in section 3 for camera/mic flags). Treat them as estimates.
- Items I could not verify are tagged **unverified**.

**Build difficulty (1-5), small team, web version**
- 1 = text prompts + voting only (turn-based state machine, no assets)
- 2 = text/choice only but extra phases/hidden info/scoring rules, or needs a verified-content bank
- 3 = drawing canvas, image/audio asset library, TTS/performance, or multiple private role screens
- 4 = real-time shared state or minigames, auction/economy timers, heavy rule engine, heavy content+art
- 5 = twitchy real-time sync, rhythm/audio capture, camera/image-warp, physics, or large bespoke art/animation

**Cell legend**: `aud: yes/no` = a separate audience mode exists (audience capped at 10,000 per official pages). `AK:X` = Audience Kit table shows a prohibited-sign symbol that the page never defines. Phone-input categories: free text / drawing / multiple choice / ranking / real-time taps / other.

---

## 1. Numbered Party Packs

Release dates are Jackboxpedia's (https://jackbox.wiki/wiki/The_Jackbox_Party_Pack_(series)); Steam store pages sometimes show a date one day off (time zone) and are noted where seen.

### Pack 1 - The Jackbox Party Pack (2014-11-18; Steam page shows 2014-11-26)

| Game | Players (+aud.) | Core loop | Phone input | Content it needs | Diff |
|---|---|---|---|---|---|
| You Don't Know Jack 2015 | 1-4; aud: no | Voiced game-show trivia: fast correct answers win cash, wrong ones lose it, "Screws" force a rival to answer. | multiple choice | verified, jokey trivia + host voice script | 3 |
| Drawful | 3-8; aud: no | Everyone draws a secret absurd prompt, others write fake titles, then all pick the real title (points for fooling and for finding it). | drawing + free text + multiple choice | prompt bank of weird titles | 3 |
| Word Spud | 2-8; aud: no | A random player turns a prefix ("light-") into a word/phrase, the rest vote yes/no; a yes passes the leftover chunk ("house") to the next player. | free text (short) + yes/no | prefix list | 2 |
| Lie Swatter | 1-100; aud: n/a (it is the mass-player game) | Timed true/false statements; fastest correct answer gets a bonus. | two buttons (TRUTH / LIE) | verified true/false facts | 1 |
| Fibbage XL | 2-8; aud: no | Fill the blank in an obscure true fact with a convincing lie; all pick the truth; "Lie for me" lets the game supply a lie. | free text + multiple choice | verified fact bank (blank, truth, decoy lies) | 2 |

Notes: no Pack 1 game has audience mode (the Audience Kit table marks them all as having no audience; Jackboxpedia Audience page agrees). Lie Swatter 1-100 is on the official pack page and Steam. Sources: https://www.jackboxgames.com/games/packs/the-jackbox-party-pack-1 , https://store.steampowered.com/app/331670/The_Jackbox_Party_Pack/ , https://jackbox.wiki/wiki/Word_Spud , https://jackbox.wiki/wiki/Lie_Swatter

### Pack 2 - The Jackbox Party Pack 2 (2015-10-13)

| Game | Players (+aud.) | Core loop | Phone input | Content it needs | Diff |
|---|---|---|---|---|---|
| Fibbage 2 | 2-8; aud: yes* (vote on the truth) | Fibbage with two rounds + Final Fibbage; adds the Defibrillator (shrinks choices to truth + one lie) and likes ("Thumbs Up Cup"). | free text + multiple choice + tap buttons | verified fact bank (500+ new) | 2 |
| Earwax | 3-8; aud: yes | A judge picks one of five prompts, others each pick two of six sound effects in order, judge crowns the funniest; first to 3. | multiple choice (ordered picks) | prompt bank + large sound-effect library | 3 |
| Bidiots | 3-6; aud: no | Draw two vague prompts that secretly carry dollar values, then auction others' drawings with bid buttons, loans and "screws"; richest wins. | drawing + bid buttons | prompts with hidden values; art/UI | 4 |
| Quiplash XL | 3-8; aud: yes | Each player answers two prompts; each pair duels in a crowd vote; final "Last Lash": all answer one prompt and vote three times. | free text + vote | prompt bank | 1 |
| Bomb Corp. | 1-4; aud: no | Co-op intern bomb-defusal with obtuse, partial instructions spread across players (mechanic summary from Wikipedia; **details unverified**). | custom panel taps + talking | bomb modules + instruction sets | 4 |

Notes: *Fibbage 2 audience conflict: Jackboxpedia says audience members pick which answer they think is the truth (a store-listing snippet says the same); the Audience Kit table marks it as having no audience (that table is about the Twitch extension) and the Steam page gives no per-game audience statement. Bomb Corp.: official pack page says "4 Players", Steam says 1-4. Sources: https://www.jackboxgames.com/games/packs/the-jackbox-party-pack-2 , https://store.steampowered.com/app/397460/The_Jackbox_Party_Pack_2/ , https://jackbox.wiki/wiki/Fibbage_2 , https://jackbox.wiki/wiki/Bidiots

### Pack 3 - The Jackbox Party Pack 3 (2016-10-18; Steam page shows 2016-10-17)

| Game | Players (+aud.) | Core loop | Phone input | Content it needs | Diff |
|---|---|---|---|---|---|
| Quiplash 2 | 3-8; aud: yes | Quiplash with Last Lash variants (define an acronym, caption a comic strip, clever use of a given word); host can write own prompts. | free text + vote | prompt bank (+ custom prompts) | 1 |
| Trivia Murder Party | 1-8; aud: yes (separate entity) | Horror-host quiz: wrong answers trigger "Killing Floor" minigames, losers become ghosts, survivors race to escape with category answers. | multiple choice + minigame taps | verified trivia + minigames + host VO | 4 |
| Guesspionage | 2-8; aud: yes | Guess what % of people do/are X; others call higher/lower; final round: pick the 3 most popular of 9. | slider/number + higher/lower + multiple choice | real survey percentages | 2 |
| Fakin' It | 3-6; aud: yes (votes) | One secret Faker blends into in-room physical prompts (raise a hand, point, make a face, hold up fingers); the group must unanimously finger them; final "Text You Up" text round. | multiple choice/prompt screen + vote; free text in finale | task prompt bank | 2 |
| Tee K.O. | 3-8; aud: yes | Draw images and write slogans, they are mixed into shirts, shirts duel in bracket votes. | drawing + free text + vote | drawing/slogan prompts | 3 |

Sources: https://www.jackboxgames.com/games/packs/the-jackbox-party-pack-3 , https://jackbox.wiki/wiki/Fakin%27_It , https://store.steampowered.com/app/434170/The_Jackbox_Party_Pack_3/

### Pack 4 - The Jackbox Party Pack 4 (2017-10-17; Steam page shows 2017-10-18)

| Game | Players (+aud.) | Core loop | Phone input | Content it needs | Diff |
|---|---|---|---|---|---|
| Fibbage 3 | 2-8; aud: yes (audience can add lies) | Fibbage with new question types and a two-blank Final Fibbage; includes the "Enough About You" mode (3-8) built on facts about the players. | free text + multiple choice | fact bank; the Enough About You mode needs no authored bank (players supply facts) | 2 |
| Survive the Internet | 3-8; aud: yes | Answer an opinion question; your answer is lifted out of context and handed to another player who must reply as if on a given website to make you look bad; vote on the funniest pairing. | free text | opinion prompts + site/format templates | 2 |
| Monster Seeking Monster | 3-7; aud: optional | Players DM each other (or a robot) up to four messages, then each picks someone to date; mutual picks earn hearts. | free text/mad-lib + selection | monster/robot templates | 3 |
| Bracketeering | 3-16; aud: yes | Everyone answers a prompt, answers are seeded into a bracket, players predict winners, audience votes matchups; later rounds are "blind". | free text + pick + vote | prompt bank | 2 |
| Civic Doodle | 3-8; aud: yes (votes + emoji) | Two players draw on the same starting doodle in real time while others react with emoji; winner gets re-drawn by new players; then title it. | shared real-time drawing + emoji + vote | starting doodle art + prompts | 4 |

Sources: https://www.jackboxgames.com/games/packs/the-jackbox-party-pack-4 , https://store.steampowered.com/app/610180/The_Jackbox_Party_Pack_4/

### Pack 5 - The Jackbox Party Pack 5 (2018-10-17)

| Game | Players (+aud.) | Core loop | Phone input | Content it needs | Diff |
|---|---|---|---|---|---|
| You Don't Know Jack: Full Stream | 1-8; aud: yes per Wikipedia; AK:X | Streaming-friendly YDKJ trivia, including text-entry "Gibberish Question". | multiple choice + text | verified jokey trivia + host VO | 3 |
| Split the Room | 3-8; aud: yes | Fill in a hypothetical yes/no question so the group's answers split evenly; final round "Decisive Dimension" is a two-option question. | free text + yes/no | question stems | 2 |
| Mad Verse City | 3-8; aud: yes | Robot rap battle: fill prompts on your phone, the game performs the rap via text-to-speech, players + audience vote. | fill-in text (templates) + vote | rap templates + TTS voices + beats | 4 |
| Zeeple Dome | 1-6; aud: no | Physics arena: players slingshot their creatures at enemies for money, team power-ups (exact phone gesture not stated in sources; **unverified**). | real-time slingshot gesture | levels + art + physics | 5 |
| Patently Stupid | 3-8; aud: yes | Write problems, draw and name an invention for a problem you are assigned, pitch it aloud, vote to fund; final: one problem for all. | free text + drawing + vote | problem prompts | 3 |

Notes: YDKJ Full Stream: Wikipedia lists audience yes, Audience Kit shows AK:X. Sources: https://www.jackboxgames.com/games/packs/the-jackbox-party-pack-5 , https://store.steampowered.com/app/774461/The_Jackbox_Party_Pack_5/ , https://shacknews.com/article/108065/the-jackbox-party-pack-5-review-jack-of-all-trades (Zeeple Dome: the reviewer says you slingshot the creatures using your phone)

### Pack 6 - The Jackbox Party Pack 6 (2019-10-17)

| Game | Players (+aud.) | Core loop | Phone input | Content it needs | Diff |
|---|---|---|---|---|---|
| Trivia Murder Party 2 | 1-8; aud: yes | Murder-Hotel sequel: trivia, items, Killing Floor minigames, escape gate that needs a correct answer. | multiple choice + minigame taps | verified trivia + minigames + host VO | 4 |
| Role Models | 3-6; aud: yes | Personality test: vote one of five categories, assign players (yourself included) to items; matching the group majority scores, "99% sure" bonus. Controller declares a `camera` feature (section 3). | multiple choice (assign) | categories + item lists | 2 |
| Joke Boat | 3-8; aud: yes | Brainstorm words, complete joke setups with them, jokes are performed two at a time and voted; final round: rewrite a joke. | free text + vote | joke setups; performance voices | 3 |
| Dictionarium | 3-8; aud: yes | Invent a dictionary entry for a fake word/slang: definition, then synonym, then sentence; vote each round. | free text + vote | fake/obscure word bank | 2 |
| Push the Button | 4-10; aud: no | Spaceship social deduction: humans and aliens get different prompts for shared activities; anyone can push the button to accuse; unanimous vote ejects. | multiple choice/short text + accuse button | activity prompt pairs (human/alien) | 4 |

Sources: https://www.jackboxgames.com/games/packs/the-jackbox-party-pack-6 , https://www.builtinchicago.org/articles/jackbox-games-design-party-pack (a Jackbox engineer calls Push the Button a phone-only kind of game)

### Pack 7 - The Jackbox Party Pack 7 (2020-10-15)

| Game | Players (+aud.) | Core loop | Phone input | Content it needs | Diff |
|---|---|---|---|---|---|
| Quiplash 3 | 3-8; aud: yes | Quiplash duels; final "Thriplash": three answers per prompt. | free text + vote | prompt bank | 1 |
| The Devils and the Details | 3-8; aud: AK:X (late joiners become players) | Co-op devil family does household chores through phone-based mini-tasks; selfish chores score more but fill a meter that triggers family emergencies. | real-time taps/drags (co-op) | chore scenarios + art/animation | 5 |
| Champ'd Up | 3-8; aud: yes | Draw champions/challengers with unusual names and skills, vote which fits each category better. | drawing + free text + vote | category prompts | 3 |
| Talking Points | 3-8; aud: yes (reactions) | Write three speech titles; a presenter talks through unseen slides while others pick the next slide; audience reacts; comments + awards. Controller declares `camera` (section 3). | free text + multiple choice (slide picks) + reactions | slide image library + prompts | 3 |
| Blather 'Round | 2-6; aud: yes (guessing) | One player gives hints about a secret place/thing/person using fixed sentence frames; others and the audience guess. | constrained sentence builder + free-text guess | large answer bank (places/things/people) | 3 |

Sources: https://www.jackboxgames.com/games/packs/the-jackbox-party-pack-7 , https://jackbox.wiki/wiki/Audience

### Pack 8 - The Jackbox Party Pack 8 (2021-10-14)

| Game | Players (+aud.) | Core loop | Phone input | Content it needs | Diff |
|---|---|---|---|---|---|
| Drawful: Animate | 3-10; aud: yes | Drawful with two-frame animations; guess other drawings; "double down" once per round. | drawing x2 + free text + multiple choice | prompt bank | 3 |
| The Wheel of Enormous Proportions | 2-8; aud: yes | Write a question for the wheel; trivia rounds earn wheel slices; place slices and take turns spinning for points. | free text + multiple choice + spin gesture | verified trivia + wheel logic/art | 4 |
| Job Job | 3-10; aud: yes | Icebreaker answers are shuffled; write job-interview answers using only words from the icebreakers + the question; vote. | word-bank text composition + vote | icebreaker + interview questions | 2 |
| The Poll Mine | 2-10; aud: yes (streamer mode: audience picks doors by majority) | Teams rank an 8-option poll, then take turns opening doors to find the most popular answers. | ranking + door pick | poll questions with 8 ranked answers (real data) | 3 |
| Weapons Drawn | 4-8; aud: yes | Everyone is a killer: draw murder weapons containing letters of your name, hide them, invite accomplices, commit one murder, vote on culprits. | drawing + placement + vote | prompts + room art | 4 |

Sources: https://www.jackboxgames.com/games/packs/the-jackbox-party-pack-8

### Pack 9 - The Jackbox Party Pack 9 (2022-10-20)

| Game | Players (+aud.) | Core loop | Phone input | Content it needs | Diff |
|---|---|---|---|---|---|
| Fibbage 4 | 2-8; aud: yes | Fibbage plus video questions, a new Final Fibbage and a fresh mode; fan-submitted questions. | free text + multiple choice | fact bank (+ video clips if you copy that) | 2 |
| Roomerang | 4-9; aud: yes | Reality-TV role-play: each character has traits; write responses fitting yours and others'; top response wins an elimination advantage; eliminated players return with new traits. | free text + multiple choice + vote | trait list + prompts | 3 |
| Junktopia | 3-8; aud: yes | Buy one of three random items, invent a name and backstory, pitch it aloud, items get appraised for a price. | multiple choice + free text + price/vote | item images (art) | 3 |
| Nonsensory | 3-8; aud: yes | Write or draw to a prompt; others guess where it ranks on a percentage / 1-10 scale; points for accuracy. | free text or drawing + slider | scale definitions + prompts | 3 |
| Quixort | 1-10; aud: AK:X | Teams drop falling answers into the correct order in real time; score by closeness. | real-time drag/placement | ordering sets (verified) | 4 |

Sources: https://www.jackboxgames.com/games/packs/the-jackbox-party-pack-9

### Pack 10 - The Jackbox Party Pack 10 (2023-10-19)

| Game | Players (+aud.) | Core loop | Phone input | Content it needs | Diff |
|---|---|---|---|---|---|
| Tee K.O. 2 | 3-8; aud: yes | Tee K.O. with hoodies, redraw round and a button-mashing final. | drawing + free text + vote + rapid taps | drawing/slogan prompts | 3 |
| Timejinx | 1-8; aud: yes | Guess the years of historical events, then do side missions (blend in at parties, fix altered events); final asks future years; lowest score wins. | number/year + multiple choice + mission inputs | verified events with years + mission content | 4 |
| FixyText | 3-8; aud: yes | Two groups type chaotic replies to a host message; cursor movable but no deleting; others vote favorite words. | real-time shared typing + vote | host messages | 4 |
| Dodo Re Mi | 1-9; aud: AK:X | Rhythm co-op: tap in sync so correct notes feed a carnivorous plant; reach five stars. | real-time rhythm taps | original music/audio + note charts | 5 |
| Hypnotorious | 4-8; aud: yes | Under a hypnotist's spell, answer questions as secret identities, sort into jars, and find the Outlier who doesn't know they are one. | free text/multiple choice + sorting + vote | identity cards + questions | 3 |

Sources: https://www.jackboxgames.com/games/packs/the-jackbox-party-pack-10

### Pack 11 - The Jackbox Party Pack 11 (2025-10-23; Steam page shows 2025-10-22)

| Game | Players (+aud.) | Core loop | Phone input | Content it needs | Diff |
|---|---|---|---|---|---|
| Doominate | 3-8; aud: yes | Head-to-head jokes that ruin a pleasant scenario: preselected prompts, then your own, then repairing earlier ruined prompts; votes score. | free text + vote | wholesome-scenario bank | 2 |
| Hear Say | 2-8; aud: yes | Record sound effects/dialogue for a stock-video prompt; winning sounds are played over the clip (one sound per player in rounds 1-2, two in the final). Controller declares `microphone` (section 3). | phone microphone recording + vote | licensed stock video clips + prompts | 5 |
| Cookie Haus | 3-8; aud: yes | Fill cookie orders from odd clients: choose shape, draw on it, add sprinkles, name it; two cookies face off. Controller declares `gpu` (section 3). | drawing + shape/sprinkle picks + text | client order prompts + cookie art | 3 |
| Suspectives | 4-8; aud: not stated | Everyone answers surveys first; a crime is generated from those answers; one player is the culprit; find them from the evidence (one clue falsely points at an innocent). | survey (choice/text) + accusation/deduction | survey questions + crime templates | 4 |
| Legends of Trivia | 1-6; aud: not stated | Co-op fantasy RPG: fight monsters by answering trivia (some answers split across phone screens, list questions, rapid-fire) to reach the final boss with enough gold. | multiple choice + list entry + shared answer fragments | large verified trivia set + RPG art/progression | 5 |

Notes: audience sentences for Doominate/Hear Say/Cookie Haus are in Wikipedia; none for Suspectives/Legends. Official pack page lists pack-level audience of 10,000. Sources: https://www.jackboxgames.com/games/packs/the-jackbox-party-pack-11 , https://store.steampowered.com/app/3364070/The_Jackbox_Party_Pack_11/ , https://jackbox.wiki/wiki/The_Jackbox_Party_Pack_11

### Pack 12 - The Jackbox Party Pack 12 (2026-10-15; Steam page shows 2026-10-14)

| Game | Players (+aud.) | Core loop | Phone input | Content it needs | Diff |
|---|---|---|---|---|---|
| We Forgot a Card | 3-8; aud: yes | Pick an occasion, choose a card front, write the inside message; cards duel in votes; final round writes the line a talking plushie says. | multiple choice (card) + free text + vote | card art + occasions + plushie lines | 2 |
| MegaPals | 3-8; aud: yes | Type as many associated answers to a prompt as you can; matches with others score; leftover answers become the next prompt; final round matches on guesses about each other. | rapid multi-entry free text | prompt bank; answer-normalising logic | 3 |
| Debate and Switch | 2-8; aud: yes | Two players argue a silly topic aloud; others walk their avatar to a side and send typed comments; one word of the topic is swapped between debates. | free text (opinion/comments) + side pick | topic bank | 3 |
| Hyperface | 3-8**; aud: yes | Take a selfie (or pick a stock photo), warp/smudge/draw on it to answer a prompt; two photos face off; final round re-edits an earlier photo. Controller declares `camera` + `gpu` (section 3). | phone camera + image-warp tools + vote | prompts + licensed stock faces + image-processing code | 5 |
| Idol Factions | 2-8; aud: not stated | Two teams sort a stream of answers into three categories on a shared board, passing items to teammates or through portals; bombs disrupt the other team; three rounds. | real-time drag/swipe routing | category sets with verified members | 4 |

Notes: **Hyperface min players: official pack page, Steam and Wikipedia say 3-8; Jackboxpedia says 2-8. Debate and Switch dispute (reported, not adjudicated): a solo board-game developer alleged resemblance to his board game "Die On This Hill"; Jackbox said its internal team built it without knowledge of that game; no legal action reported (https://kotaku.com/jackbox-games-debate-and-switch-die-on-this-hill-similarities-2000750185). Sources: https://www.jackboxgames.com/games/packs/the-jackbox-party-pack-12 , https://store.steampowered.com/app/4199960/The_Jackbox_Party_Pack_12/ , https://www.jackboxgames.com/blog/here-are-all-5-games-in-the-jackbox-party-pack-12 , https://www.pocketgamer.com/game-reviews/jackbox-party-pack-12/

---

## 2. Standalone and other releases

### 2a. Standalone titles (games not sold only inside a numbered pack)

The official catalogue (https://www.jackboxgames.com/games) lists 8 titles with no pack: Fakin' It XL, Trivia Murder Party 3, The Jackbox Survey Scramble, Quiplash 2 InterLASHional, Drawful 2, Quiplash, Fibbage, YDKJ Classic. The three Naughty Pack games are listed under that pack and included below because you asked for them.

| Title (date) | Players (+aud.) | Core loop | Phone input | Content it needs | Diff |
|---|---|---|---|---|---|
| Fibbage (2014-09-16; console-first standalone) | 2-8; aud: no (AK table: no audience) | Original bluffing-trivia game (same loop as Fibbage XL), with a "Thumbs Cup" bonus for clever lies. | free text + multiple choice | verified fact bank | 2 |
| Fibbage XL (separate storefront SKUs: Apple TV 2015-10-27, $9.99; Nintendo Switch 2020-07-23, $5.49) | 2-8 (Apple TV listing; Switch listing text says both 2-8 and 3-8 with an audience of up to 10,000, so **conflicting**) | Same game as the Pack 1 version, hosted by Cookie Masterson; Apple TV listing mentions quick 7-question games and themed rounds (Celebrity Tweets, Road Trip) plus Final Fibbage. | free text + multiple choice | verified fact bank | 2 |
| Quiplash (2015-06-30) | 3-8; aud: yes, up to 10,000 | Original duel-answer game; the audience mode debuted here (PlayStation Blog describes it as a first attempt at the feature). | free text + vote | prompt bank | 1 |
| Drawful 2 (2016-06-21; Switch 2018-06-21; international update 2021-05-06) | 3-8; aud: yes | Drawful with 2x prompts, streak bonuses, two-colour drawing, custom prompts/episodes, 5 languages, moderation console. | drawing + free text + multiple choice | prompt bank (+ user-made episodes) | 3 |
| Quiplash 2 InterLASHional (2020-04-08) | 3-8; aud: yes | Quiplash 2 plus 100 new prompts each in French, Italian, German, Spanish. | free text + vote | localised prompt banks | 1 |
| YDKJ Classic (Steam; official page says 2013) | 1-3; local only, no jackbox.tv | The 1990s CD-ROM YDKJ volumes re-released for Windows; players share one keyboard (some volumes don't run; 5th Dementia excluded). | keyboard (no phones) | n/a | n/a |
| YDKJ 2011 (PC/consoles), YDKJ Facebook (2012), YDKJ Party (2013, Fire TV/iPad) | not verified | Earlier Jackbox-era YDKJ releases listed on Wikipedia; no gameplay/engine details verified. | unverified | unverified | n/a |
| Fakin' It All Night Long (Naughty Pack, 2024-09-12) | 3-8; aud: yes | Adult follow-up to Fakin' It: new categories, Remote Play for streams, majority vote instead of unanimity. | prompt/multiple choice + vote + text | adult task prompts | 2 |
| Dirty Drawful (Naughty Pack) | 3-8; aud: yes | Drawful with M-rated prompts, undo button and emotes; ends after a few rounds with no final. | drawing + free text + multiple choice | adult prompt bank | 3 |
| Let Me Finish (Naughty Pack) | 3-8; aud: yes | An absurd (often suggestive) question over a stock photo; two players draw on it and present aloud; group votes; others can jump in for bonus points. | drawing + text + vote | stock object photos + questions | 3 |
| The Jackbox Survey Scramble (2024-10-24, $9.99) | 2-10; aud: yes | One-word answers to survey questions feed an online database; six modes (Hilo, Speed, Squares, Bounce, Dash, Dares), incl. team and real-time modes. | free text (one word) + higher/lower + real-time taps | crowd-sourced survey database | 4 |
| Trivia Murder Party 3 (Early Access 2026-09-17, $14.99; 1.0 planned 2027 incl. consoles/Switch 2) | 1-8; online matchmaking; audience listed 10,000 | Camp Mass Acres: up to 7 rounds of timed multiple choice, Killing Floor minigames (11 in EA), plot twists, wagon-chase finale; first TMP with a family-friendly question option and online play. | multiple choice + minigame taps/holds (e.g. Pouring) | large trivia set + 3D art/animation + minigames | 5 |
| Fakin' It XL (scheduled 2026-11-12, $8.99) | 3-8 | T-rated reskin of Fakin' It All Night Long: risque material removed, original Fakin' It rounds + new content, remote-play controller options. | same as Fakin' It | task prompts | 2 |

Sources: https://www.jackboxgames.com/games , https://www.jackboxgames.com/games/fibbage , https://apps.apple.com/us/app/fibbage-xl/id833697006 , https://www.nintendo.com/us/store/products/fibbage-xl-switch/ , https://www.jackboxgames.com/games/quiplash , https://blog.playstation.com/2015/06/30/quiplash-new-party-game-expands-audience-participation-to-10000/ , https://www.jackboxgames.com/games/drawful-2 , https://www.jackboxgames.com/games/quiplash-2-interlashional , https://www.jackboxgames.com/games/ydkj-classic , https://www.jackboxgames.com/games/the-jackbox-survey-scramble , https://jackbox.wiki/wiki/The_Jackbox_Survey_Scramble , https://www.jackboxgames.com/games/trivia-murder-party-3 , https://jackbox.wiki/wiki/Trivia_Murder_Party_3 , https://www.jackboxgames.com/blog/fakin-it-xl-is-coming-november-12th-to-a-bundle-near-you , https://jackbox.wiki/wiki/Fakin%27_It_XL , https://www.shacknews.com/article/141615/the-jackbox-naughty-pack-review-score , https://en.wikipedia.org/wiki/The_Jackbox_Party_Pack (YDKJ 2011-2013 via https://en.wikipedia.org/wiki/Jackbox_Games)

### 2b. Compilations, launchers, bundles (games not repeated)

| Item | What it is |
|---|---|
| The Jackbox Party Starter (2022-06-30) | Curated 3-game entry pack (Quiplash 3, Tee K.O., Trivia Murder Party 2) with moderation, subtitles, more languages; not a launcher. Its controllers are Vue rebuilds (section 3). https://www.jackboxgames.com/games/packs/the-jackbox-party-starter |
| The Jackbox Naughty Pack (2024-09-12) | ESRB M 17+ pack of 3 adult games (table 2a). https://www.jackboxgames.com/games/packs |
| The Jackbox Party Essentials (Netflix, 2026-04-07 per Jackboxpedia; official blog 2026-04-09) | Netflix-only 3-game bundle (Drawful 2, Quiplash 3, Fibbage 4) on supported TVs/browsers; phones join via QR + Netflix Game Controller app instead of a jackbox.tv code. https://www.jackboxgames.com/blog/play-the-jackbox-party-essentials-on-netflix |
| The Jackbox Megapicker (2024-07-29 per Wikipedia; the official page gives no date) | Free Steam launcher/library for Mac/Windows/Linux: launch single games without pack menus, search/sort/filter. https://jackboxgames.com/the-jackbox-megapicker |
| Storefront bundles (Backpack, Decade, Big Bang, Holiday...) | Price bundles of existing packs; no new games. https://www.jackboxgames.com/games/packs |
| Jackbox Partyverse (announced; not released) | Ad-supported TV/streaming app; CEO (2026-10-26): Samsung TV app in the US, no date. Wikipedia says closed beta. See section 3. https://player2.net.au/2026/10/jackbox-the-interview-mike-bilder-and-andy-kniaz |

### 2c. 2025-2026 log (everything found through 2026-10-31)

| Date | Event | Source |
|---|---|---|
| 2025-02-17 | Party game bundles on Nintendo Switch | https://www.jackboxgames.com/blog/year/2025 |
| 2025-03-06 | Free ad-supported smart-TV app announced (spring 2025 beta planned; slipped) | https://9to5google.com/2025/03/06/jackbox-games-app-is-coming-to-smart-tvs-for-free-in-spring-2025/ |
| 2025-04-07 | "Jackbox Direct": Party Pack 11 + standalone Trivia Murder Party announced | https://www.jackboxgames.com/blog/year/2025 |
| 2025-05-05 to 08-07 | Pack 11 games revealed one by one (Suspectives, Doominate, Legends of Trivia, Hear Say, Cookie Haus) | same |
| 2025-07-14 | Trivia Murder Party 3 delayed (to 2026) | same |
| 2025-10-23 | **The Jackbox Party Pack 11** released; free content update 2025-11-20 | same |
| 2026-03-04 | Jackbox begins publishing third-party games: My Arms Are Longer Now (Toot Games; single-player heist game; PC 2026, consoles 2027; the Jackbox site still lists it as coming soon on 2026-10-31) | https://www.jackboxgames.com/blog/year/2026 |
| 2026-04-07/09 | The Jackbox Party Essentials on Netflix | https://www.jackboxgames.com/blog/play-the-jackbox-party-essentials-on-netflix |
| 2026-04-13 | Smart-TV app update: ad-supported free tier, full catalog by subscription later, beta hoped for summer 2026, cloud-streamed with AWS GameLift Streams | https://www.jackboxgames.com/blog/jackbox-coming-to-your-smart-tv-for-free |
| 2026-05-06 | Party Pack 12 announced (all five games listed by 2026-09-03) | https://www.jackboxgames.com/blog/year/2026 |
| 2026-07-20 | Fibbage physical board/card game (Wilder Toys; 3-6 players, 14+, $19.99, no phones); follows Fakin' It tabletop games | https://www.jackboxgames.com/blog/no-lie-fibbage-is-out-now-as-a-physical-board-game |
| 2026-08-19/21 | Release dates set: TMP3 Early Access 2026-09-17, Party Pack 12 2026-10-15 | https://www.jackboxgames.com/blog/year/2026 |
| 2026-09-09 | Fakin' It XL announced for 2026-11-12 | https://www.jackboxgames.com/blog/fakin-it-xl-is-coming-november-12th-to-a-bundle-near-you |
| 2026-09-17 | **Trivia Murder Party 3** Early Access (first Jackbox game on Unreal Engine 5) | https://www.jackboxgames.com/games/trivia-murder-party-3 |
| 2026-09-23 | TMP3 promotional minigame islands in Fortnite (marketing, not a Jackbox party game) | https://www.jackboxgames.com/blog/trivia-murder-party-3-in-fortnite |
| 2026-10-15 | **The Jackbox Party Pack 12** released | https://www.jackboxgames.com/blog/year/2026 |
| 2026-10-26 | CEO interview: Partyverse streaming app (Samsung TVs, ad-backed, no date), more tabletop games planned | https://player2.net.au/2026/10/jackbox-the-interview-mike-bilder-and-andy-kniaz |

Searched for and **not found** as of 2026-10-31: Party Pack 13, Quiplash 4, Drawful 3, any 2026 "Jackbox Direct", any second published third-party title.

---

## 3. Tech stack

Every claim row carries a URL except T11/T12, which are negative findings. Status: **P** = primary (I read Jackbox's own public JS/HTTP myself on 2026-10-31), **Q** = first-party quote in an interview/post, **S** = secondary (journalist/wiki/community), **SN** = seen only in a search-result snippet (page blocked for my fetcher), **U** = unverified/not found.

Raw captures of what I inspected are in `...\scratchpad\research\fetched-jackbox-tv\` (loader + 15 controller bundles; read as text only, never executed).

### 3.1 TV/host side (the game engine)

| # | Claim | URL | Status |
|---|---|---|---|
| T1 | YDKJ began as a HyperCard demo that became a CD-ROM product (Laban). | https://www.pocketgamer.com/the-jackbox-party-pack-12/interview-with-allard-laban-cco/ , https://www.gamedeveloper.com/business/allard-laban-dives-into-the-past-present-and-future-of-jackbox-games | Q |
| T2 | Phones-as-controllers path: YDKJ for Ouya -> JackPad native app (Google Play/iOS, local Wi-Fi) -> web-based join by room code. | https://www.pocketgamer.com/the-jackbox-party-pack-12/interview-with-allard-laban-cco/ | Q |
| T3 | Pack 1 engine is listed as Adobe AIR (GameRant DB); PCGamingWiki lists Adobe AIR for Packs 1-4 (+ FMOD audio, Scaleform GFx UI middleware on Pack 4). | https://gamerant.com/db/video-game/the-jackbox-party-pack/ ; https://www.pcgamingwiki.com/wiki/The_Jackbox_Party_Pack_4 (Cloudflare-blocked for me) | S / SN |
| T4 | GamingOnLinux reported (2017-12-22) that the Pack 4 Linux beta no longer used Adobe AIR, and (2019-01-08) that Jackbox had moved off Adobe AIR to a native engine as all packs gained official Linux support. Pack 5 (Oct 2018) was the first officially Linux-supported pack. | https://gamingonlinux.com/2017/12/the-jackbox-party-pack-4-has-a-beta-available-for-linux-gamers ; https://www.gamingonlinux.com/2019/01/jackbox-games-now-officially-support-linux-with-all-their-party-packs ; https://www.gamingonlinux.com/2018/10/the-jackbox-party-pack-5-has-launched-as-their-first-to-officially-support-linux | S |
| T5 | By Pack 8 (2021) the Linux build shipped with an updated SDL2 supporting Vulkan and OpenGL plus Wayland work, credited to porter/FNA developer Ethan Lee. The engine's language is not stated. | https://www.gamingonlinux.com/2021/10/the-jackbox-party-pack-8-is-out-now-with-improved-linux-support | S (language: U) |
| T6 | Laban (Sept 2026) says Jackbox had worked with its previous engine for over a decade before moving to Unreal Engine 5 for Trivia Murder Party III; the interviewer reports TMP3 is the first Jackbox game built in UE5. | https://darylbaxter.com/posts/jackbox-party-pack-12-preview-interview/ | Q |
| T7 | CEO Bilder (2026-10-26) says TMP3 was built in Unreal and that this enables things the old engine could not do (higher visual fidelity, real-time multiplayer, customisable characters, physics-based killing floors). | https://player2.net.au/2026/10/jackbox-the-interview-mike-bilder-and-andy-kniaz | Q |
| T8 | TMP3 hiring: Unreal Engine (C++), Epic Online Services (EOS) for matchmaking, backend providers named as examples (PlayFab, Nakama, AWS/GCP); posting removed 2025-04-28. | https://builtin.com/job/senior-unreal-engine-developer/4736551 | S |
| T9 | Smart-TV/streaming app runs games in the cloud with AWS GameLift Streams. | https://www.jackboxgames.com/blog/jackbox-coming-to-your-smart-tv-for-free ; https://9to5google.com/2025/03/06/jackbox-games-app-is-coming-to-smart-tvs-for-free-in-spring-2025/ | Q |
| T10 | Netflix edition: QR pairing with the Netflix Game Controller app, no jackbox.tv code (Tudum describes QR pairing without naming an app). | https://www.jackboxgames.com/blog/play-the-jackbox-party-essentials-on-netflix ; https://www.netflix.com/tudum/articles/jackbox-games-party-essentials-news | Q |
| T11 | **Unity: no evidence found** that any Jackbox game used it (searched engine/Unity/Flash/AIR; all hits point to AIR -> native engine -> UE5). | searches only; see T3-T7 | U |
| T12 | Engines for YDKJ 2011-2013 and for Packs 11-12 are not stated anywhere I found (Packs 11-12 presumably the pre-UE5 engine). The in-house engine's programming language is not stated. | n/a | U |

Interpretation (mine): Adobe AIR (Flash lineage; AS3 not confirmed) for the early packs -> proprietary native engine from ~Pack 4/5 through Pack 12 -> Unreal Engine 5 starting with TMP3 (2026).

### 3.2 jackbox.tv, the phone controller

| # | Claim | URL | Status |
|---|---|---|---|
| T20 | jackbox.tv is a single-page app (ES-module entry bundle, `<div id="app">`). It acts as a loader that fetches a per-game controller bundle at runtime from `https://bundles.jackbox.tv/{base}/{file}` (code path named `getS3Url`; S3 backing is my inference). The entry file name is hashed and changes per deploy (was `CM0nr-Mh.js`). | https://jackbox.tv/ ; https://jackbox.tv/CM0nr-Mh.js | P |
| T21 | The loader manifest lists 76 controller entries (two are internal test apps), each tagged with a wrapper: **marionette (41)** = Packs 1-7 and early standalones (Quiplash, Drawful 2, Quiplash 2 InterLASHional...); **vue (35)** = Pack 8 onward, plus the Party Starter rebuilds of Quiplash 3/Tee K.O./TMP2, Survey Scramble, Naughty Pack, TMP3, Fakin' It XL. Each bundle is separately versioned (e.g. `main/pp12-debate`, `main/pp11-cookies`). Also lists unreleased-looking entries "Acquisitions, Inc." and "Guesspionage Crowdplay" (**unverified** what they are). | https://jackbox.tv/CM0nr-Mh.js | P |
| T22 | Marionette-era controllers (checked: Pack 1 Drawful, Pack 3 Tee K.O.) bundle Backbone + Marionette + jQuery (v3.7.1 in the Drawful bundle) + lodash. Vue-era controllers (checked: Pack 11 Hear Say, Pack 12 Debate and Switch) bundle Vue 3 (`createApp`, `setupState`, Teleport, vue-i18n v9.14.5) + lodash + Sentry error reporting. | https://bundles.jackbox.tv/main/pp1-drawful/BvVaeIf6.js ; https://bundles.jackbox.tv/main/pp3-awshirt/BJTbcRPV.js ; https://bundles.jackbox.tv/main/pp11-sfx/DFxei7rs.js ; https://bundles.jackbox.tv/main/pp12-debate/C2AMXsH3.js | P |
| T23 | Per-game feature flags in the manifest: `camera` = Role Models, Talking Points, Hyperface; `microphone` = Hear Say; `gpu` = Cookie Haus, Hyperface; also `moderation`, `kicking`, `dropInDropOut`, `previews`, and merch `shopItems` (shirts/mugs/cards). | https://jackbox.tv/CM0nr-Mh.js | P |
| T24 | Hear Say's bundle uses `MediaRecorder` + `AudioContext`; Hyperface's uses camera `facingMode`. None of the 15 bundles I scanned reference `devicemotion`/`deviceorientation` (no gyro use in those games; Zeeple Dome not scanned). | https://bundles.jackbox.tv/main/pp11-sfx/DFxei7rs.js ; https://bundles.jackbox.tv/main/pp12-reaction/C9o4W-5Z.js | P |
| T25 | A Jackbox senior software engineer (2020) describes the controller as a deliberately small component set: draw, press buttons, enter text; camera and gyroscope ideas were floated then (camera shipped in Hyperface, 2026). | https://www.builtinchicago.org/articles/jackbox-games-design-party-pack | Q |
| T26 | No app install: open a browser, go to jackbox.tv; cookies let you rejoin after a disconnect (Jackbox staff, 2016). | https://steamcommunity.com/app/434170/discussions/0/341537671992509645 | Q |
| T27 | Moderators use a separate console at mod.jackbox.tv with the room code (Drawful 2 international update). | https://www.jackboxgames.com/games/drawful-2 | Q |
| T28 | Audience members join the same site; official cap is 10,000 per room. In the client, the `audience` role connects to a different WebSocket path (see T32). | https://www.jackboxgames.com/games/packs/the-jackbox-party-pack-12 ; https://jackbox.tv/CM0nr-Mh.js | Q / P |

### 3.3 Room/WebSocket server ("ecast" / "blobcast")

| # | Claim | URL | Status |
|---|---|---|---|
| T30 | "Ecast" is Jackbox's own term: Laban says the first phones-as-controllers Fibbage ran on "an early build of our e-cast system". | https://www.pocketgamer.com/the-jackbox-party-pack-12/interview-with-allard-laban-cco/ | Q |
| T31 | Default server host in the client is `ecast.jackboxgames.com` (overridable with `?server=` / `?s=`). REST: `POST /api/v2/rooms?appTag=...` returns `{code, token, host}`; `GET /api/v2/rooms/{CODE}` returns room metadata (appTag, audienceEnabled, audienceHost, locked, full, maxPlayers, minPlayers, moderationEnabled, passwordRequired, twitchLocked, locale, keepalive, controllerBranch). A GET for a made-up code returns HTTP 404 JSON `{"ok": false, "error": "no such room"}` with header `Ecast-Room-Status: not-found`, `Server: nginx`. | https://jackbox.tv/CM0nr-Mh.js ; https://ecast.jackboxgames.com/api/v2/rooms/ZZZZ | P |
| T32 | Real-time channel: WebSocket `wss://{host}/api/v2/rooms/{CODE}/play?...` (audience role uses `/api/v2/audience/{CODE}/play`), sub-protocol `ecast-v0`, query params `role` (player/host/moderator/audience), `name`, `format=json`, `user-id`, `device-id`, `secret`, `host-token`, `twitch-token`, `replay-since`, `sync-entities`. Messages are JSON `{seq, opcode, params}` with replies matched by `re`; client auto-reconnects with exponential backoff. | https://jackbox.tv/CM0nr-Mh.js | P |
| T33 | Opcodes/entity model (shared-state "entities" with ACLs): `room/lock`, `room/unlock`, `room/migrate`, `room/set-password`, `room/start-audience`, `room/get-audience`, `client/send` (private message), `client/kick`, `drop`, `echo`, `lock`; entity types number, object, text, text-map, **doodle** (stroke/undo), stack, count-group, g-counter, pn-counter, text-ring, **image** (create/submit/moderate), external-request, plus `audience/*` counters. Error codes 1000-2028 and 2420 (rate limit). | https://jackbox.tv/CM0nr-Mh.js | P |
| T34 | Two server generations are described by the community: Blobcast / API v1 (older games; socket.io WebSockets; the README itself says these names may be wrong) and Ecast / API v2 (Pack 7+ and Drawful 2 International). Pack 6 and Quiplash 2 InterLASHional use v2 only to fetch server info; their rooms still go through blobcast. Separately, even the Pack 1 and Pack 3 controller bundles I inspected contain the ecast v2 client (`/api/v2/rooms/{code}/play`, `ecast-v0`), so the browser side looks unified; which generation each old TV-side game talks to is **unverified** beyond the README. | https://raw.githubusercontent.com/InvoxiPlayGames/johnbox/master/README.md | S |
| T35 | Community re-implementations prove the protocols are workable but incomplete: johnbox (Node; one room at a time; no audiences/moderation/reconnect/passcodes) and jonahbox (Rust; reports Packs 2-10 + Drawful 2 International working; Pack 1 ignores config and contacts Jackbox's servers). Neither is endorsed by Jackbox. | https://github.com/InvoxiPlayGames/johnbox ; https://github.com/e965/jonahbox | S |
| T36 | Both `ecast.jackboxgames.com` and `blobcast.jackboxgames.com` resolve to the same EC2 address in us-east-2 (reverse DNS `ec2-18-225-143-132.us-east-2.compute.amazonaws.com`); site root answers via AWS ELB (`Server: awselb/2.0`, HTTP 403), API via nginx. | https://ecast.jackboxgames.com/ ; https://blobcast.jackboxgames.com/ | P |
| T37 | Firewall ports: Jackbox staff (2016, Pack 3) told players to open 80, 443, 843, 38202, 38203. The current support article says Packs 7-10 use only 80/443 (seen in a search snippet; page returns 403 to my fetcher). Port 843 is Flash's default socket-policy port per Adobe docs; what Jackbox used it for is **unverified**. | https://steamcommunity.com/app/434170/discussions/0/341537671992509645 ; https://support.jackboxgames.com/hc/en-us/articles/15794759415575-I-m-having-trouble-connecting-to-the-Jackbox-servers ; https://help.adobe.com/en_US/as3/dev/WS5b3ccc516d4fbf351e63e3d118a9b90204-7c60.html | Q / SN / S |
| T38 | Room codes are 4 letters; room info exposes appTag, audienceEnabled, numAudience, joinAs, requiresPassword. | https://github.com/kklash/jackbox_scanner | S |
| T39 | Ecast server language/framework: not found. Whether TMP3's online matchmaking runs on Epic Online Services or something else: not confirmed (job posting only names EOS as required experience). | https://builtin.com/job/senior-unreal-engine-developer/4736551 | U |
| T40 | TMP3 adds Jackbox accounts, XP/unlocks and "Quick Party" matchmaking that still joins via Jackbox.TV. | https://jackbox.wiki/wiki/Trivia_Murder_Party_3 | S |

How to reproduce the primary checks: `curl -sL https://jackbox.tv/` (note the entry `<script type="module" src="/XXXX.js">`), fetch that file and grep for `ecast-v0`, `wrapper:"vue"`, `wrapper:"marionette"`, `getS3Url`; fetch any `https://bundles.jackbox.tv/main/<pack>-<tag>/<file>.js` listed in the manifest and grep for `createApp` (Vue) vs `Marionette`.

What this implies for a web rebuild (my inference, not sourced): Jackbox's own model is a thin browser controller (text, buttons, drawing canvas, optional camera/mic) + a room server that holds shared "entities" and pushes JSON over WebSocket; audience is just another low-privilege role. That maps directly onto any room/channel service you already have; the expensive parts are content and the real-time titles, not the transport.

---

## 4. Recurring mechanics across the catalog

| Mechanic | Games using it | Typical difficulty / note |
|---|---|---|
| Freeform answers + crowd vote (usually head-to-head duels) | Quiplash (2015), Quiplash XL, Quiplash 2, Quiplash 2 InterLASHional, Quiplash 3; Doominate; We Forgot a Card; Job Job; Joke Boat; Survive the Internet (vote on pairings); Dictionarium (per-round vote); FixyText (vote favourite words); Roomerang; Let Me Finish; Debate and Switch (side vote) | 1-2. Cheapest family to clone: prompt bank + pairing + vote tally. |
| Bluff: write a fake, find the original | Fibbage (2014), Fibbage XL, Fibbage 2, Fibbage 3 (+ Enough About You), Fibbage 4; Drawful, Drawful 2, Drawful: Animate, Dirty Drawful (fake titles for a drawing) | 2-3. Needs a verified fact bank or a user-generated content mode. |
| Draw it, others caption/guess/judge | Drawful family; Bidiots; Tee K.O. 1 and 2; Civic Doodle; Patently Stupid; Champ'd Up; Weapons Drawn; Cookie Haus; Nonsensory; Let Me Finish; Hyperface (photo version) | 3-5. Canvas + image storage; shared real-time drawing (Civic Doodle) is 4. |
| Guess how the crowd answered / match the majority | Guesspionage; The Poll Mine; Survey Scramble; Nonsensory; Role Models; Split the Room (split evenly); MegaPals (match others); Bracketeering (predict winners); Suspectives (survey seeds the case) | 2-4. Real survey data is the hard part unless you collect it from your own players. |
| Trivia with a host persona and consequences | YDKJ 2015, Full Stream, Classic; Trivia Murder Party 1-3; The Wheel of Enormous Proportions; Timejinx; Legends of Trivia; Lie Swatter; Quixort and Idol Factions (sorting trivia) | 3-5. Verified content + host writing; consequence minigames push TMP to 4-5. |
| Social deduction / hidden roles | Fakin' It / All Night Long / XL; Push the Button; Weapons Drawn; Suspectives; Hypnotorious; Monster Seeking Monster (mutual-pick dating) | 2-4. Private per-player screens are the main requirement. |
| Real-time or skill play on the phone | Dodo Re Mi; Quixort; Idol Factions; Zeeple Dome; The Devils and the Details; Bomb Corp.; TMP minigames; Tee K.O. 2 tapping final; FixyText; Civic Doodle | 4-5. Latency matters (Zeeple Dome drew latency complaints in reviews). |
| Speak/perform aloud while phones feed content | Talking Points; Junktopia; Let Me Finish; Debate and Switch; Patently Stupid; Mad Verse City and Joke Boat (TTS performs); Hear Say (record voice) | 2-5. Mostly social glue: little engineering when humans do the talking. |
| Constrained writing (limited vocabulary/template) | Word Spud; Job Job; Blather 'Round; Split the Room; Mad Verse City; Survive the Internet; FixyText (no delete) | 2-3. Cheap, high-variety. |
| Bracket / tournament | Bracketeering; Tee K.O. 1 and 2 | 2-3 |
| Auction / economy | Bidiots; Junktopia; YDKJ (cash and Screws); The Wheel (slices) | 3-4 |
| Media capture | Hear Say (mic); Hyperface (camera); Role Models and Talking Points (camera flag); every drawing game (canvas); Earwax (sound-effect library) | 3-5 |
| Teams / co-op | Poll Mine; Survey Scramble team modes; Idol Factions; Quixort; Legends of Trivia; Dodo Re Mi; Devils and the Details; Bomb Corp.; FixyText (two groups) | 4-5 |
| Pack-wide wrapper pattern | 3 rounds with a final-round twist (Last Lash, Thriplash, Final Fibbage, Decisive Dimension, Text You Up), a named host personality, an audience layer, and a room code | n/a |

### Easiest to recreate or riff on (difficulty 1-2)
- Difficulty 1: Quiplash family (all five Quiplash titles), Lie Swatter (needs verified facts).
- Difficulty 2: Word Spud, Fibbage family, Guesspionage, Fakin' It (+ AINL/XL), Survive the Internet, Bracketeering, Split the Room, Role Models, Dictionarium, Job Job, Doominate, We Forgot a Card.
- Content-light picks (players supply most of the content): Fibbage "Enough About You", Quiplash and Drawful 2 custom prompts, Split the Room (players finish the stems), Talking Points (players write the titles), and partly Job Job (icebreaker answers; interview questions still need a bank) and Suspectives (survey answers; survey questions and crime templates still need authoring).

---

## 5. Unverified / conflicting items

- Engine for YDKJ 2011-2013; programming language of the in-house engine; ecast server language; whether Packs 11-12 run on the pre-UE5 engine.
- Adobe AIR for Packs 1-4: supported by GameRant DB, GamingOnLinux and PCGamingWiki snippets, but not by a first-party statement I could fetch.
- Hyperface minimum players (2 vs 3); Fibbage 2 audience (Jackboxpedia yes vs Audience Kit table: no audience); YDKJ Full Stream audience (Wikipedia yes vs AK:X); Bomb Corp. mechanics (Wikipedia summary only); Zeeple Dome exact gesture.
- Partyverse status: Wikipedia says closed beta; the CEO's 2026-10-26 interview says launching with no date and does not mention a closed beta.
- TMP3 Early Access platforms: official page names Windows/Steam/Epic; Jackboxpedia also lists macOS/Linux; Wikipedia says Windows and macOS.
- Party Essentials date: Jackboxpedia 2026-04-07; official blog and Tudum 2026-04-09.
- "Acquisitions, Inc." and "Guesspionage Crowdplay" appear in the live controller manifest; I found no public release of either.
- Pack release dates differ by one day between Jackboxpedia and Steam pages (Packs 3, 4, 11, 12; Pack 1 differs by eight days: 2014-11-18 vs 2014-11-26).
- Other individually sold SKUs of pack games (like Fibbage XL on Apple TV and Switch) may exist on other storefronts; I did not compile a full per-platform list.
- Several third-party pages (PCGamingWiki, Jackbox support site, Variety, Checkpoint, fandom wiki) refused automated fetches; claims drawn from them are marked SN or omitted. I did not try to bypass their bot protection.
