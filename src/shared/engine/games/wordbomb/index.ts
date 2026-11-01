// Word Bomb — pass it on or go boom.
//
// The bomb sits with one living player at a time, showing a letter combo.
// A word (letters only, 3+ long, containing the combo, unused this game)
// passes the bomb to the next living player with a new combo. Each bomb has
// a hidden fuse; whoever holds it when it blows loses a life. Any other
// living player can challenge a word for a few seconds; if at least half of
// them do, the word is ruled fake and its writer loses a life. Last player
// standing wins.

import { WB_CHALLENGE_MS, WB_WORD_MAX, cleanText, type WbPhase, type WbPlayer, type WbTv, type WbWord } from "@party/shared";
import { asRecord, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";

const INTRO_MS = 8000;
const FUSE_MIN_MS = 12_000;
const FUSE_MAX_MS = 32_000;
const BOOM_MS = 4500;
const AWAY_PASS_MS = 3000;
const WORD_POINTS = 10;
const SURVIVAL_POINTS = 100;
const WIN_POINTS = 300;
const SYLLABLES = [
  "AN", "ER", "IN", "ON", "AT", "EN", "ES", "OR", "TE", "TI", "RE", "LE", "ST", "AR", "AL", "IT", "IC", "CH", "TH", "SH",
  "OU", "EA", "OO", "UN", "AM", "OL", "UR", "IL", "ING", "ENT", "ION", "TER", "AND", "OUT", "AIN", "EAR", "ATE", "ACK",
  "ILL", "ARE", "ONE", "OVE", "IGHT", "ART", "AST", "ORN", "ACE", "ICE", "OCK", "UMP", "ASH", "EST", "AKE", "INK",
];

export interface WbState {
  players: GamePlayer[];
  ids: string[];
  phase: WbPhase;
  lives: Record<string, number>;
  holderId: string;
  /** When the current holder got the bomb. */
  turnAt: number;
  syllable: string;
  fuseAt: number;
  used: string[];
  words: WbWord[];
  boomId: string | null;
  bombs: number;
  /** Elimination order, first out first. */
  out: string[];
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function alive(state: WbState): string[] {
  return state.ids.filter((id) => (state.lives[id] ?? 0) > 0);
}

function nextAlive(state: WbState, from: string): string {
  const start = state.ids.indexOf(from);
  for (let step = 1; step <= state.ids.length; step++) {
    const id = state.ids[(start + step) % state.ids.length]!;
    if ((state.lives[id] ?? 0) > 0) return id;
  }
  return from;
}

function award(state: WbState, playerId: string, points: number) {
  state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
  state.gained[playerId] = (state.gained[playerId] ?? 0) + points;
}

function newSyllable(state: WbState, ctx: GameContext) {
  let s = ctx.pick(SYLLABLES);
  if (s === state.syllable) s = ctx.pick(SYLLABLES);
  state.syllable = s;
}

/** Wakes up for whichever comes first: the fuse, a challenge window closing, or passing an away holder. */
function schedule(state: WbState, ctx: GameContext) {
  const now = ctx.now();
  let next = state.fuseAt;
  for (const w of state.words) if (w.verdict === null) next = Math.min(next, w.at + WB_CHALLENGE_MS);
  if (!ctx.isConnected(state.holderId)) next = Math.min(next, state.turnAt + AWAY_PASS_MS);
  ctx.setDeadline(Math.max(0, next - now));
}

function passTo(state: WbState, ctx: GameContext, holder: string) {
  state.holderId = holder;
  state.turnAt = ctx.now();
  newSyllable(state, ctx);
}

function startBomb(state: WbState, ctx: GameContext, holder: string) {
  state.phase = "play";
  state.boomId = null;
  state.bombs++;
  state.fuseAt = ctx.now() + ctx.randomInt(FUSE_MIN_MS, FUSE_MAX_MS + 1);
  passTo(state, ctx, holder);
  schedule(state, ctx);
  ctx.emit({ kind: "bomb", sfx: "rocket.countdown", playerId: holder, text: `Bomb #${state.bombs}`, haptic: [80, 40, 80], to: [holder] });
}

function loseLife(state: WbState, ctx: GameContext, playerId: string, reason: string) {
  if ((state.lives[playerId] ?? 0) === 0) return;
  state.lives[playerId] = state.lives[playerId]! - 1;
  if (state.lives[playerId] === 0) {
    state.out.push(playerId);
    award(state, playerId, (state.out.length - 1) * SURVIVAL_POINTS);
  }
  ctx.emit({ kind: "lifeLost", sfx: "fail.buzz", playerId, text: reason, haptic: [150, 60, 150], to: [playerId] });
}

function checkWinner(state: WbState, ctx: GameContext): boolean {
  const living = alive(state);
  if (living.length > 1) return false;
  const winner = living[0];
  if (winner) award(state, winner, state.out.length * SURVIVAL_POINTS + WIN_POINTS);
  state.phase = "podium";
  ctx.setDeadline(null);
  ctx.finish();
  ctx.emit({ kind: "podium", sfx: "win.big" });
  return true;
}

/** Closes challenge windows that have run out; fake words cost their writer a life. */
function settleChallenges(state: WbState, ctx: GameContext) {
  for (const w of state.words) {
    if (w.verdict !== null || ctx.now() - w.at < WB_CHALLENGE_MS) continue;
    const judges = alive(state).filter((id) => id !== w.playerId).length;
    if (w.challengers.length > 0 && w.challengers.length * 2 >= judges) {
      w.verdict = "rejected";
      award(state, w.playerId, -WORD_POINTS);
      loseLife(state, ctx, w.playerId, `“${w.word}” was ruled fake!`);
    } else {
      w.verdict = "ok";
    }
  }
}

export const wordbomb: GameDefinition<WbState> = {
  id: "wordbomb",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const lives = ctx.options.lives ?? 2;
    const state: WbState = {
      players,
      ids,
      phase: "intro",
      lives: Object.fromEntries(ids.map((id) => [id, lives])),
      holderId: ctx.pick(ids),
      turnAt: 0,
      syllable: "",
      fuseAt: 0,
      used: [],
      words: [],
      boomId: null,
      bombs: 0,
      out: [],
      scores: Object.fromEntries(ids.map((id) => [id, 0])),
      gained: {},
    };
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    if (state.phase === "intro") return startBomb(state, ctx, state.holderId);
    if (state.phase === "boom") {
      if (checkWinner(state, ctx)) return;
      return startBomb(state, ctx, nextAlive(state, state.boomId ?? state.holderId));
    }
    if (state.phase !== "play") return;
    settleChallenges(state, ctx);
    if (checkWinner(state, ctx)) return;
    if (ctx.now() >= state.fuseAt) {
      // If a challenge just knocked the holder out, the next player catches the blast.
      const victim = (state.lives[state.holderId] ?? 0) > 0 ? state.holderId : nextAlive(state, state.holderId);
      state.boomId = victim;
      loseLife(state, ctx, victim, "BOOM! You lost a life.");
      ctx.emit({ kind: "boom", sfx: "rocket.boom", playerId: victim, text: "BOOM!" });
      if (checkWinner(state, ctx)) return;
      state.phase = "boom";
      return ctx.setDeadline(BOOM_MS);
    }
    const holderOut = (state.lives[state.holderId] ?? 0) === 0;
    const awayTooLong = !ctx.isConnected(state.holderId) && ctx.now() - state.turnAt >= AWAY_PASS_MS;
    if (holderOut || awayTooLong) passTo(state, ctx, nextAlive(state, state.holderId));
    schedule(state, ctx);
  },

  onInput(state, ctx, playerId, raw) {
    const input = asRecord(raw);
    if (!input || state.phase !== "play" || !state.ids.includes(playerId)) return;
    settleChallenges(state, ctx);
    if (input.type === "word") {
      if (playerId !== state.holderId || (state.lives[playerId] ?? 0) === 0) return;
      const word = cleanText(input.text, WB_WORD_MAX).toUpperCase();
      const reason = !/^[A-Z]+$/.test(word)
        ? "Letters only!"
        : word.length < 3
          ? "Three letters or more!"
          : !word.includes(state.syllable)
            ? `It has to contain ${state.syllable}!`
            : state.used.includes(word)
              ? "Already used this game!"
              : null;
      if (reason) {
        ctx.emit({ kind: "badWord", sfx: "fail.jinx", text: reason, to: [playerId], tv: false, haptic: [60, 30, 60] });
        return;
      }
      state.used.push(word);
      state.words = [{ playerId, word, syllable: state.syllable, at: ctx.now(), challengers: [], verdict: null }, ...state.words].slice(0, 12);
      award(state, playerId, WORD_POINTS);
      ctx.emit({ kind: "word", sfx: "ui.whoosh", playerId, text: word });
      passTo(state, ctx, nextAlive(state, playerId));
      return schedule(state, ctx);
    }
    if (input.type === "challenge") {
      const w = state.words.find((x) => x.at === Number(input.at));
      if (!w || w.verdict !== null || w.playerId === playerId || (state.lives[playerId] ?? 0) === 0 || w.challengers.includes(playerId)) return;
      w.challengers.push(playerId);
      ctx.emit({ kind: "challenge", sfx: "ui.pop", playerId, text: `No way, “${w.word}”?` });
    }
  },

  onConnectionChange(state, ctx) {
    if (state.phase === "play") schedule(state, ctx);
  },

  onResume(state, _ctx, pausedForMs) {
    state.fuseAt += pausedForMs;
    state.turnAt += pausedForMs;
    for (const w of state.words) if (w.verdict === null) w.at += pausedForMs;
  },

  tvView(state): WbTv {
    return {
      phase: state.phase,
      holderId: state.phase === "play" ? state.holderId : null,
      syllable: state.phase === "play" ? state.syllable : null,
      lives: state.lives,
      words: state.words,
      boomId: state.boomId,
      bombs: state.bombs,
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, ctx, playerId): WbPlayer {
    const living = (state.lives[playerId] ?? 0) > 0;
    return {
      phase: state.phase,
      holderId: state.phase === "play" ? state.holderId : null,
      isHolder: state.phase === "play" && state.holderId === playerId,
      syllable: state.phase === "play" ? state.syllable : null,
      lives: state.lives[playerId] ?? 0,
      alive: living,
      challengeable: living ? state.words.filter((w) => w.verdict === null && w.playerId !== playerId && !w.challengers.includes(playerId) && ctx.now() - w.at < WB_CHALLENGE_MS) : [],
      usedCount: state.used.length,
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
