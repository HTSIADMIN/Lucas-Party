// The game catalog shown on the front page, the /games page, and the host's
// game picker. `status: "live"` games have an engine in src/shared/engine/games
// and TV/phone views in src/client/games.

export const LIVE_GAME_IDS = ["punchline", "rocket", "oddoneout", "greatminds", "mostlikely", "dial", "liarsdice", "spygrid", "oneclue", "blackjack", "shadespotter", "showdown"] as const;
export type GameId = (typeof LIVE_GAME_IDS)[number];

export function isGameId(value: unknown): value is GameId {
  return typeof value === "string" && (LIVE_GAME_IDS as readonly string[]).includes(value);
}

export type GameTag =
  | "writing" | "drawing" | "bluffing" | "trivia" | "deduction"
  | "reflex" | "casino" | "teams" | "voting" | "words" | "co-op";

export const TAG_LABEL: Record<GameTag, string> = {
  writing: "Writing", drawing: "Drawing", bluffing: "Bluffing", trivia: "Trivia",
  deduction: "Deduction", reflex: "Real-time", casino: "Casino", teams: "Teams",
  voting: "Voting", words: "Words", "co-op": "Co-op",
};

export interface GameOptionChoice { value: number; label: string }
export interface GameOption { key: string; label: string; choices: GameOptionChoice[]; default: number }

export interface GameMeta {
  id: string;
  name: string;
  tagline: string;
  description: string;
  players: [min: number, max: number];
  minutes: [min: number, max: number];
  tags: GameTag[];
  status: "live" | "soon";
  /** Accent colour for cards and the TV title splash. */
  accent: string;
  howTo: [string, string, string];
  options?: GameOption[];
  /** Genre reference for the roadmap docs. Not shown to players. */
  inspiredBy?: string;
}

