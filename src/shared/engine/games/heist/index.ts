// Heist Night — crack the vault together.
//
// Each vault has a secret code of distinct digits (3 digits for the first two
// vaults, 4 after). The clue set narrows it to exactly one code; clues are
// dealt across every phone (extra true clues fill in so nobody's empty-handed).
// A rotating safecracker gets three tries; each miss shows how many digits
// were in the right spot. Opening the vault pays the whole crew.

import {
  HEIST_ATTEMPTS,
  HEIST_CRACKER_BONUS,
  HEIST_MISS_PENALTY,
  HEIST_OPEN_POINTS,
  HEIST_SECOND_POINTS,
  type HeistAttempt,
  type HeistPhase,
  type HeistPlayer,
  type HeistTv,
} from "@party/shared";
import { asRecord, nextTurn, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { inPlace, solveSet, trueClues } from "./clues";

const INTRO_MS = 8000;
const BRIEF_MS = 6000;
const CRACK_MS = 100_000;
const RESULT_MS = 8000;
const STANDINGS_MS = 4500;

export interface HeistState {
  players: GamePlayer[];
  ids: string[];
  phase: HeistPhase;
  round: number;
  totalRounds: number;
  order: string[];
  turns: Record<string, number>;
  crackerId: string;
  code: number[];
  clues: Record<string, string[]>;
  attempts: HeistAttempt[];
  guardsAt: number | null;
  opened: boolean | null;
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function digitsFor(round: number): number {
  return round <= 2 ? 3 : 4;
}

function award(state: HeistState, playerId: string, points: number) {
  state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
  state.gained[playerId] = (state.gained[playerId] ?? 0) + points;
}

function startVault(state: HeistState, ctx: GameContext) {
  const n = digitsFor(state.round);
  state.code = ctx.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, n);
  const chosen = solveSet(state.code, ctx.shuffle).map((c) => c.text);
  // Top up with extra true clues so every phone gets at least one.
  const spare = ctx.shuffle(trueClues(state.code).map((c) => c.text).filter((t) => !chosen.includes(t)));
  while (chosen.length < state.ids.length && spare.length) chosen.push(spare.shift()!);
  const holders = ctx.shuffle(state.ids);
  state.clues = Object.fromEntries(state.ids.map((id) => [id, []]));
  ctx.shuffle(chosen).forEach((text, i) => state.clues[holders[i % holders.length]!]!.push(text));
  state.crackerId = nextTurn(state.order, state.turns, ctx.isConnected);
  state.attempts = [];
  state.guardsAt = null;
  state.opened = null;
  state.gained = {};
  state.phase = "brief";
  ctx.setDeadline(BRIEF_MS);
  ctx.emit({ kind: "round", sfx: state.round === state.totalRounds ? "round.final" : "round.start", text: `Vault ${state.round}`, haptic: 60 });
}

function finishVault(state: HeistState, ctx: GameContext, opened: boolean) {
  state.opened = opened;
  if (opened) {
    const secondsLeft = state.guardsAt === null ? 0 : Math.max(0, Math.ceil((state.guardsAt - ctx.now()) / 1000));
    const misses = state.attempts.filter((a) => a.inPlace < state.code.length).length;
    const crew = Math.max(50, HEIST_OPEN_POINTS + secondsLeft * HEIST_SECOND_POINTS - misses * HEIST_MISS_PENALTY);
    for (const id of state.ids) award(state, id, crew);
    award(state, state.crackerId, HEIST_CRACKER_BONUS);
  }
  state.phase = "result";
  ctx.setDeadline(RESULT_MS);
  ctx.emit({ kind: opened ? "opened" : "alarm", sfx: opened ? "win.big" : "fail.buzz", text: opened ? "The vault is open!" : "ALARM! The guards are back!", haptic: opened ? 80 : [200, 80, 200] });
}

export const heist: GameDefinition<HeistState> = {
  id: "heist",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const state: HeistState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds: ctx.options.rounds ?? 4,
      order: ctx.shuffle(ids),
      turns: {},
      crackerId: ids[0]!,
      code: [],
      clues: {},
      attempts: [],
      guardsAt: null,
      opened: null,
      scores: Object.fromEntries(ids.map((id) => [id, 0])),
      gained: {},
    };
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        return startVault(state, ctx);
      case "brief": {
        const ms = ctx.timer(CRACK_MS);
        state.phase = "crack";
        state.guardsAt = ctx.now() + ms;
        ctx.setDeadline(ms);
        ctx.emit({ kind: "crack", sfx: "rocket.countdown", text: "Crack it before the guards come back!", haptic: 60 });
        return;
      }
      case "crack":
        return finishVault(state, ctx, false);
      case "result":
        state.phase = "standings";
        ctx.setDeadline(STANDINGS_MS);
        ctx.emit({ kind: "standings", sfx: "scores.tally" });
        return;
      case "standings":
        if (state.round < state.totalRounds) {
          state.round++;
          return startVault(state, ctx);
        }
        state.phase = "podium";
        ctx.setDeadline(null);
        ctx.finish();
        ctx.emit({ kind: "podium", sfx: "win.big" });
        return;
      case "podium":
        return;
    }
  },

  onSkip(state, ctx) {
    if (state.phase === "crack") return;
    heist.onDeadline(state, ctx);
  },

  onResume(state, _ctx, pausedForMs) {
    if (state.phase === "crack" && state.guardsAt !== null) state.guardsAt += pausedForMs;
  },

  onInput(state, ctx, playerId, raw) {
    const input = asRecord(raw);
    if (!input || input.type !== "code" || state.phase !== "crack" || playerId !== state.crackerId) return;
    const text = typeof input.code === "string" ? input.code.replace(/\D/g, "") : "";
    if (text.length !== state.code.length) return;
    const guess = [...text].map(Number);
    const hits = inPlace(state.code, guess);
    state.attempts.push({ code: text, inPlace: hits });
    if (hits === state.code.length) return finishVault(state, ctx, true);
    ctx.emit({ kind: "miss", sfx: "fail.jinx", text: `${hits} in the right spot`, haptic: [80, 40, 80] });
    if (state.attempts.length >= HEIST_ATTEMPTS) finishVault(state, ctx, false);
  },

  tvView(state): HeistTv {
    const playing = state.phase !== "intro" && state.phase !== "podium";
    const revealed = state.phase === "result" || state.phase === "standings";
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      digits: digitsFor(state.round),
      crackerId: playing ? state.crackerId : null,
      guardsAt: state.phase === "crack" ? state.guardsAt : null,
      attempts: state.attempts,
      clueCounts: Object.fromEntries(Object.entries(state.clues).map(([id, c]) => [id, c.length])),
      opened: state.opened,
      code: revealed ? state.code.join("") : null,
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, _ctx, playerId): HeistPlayer {
    const playing = state.phase !== "intro" && state.phase !== "podium";
    const revealed = state.phase === "result" || state.phase === "standings";
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      digits: digitsFor(state.round),
      crackerId: playing ? state.crackerId : null,
      isCracker: playing && playerId === state.crackerId,
      clues: playing ? state.clues[playerId] ?? [] : [],
      attempts: state.attempts,
      attemptsLeft: HEIST_ATTEMPTS - state.attempts.length,
      opened: state.opened,
      code: revealed ? state.code.join("") : null,
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
