// Emoji Pitch — say it with emoji.
//
// Everyone pitches their own secret prompt in 1–3 emoji at the same time.
// Then each pitch gets its turn on the TV with four options (the real prompt
// plus three decoys from the bank); everyone but the pitcher picks one. Right
// guesses pay the guesser and the pitcher. Blank pitches are skipped.

import {
  EP_GUESS_POINTS,
  EP_PITCH_POINTS,
  epCleanPitch,
  type EpPhase,
  type EpPlayer,
  type EpTv,
} from "@party/shared";
import { asRecord, drawFresh, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { PROMPTS } from "./content";

const INTRO_MS = 7000;
const PITCH_MS = 45_000;
const GUESS_MS = 15_000;
const REVEAL_MS = 6000;
const STANDINGS_MS = 4500;
const GRACE_MS = 900;
const DECOY_POOL = 12;

interface Showing {
  pitcherId: string;
  options: string[];
  answer: number;
}

export interface EpState {
  players: GamePlayer[];
  ids: string[];
  phase: EpPhase;
  round: number;
  totalRounds: number;
  prompts: Record<string, string>;
  decoys: string[];
  pitches: Record<string, string>;
  /** The pitches that made it to the TV, in order. */
  queue: Showing[];
  picks: Record<string, number>;
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function current(state: EpState): Showing | null {
  return state.queue[state.round - 1] ?? null;
}

function award(state: EpState, playerId: string, points: number) {
  state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
  state.gained[playerId] = (state.gained[playerId] ?? 0) + points;
}

function buildQueue(state: EpState, ctx: GameContext) {
  const pitchers = ctx.shuffle(state.ids.filter((id) => state.pitches[id]));
  state.queue = pitchers.map((pitcherId) => {
    const real = state.prompts[pitcherId]!;
    const others = [...Object.values(state.prompts).filter((p) => p !== real), ...state.decoys];
    const decoys = ctx.shuffle([...new Set(others)]).slice(0, 3);
    const options = ctx.shuffle([real, ...decoys]);
    return { pitcherId, options, answer: options.indexOf(real) };
  });
  state.totalRounds = state.queue.length;
}

function startGuess(state: EpState, ctx: GameContext) {
  state.phase = "guess";
  state.picks = {};
  state.gained = {};
  ctx.setDeadline(ctx.timer(GUESS_MS));
  ctx.emit({ kind: "pitch", sfx: "ui.whoosh", text: `Pitch ${state.round} of ${state.totalRounds}`, haptic: 50 });
}

function finishGame(state: EpState, ctx: GameContext) {
  state.phase = "podium";
  ctx.setDeadline(null);
  ctx.finish();
  ctx.emit({ kind: "podium", sfx: "win.big" });
}

function pending(state: EpState): string[] {
  if (state.phase === "pitch") return state.ids.filter((id) => !state.pitches[id]);
  const showing = current(state);
  if (state.phase === "guess" && showing) return state.ids.filter((id) => id !== showing.pitcherId && state.picks[id] === undefined);
  return [];
}

function checkProgress(state: EpState, ctx: GameContext) {
  if (state.phase !== "pitch" && state.phase !== "guess") return;
  const waiting = pending(state).filter((id) => ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

export const emojipitch: GameDefinition<EpState> = {
  id: "emojipitch",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const bank = ctx.settings.familyMode ? PROMPTS.filter((p) => !p.spicy) : PROMPTS;
    const drawn = drawFresh(ctx, "ep:prompts", bank, (p) => p.text, ids.length + DECOY_POOL).map((p) => p.text);
    const state: EpState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds: ids.length,
      prompts: Object.fromEntries(ids.map((id, i) => [id, drawn[i]!])),
      decoys: drawn.slice(ids.length),
      pitches: {},
      queue: [],
      picks: {},
      scores: Object.fromEntries(ids.map((id) => [id, 0])),
      gained: {},
    };
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        state.phase = "pitch";
        ctx.setDeadline(ctx.timer(PITCH_MS));
        ctx.emit({ kind: "pitch", sfx: "round.start", text: "Pitch it in emoji!", haptic: 80 });
        return;
      case "pitch":
        buildQueue(state, ctx);
        if (state.queue.length === 0) return finishGame(state, ctx);
        state.round = 1;
        return startGuess(state, ctx);
      case "guess": {
        const showing = current(state)!;
        for (const [picker, index] of Object.entries(state.picks)) {
          if (index !== showing.answer) continue;
          award(state, picker, EP_GUESS_POINTS);
          award(state, showing.pitcherId, EP_PITCH_POINTS);
        }
        state.phase = "reveal";
        ctx.setDeadline(REVEAL_MS);
        ctx.emit({ kind: "reveal", sfx: Object.values(state.picks).some((i) => i === showing.answer) ? "win.zinger" : "fail.buzz" });
        return;
      }
      case "reveal":
        state.phase = "standings";
        ctx.setDeadline(STANDINGS_MS);
        ctx.emit({ kind: "standings", sfx: "scores.tally" });
        return;
      case "standings":
        if (state.round < state.totalRounds) {
          state.round++;
          return startGuess(state, ctx);
        }
        return finishGame(state, ctx);
      case "podium":
        return;
    }
  },

  onInput(state, ctx, playerId, raw) {
    const input = asRecord(raw);
    if (!input || !state.ids.includes(playerId)) return;
    if (input.type === "pitch") {
      if (state.phase !== "pitch" || state.pitches[playerId]) return;
      const emoji = epCleanPitch(input.emoji);
      if (!emoji) {
        ctx.emit({ kind: "badPitch", text: "Emoji only — one to three of them!", to: [playerId], tv: false, haptic: [80, 40, 80] });
        return;
      }
      state.pitches[playerId] = emoji;
      ctx.emit({ kind: "pitched", sfx: "ui.tick", playerId });
      return checkProgress(state, ctx);
    }
    if (input.type === "pick") {
      const showing = current(state);
      if (state.phase !== "guess" || !showing || playerId === showing.pitcherId || state.picks[playerId] !== undefined) return;
      const index = Number(input.index);
      if (!Number.isInteger(index) || index < 0 || index >= showing.options.length) return;
      state.picks[playerId] = index;
      ctx.emit({ kind: "picked", sfx: "ui.tick", playerId });
      return checkProgress(state, ctx);
    }
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): EpTv {
    const showing = ["guess", "reveal", "standings"].includes(state.phase) ? current(state) : null;
    const revealed = state.phase === "reveal" || state.phase === "standings";
    const waiting = pending(state);
    const active = state.phase === "pitch" ? state.ids : showing ? state.ids.filter((id) => id !== showing.pitcherId) : [];
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      pitcherId: showing?.pitcherId ?? null,
      emoji: showing ? state.pitches[showing.pitcherId]! : null,
      options: showing?.options ?? [],
      doneIds: active.filter((id) => !waiting.includes(id)),
      activeIds: active,
      answer: revealed && showing ? showing.answer : null,
      picks: revealed ? state.picks : null,
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, _ctx, playerId): EpPlayer {
    const showing = ["guess", "reveal", "standings"].includes(state.phase) ? current(state) : null;
    const revealed = state.phase === "reveal" || state.phase === "standings";
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      myPrompt: state.phase === "pitch" ? state.prompts[playerId] ?? null : null,
      myPitch: state.pitches[playerId] ?? null,
      isPitcher: showing?.pitcherId === playerId,
      options: showing?.options ?? [],
      myPick: state.picks[playerId] ?? null,
      answer: revealed && showing ? showing.answer : null,
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
