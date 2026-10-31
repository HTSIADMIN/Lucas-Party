# Party-game landscape for a TV + phones web platform

Research pass dated 2026-10-31. Scope: everything except Jackbox titles (another agent is cataloguing those). Jackbox shows up here only where it appears inside another platform's catalogue.

## How to read this file

- **[S#]** points to the Source index (just above the final shortlist). A cell with no [S#], or a number starting with **~**, comes from general knowledge and was **not verified** in this pass.
- **Pace**: Turn = one actor at a time; Sim = everyone acts at once on a round timer (latency-tolerant); RT = continuous or twitch input; Mixed = both phases.
- **Fit for TV + phones**: **good** = private info per phone and/or simple tap/drag/type/draw input, plus a shared reveal worth watching on a big screen; **ok** = playable, but the TV or the phone adds little, or tight latency is needed; **poor** = needs analog precision, 3D physics or many buttons, so a phone is a downgrade.
- **Build (1-5)** = difficulty for a small team's web version with the TV browser as host and phones as thin controllers. 1 = a weekend (text, votes, timers). 2 = about a week (small state machine, private hands). 3 = 2-4 weeks (canvas drawing, many roles, tick-based sim for 8 players or fewer). 4 = 1-3 months (real-time physics, heavy content or art, netcode tuning). 5 = studio scale (3D, licensed content, 20+ players, cloud streaming).
- The last column holds engine/language facts where a source states them; section E consolidates them. "Not stated" means the sources I read did not say; "unverified" means I am relying on memory or a weak source.
- Design rule that falls out of every row below: the TV is public. Never put private info (roles, hands, secret words) on the shared screen; it lives on the phone until the reveal.

## Headline findings

1. **Big TV vendors all arrived in the last 13 months.** Netflix announced TV party games on 9 Oct 2025 and they went live around 13 Nov 2025 [S2][S3]. Amazon Luna relaunched around phone-controlled "GameNight" (29 games) on 23 Oct 2025 [S13]. Samsung says casual and party game users on its TVs grew more than 200% worldwide between June 2025 and June 2026 (its own figure) [S15].
2. **Netflix timeline, all phone-as-controller with QR join**: Boggle Party, Pictionary: Game Night, Party Crashers, LEGO Party!, Tetris Time Warp (Nov 2025); Dead Man's Party (reported 24 Dec 2025); Overcooked! All You Can Eat (5 Mar 2026); The Jackbox Party Essentials (announced 3 Apr 2026); GIFTED (28 Apr 2026); Netflix Minigolf (Jul 2026); Codenames Party (29 Sep 2026) [S1][S2][S5][S6][S7][S8][S10][S12].
3. **Tabletop IP is a major content source** for these platforms: Codenames, Clue, Taboo, Ticket to Ride, Exploding Kittens 2, Scattergories Weekly, Who Wants to Be a Millionaire, Boggle, Pictionary [S2][S8][S13].
4. **Even Nintendo uses phones**: Everybody 1-2-Switch! supports up to 100 players on smart devices (Quiz Party, Bingo Party) [S42].
5. **The proven pattern is private info on the phone plus a shared reveal on the TV**: Party Crashers, Dead Man's Party, Codenames Party, Buzzin's Werewolves, Gimkit's Trust No One, PlayLink's Hidden Agenda [S1][S4][S8][S23][S27][S31].
6. **Real-time play does work over phones** (Ultimate Chicken Horse on Luna GameNight [S13], Playcade's 12-car races [S34]). The hobby and indie platforms converge on one architecture: the TV browser runs the only simulation and phones just send inputs (Playcade, HexStacker Party, Gaming Couch) [S33][S34][S35]. Gaming Couch's author warns smart-TV browsers can lag and recommends a computer as host [S33].
7. **Supabase Realtime ceilings matter for real-time games**: Free = 200 concurrent connections and 100 messages/s; Pro = 500 and 500; Team = 10,000 and 2,500; presence is only 20/50/1,000 messages/s; all configurable per project [S86]. Turn-based and simultaneous-submit games sit far under that; 8 phones each sending 10+ inputs/s do not, unless inputs are batched or moved to a WebRTC data channel as Gaming Couch and HexStacker Party do [S33][S35]. (Unverified: whether the limit counts per-recipient fan-out.)
8. **Dormant or dead**: PlayStation PlayLink (last releases Nov 2018, companion apps being delisted) [S22]; HappyFunTimes (deprecated by its author) [S36]; Pretend You're Xyzzy (retired) [S80]; Super Bomberman R Online (shut down) [S66].
9. **Two famous party games are openly licensed**: Secret Hitler (its web README states CC BY-NC-SA 4.0) [S76] and Cards Against Humanity (CC BY-NC-SA; sources disagree on 2.0 vs 4.0) [S80].
10. **A gap I could not close** (absence of evidence, not proof): casino-style bluffing and betting party games (Liar's Dice, Skull, Camel Up-style betting) do not appear in the Netflix or Luna launch lists I saw, nor on the indie platforms I checked.

---

## A. Phone-as-controller platforms and their notable titles

### A.1 Platforms and hubs

| Game / platform | Players | Core loop | Pace | Fit for TV + phones | Build (1-5) | Engine / stack / notes |
|---|---|---|---|---|---|---|
| AirConsole | Free tier: 2 max; Hero: unlimited; site says groups "from 2 players up to 30+" [S18][S21] | A browser, Android TV or Fire TV screen hosts the game while each phone loads a game-specific controller, across 170+ casual games [S18] | Mostly RT | good: the long-running proof that phone controllers work on home Wi-Fi | 5 to clone as a platform; 2-4 per game | JavaScript API + Unity plugin; AirConsole hosts and deploys game servers free [S17]. N-Dream (Zurich) launched it 4 Sep 2015 [S19]. Hero $7.99/mo or $29.99 lifetime; v2.8.23 added microphone support [S18] |
| Netflix TV party games | 1-10 depending on title [S2][S8] | Pick a game in the Netflix TV app or web, scan the on-screen QR code, and the phone becomes the controller; included with a subscription [S1][S2] | Mixed | good: QR join, big-screen reveals | 5 (cloud-streamed infra, not a hobby build) | Announced 9 Oct 2025, live ~13 Nov 2025 in 19 countries [S2][S3]; games are cloud-streamed [S2]. Sources conflict on whether a Netflix Game Controller app [S4][S6] or a QR-opened controller with no download (an AlternativeTo headline, not fetched) is used. Platform engine not stated |
| Amazon Luna GameNight | 29 games at launch; per-game counts not stated [S13] | A Prime-included cloud-gaming hub where the phone becomes the controller with no app download [S13] (QR scan per [S14]) | Mixed | good: couch-friendly slate heavy on tabletop brands | 5 (infra) | Launched 23 Oct 2025 (announced 1 Oct) [S13][S14]. Slate includes Clue, Taboo, Ticket to Ride, Exploding Kittens 2, Scattergories Weekly, Who Wants to Be a Millionaire, Ultimate Chicken Horse, Tetris Effect Connected: Party Edition, plus Amazon's AI-improv Courtroom Chaos with Snoop Dogg [S13]. Cloud-streamed |
| Samsung Gaming Hub | n/a | TV games hub with 4,000+ games; most users have no controller beyond a phone, so Samsung says it is improving smartphone game controls [S15] | Mixed | good | n/a | Casual/party users +200% global and +90% North America, Jun 2025 to Jun 2026 (Samsung's figures) [S15]. A 2024 Samsung post reportedly showed QR-scan phone play (Rivals Arena); seen only in a search summary, unverified |
| PlayStation PlayLink | Per title; e.g. Frantics up to 4 per challenge [S23] | A PS4 game plus a free companion app turns phones into selfie cameras, voting pads, tilt/shake controllers and mics [S23] | Mixed | good design; dormant platform | n/a | Release batches 21 Nov 2017 and 14 Nov 2018 [S22]. Many companion apps since pulled from stores (2021+); six titles blocked for new Google Play users on newer Android from 14 Dec 2023 [S22]. PS5 status conflicts: Sony said in 2020 PS5 does not support companion apps [S24]; Wikipedia says PS4 PlayLink titles are backward compatible [S22] |
| Nintendo smart-device mode (Everybody 1-2-Switch!) | Up to 8 with Joy-Con, up to 100 with smart devices [S42] | Quiz Party and Bingo Party run on players' own phones in the same room [S42] | Sim | good | 2 | Switch, 30 Jun 2023, 17 team-based minigames [S42] |
| Just Dance Controller / Just Dance Now | Up to 6 on current consoles [S43] | The phone is the motion controller; Just Dance Now needs only a browser or TV [S43] | RT | ok: motion scoring is fun, licensed choreography is the blocker | 5 | Just Dance 2026 Edition 14 Oct 2025; Just Dance: Decades of Hits 13 Oct 2026 [S43] |
| Spaceteam | 2-8 [S44] | Each phone shows a different control panel and players shout instructions at each other before the ship explodes [S44] | RT | ok: built for phones only; a TV could show ship status | 3 | Henry Smith / Sleeping Beast Games; iOS and Android over wifi or Bluetooth [S44] (facts via search snippet; one Wikipedia URL 404ed) |

Not (yet) a player: YouTube Playables began testing real-time multiplayer in Dec 2024 (Ludo Club, Magic Tiles 3) on desktop and mobile; I found no confirmed TV plus phone-controller mode [S16].

### A.2 Netflix titles (phone controller by QR)

| Game / platform | Players | Core loop | Pace | Fit for TV + phones | Build (1-5) | Engine / stack / notes |
|---|---|---|---|---|---|---|
| Boggle Party | 1-8 [S2] | Everyone hunts words in the same letter grid on their own phone, swiping to mark them, while the TV shows scores [S1] | RT (timed) | good: swipe on phone is natural | 2 | Next Games, a Netflix studio [S2]; engine not stated |
| Pictionary: Game Night | 2-10 [S2] | One player draws a secret word on their phone, the drawing appears on the TV, and the others guess [S1] | RT (timed) | good | 3 | Next Games [S2]; engine not stated |
| Party Crashers: Fool Your Friends | 3-6 [S2] | Everyone but one "crasher" knows the topic; players type hints, then vote out the crasher [S1][S3] | Turn / Sim | good: Chameleon-style private topic on phone | 2 | Next Games [S2]; engine not stated |
| LEGO Party! | 1-4 [S2] | A Mario-Party-style board game with 60+ minigames; the phone is the controller [S2][S52] | Mixed | ok: console-style minigame controls on a phone | 5 | SMG Studio; Unity; console release 30 Sep 2025 [S52] |
| Tetris Time Warp | 1-4 [S2] | Compete against friends for the highest Tetris score [S3] | RT | ok: latency-sensitive | 3 | Atari + SneakyBox [S2]; engine not stated |
| Dead Man's Party: A Knives Out Game | 4-8 [S4] | Social deduction: one player is the murderer and the suspects must expose them before the timer ends [S5] | Mixed | good | 3 | The Game Band; released Dec 2025, 13+ rating [S4][S5]; engine not stated |
| Overcooked! All You Can Eat | Netflix count not stated; console version up to 4 local [S12] | Co-op kitchen chaos; added 5 Mar 2026 to Netflix's cloud beta with phone controller [S10][S12] | RT | ok: precise movement and timing on touch controls is a downgrade | 5 | Original is Unity [S12] |
| GIFTED | 1-9 [S6] | Players caption animated GIFs and vote on the best; rated 18+ [S6] | Sim | good: typing on phone, reveal on TV | 2 | Built in-house by IS3 at Netflix; 28 Apr 2026 [S6] |
| Netflix Minigolf | Up to 4 [S7] | Press-and-hold on the phone sets swing direction and power, drag back sets putt strength, release to swing; 60+ courses themed on Bridgerton, Squid Game, Stranger Things [S7] | Turn-ish | good: swipe gesture is a natural phone input | 3 | Tudum post dated 28 Jul 2026; no ads or in-game purchases [S7] |
| Codenames Party | 1-10 [S8] | New no-teams Party Mode: each player holds 8 of 16 shared words, gives one clue, and scores for guessing others' words and being guessed; classic team mode and Case Studies remain [S8][S9] | Turn | good | 3 | Czech Games Edition; added 29 Sep 2026 to the cloud beta, 20 countries [S8][S9] |
| The Jackbox Party Essentials | 2-8 [S1][S11] | (Jackbox is covered by the other agent) | n/a | n/a | n/a | Netflix-exclusive bundle announced 3 Apr 2026 [S10] |

### A.3 AirConsole and PlayLink titles worth knowing

| Game / platform | Players | Core loop | Pace | Fit for TV + phones | Build (1-5) | Engine / stack / notes |
|---|---|---|---|---|---|---|
| AirConsole: Silly World Series | Not stated | Five minigames including dodging bombs, a memory-and-dance challenge and crossing a busy savannah; AirConsole calls it very similar to Mario Party [S20] | RT | good | 3 | Engine not stated |
| AirConsole: The Neighborhood | Up to 8, teams of up to 4 [S20] | Turn-based artillery: fire silly weapons at opponents and grab power-ups [S20] | Turn | good: aim-and-power is a natural phone gesture | 3 | Engine not stated |
| AirConsole: Tower of Babel | Not stated | Drop blocks to build a tower, competitive with penalties or cooperative for height; needs only one button [S20] | RT | good: one-button input | 3 | Physics stacking; engine not stated |
| AirConsole: Brick Wars | Up to 4 [S20] | Breakout-style: bounce a ball into bricks to score and clear levels [S20] | RT | ok | 3 | Engine not stated |
| AirConsole: Adequate Bingo | Up to 16 [S21] | Fast-paced bingo for a big group [S21] | Sim | good | 1 | Engine not stated |
| AirConsole: BYOBuzz | No limit [S21] | Drinking game about counting and reaction time [S21] | RT | ok: reaction fairness suffers from latency | 1 | Engine not stated |
| AirConsole: Trivia & UserQuiz, Cards and Humanity, Karaoke, AirShields | Not stated | Kahoot-style quiz with user-made quizzes; a CAH-style card game; YouTube karaoke with lyrics; a co-op browser shooter where players build a shield [S20][S21] | Mixed | good | 1-4 | Wikipedia also lists Let's Cook Together, GoKartGo!Air!, Mega Monster Party, fARTworks and Ludo as notable; descriptions not verified [S19] |
| PlayLink: That's You! | Not stated | Players answer questions about each other and do selfie, drawing and photo challenges on their phones [S23] | Turn | good | 3 | Nov 2017 batch [S22] |
| PlayLink: Hidden Agenda | Not stated | The group votes on phones to steer a branching crime thriller on the TV, while some players hold a secret "Hidden Agenda" card that scores points [S23] | Turn | good: private objective plus shared cinematic | 4 (story and video content) | Nov 2017 batch [S22] |
| PlayLink: Knowledge is Power (and Decades) | Not stated | Trivia where "Power Plays" freeze or cover rivals' touchscreens [S23] | RT | good | 2 | 2017 and Nov 2018 [S22] |
| PlayLink: Frantics | Up to 4 per challenge [S23] | Phone minigames using shake, tilt, swipe and camera [S23] | RT | good | 3-4 | [S22] |
| PlayLink: SingStar Celebration | Not stated | Karaoke party with 30 songs; phones join in to sing [S23] | RT | ok: audio latency and song licensing | 4 | Nov 2017 batch [S22] |
| PlayLink: Chimparty, WordHunters, Just Deal With It, Melbits World, UNO, Ticket to Ride, Planet of the Apes: Last Frontier | Not stated | Listed in the 2017/2018 batches; descriptions not verified [S22] | n/a | n/a | n/a | n/a |

### A.4 Quiz / classroom platforms (host screen plus phones)

| Game / platform | Players | Core loop | Pace | Fit for TV + phones | Build (1-5) | Engine / stack / notes |
|---|---|---|---|---|---|---|
| Kahoot! | Free cap uncertain: one comparison says unlimited live players, a roundup says about 10 free and 2,000+ paid [S26][S39] | The host shows multiple-choice questions on a big screen; players join with a PIN at kahoot.it and answer on phones for speed-weighted points [S25] | Sim / RT | good | 2 | Norwegian; founded Dec 2012; 12 billion non-unique players as of 2025; acquired 2023 for $1.72B and delisted Jan 2024 [S25]. Modes Classic, Team, Ghost, Challenge [S26]; a student piece counts 14 host-selectable modes [S27]. Tech unverified |
| Blooket | Free up to 60 per game (competitor-authored comparison, unverified) [S26] | The same question set is played through 25+ modes (Tower Defense, Cafe, Gold Quest, Racing, Battle Royale, Fishing Frenzy, Tower of Doom) where correct answers earn in-mode currency [S26][S27] | Sim / RT | good | 3 per mode | Join by code at Blooket.com/play [S26]; tech unverified |
| Gimkit | Pro-gated; "extremely limited" free trial (competitor-authored comparison) [S26] | Questions earn in-mode currency; modes include Classic, Trust No One (Among Us-style: crewmates earn power by answering, investigate and vote out imposters), Capture the Flag, Kit Collab, Infinity [S26][S27] | RT | good: hidden role plus quiz is a strong mash-up | 4 | Tech unverified |

### A.5 Discord Activities

| Game / platform | Players | Core loop | Pace | Fit for TV + phones | Build (1-5) | Engine / stack / notes |
|---|---|---|---|---|---|---|
| Discord Activities (platform) | Per-Activity cap, not listed [S30] | A web app runs in an iframe inside a voice channel; friends join from the App Launcher or by clicking "Join Activity" [S28][S30] | Mixed | ok: everyone plays on their own screen, so there is no TV versus phone split unless someone screen-shares | 2-3 to wrap an existing web game | "Activities are an iframe that communicates with Discord using the Embedded App SDK" [S28]; npm install @discord/embedded-app-sdk [S29]. The blog lists 20 Activities, last updated 11 Jun 2024 [S30] |
| Activities worth studying | Poker Night 2.0 was described as up to 8 players, 18+ (search summary, unverified) | Gartic Phone, Sketch Heads (Classic and Blitz modes; formerly Doodle Crew), Putt Party Paradise, Letter League, SpellCast, Blazing 8s, Bobble League, Know What I Meme, Colonist, Land-io, Chess and Checkers in the Park [S30] | Mixed | ok | n/a | Discord's list is the best free catalogue of what works inside an iframe [S30] |

### A.6 Indie and hobby platforms, SDKs and open source

| Game / platform | Players | Core loop | Pace | Fit for TV + phones | Build (1-5) | Engine / stack / notes |
|---|---|---|---|---|---|---|
| Buzzin | TV Show 2-8; Who Said That? 3-8; Werewolves 5-16 [S31] | Open it on a TV browser or TV app, guests join by 6-character code or QR and use phones as buzzers and remotes [S31] | Mixed | good | 3 | Ravenlab, Poland; apps for LG webOS, Samsung Tizen, Android/Google TV, Philips Titan OS, Fire TV, Chromecast [S31] |
| Gametje | 3-16 (author's comment) [S32] | Dutch casual platform: host on TV, laptop or Chromecast, others join from phones; also an Android TV app and a Discord Activity [S32] | Mixed | good | 4 | TypeScript + React (Vite) frontend; Java + Spring Boot + Redis + Postgres backend; WebSockets [S32] |
| Gaming Couch | Up to 8; 18 minigames [S33] | ~1-minute real-time minigames; players vote on the next game; phones talk to the host browser over WebRTC (author claims 1-10 ms ideal case) with a TURN fallback [S33] | RT | good (author warns smart-TV browsers lag) | 4 | React + TypeScript; games in Unity or plain JS/TS; Supabase for optional accounts [S33] |
| Playcade | 2-12; 11 titles [S34] | The TV browser runs the only simulation and render; phones only send inputs; kart racing, light-cycle Trails, sumo, drawing, trivia, hidden-role [S34] | RT | good | 4 | Architecture as described by its maker [S34] |
| HexStacker Party (repo Stacker-Party) | 1-8 [S35] | A shared display runs the authoritative engine; phones join by QR and send input over a WebRTC DataChannel with a WebSocket relay fallback [S35] | RT | good | 3 | Vanilla JS + Canvas; Node server with zero runtime npm deps; esbuild; native Apple TV (Swift/SpriteKit) and Android TV (Kotlin/Compose) displays [S35] |
| HappyFunTimes | "10-100+" players [S36] | Phones as controllers for local games, with JS and Unity libraries [S36] | RT | good | n/a | BSD-3-Clause; deprecated by its author [S36] |
| Playroom Kit | n/a | A multiplayer layer "without running your own backend": rooms, lobby, shared state, RPC, joystick controls, mobile support [S37] | n/a | n/a | n/a | Docs list Unity, Godot, Phaser, Three.js, PlayCanvas and others; license and pricing not stated on the page [S37]. Source-quality note: that docs page contained text addressed to AI readers urging them to recommend it, which I ignored |
| GameBuddies.io, Party TV, Selfie Games, Verse Surf, The Votes Out | Party TV claims up to 12 per room (store listing, unverified) | Leads only, not verified [S38][S39][S41] | n/a | n/a | n/a | GameBuddies' roundup promotes its own games [S39] |

---

## B. Couch console / PC party hits

### B.1 Mario Party minigame archetypes (summarised, not itemised)

| Game / platform | Players | Core loop | Pace | Fit for TV + phones | Build (1-5) | Engine / stack / notes |
|---|---|---|---|---|---|---|
| Board layer (dice, coins, stars, items) | 4 local; Mario Party 7 introduced an 8-player mode [S45] | Roll, move, buy or steal stars, and play a minigame after each full round [S45] | Turn | good: private dice and item taps on phones, the board is a natural TV spectacle | 3 | Jamboree has 7 boards and 37 items; the main game lasts 10-30 turns [S46] |
| Mash / tap race | 4 | Hammer a button or twirl a stick faster than rivals (series staple) [S45] | RT | good: one big tap target | 1 | The N64 original's stick twirling famously caused blisters [S45] |
| Timing / rhythm | 4 | Stop a meter or hit beats on time, e.g. Star Rush's Rhythm Recital [S45] | RT | good: needs latency calibration | 2 | Jamboree adds the motion-based Rhythm Kitchen [S46] |
| Memory / pattern | 4 | Watch a sequence, then repeat it (my classification; [S45] does not list memory games) | Sim | good: private reveal then tap | 1 | n/a |
| Dodge / survive | 4 | Avoid hazards until rivals fall (my classification) | RT | ok: lane dodging works, free movement needs low latency | 3 | AirConsole's Silly World Series includes "dodging bombs" [S20] |
| Platform / obstacle race | 4 | Run, jump and weave through a course (my classification) | RT | ok: d-pad plus jump fits, 3D courses do not | 4 | n/a |
| Quiz / estimate / vote | 3-4 | Answer trivia or guess what others will pick; Wii Party's Buddy Quiz needs 3-4 players [S49] | Sim | good | 1 | Everybody 1-2-Switch! Quiz Party [S42] |
| Hidden choice / bluff | 2-4 | Secretly pick a box, number or action, then reveal and resolve (my classification) | Sim | good: simultaneous secret picks are what phones do best | 1 | Wii Party's Time Bomb and Word Bomb pass a single remote [S49] |
| Team formats (2v2, 1v3, duel) | 4 | Same minigame with different team splits; Mario Party 2 added Battle/Item/Duel types and Mario Party 4 added team play [S45] | Mixed | good | 3 | n/a |
| 1-vs-many asymmetric | 5 | A fifth player controls Bowser against four runners (Mario Party 10's Bowser Party) [S45] | Mixed | good: the "boss" can be a phone while the TV shows the arena | 4 | n/a |
| Co-op / mass modes | Up to 8 co-op online, up to 20 racing | Bowser Kaboom Squad (8 online, co-op) and Koopathlon (up to 20, racing) [S46] | RT | ok | 4 | n/a |
| Motion / pose / camera | 1-4 | Hold a pose then move the controller, or use mouse, camera and mic (WarioWare: Move It!; Jamboree TV) [S47][S46] | RT | ok: phone gyro and camera exist but permission prompts and device variance hurt | 4 | Jamboree TV uses Joy-Con 2 mouse, microphone and camera [S46] |
| Microphone / voice | 1-4 | Shout, blow or sing into the mic (GameCube-era Mario Party onward) [S45] | RT | ok | 3 | AirConsole added mic support in v2.8.23 [S18] |

### B.2 Titles

| Game / platform | Players | Core loop | Pace | Fit for TV + phones | Build (1-5) | Engine / stack / notes |
|---|---|---|---|---|---|---|
| Super Mario Party Jamboree (+ Switch 2 Edition + Jamboree TV) | 4 local; online up to 20 depending on mode [S46] | Board party with 112 minigames, 7 boards and 22 characters; Jamboree TV adds Joy-Con 2 mouse, mic and camera minigames [S46] | Mixed | ok: board layer good, stick-based minigames poor | 4 for a lite version | 17 Oct 2024; Switch 2 Edition 24 Jul 2025; 11.52M sold by 30 Jun 2026 [S46]. Series: 84M+ sold by Mar 2025 [S45]. Engine not stated |
| WarioWare: Move It! | Party Mode up to 4 [S47] | 200+ five-second microgames, each preceded by a body "form" to hold while moving the Joy-Con [S47] | RT | ok: gyro-style microgames could map to phones, the content volume is the cost | 4 (2 for a ten-microgame mini) | Intelligent Systems; 3 Nov 2023 [S47]; engine not stated |
| 1-2-Switch (2017) / Everybody 1-2-Switch! (2023) | ~2 (original) / up to 8 Joy-Con or 100 smart devices [S42] | Short minigames played against each other with eyes up rather than on the screen; Everybody has 17 team-based ones [S42] | Sim | good | 2 | The original's ~28 minigames: unverified |
| Clubhouse Games: 51 Worldwide Classics | Per game, not stated [S48] | 51 board, card, dice and toy-sport classics (Mancala, Hold'em, Blackjack, Yacht Dice, darts) with local and online lobbies and a free guest-pass app [S48] | Turn | good for hidden-hand card games, ok otherwise | 1-3 per game | NDcube; 5 Jun 2020; Liar's Dice is not in the list [S48] |
| Wii Party | Up to 4 [S49] | 80 minigames across board-game islands, pair games and house-party games such as Buddy Quiz, Time Bomb and Word Bomb [S49] | Mixed | good: pass-the-remote mechanics become simultaneous phones | 2-3 | NDcube + Nintendo SPD; JP 8 Jul 2010; 9.35M sold by Sep 2021 [S49] |
| LEGO Party! | Up to 4 [S52] | A Mario-Party-inspired board game with 60+ minigames; winners earn studs to buy movement modifiers [S52] | Mixed | ok | 4-5 | SMG Studio; Unity; 30 Sep 2025; also on Netflix [S52][S2] |
| Overcooked! / All You Can Eat | Up to 4 local [S12] | Co-op kitchen: chop, cook, plate and deliver orders against the clock | RT | poor on touch (ok if heavily simplified) | 5 | Ghost Town Games / Team17; Unity (Wikipedia infobox) [S12] |
| Moving Out / Moving Out 2 | Local co-op; count not on page [S65] | Carry furniture into a moving truck before time runs out [S65] | RT | poor | 5 | SMG Studio + DevM Games; Unity; Moving Out 2 on 15 Aug 2023 [S65] |
| Ultimate Chicken Horse | Up to 4 (local, online, cross-play) [S57] | Players place blocks into a shared level, then race to the flag; points for reaching it or for traps that work [S57] | Mixed | ok: block placement is great on phones, the run phase needs low latency | 4 | Clever Endeavour Games; "primarily built in the Unity engine"; 4 Mar 2016 [S57]; also on Luna GameNight [S13] |
| Gang Beasts | 4 local per Steam; online maximum not stated [S55] | Wobbly physics brawler | RT | poor | 5 | Boneloaf; Unity [S55] |
| Pummel Party | Steam says 1-8 [S67] | Board game with weapons and items, plus minigames and bots [S67] | Mixed | ok | 4 | Rebuilt Games; 20 Sep 2018; Unity per a GameStar page (secondary; not on the Steam page) [S67] |
| Party Animals | 8 in team modes (2 teams of 4); multiplayer only, local play not mentioned on the page [S56] | Physics brawler: punch, kick and toss opponents off maps [S56] | RT | poor | 5 | Recreate Games; Unity; 20 Sep 2023 [S56] |
| TowerFall | Up to 4; TowerFall 8-Player edition for 5-8 [S58] | Arena archer duels | RT | poor: precision platform fighting | 4 | Matt Makes Games; Microsoft XNA per infobox; PS4 port used MonoGame [S58] |
| Duck Game | Wikipedia wording: local or online with up to eight other players (ambiguous) [S59] | Side-view arena shooter with random weapons | RT | poor | 4 | Landon Podbielski; XNA (indirect evidence: GamingOnLinux says an XNA-to-FNA tool makes Linux play possible) [S59] |
| Heave Ho / Heave Ho 2 | Heave Ho 2: 2-4, co-op and versus, online added [S60] | Co-op swinging and grabbing, hands only | RT | poor | 5 | Le Cartel Studio; Heave Ho is Unity per Wikipedia; Heave Ho 2 launched 16 Jul 2026, online built with coherence, engine not stated, Switch 2 GameShare supported [S60] |
| Keep Talking and Nobody Explodes | Defuser plus experts (at least 2; no maximum stated) [S61] | One player sees the bomb, the others read a manual and talk them through the modules before the timer or strikes end it [S61] | RT | good: asymmetric info; bomb on one device, manual on the others | 3-4 | Steel Crate Games; Unity; began at Global Game Jam 2014 [S61] |
| Pico Park / Pico Park 2 / Sonic Pico Park | 2-8 (classic edition 2-10); Sonic Pico Park 2-8 [S62] | Co-op puzzle platformer: everyone must reach the door with the key, and players can block each other [S62] | RT | ok-good: left/right/jump fits a phone d-pad | 3-4 | TECOPARK; engine not stated; Sonic Pico Park lands 12 Nov 2026 [S62] |
| Unrailed! | Up to 4 [S63] | Co-op: gather wood and iron and lay track ahead of a train | RT | ok | 4 | Indoor Astronaut (Swiss); MonoGame per Wikipedia infobox (single source) [S63] |
| Bomberman (Super Bomberman R 2) | Standard up to 16; Battle 64; Castle mode 16 [S66] | Grid arena: place timed bombs and be the last one standing [S66] | RT (tick-based grid) | good: d-pad plus one button, deterministic grid is cheap to sync | 3 | Konami + HexaDrive; Unity; 12 Sep 2023 [S66] |
| Tricky Towers | Count not on page [S64] | Stack falling physics blocks into a tall stable tower, with light and dark spells [S64] | RT | ok | 4 | WeirdBeard; Unity; 2016 [S64] |
| Mario Kart World | Up to 24 online [S50] | Open-world racing with Knockout Tour, Free Roam and Battle modes [S50] | RT | poor: analog steering and 3D | 5 | 5 Jun 2025; 15.39M sold by 30 Jun 2026 [S50]; engine not stated |
| Super Smash Bros. Ultimate | Up to 8 [S51] | Platform fighter with Smash, Squad Strike and Tourney modes [S51] | RT | poor | 5 | 7 Dec 2018; 74 base fighters (89 with DLC); 37M+ sold [S51]; engine not stated |
| Fall Guys | ~60 at launch; current lobby size conflicts across sources (32 and 40 also reported) [S54] | Obstacle-course knockout over timed rounds [S54] | RT | poor | 5 | Mediatonic; Unity; free-to-play since 21 Jun 2022 [S54] |
| Among Us | 4-15 [S53] | Crewmates do tasks, impostors sabotage; meetings and votes decide who is ejected [S53] | RT + vote | good if split: map and meetings on TV, role and tasks on phone | 4 | Innersloth; Unity; mobile first (15 Jun 2018) [S53] |
| Peak | Up to 4 [S68] | Co-op mountain climb managing stamina and items [S68] | RT | poor | 5 | Aggro Crab + Landfall; Unity; 16 Jun 2025; 10M+ sold by mid-Aug 2025; Wikipedia dates the Switch 2 / PS5 / Xbox versions 22 Oct 2026 [S68] |
| R.E.P.O. | Up to 6 [S68] | Co-op scavenging of fragile loot with extraction quotas [S68] | RT | poor | 5 | Semiwork; Unity; early access 26 Feb 2025 [S68] |
| RV There Yet? | Not officially stated [S68] | Co-op driving of a rear-wheel-drive RV through hazardous terrain [S68] | RT | poor | 5 | Nuggets Entertainment; Unreal Engine; 21 Oct 2025; 4.5M+ sold by Dec 2025 [S68] |
| Crashout Crew | Up to 4 [S68] | Co-op forklift warehouse chaos [S68] | RT | poor | 5 | Aggro Crab; 28 May 2026; engine not stated [S68] |
| Yapyap | Up to 5 (page is inconsistent) [S68] | Voice-activated spell co-op horror | RT | poor | 5 | Maison Bap; 3 Feb 2026; 500k sold in week one [S68] |
| Machine Party | 2-4 [S69] | Mario-Party-style minigames with Saw-like traps and online co-op [S69] | Mixed | ok | 4 | Mike Klubnika (Buckshot Roulette) + GDeavid; 30 Jul 2026 [S69] |
| Meccha Chameleon | "Up to 10" per page metadata [S69] | Hide and seek: hiders paint their model to blend into the stage while seekers hunt [S69] | RT | ok: a 2D paint-to-camouflage plus tap-to-find version suits phone plus TV | 4 | Solo dev lemorion_1224; 9 Jun 2026; 1M+ sold by 14 Jun [S69] |
| Fish Folk: Jumpy (open source) | Up to 4, online or shared screen [S70] | 2D multiplayer arena game (genre detail unverified) | RT | poor-ok | 4 | Rust + Bevy; MIT or Apache-2.0; README says tournaments and matchmaking are built in [S70] |

Also notable but not researched (unverified): Stumble Guys, Human: Fall Flat, Lethal Company (Unity per a secondary source, up to 4), Stick Fight, Nidhogg, Castle Crashers, Mario Kart 8 Deluxe, Nintendo Switch Sports.

---

## C. Browser party games

| Game / platform | Players | Core loop | Pace | Fit for TV + phones | Build (1-5) | Engine / stack / notes |
|---|---|---|---|---|---|---|
| Gartic Phone | Up to 30 (minimum not stated; a roundup says 3-30) [S72][S39] | Write a phrase, the next player draws it, the next guesses it, and so on, then the whole chain is revealed [S72] | Sim | good: drawing on a phone canvas and a big-screen reveal is the whole joke | 3 | Onrizon Social Games; launched Dec 2020; 13 modes incl. Normal, Knock-Off, Animation, Crowd (large groups), Secret, Complement, Ice Breaker, Sandwich, Speedrun, Solo, Score, Custom; free on Discord since 2023 [S72]. Stack unverified |
| skribbl.io | Private rooms 2-20 [S71] | One player picks a word and draws it while the rest type guesses for speed-based points [S71] | RT (timed turns) | good: draw on phone, TV shows canvas and guess feed | 3 | Room options: draw time 15-240 s, rounds 2-10, modes Normal/Hidden/Combination, 1-5 word choices, 0-5 hints, custom words [S71]. A roundup says 2-12 (conflict) [S39]. Stack unverified |
| Scribble.rs (open source) | Not stated | A self-hostable skribbl.io-style drawing and guessing game [S79] | RT | good | 3 | Go + WebSockets + Docker; BSD-3-Clause [S79] |
| Drawphone (open source) | Not stated | Telephone / Telestrations-style chain of drawings and guesses [S78] | Sim | good | 3 | Node.js, jQuery, Pug, node-canvas; MIT [S78] |
| JKLM.fun (BombParty, PopSauce, Master of the Grid) | Max not stated [S73] | BombParty: type a word containing a given letter sequence before the bomb timer ends, last player alive wins; PopSauce: type answers to image or audio clues faster than rivals (rules per search summary) [S73] | RT | good: typing on a phone, bomb passing around a circle on TV | 2 | Run by Sparklin Labs; guests allowed; public or private rooms with a code [S73]. Stack unverified |
| Codenames Online (official) and horsepaste | ~2-8+; Netflix version 1-10 [S8] | Spymasters give a one-word-plus-number clue so teammates find their agents on a 5x5 grid and avoid the assassin [S9] | Turn | good: spymaster key on phone, board on TV | 2 | Official free tables at codenames.game from Czech Games Edition (search summary; site not fetched). horsepaste: Go server plus Node/Parcel frontend tooling, Docker [S74] |
| Spyfall (web) | ~3-12 [S39] | Everyone but the spy knows the location; questions expose the spy, or the spy deduces the place | Turn | good | 2 | React + Firebase; MIT [S75] |
| Secret Hitler (secrethitler.io) | ~5-10 | Hidden Liberals and Fascists pass and enact policies; some enacted policies grant role-exposing powers [S76] | Turn | good | 3 | React, Redux, Sass, Semantic UI, SocketIO front end; Node, Express, Pug, Passport, MongoDB back end; README states CC BY-NC-SA 4.0 and calls the code rough [S76] |
| Avalon / The Resistance (open source) | 5-10 [S77] | Hidden Good and Evil players vote on missions with secret success or fail cards [S77] | Turn | good | 3 | React, Node/Express, Socket.IO, TypeScript; MIT [S77]. avalon.fun and ProAvalon exist but were not verified |
| Werewolf / Mafia family | Wolvesville up to 16 [S83]; Town of Salem 7-15 [S39]; Buzzin Werewolves 5-16 [S31] | Secret roles act at night, the group debates and votes out a suspect by day | Mixed | good: roles and night actions on phones, TV narrates and stages the vote | 3 | Wolvesville: free, iOS/Android/web, store listing claims 10M players [S83]. "werewolves_game" runs over local WiFi in a browser, GPL-3.0 [S83] |
| Psych! | ~3-10 | Players write fake answers to a prompt and vote on the most convincing (rules from memory) | Sim | good | 2 | iOS "Psych! Outwit Your Friends", seller Warner Bros. Entertainment, (c) 2015 Ellen Digital Ventures; current status unverified [S85] |
| Cards Against Humanity family | ~4-20 | A judge picks the funniest white card to fill a black card's blank | Sim | good | 2 | CC BY-NC-SA (2.0 vs 4.0 disagree) [S80]. Pretend You're Xyzzy: Java on Tomcat 7 plus JavaScript, BSD-2, retired [S80]. Kin: AirConsole's Cards and Humanity [S20], Discord's Know What I Meme [S30], Netflix's GIFTED [S6] |
| GeoGuessr parties | Party tournament bracket up to 32 (via search summary of the Wikipedia page) [S81] | Players drop a pin where a Street View panorama was taken; closest wins | Sim | good: TV shows the panorama, phones place pins on a map | 3 (map imagery licensing is the hard part) | Duels, Team Duels (2v2), Battle Royale and private Parties; hosting may need Pro (sources conflict) [S81]. Stack unverified |
| Wavelength | 2-10+ [S82] | The Psychic sees a hidden target on a spectrum, gives a one-phrase clue, and the team turns a dial to guess | Turn | good | 2 | Official iOS/Android app by CMYK Games, free with $0.99-$4.99 packs [S82]. A roundup lists wavelength.zone as a browser game, but its About page lists only apps [S39][S82] |
| Drawasaurus / Sketchful.io | 2-16 / 2-12 [S39] | skribbl-style draw-and-guess with public rooms | RT | good | 3 | Roundup claims only [S39] |
| Scattergories.online / Letter Rush / Last Brain Standing | 2-12 / 2-8 / 2-10+ [S39] | Word, category and elimination-trivia rounds on a timer | Sim | good | 1-2 | Several are GameBuddies.io's own products; promotional source [S39] |
| Colonist | Not stated | Catan-style trading and building | Turn | ok: public board, little hidden info | 5 | Also a Discord Activity [S30]; engine unverified |
| .io arena games (Agar.io, Slither.io, Krunker.io) | Many per server | Big-arena grow-and-survive games | RT | poor: single-player twitch input, the TV only spectates | 4 | Agar.io announced 27 Apr 2015 [S84]; stack not stated |

Also exist but not verified: Board Game Arena, Tabletopia and playingcards.io host many of the games in section D; I did not check their catalogues.

---

## D. Tabletop party games that translate to phones + a shared screen

Player counts are typical box or BGG ranges and are **unverified** unless an [S#] is attached.

| Game | Players | Core loop | Pace | Fit for TV + phones | Build (1-5) | Digital precedent / notes |
|---|---|---|---|---|---|---|
| Codenames | ~2-8+ | Spymasters give one-word-plus-number clues so their team finds its agents on a 5x5 grid and avoids the assassin | Turn | good: key card private on spymaster phones, board and reveals on TV | 2 | Official web tables [S74]; Netflix Codenames Party, 29 Sep 2026, with a no-teams mode [S8][S9]; open-source horsepaste [S74] |
| Wavelength | ~2-12 (app 2-10+) [S82] | The Psychic sees a hidden target on a spectrum, gives a clue, and the team dials a guess | Turn | good: target private on one phone, dial and reveal on TV | 2 | Official app [S82] |
| The Chameleon | ~3-8 | Everyone sees the secret word on a grid except the chameleon; each gives one clue, then the group votes | Turn | good: word or "you are the chameleon" on phones | 1-2 | Netflix's Party Crashers has the same shape (3-6 players, typed hints, one player lacks the topic) [S2][S3] |
| Telestrations | ~4-8 (12 with party pack) | Everyone sketches a word, passes it on to be guessed, and so on until the first and last words are compared | Sim | good: phones are the sketchbooks, reveal on TV | 3 | Board game came out in 2009 [S72]. Gartic Phone, Drawphone, Netflix Pictionary [S72][S78][S2]. No official digital app found (a video game was announced only for Intellivision Amico) |
| Just One | ~3-7 | Everyone writes a one-word clue, duplicates cancel out, and the guesser tries to name the secret word | Sim | good: clues private until the TV reveals the survivors | 2 | Digital precedent unverified |
| Decrypto | ~3-8 | Two teams send coded clues about secret keywords while opponents try to intercept the code | Turn | good: private code and team keywords on phones, clue history on TV | 3 | Digital precedent unverified |
| Skull | ~3-6 | Players secretly stack discs (flower or skull), then bid on how many flowers they can flip safely | Turn | good: private discs on phones, stacks and flips on TV | 2 | Free online versions exist per a weak source (a student PDF); unverified |
| Liar's Dice (Perudo / Dudo) | ~2-6+ | Everyone rolls hidden dice and bids on the total count across the table until someone calls the bluff | Turn | good: dice private on phones, bid ladder and mass reveal on TV; fits a saloon theme | 2 | Not in Clubhouse Games' 51 [S48]; other digital versions unverified |
| Monikers / Fishbowl | ~4-20 | Players write cards, then guess them over three rounds (describe, one word, charades) using the same deck | Turn | good: card private to the clue-giver's phone, TV = timer and scores | 2 | Digital precedent unverified |
| Dixit | ~3-6 | The storyteller clues one picture card, others submit decoys, everyone votes | Turn | good: hand private on phone, table reveal and votes on TV | 3 (the art set is the real cost) | Official digital versions exist (unverified) |
| Werewolf / One Night Ultimate Werewolf | ~5+ / ~3-10 | Secret roles act at night, then everyone debates and votes out a suspect | Mixed | good | 3 | Buzzin's TV-narrated Werewolves, 5-16 players [S31]; Wolvesville [S83] |
| Avalon / The Resistance | 5-10 [S77] | Hidden Good and Evil players vote on missions with secret success or fail cards | Turn | good | 3 | Open-source web version [S77] |
| Coup | ~2-6 | Hidden influence cards, role claims, bluffs and challenges | Turn | good | 3 | Digital precedent unverified |
| Love Letter | ~2-4 (newer edition 2-6) | Hold one card, play one per turn, and eliminate others by deduction | Turn | ok: private hand fits, but the TV has little to show | 1-2 | GameBuddies' "Prime Suspect" is Love Letter-style [S39] |
| Herd Mentality | ~4-20 | Everyone answers a question, the majority wins, and the lone odd answer holds the pink cow | Sim | good: answers private, clusters revealed on TV | 1 | Digital precedent unverified |
| Insider | ~4-8 | The Master picks a word, the secret Insider nudges the group to find it, then everyone votes for the Insider | Mixed | good | 2 | Digital precedent unverified |
| Hues and Cues | ~3-10 | The clue-giver picks a colour on a grid and gives a one-word then a two-word clue; others place markers | Turn | good: target private on one phone, colour grid (~30x16) on TV | 2 | Digital precedent unverified |
| Spyfall | ~3-12 [S39] | Everyone but the spy knows the location; questioning exposes the spy | Turn | good | 2 | Open-source web version [S75] |
| Secret Hitler | ~5-10 | Hidden Liberals and Fascists enact policies; powers expose roles | Turn | good | 3 | secrethitler.io; CC BY-NC-SA 4.0 [S76] |
| A Fake Artist Goes to New York | ~5-10 | Each player adds one stroke to a shared drawing and the fake artist, who lacks the subject, tries to blend in | Turn | good: shared canvas on TV, private subject on phones | 3 | Digital precedent unverified |
| Mysterium | ~2-7 | A ghost sends vision cards to mediums who must identify their own suspect, place and weapon | Turn | good | 4 (art-heavy) | Digital precedent unverified |
| Sushi Go! Party! | 2-8 (store listing) | Players draft cards simultaneously from a passed hand | Sim | good: hand private, menu and scores on TV | 3 | Digital precedent unverified |
| Wits & Wagers | ~3-7 | Everyone guesses a number, then bets on whose guess is closest | Sim | good | 2 | Digital precedent unverified |
| Cockroach Poker / Sheriff of Nottingham | ~2-6 / ~3-5 | Bluff-pass cards or goods and call bluffs | Turn | good | 2-3 | Digital precedent unverified |
| Hanabi | ~2-5 | Co-op: you see everyone's cards but your own and trade hints | Turn | ok: a shared TV cannot show other hands without exposing them to their owners, so each phone must show the others' hands | 3 | Digital precedent unverified |
| The Mind | ~2-4 | Co-op: play number cards in ascending order without talking | RT | good | 2 | Digital precedent unverified |
| Bang! | ~4-7 | Hidden-role Western shootout driven by card actions | Turn | ok | 4 | Western theme matches a saloon brand; digital precedent unverified |
| Camel Up | ~3-8 | Bet on camels racing around a shared track, moved by dice | Turn | good: shared race on TV, bets on phones | 3 | Digital precedent unverified |
| Two Rooms and a Boom / Blood on the Clocktower | ~6-30 / ~5-20 | Large-group hidden-role games that need a storyteller or room splitting | Mixed | ok | 5 | Digital precedent unverified |
| Balderdash / Fibbage-style bluffing | ~2-6 | Write fake answers or definitions and vote on the real one | Sim | good | 2 | Fibbage XL is on Luna GameNight [S13]; Fibbage itself is Jackbox territory |
| Cards Against Humanity family | ~4-20 | Judge picks the funniest card for a prompt | Sim | good | 2 | CC BY-NC-SA [S80]; GIFTED on Netflix [S6] |
| Reflex games (Anomia, Dobble/Spot It, Ghost Blitz, Jungle Speed) | ~2-8 | Spot a match or react first | RT | ok: reaction fairness suffers from latency, needs server-timestamped taps | 3 | Digital precedent unverified |
| Ito | ~2-14 | Co-op: players hold secret numbers and give themed clues so the group orders them without sharing numbers | Turn | good | 2 | Digital precedent unverified |
| Taboo / Charades / Pictionary / Heads Up! | ~4+ | Describe, act or draw without forbidden words or gestures | RT | ok-good | 1-2 | Taboo and Draw & Guess are on Luna GameNight [S13]; Pictionary: Game Night is on Netflix [S2] |
| Scattergories | ~2-6 | Write category answers starting with a given letter, scored only if unique | Sim | good | 2 | Scattergories Weekly on Luna [S13]; scattergories.online [S39] |
| Texas Hold'em and other card-room games | 2-8 | Private hole cards, public board and pot | Turn | good: hole cards on phone, board and chips on TV | 2 | Clubhouse Games includes Hold'em and Blackjack [S48]; Discord Poker Night 2.0 [S30]; the repo's CLAUDE.md lists poker and blackjack among its existing game pages |

---

## E. Engine and language facts confirmed by a source

| Title / project | Engine or language | Source | Confidence |
|---|---|---|---|
| Fish Folk: Jumpy | Rust + Bevy | [S70] | Confirmed (README: "Made with Rust-lang and Bevy") |
| Overcooked!, Among Us, Fall Guys, Gang Beasts, Party Animals, Keep Talking and Nobody Explodes, Tricky Towers, Moving Out | Unity | [S12][S53][S54][S55][S56][S61][S64][S65] | Confirmed (Wikipedia infobox or article text) |
| Ultimate Chicken Horse | Unity ("primarily built in") | [S57] | Confirmed (Wikipedia) |
| LEGO Party! | Unity | [S52] | Confirmed (infobox and development section) |
| Super Bomberman R 2 | Unity | [S66] | Confirmed (Wikipedia) |
| Peak, R.E.P.O. | Unity | [S68] | Confirmed (Wikipedia) |
| RV There Yet? | Unreal Engine | [S68] | Confirmed (Wikipedia) |
| Heave Ho (original) | Unity | [S60] | Wikipedia infobox via search summary; Heave Ho 2 engine not stated |
| Unrailed! | MonoGame | [S63] | Single source (Wikipedia infobox); I expected Unity and could not corroborate either way |
| TowerFall | Microsoft XNA (PS4 port used MonoGame) | [S58] | Confirmed (Wikipedia) |
| Duck Game | XNA (C#), indirect | [S59] | Indirect evidence only |
| Pummel Party | Unity | [S67] | Secondary source (GameStar); not stated on the Steam page |
| Pico Park, Mario Party, Mario Kart World, Smash Ultimate, Crashout Crew | Not stated | [S62][S45][S50][S51][S68] | Not stated in sources read |
| AirConsole | JavaScript API + Unity plugin | [S17] | Confirmed (developer site) |
| Discord Activities | Iframe web app + Embedded App SDK (npm package) | [S28][S29] | Confirmed; SDK language inferred TypeScript from repo files only |
| Netflix and Amazon Luna party games | Cloud-streamed; platform engine not stated | [S2][S13] | LEGO Party! is Unity [S52]; Overcooked original is Unity [S12] |
| Gametje | TypeScript + React (Vite); Java + Spring Boot + Redis + Postgres; WebSockets | [S32] | Confirmed (author's Show HN post) |
| Gaming Couch | React + TypeScript; games in Unity or JS/TS; WebRTC phones; Supabase | [S33] | Confirmed (author's Show HN post) |
| HexStacker Party | Vanilla JS + Canvas, Node, WebRTC DataChannel + WebSocket relay, esbuild; native Swift and Kotlin TV displays | [S35] | Confirmed (README) |
| Playcade | TV-hosted simulation, phones send inputs | [S34] | Described by maker |
| Secret Hitler.io | React, Redux, Sass, Semantic UI, SocketIO; Node, Express, Pug, Passport, MongoDB | [S76] | Confirmed (README) |
| horsepaste (Codenames-style) | Go server; Node/Parcel frontend tooling; Docker | [S74] | Confirmed (README) |
| Spyfall web | React + Firebase | [S75] | Confirmed (README) |
| the-resistance (Avalon) | React, Node/Express, Socket.IO, TypeScript | [S77] | Confirmed (README) |
| Drawphone | Node.js, jQuery, Pug, node-canvas | [S78] | Confirmed (README) |
| Scribble.rs | Go + WebSockets | [S79] | Confirmed (README) |
| Pretend You're Xyzzy | Java on Tomcat 7 + JavaScript | [S80] | Confirmed (README); retired |
| HappyFunTimes | HTML5/JavaScript + Unity libraries | [S36] | Confirmed (README); deprecated |
| Lesury (Next.js + PartyKit on Cloudflare Workers) | Next.js + PartyKit | search snippet only (repo URL 404ed) | Unverified |
| Gartic Phone, skribbl.io, JKLM.fun, official Codenames web, Kahoot, Blooket, Gimkit, Wolvesville, Wavelength app | Not found | n/a | Unverified |

---

## F. Licensing, safety and platform caveats (my synthesis, not legal advice)

- **Openly licensed**: Secret Hitler's web README states CC BY-NC-SA 4.0 [S76]; Cards Against Humanity is released under a CC BY-NC-SA licence (2.0 per most sources, 4.0 per one npm package) [S80]. "NC" means non-commercial, which matters if the platform ever takes money.
- **Everything else on this list is branded**: names, art and card text for Codenames, Wavelength, Taboo, Clue, Ticket to Ride and similar are owned content. Netflix and Luna got them through licences [S8][S13]. Re-skinning mechanics with original names, words and art is the usual route for a hobby build.
- **User-typed content**: skribbl.io disclaims responsibility for user-generated drawings, messages and names [S71]; Netflix rated GIFTED 18+ [S6]. Plan for filtering, host kick/ban (skribbl.io has it [S71]) and a family mode.
- **Maps imagery** (GeoGuessr-style) carries licensing and API-cost risk; unverified, check terms before building.
- **Source quality**: the Kahoot / Blooket / Gimkit limits and prices come from a competitor-authored comparison [S26]; GameBuddies and Gaming Couch roundups promote their own games [S39][S40]; several browser-game facts come from search summaries rather than the sites (marked above).

## G. Gaps and conflicts left open

- Engines not found: Gartic Phone, skribbl.io, JKLM.fun, official Codenames web, Kahoot, Blooket, Gimkit, Wolvesville, the Wavelength app, Pico Park, Heave Ho 2, Netflix's platform.
- Fetch failures: garticphone.com and MobyGames (403), codenames.game and Party TV store page (not retrieved), game.city (no body text), Lesury and Rocketcrab repos (404), Wikipedia pages for Pummel Party and Spaceteam under the URLs I tried (404).
- Conflicts: Netflix controller app vs QR web flow; PlayLink on PS5; Fall Guys lobby size (60 vs 40 vs 32); skribbl.io room cap (12 vs 20; the site itself says 20 [S71]); GeoGuessr hosting needing Pro; whether wavelength.zone has a browser version; Kahoot's free cap; CAH licence version.
- Not found: an official Telestrations app; a verified Board Game Arena catalogue; any Roku or LG party-game phone-controller launch (searches returned nothing relevant).

---

## H. Invent-your-own seeds (patterns from the tables above, my synthesis)

- **Saloon Liar's Dice / Skull with coin stakes**: hidden dice or discs on phones, bid ladder and flip on the TV; fits the existing casino theme and avoids any licensed content.
- **Dynamite Alley**: a Bomberman-style grid arena where the TV hosts the tick-based sim and phones send d-pad plus bomb; the grid keeps sync cheap [S66].
- **Wanted Poster**: a Gartic-style chain where players draw outlaws from a description and the TV hangs the posters in a gallery for voting.
- **Hidden-role quiz**: Gimkit's Trust No One crossed with a saloon bluff theme, so wrong answers cost reputation [S27].
- **Paint-to-hide**: a 2D take on Meccha Chameleon where hiders colour a sprite to blend into a TV scene and seekers tap to accuse [S69].
- **Mario-Party-lite**: a dice board on the TV with only tap, timing, memory and secret-pick minigames, skipping stick-based ones [S45].
- **Camel Up-style betting race** using the same wallet and odds language as the rest of the site.
- **Defuser and experts**: one phone holds the "vault" puzzle, the others hold a shared manual; keeps the Keep Talking recipe with original art [S61].

---

## I. Source index

Netflix, Amazon, Samsung, YouTube
- [S1] Netflix Tudum, TV party games guide: https://www.netflix.com/tudum/articles/netflix-party-games-play-on-tv
- [S2] What's on Netflix, launch of Boggle Party / Pictionary / LEGO Party / Tetris / Party Crashers (13 Nov 2025): https://www.whats-on-netflix.com/news/netflix-games/party-games-launch-on-netflix/
- [S3] TechCrunch, 9 Oct 2025: https://techcrunch.com/2025/10/09/netflix-is-letting-users-play-games-on-their-tv-screens
- [S4] Netflix listing, Dead Man's Party: https://www.netflix.com/games/81993046
- [S5] What's on Netflix, Dead Man's Party (24 Dec 2025): https://www.whats-on-netflix.com/news/netflix-games/netflix-releases-its-knives-out-tie-in-game-just-in-time-for-christmas
- [S6] What's on Netflix, GIFTED (28 Apr 2026): https://www.whats-on-netflix.com/news/netflix-games/netflix-launches-new-meme-party-game-gifted/
- [S7] Netflix Tudum, Netflix Minigolf (28 Jul 2026): https://www.netflix.com/tudum/articles/netflix-minigolf-party-game-news
- [S8] What's on Netflix, Codenames Party (29 Sep 2026): https://www.whats-on-netflix.com/news/netflix-games/codenames-board-game-netflix-cloud-gaming-release/
- [S9] Engadget, Codenames Party: https://www.engadget.com/2272720/codenames-party-is-the-latest-addition-to-netflix-games/
- [S10] What's on Netflix, games news index: https://www.whats-on-netflix.com/news/netflix-games/
- [S11] Time Out guide, 15 Jul 2026: https://www.timeout.com/usa/news/heres-how-to-play-party-games-on-netflix-071526
- [S12] Overcooked! (Wikipedia; Unity; Netflix 5 Mar 2026): https://en.wikipedia.org/wiki/Overcooked_(video_game)
- [S13] VGC, Amazon Luna redesign and GameNight launch (23 Oct 2025): https://www.videogameschronicle.com/news/amazons-redesigned-luma-launches-with-gamenight-its-party-library-with-a-ai-snoop-dogg-courtroom-game
- [S14] Thurrott, Luna revamp (1 Oct 2025): https://www.thurrott.com/games/327709/amazon-to-revamp-its-luna-cloud-gaming-service-with-casual-party-games-and-more and CordCutters News: https://cordcuttersnews.com/amazon-luna-reinvents-cloud-gaming-with-gamenight-party-games-prime-member-perks/
- [S15] GamesBeat, Samsung casual and party game growth (15 Jul 2026): https://gamesbeat.com/samsungs-ctv-gaming-push-delivers-200-growth-in-casual-and-party-games-exclusive/
- [S16] PhoneArena, YouTube Playables multiplayer tests: https://www.phonearena.com/news/youtube-test-multiplayer-mini-games_id165709

AirConsole, PlayLink
- [S17] AirConsole developers: https://developers.airconsole.com
- [S18] AirConsole App Store listing: https://apps.apple.com/app/airconsole/id1017688554
- [S19] AirConsole, Wikipedia: https://en.wikipedia.org/wiki/AirConsole
- [S20] AirConsole, top 5 family-friendly: https://airconsole.com/games/top-5-family-friendly-party-games-on-airconsole
- [S21] AirConsole, 16-player games: https://www.airconsole.com/games/16-player-games
- [S22] PlayLink, Wikipedia: https://en.wikipedia.org/wiki/PlayLink
- [S23] PlayStation Blog, PlayLink games: https://blog.playstation.com/?p=194684
- [S24] Push Square, PlayLink on PS5 (2020): https://www.pushsquare.com/news/2020/10/you_may_not_be_able_to_enjoy_playlink_games_on_ps5

Quiz, Discord
- [S25] Kahoot!, Wikipedia: https://en.wikipedia.org/wiki/Kahoot!
- [S26] TriviaMaker comparison (competitor-authored, 9 Jul 2026): https://triviamaker.com/blooket-vs-gimkit-vs-kahoot/
- [S27] Northern Review, Kahoot vs Gimkit vs Blooket (13 May 2026): https://northernreview.org/2026/05/13/kahoot-vs-gimkit-vs-blooket/
- [S28] Discord developer docs, Activities: https://docs.discord.com/developers/platform/activities
- [S29] Discord Embedded App SDK repo: https://github.com/discord/embedded-app-sdk
- [S30] Discord blog, Activities list: https://discord.com/blog/server-activities-games-voice-watch-together

Indie platforms and SDKs
- [S31] Buzzin: https://playbuzzin.com
- [S32] Show HN: Gametje: https://news.ycombinator.com/item?id=45887709
- [S33] Show HN: Gaming Couch (mirror): https://hn.svelte.dev/item/46344573
- [S34] Playcade: https://hunted.space/product/playcade
- [S35] HexStacker Party (repo Stacker-Party): https://github.com/tim4724/Stacker-Party
- [S36] HappyFunTimes: https://github.com/greggman/HappyFunTimes
- [S37] Playroom Kit docs: https://docs.joinplayroom.com
- [S38] AlternativeTo, Quiplash alternatives: https://alternativeto.net/software/quiplash/
- [S39] GameBuddies.io browser party game roundup (promotional): https://gamebuddies.io/blog/free-browser-party-games-ecosystem-2026
- [S40] Gaming Couch blog roundup (promotional): https://gamingcouch.com/blog/best-free-online-party-games-browser
- [S41] Party TV (Play Store; seen only in search summary): https://play.google.com/store/apps/details?id=live.partytv.app

Console, PC and mobile
- [S42] Everybody 1-2-Switch!: https://en.wikipedia.org/wiki/Everybody_1-2-Switch! and https://nintendolife.com/news/2023/06/nintendos-upcoming-party-game-everybody-1-2-switch-showcases-100-players-at-once
- [S43] Just Dance series: https://en.wikipedia.org/wiki/Just_Dance_(video_game_series)
- [S44] Spaceteam: https://en.wikipedia.org/wiki/Spaceteam
- [S45] Mario Party series: https://en.wikipedia.org/wiki/Mario_Party
- [S46] Super Mario Party Jamboree: https://en.wikipedia.org/wiki/Super_Mario_Party_Jamboree
- [S47] WarioWare: Move It!: https://en.wikipedia.org/wiki/WarioWare:_Move_It!
- [S48] Clubhouse Games: 51 Worldwide Classics: https://en.wikipedia.org/wiki/Clubhouse_Games:_51_Worldwide_Classics
- [S49] Wii Party: https://en.wikipedia.org/wiki/Wii_Party
- [S50] Mario Kart World: https://en.wikipedia.org/wiki/Mario_Kart_World
- [S51] Super Smash Bros. Ultimate: https://en.wikipedia.org/wiki/Super_Smash_Bros._Ultimate
- [S52] Lego Party: https://en.wikipedia.org/wiki/Lego_Party
- [S53] Among Us: https://en.wikipedia.org/wiki/Among_Us
- [S54] Fall Guys: https://en.wikipedia.org/wiki/Fall_Guys
- [S55] Gang Beasts: https://en.wikipedia.org/wiki/Gang_Beasts and https://store.steampowered.com/app/285900/Gang_Beasts/
- [S56] Party Animals: https://en.wikipedia.org/wiki/Party_Animals_(video_game)
- [S57] Ultimate Chicken Horse: https://en.wikipedia.org/wiki/Ultimate_Chicken_Horse and https://store.steampowered.com/app/386940/Ultimate_Chicken_Horse/
- [S58] TowerFall: https://en.wikipedia.org/wiki/TowerFall
- [S59] Duck Game: https://en.wikipedia.org/wiki/Duck_Game and https://gamingonlinux.com/2017/09/want-to-play-duck-game-on-linux-well-its-possible-thanks-to-xnatofna
- [S60] Heave Ho: https://en.wikipedia.org/wiki/Heave_Ho ; Heave Ho 2: https://www.gematsu.com/2026/06/heave-ho-2-launches-july-16 and https://coherence.io/blog/news/Heave-Ho-2-announced-coherence-builds-multiplayer
- [S61] Keep Talking and Nobody Explodes: https://en.wikipedia.org/wiki/Keep_Talking_and_Nobody_Explodes
- [S62] Pico Park: https://en.wikipedia.org/wiki/Pico_Park and Sonic Pico Park: https://www.nintendolife.com/news/2026/10/sonic-pico-park-brings-co-op-action-puzzle-fun-to-switch-1-and-2-next-month
- [S63] Unrailed!: https://en.wikipedia.org/wiki/Unrailed!
- [S64] Tricky Towers: https://en.wikipedia.org/wiki/Tricky_Towers
- [S65] Moving Out: https://en.wikipedia.org/wiki/Moving_Out_(video_game)
- [S66] Super Bomberman R 2: https://en.wikipedia.org/wiki/Super_Bomberman_R_2
- [S67] Pummel Party (Steam): https://store.steampowered.com/app/880940/Pummel_Party/ and GameStar: https://www.gamestar.de/videos/pummel-party,14306_138/
- [S68] Peak https://en.wikipedia.org/wiki/Peak_(video_game) ; R.E.P.O. https://en.wikipedia.org/wiki/R.E.P.O. ; RV There Yet? https://en.wikipedia.org/wiki/RV_There_Yet%3F ; Crashout Crew https://en.wikipedia.org/wiki/Crashout_Crew ; Yapyap https://en.wikipedia.org/wiki/Yapyap
- [S69] Machine Party: https://gamerant.com/steam-co-op-mario-saw-machine-party-july-30/ ; Meccha Chameleon: https://gamerant.com/steam-co-op-party-game-meccha-chameleon-sales/
- [S70] Fish Folk: Jumpy: https://github.com/fishfolk/jumpy

Browser games
- [S71] skribbl.io: https://skribbl.io
- [S72] Broken Picture Telephone / Gartic Phone: https://en.wikipedia.org/wiki/Broken_Picture_Telephone and https://www.thegamer.com/gartic-phone-all-game-modes-ranked/
- [S73] JKLM.fun: https://jklm.fun
- [S74] horsepaste (Codenames-style): https://github.com/jbowens/codenames ; official Codenames web: https://codenames.game (not fetched)
- [S75] Spyfall web: https://github.com/adrianocola/spyfall
- [S76] Secret Hitler online: https://github.com/cozuya/secret-hitler
- [S77] The Resistance / Avalon: https://github.com/thesilican/the-resistance
- [S78] Drawphone: https://github.com/tannerkrewson/drawphone
- [S79] Scribble.rs: https://github.com/scribble-rs/scribble.rs
- [S80] Pretend You're Xyzzy: https://github.com/ajanata/PretendYoureXyzzy ; Cards Against Humanity: https://en.wikipedia.org/wiki/Cards_Against_Humanity (licence via search summary)
- [S81] GeoGuessr: https://en.wikipedia.org/wiki/GeoGuessr
- [S82] Wavelength app: https://www.wavelength.zone/about
- [S83] Wolvesville: https://www.apkmirror.com/apk/wolvesville-gmbh-co-kg/wolvesville-werewolf-online/ ; werewolves_game: https://f-droid.org/en/packages/io.github.davidchilin.werewolves_game
- [S84] .io games: https://en.wikipedia.org/wiki/.io_games
- [S85] Psych! (App Store): https://apps.apple.com/app/id1005765746

Stack
- [S86] Supabase Realtime limits: https://supabase.com/docs/guides/realtime/limits

---

## J. Best fits for TV + phones: shortlist

Chosen for private information on each phone plus a shared spectacle on the TV. "Build" is the 1-5 difficulty from the tables.

1. **Codenames-style word-clue board (Build 2)**: spymaster keys stay on phones while the 5x5 board and reveals play out on the TV, and Netflix just shipped it as Codenames Party [S8].
2. **Wavelength-style spectrum dial (Build 2)**: one phone knows the secret target and the room watches the dial swing on the TV; the UI is trivial and the content is just spectrum cards [S82].
3. **Gartic Phone / Telestrations draw-and-guess chain (Build 3)**: phones are the sketchpads and the chain reveal on the TV is the whole show; Gartic Phone scales to 30 players [S72].
4. **Secret-word bluff: Spyfall / Chameleon / Party Crashers (Build 1-2)**: the topic is private on each phone and the clue order and vote play out on the TV; Netflix's Party Crashers proves mainstream appetite [S2][S3].
5. **Werewolf / Mafia with a TV narrator (Build 3)**: roles and night actions are private, the TV narrates and stages the vote, and Buzzin already ships this for 5-16 players [S31].
6. **Avalon or Secret Hitler (Build 3)**: deep hidden-information play with dramatic vote reveals; Secret Hitler's web README states CC BY-NC-SA 4.0 [S76][S77].
7. **Liar's Dice / Perudo (Build 2)**: hidden dice on phones, a bid ladder and one big reveal on the TV; fits the saloon theme and needs no licensed content.
8. **Skull (Build 2)**: private discs and escalating bids with a flip-the-stack payoff built for a big screen.
9. **Just One (Build 2)**: clues are typed privately and the TV strikes out the duplicates; co-op and friendly to mixed ages.
10. **Decrypto (Build 3)**: private team codes with a shared clue history on the TV give layered deduction without hiding anything from the room that should be public.
11. **Hues and Cues (Build 2)**: the colour grid sits on the TV while the secret target and marker placement live on phones; trivial to render on the web.
12. **Herd Mentality / majority-vote questions (Build 1)**: the fastest win; answers are private, the TV clusters them and hands out the cow.
13. **Camel Up-style betting race (Build 3)**: a shared racetrack and dice pyramid make the spectacle, phones place the bets; it matches the casino identity.
14. **Keep-Talking-style defuser and experts (Build 3-4)**: one phone holds the puzzle and the others hold the manual, so the fun comes from talking across the room [S61].
15. **Mario-Party-lite (Build 4)**: the only spectacle-first pick; a dice board and items on the TV, with minigames limited to taps, timing, memory and secret picks [S45][S46].

Lowest-effort order if you want a quick start: Herd Mentality (1), Chameleon / Spyfall (1-2), Codenames (2), Wavelength (2), Liar's Dice (2), Skull (2), Just One (2), Hues and Cues (2).
