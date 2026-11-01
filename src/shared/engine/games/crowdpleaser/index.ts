// Crowd Pleaser — read the room.
//
// Every round is an either/or poll. Each player picks a side and predicts how
// many players (themselves included) picked the first option. Predictions pay
// by how close they land; being the only one on your side earns a bonus.

import {
  CP_LONE_WOLF_BONUS,
  CP_POINTS,
  type CpAnswer,
  type CpPhase,
  type CpPlayer,
  type CpQuestion,
  type CpTv,
} from "@party/shared";
import { asRecord, drawFresh, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { POLLS } from "./content";

const INTRO_MS = 6500;
const ANSWER_MS = 25_000;
const REVEAL_MS = 8000;
const STANDINGS_MS = 4500;
const GRACE_MS = 900;

export interface CpState {
  players: GamePlayer[];
  ids: string[];
  phase: CpPhase;
  round: number;
  totalRounds: number;
  questions: CpQuestion[];
  answers: Record<string, { choice: "a" | "b"; guess: number }>;
  results: CpAnswer[];
  countA: number | null;
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function startRound(state: CpState, ctx: GameContext) {
  state.phase = "answer";
  state.answers = {};
  state.results = [];
  state.countA = null;
  state.gained = {};
  ctx.setDeadline(ctx.timer(ANSWER_MS));
  ctx.emit({ kind: "round", sfx: state.round === state.totalRounds ? "round.final" : "round.start", text: `Poll ${state.round}`, haptic: 60 });
}

function reveal(state: CpState, ctx: GameContext) {
  const entries = Object.entries(state.answers);
  const countA = entries.filter(([, a]) => a.choice === "a").length;
  const countB = entries.length - countA;
  state.countA = countA;
  state.results = entries.map(([playerId, a]) => {
    const off = Math.abs(a.guess - countA);
    let points = CP_POINTS[off] ?? 0;
    const alone = entries.length >= 3 && (a.choice === "a" ? countA : countB) === 1;
    if (alone) points += CP_LONE_WOLF_BONUS;
    return { playerId, choice: a.choice, guess: a.guess, points };
  });
  for (const r of state.results) {
    state.scores[r.playerId] = (state.scores[r.playerId] ?? 0) + r.points;
    state.gained[r.playerId] = r.points;
  }
  state.phase = "reveal";
  ctx.setDeadline(REVEAL_MS);
  ctx.emit({ kind: "reveal", sfx: state.results.some((r) => r.points >= CP_POINTS[0]) ? "win.zinger" : "reveal.votes" });
}

function checkProgress(state: CpState, ctx: GameContext) {
  if (state.phase !== "answer") return;
  const waiting = state.ids.filter((id) => !state.answers[id] && ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

export const crowdpleaser: GameDefinition<CpState> = {
  id: "crowdpleaser",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const totalRounds = ctx.options.rounds ?? 8;
    const bank = ctx.settings.familyMode ? POLLS.filter((p) => !p.spicy) : POLLS;
    const state: CpState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds,
      questions: drawFresh(ctx, "cp:polls", bank, (p) => p.text, totalRounds).map(({ text, a, b }) => ({ text, a, b })),
      answers: {},
      results: [],
      countA: null,
      scores: Object.fromEntries(ids.map((id) => [id, 0])),
      gained: {},
    };
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        return startRound(state, ctx);
      case "answer":
        return reveal(state, ctx);
      case "reveal":
        state.phase = "standings";
        ctx.setDeadline(STANDINGS_MS);
        ctx.emit({ kind: "standings", sfx: "scores.tally" });
        return;
      case "standings":
        if (state.round < state.totalRounds) {
          state.round++;
          return startRound(state, ctx);
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

  onInput(state, ctx, playerId, raw) {
    const input = asRecord(raw);
    if (!input || input.type !== "answer" || state.phase !== "answer" || !state.ids.includes(playerId) || state.answers[playerId]) return;
    if (input.choice !== "a" && input.choice !== "b") return;
    const guess = Number(input.guess);
    if (!Number.isInteger(guess) || guess < 0 || guess > state.ids.length) return;
    state.answers[playerId] = { choice: input.choice, guess };
    ctx.emit({ kind: "answered", sfx: "ui.tick", playerId });
    checkProgress(state, ctx);
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): CpTv {
    const revealed = state.phase === "reveal" || state.phase === "standings";
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      question: state.phase === "intro" ? null : state.questions[state.round - 1] ?? null,
      voters: state.ids.length,
      doneIds: Object.keys(state.answers),
      countA: revealed ? state.countA : null,
      answers: revealed ? state.results : [],
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, _ctx, playerId): CpPlayer {
    const revealed = state.phase === "reveal" || state.phase === "standings";
    const mine = state.answers[playerId];
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      question: state.phase === "intro" ? null : state.questions[state.round - 1] ?? null,
      voters: state.ids.length,
      myChoice: mine?.choice ?? null,
      myGuess: mine?.guess ?? null,
      countA: revealed ? state.countA : null,
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
