// Telly Trivia — quick-fire multiple choice.
//
// Each question shows four shuffled options. A right answer pays 100 plus a
// speed bonus that slides from 100 to 0 over the timer (measured when the TV
// receives it). The final question counts double. Standings every third
// question and at the end.

import {
  QZ_BASE_POINTS,
  QZ_SPEED_POINTS,
  type QzAnswerLine,
  type QzPhase,
  type QzPlayer,
  type QzQuestion,
  type QzTv,
} from "@party/shared";
import { asRecord, drawFresh, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { QUESTIONS } from "./content";

const INTRO_MS = 6500;
const QUESTION_MS = 20_000;
const REVEAL_MS = 6500;
const STANDINGS_MS = 4500;
const GRACE_MS = 700;

interface Asked extends QzQuestion {
  answer: number;
}

export interface QzState {
  players: GamePlayer[];
  ids: string[];
  phase: QzPhase;
  round: number;
  totalRounds: number;
  questions: Asked[];
  openedAt: number;
  windowMs: number;
  answers: Record<string, { choice: number; at: number }>;
  results: QzAnswerLine[];
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function isFinal(state: QzState): boolean {
  return state.round === state.totalRounds;
}

function startQuestion(state: QzState, ctx: GameContext) {
  state.phase = "question";
  state.answers = {};
  state.results = [];
  state.gained = {};
  state.windowMs = ctx.timer(QUESTION_MS);
  state.openedAt = ctx.now();
  ctx.setDeadline(state.windowMs);
  ctx.emit({ kind: "question", sfx: isFinal(state) ? "round.final" : "round.start", text: isFinal(state) ? "Final question — double points!" : `Question ${state.round}`, haptic: 60 });
}

function reveal(state: QzState, ctx: GameContext) {
  const q = state.questions[state.round - 1]!;
  const multiplier = isFinal(state) ? 2 : 1;
  state.results = Object.entries(state.answers).map(([playerId, a]) => {
    const correct = a.choice === q.answer;
    const left = Math.max(0, 1 - (a.at - state.openedAt) / state.windowMs);
    const points = correct ? (QZ_BASE_POINTS + Math.round(QZ_SPEED_POINTS * left)) * multiplier : 0;
    return { playerId, choice: a.choice, correct, points };
  });
  for (const r of state.results) {
    state.scores[r.playerId] = (state.scores[r.playerId] ?? 0) + r.points;
    state.gained[r.playerId] = r.points;
  }
  state.phase = "reveal";
  ctx.setDeadline(REVEAL_MS);
  ctx.emit({ kind: "reveal", sfx: state.results.some((r) => r.correct) ? "win.zinger" : "fail.buzz" });
}

function checkProgress(state: QzState, ctx: GameContext) {
  if (state.phase !== "question") return;
  const waiting = state.ids.filter((id) => !state.answers[id] && ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

export const trivia: GameDefinition<QzState> = {
  id: "trivia",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const totalRounds = ctx.options.rounds ?? 12;
    const questions = drawFresh(ctx, "qz:questions", QUESTIONS, (q) => q.text, totalRounds).map((q) => {
      const order = ctx.shuffle([0, 1, 2, 3]);
      return { category: q.category, text: q.text, options: order.map((i) => q.options[i]!), answer: order.indexOf(0) };
    });
    const state: QzState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds,
      questions,
      openedAt: 0,
      windowMs: QUESTION_MS,
      answers: {},
      results: [],
      scores: Object.fromEntries(ids.map((id) => [id, 0])),
      gained: {},
    };
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        return startQuestion(state, ctx);
      case "question":
        return reveal(state, ctx);
      case "reveal":
        if (state.round % 3 === 0 || isFinal(state)) {
          state.phase = "standings";
          ctx.setDeadline(STANDINGS_MS);
          ctx.emit({ kind: "standings", sfx: "scores.tally" });
          return;
        }
        state.round++;
        return startQuestion(state, ctx);
      case "standings":
        if (state.round < state.totalRounds) {
          state.round++;
          return startQuestion(state, ctx);
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

  onResume(state, _ctx, pausedForMs) {
    // A pause shouldn't eat into anyone's speed bonus.
    if (state.phase === "question") state.openedAt += pausedForMs;
  },

  onInput(state, ctx, playerId, raw) {
    const input = asRecord(raw);
    if (!input || input.type !== "answer" || state.phase !== "question" || !state.ids.includes(playerId) || state.answers[playerId]) return;
    const choice = Number(input.choice);
    if (!Number.isInteger(choice) || choice < 0 || choice > 3) return;
    state.answers[playerId] = { choice, at: ctx.now() };
    ctx.emit({ kind: "answered", sfx: "ui.tick", playerId });
    checkProgress(state, ctx);
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): QzTv {
    const q = state.phase === "intro" ? null : state.questions[state.round - 1] ?? null;
    const revealed = state.phase === "reveal";
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      final: isFinal(state),
      question: q ? { category: q.category, text: q.text, options: q.options } : null,
      doneIds: Object.keys(state.answers),
      answer: revealed && q ? q.answer : null,
      answers: revealed ? state.results : [],
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, _ctx, playerId): QzPlayer {
    const q = state.phase === "intro" ? null : state.questions[state.round - 1] ?? null;
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      final: isFinal(state),
      question: q ? { category: q.category, text: q.text, options: q.options } : null,
      myChoice: state.answers[playerId]?.choice ?? null,
      answer: state.phase === "reveal" && q ? q.answer : null,
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