export const GAME_CATALOG: GameMeta[] = [
  // ── Live ──────────────────────────────────────────────────────────────
  {
    id: "punchline", name: "Punchline Panic", status: "live",
    tagline: "Finish the joke. Win the room.",
    description: "Everyone gets weird prompts on their phone and writes the funniest answer they can. Answers face off head-to-head on the TV and the room votes for the winner. Three rounds, and the last one is a free-for-all.",
    players: [3, 8], minutes: [12, 18], tags: ["writing", "voting"], accent: "#FF4FA3",
    howTo: ["Answer two prompts on your phone.", "Vote for the funnier answer in each face-off.", "Sweep every vote for a Zinger bonus."],
    inspiredBy: "Quiplash-style head-to-head writing",
  },
  {
    id: "rocket", name: "Rocket Riot", status: "live",
    tagline: "Ride the rocket. Bail before it blows.",
    description: "Bet your party chips and climb aboard. The multiplier rises as the rocket climbs — smash BAIL OUT on your phone to lock in your winnings before it explodes. Most chips after the last launch wins.",
    players: [2, 8], minutes: [8, 14], tags: ["reflex", "casino"], accent: "#FF9A3C",
    howTo: ["Place a bet (and maybe Double Down).", "Watch the multiplier climb on the TV.", "Hit BAIL OUT before the rocket explodes."],
    options: [{ key: "rounds", label: "Launches", default: 7, choices: [{ value: 5, label: "5" }, { value: 7, label: "7" }, { value: 10, label: "10" }] }],
    inspiredBy: "Our solo Crash game, rebuilt for the couch",
  },
  {
    id: "oddoneout", name: "Odd One Out", status: "live",
    tagline: "Everyone knows the word. Except one.",
    description: "Every phone shows the secret word — except the faker's. Take turns giving one-word clues without giving it away, then vote out the faker. Get caught? Guess the word to steal the round.",
    players: [3, 8], minutes: [10, 15], tags: ["bluffing", "deduction", "words"], accent: "#A46BFF",
    howTo: ["Check your phone for the secret word.", "Give a one-word clue that proves you know it.", "Vote for the faker — or fake it yourself."],
    options: [{ key: "rounds", label: "Rounds", default: 4, choices: [{ value: 3, label: "3" }, { value: 4, label: "4" }, { value: 6, label: "6" }] }],
    inspiredBy: "The Chameleon / Spyfall hidden-word bluffing",
  },
  {
    id: "greatminds", name: "Great Minds", status: "live",
    tagline: "Think like the herd.",
    description: "Everyone answers the same simple question. Match the biggest group to score — but if you're the only one with a weird answer, you get the Dunce Cap. Still wearing it at the end? That costs you.",
    players: [3, 8], minutes: [8, 12], tags: ["writing", "voting"], accent: "#45D483",
    howTo: ["Read the question on the TV.", "Type the answer you think most people will give.", "Match the biggest group to score. Dodge the Dunce Cap."],
    options: [{ key: "rounds", label: "Questions", default: 8, choices: [{ value: 6, label: "6" }, { value: 8, label: "8" }, { value: 10, label: "10" }] }],
    inspiredBy: "Herd Mentality",
  },
  {
    id: "mostlikely", name: "Most Likely To…", status: "live",
    tagline: "Who in this room would…?",
    description: "Vote for the friend who best fits each prompt. Score when you side with the room, collect embarrassing titles, and sit through the awards ceremony at the end.",
    players: [3, 8], minutes: [8, 12], tags: ["voting"], accent: "#FF6FCB",
    howTo: ["See the prompt on the TV.", "Vote for a friend on your phone.", "Score for siding with the room."],
    options: [{ key: "rounds", label: "Prompts", default: 8, choices: [{ value: 6, label: "6" }, { value: 8, label: "8" }, { value: 10, label: "10" }] }],
    inspiredBy: "Classic icebreaker voting",
  },
  {
    id: "dial", name: "Dial It In", status: "live",
    tagline: "Hot or cold? Read the room.",
    description: "One player — the psychic — sees a secret spot on a spectrum like Cold ↔ Hot and gives a one-line clue. Everyone else drags the dial on their phone to find it. Closer is better, and the psychic scores when the room nails it.",
    players: [2, 8], minutes: [10, 15], tags: ["words", "co-op"], accent: "#2ED3D3",
    howTo: ["The psychic sees a secret target on the dial.", "They give a one-line clue.", "Everyone else dials in a guess. Bullseye!"],
    options: [{ key: "rounds", label: "Rounds", default: 0, choices: [{ value: 4, label: "4" }, { value: 6, label: "6" }, { value: 0, label: "Everyone" }] }],
    inspiredBy: "Wavelength",
  },

  {
    id: "liarsdice", name: "Liar's Dice", status: "live",
    tagline: "Your dice are secret. Your bluff isn't.",
    description: "Everyone rolls hidden dice on their phone. Take turns raising the bid on how many of a face are on the whole table — or call LIAR! Whoever's wrong loses a die. Last player with dice wins.",
    players: [2, 8], minutes: [10, 20], tags: ["bluffing", "casino"], accent: "#FFD23F",
    howTo: ["Peek at your secret dice.", "Raise the bid: more dice, or a higher face.", "Call LIAR! when you don't buy it."],
    options: [{ key: "dice", label: "Dice each", default: 5, choices: [{ value: 3, label: "3" }, { value: 4, label: "4" }, { value: 5, label: "5" }] }],
    inspiredBy: "Traditional Liar's Dice / Perudo",
  },
  {
    id: "spygrid", name: "Spy Grid", status: "live",
    tagline: "One word. Many meanings. Two teams.",
    description: "Two teams race to find their agents on a 5×5 grid of words. Spymasters see the secret key on their phones and give one-word clues; teammates vote on which words to flip. Touch the assassin and it's game over.",
    players: [4, 8], minutes: [15, 20], tags: ["teams", "words", "deduction"], accent: "#4F7BFF",
    howTo: ["Spymasters see the key on their phone.", "Give a one-word clue and a number.", "Teammates vote on which words to flip."],
    options: [{ key: "rounds", label: "Boards", default: 2, choices: [{ value: 1, label: "1" }, { value: 2, label: "2" }, { value: 3, label: "3" }] }],
    inspiredBy: "Codenames",
  },
  {
    id: "oneclue", name: "One Clue", status: "live",
    tagline: "Help your friend guess — without doubling up.",
    description: "One player guesses a mystery word while everyone else writes a one-word clue on their phone. Matching clues cancel each other out, so be clever, not obvious. Everyone with a surviving clue scores when the guesser nails it.",
    players: [3, 8], minutes: [10, 15], tags: ["co-op", "words"], accent: "#FFC93C",
    howTo: ["Write a one-word clue for the mystery word.", "Matching clues get cancelled.", "The guesser gets one shot."],
    options: [{ key: "rounds", label: "Rounds", default: 0, choices: [{ value: 6, label: "6" }, { value: 10, label: "10" }, { value: 0, label: "Everyone" }] }],
    inspiredBy: "Just One",
  },
  {
    id: "blackjack", name: "Blackjack Bash", status: "live",
    tagline: "Everyone versus the dealer.",
    description: "The whole room sits at one table against the TV's dealer. Bet your party chips, then hit, stand or double on your phone — everyone plays at once. Most chips after the last hand wins.",
    players: [1, 8], minutes: [10, 20], tags: ["casino"], accent: "#FF5A5F",
    howTo: ["Bet your party chips.", "Hit, stand or double on your phone.", "Beat the dealer, then beat your friends."],
    options: [{ key: "rounds", label: "Hands", default: 8, choices: [{ value: 5, label: "5" }, { value: 8, label: "8" }, { value: 12, label: "12" }] }],
    inspiredBy: "Our multiplayer blackjack table",
  },
  {
    id: "shadespotter", name: "Shade Spotter", status: "live",
    tagline: "Is that teal or turquoise?",
    description: "A giant grid of colours fills the TV. The cue-giver sees a secret shade and describes it in one word, then two. Everyone taps the shade they think it is — the closer you land, the more you score.",
    players: [3, 8], minutes: [10, 15], tags: ["words", "voting"], accent: "#FF6FCB",
    howTo: ["The cue-giver sees a secret colour.", "They give a one-word cue, then a two-word cue.", "Tap the shade you think it is. Closer scores more."],
    options: [{ key: "rounds", label: "Rounds", default: 0, choices: [{ value: 4, label: "4" }, { value: 6, label: "6" }, { value: 0, label: "Everyone" }] }],
    inspiredBy: "Hues and Cues",
  },
  {
    id: "showdown", name: "Saloon Showdown", status: "live",
    tagline: "Steady… steady… DRAW!",
    description: "Reflex duels for the whole room. Hold your thumb down, wait for DRAW, and tap faster than everyone else — flinch early and you're out of the round. Some rounds are Stop the Clock: stop a hidden timer as close to the target as you can.",
    players: [2, 8], minutes: [5, 10], tags: ["reflex"], accent: "#FF9A3C",
    howTo: ["Hold your thumb on the button.", "Tap the instant DRAW! flashes — not before.", "Fastest draw (or closest clock) scores."],
    options: [{ key: "rounds", label: "Rounds", default: 8, choices: [{ value: 6, label: "6" }, { value: 8, label: "8" }, { value: 12, label: "12" }] }],
    inspiredBy: "Our Saloon Showdown + Stop the Clock minigame ideas",
  },

  // ── Coming soon (roadmap order, easiest first) ─────────────────────────
  {
    id: "holdem", name: "Hold'em Night", status: "soon",
    tagline: "The TV is the table. Your phone is your hand.",
    description: "Texas Hold'em with party chips: hole cards stay private on your phone while the flop, turn and river land on the big screen.",
    players: [2, 8], minutes: [20, 45], tags: ["casino", "bluffing"], accent: "#45D483",
    howTo: ["Peek at your two cards on your phone.", "Check, bet, raise or fold.", "Last stack standing wins."],
    inspiredBy: "Our poker table, rebuilt for phones + TV",
  },
  {
    id: "fibfactory", name: "Fib Factory", status: "soon",
    tagline: "Write a lie. Find the truth.",
    description: "A weird-but-true fact appears with a blank. Everyone writes a convincing fake answer, then tries to pick the real one out of the lineup.",
    players: [3, 8], minutes: [12, 18], tags: ["bluffing", "writing", "trivia"], accent: "#FF9A3C",
    howTo: ["Fill the blank with a believable lie.", "Find the truth among the fibs.", "Score for every friend you fool."],
    inspiredBy: "Fibbage",
  },
  {
    id: "doodlefraud", name: "Doodle Fraud", status: "soon",
    tagline: "Bad drawings, worse guesses.",
    description: "Draw a bizarre prompt on your phone. Everyone invents a fake title for your masterpiece, then tries to spot the real one.",
    players: [3, 8], minutes: [15, 20], tags: ["drawing", "bluffing"], accent: "#A46BFF",
    howTo: ["Draw your secret prompt.", "Write fake titles for other drawings.", "Pick the real title to score."],
    inspiredBy: "Drawful",
  },
  {
    id: "scribblechain", name: "Scribble Chain", status: "soon",
    tagline: "Write it. Draw it. Lose it.",
    description: "A sentence becomes a drawing becomes a sentence becomes chaos. Watch every chain unravel on the TV at the end.",
    players: [3, 8], minutes: [10, 15], tags: ["drawing", "writing"], accent: "#2ED3D3",
    howTo: ["Write a silly sentence.", "Draw the sentence you're handed — then describe the drawing.", "Watch the chains replay on the TV."],
    inspiredBy: "Telestrations / Gartic Phone",
  },
  {
    id: "wordbomb", name: "Word Bomb", status: "soon",
    tagline: "Type fast or go boom.",
    description: "The bomb comes to you with three letters. Type a word that contains them before it explodes, then pass it on.",
    players: [2, 8], minutes: [5, 10], tags: ["words", "reflex"], accent: "#FF5A5F",
    howTo: ["Get the bomb and a letter combo.", "Type a real word containing it.", "Don't be holding it when it blows."],
    inspiredBy: "JKLM BombParty",
  },
  {
    id: "fullmoon", name: "Full Moon", status: "soon",
    tagline: "Someone in this village is not who they seem.",
    description: "A narrated night-and-day social deduction game. Secret roles and night moves live on your phone; the TV runs the village trial.",
    players: [5, 8], minutes: [15, 25], tags: ["deduction", "bluffing"], accent: "#7C45E0",
    howTo: ["Check your secret role.", "Act at night, argue by day.", "Vote someone out of the village."],
    inspiredBy: "Werewolf / Mafia",
  },
  {
    id: "mashbash", name: "Mash Bash", status: "soon",
    tagline: "Tiny games. Huge rivalries.",
    description: "A dice-board party where every turn ends in a lightning minigame: tap races, timing tests, memory flips and secret picks.",
    players: [2, 8], minutes: [15, 30], tags: ["reflex"], accent: "#4F7BFF",
    howTo: ["Roll and move around the board.", "Play a 15-second minigame on your phone.", "Grab the most stars."],
    inspiredBy: "Mario Party (tap/timing minigames only)",
  },
  {
    id: "bombsquad", name: "Bomb Squad", status: "soon",
    tagline: "One phone has the bomb. Everyone else has the manual.",
    description: "One player sees the wires and dials; the rest of the room has scraps of the defusal manual. Talk fast.",
    players: [2, 8], minutes: [5, 15], tags: ["co-op", "reflex"], accent: "#FF9A3C",
    howTo: ["The defuser describes the bomb.", "Experts search their manual pages.", "Cut the right wire before time runs out."],
    inspiredBy: "Keep Talking and Nobody Explodes",
  },
];

export function getGameMeta(id: string): GameMeta | undefined {
  return GAME_CATALOG.find((g) => g.id === id);
}

export function defaultOptions(meta: GameMeta): Record<string, number> {
  const out: Record<string, number> = {};
  for (const opt of meta.options ?? []) out[opt.key] = opt.default;
  return out;
}
