// Lie Detector — truth or lie?
//
// Each round a different player is the speaker. They see a yes/no question,
// secretly choose to tell the truth or lie, then answer out loud while the
// TV's polygraph twitches. Everyone else votes; correct voters score and the
// speaker scores for every voter they fooled. A speaker who never chooses
// gets a coin flip.

import {
  LIE_CORRECT_POINTS,
  LIE_FOOL_POINTS,
  type LiePhase,
  type LiePlayer,
  type LieTv,
  type LieVerdict,
} from "@party/shared";
import { asRecord, drawFresh, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { QUESTIONS } from "./content";

const INTRO_MS = 7000;
const CHOOSE_MS = 15_000;
const TALK_MS = 45_000;
const VOTE_MS = 20_000;
const REVEAL_MS = 7500;
const STANDINGS_MS = 4500;
const GRACE_MS = 900;

export interface LieState {
  players: GamePlayer[];
  ids: string[];
  phase: LiePhase;
  round: number;
  totalRounds: number;
  order: string[];
  questions: string[];
  speakerId: string;
  choice: LieVerdict | null;
  votes: Record<string, LieVerdict>;
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function award(state: LieState, playerId: string, points: number) {
  state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
  state.gained[playerId] = (state.gained[playerId] ?? 0) + points;
}

function voters(state: LieState): string[] {
  return state.ids.filter((id) => id !== state.speakerId);
}

function startRound(state: LieState, ctx: GameContext) {
  const planned = (state.round - 1) % state.order.length;
  const rotation = [...state.order.slice(planned), ...state.order.slice(0, planned)];
  state.speakerId = rotation.find((id) => ctx.isConnected(id)) ?? rotation[0]!;
  state.choice = null;
  state.votes = {};
  state.gained = {};
  state.phase = "choose";
  ctx.setDeadline(ctx.timer(CHOOSE_MS));
  ctx.emit({ kind: "round", sfx: state.round === state.totalRounds ? "round.final" : "round.start", text: `Round ${state.round}`, haptic: 60 });
  ctx.emit({ kind: "speaker", sfx: "ui.pop", text: "You're on the stand!", to: [state.speakerId], tv: false, haptic: [60, 40, 60] });
}

function startTalk(state: LieState, ctx: GameContext) {
  state.choice ??= ctx.random() < 0.5 ? "truth" : "lie";
  state.phase = "talk";
  ctx.setDeadline(ctx.timer(TALK_MS));
  ctx.emit({ kind: "talk", sfx: "ui.whoosh", haptic: 40 });
}

function reveal(state: LieState, ctx: GameContext) {
  for (const [voter, verdict] of Object.entries(state.votes)) {
    if (verdict === state.choice) award(state, voter, LIE_CORRECT_POINTS);
    else award(state, state.speakerId, LIE_FOOL_POINTS);
  }
  state.phase = "reveal";
  ctx.setDeadline(REVEAL_MS);
  ctx.emit({ kind: "reveal", sfx: state.choice === "lie" ? "reveal.caught" : "win.zinger", text: state.choice === "lie" ? "LIE!" : "TRUTH!" });
}

function checkProgress(state: LieState, ctx: GameContext) {
  if (state.phase !== "vote") return;
  const waiting = voters(state).filter((id) => !state.votes[id] && ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

export const liedetector: GameDefinition<LieState> = {
  id: "liedetector",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const rounds = ctx.options.rounds ?? 0;
    const totalRounds = rounds > 0 ? rounds : ids.length;
    const bank = ctx.settings.familyMode ? QUESTIONS.filter((q) => !q.spicy) : QUESTIONS;
    const state: LieState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds,
      order: ctx.shuffle(ids),
      questions: drawFresh(ctx, "lie:questions", bank, (q) => q.text, totalRounds).map((q) => q.text),
      speakerId: ids[0]!,
      choice: null,
      votes: {},
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
      case "choose":
        return startTalk(state, ctx);
      case "talk":
        state.phase = "vote";
        ctx.setDeadline(ctx.timer(VOTE_MS));
        ctx.emit({ kind: "vote", sfx: "ui.pop", text: "Truth or lie?", haptic: 50 });
        return checkProgress(state, ctx);
      case "vote":
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
    if (!input || !state.ids.includes(playerId)) return;
    if (input.type === "choose") {
      if (state.phase !== "choose" || playerId !== state.speakerId) return;
      if (input.choice !== "truth" && input.choice !== "lie") return;
      state.choice = input.choice;
      return startTalk(state, ctx);
    }
    if (input.type === "doneTalking") {
      if (state.phase !== "talk" || playerId !== state.speakerId) return;
      return liedetector.onDeadline(state, ctx);
    }
    if (input.type === "vote") {
      if (state.phase !== "vote" || playerId === state.speakerId || state.votes[playerId]) return;
      if (input.verdict !== "truth" && input.verdict !== "lie") return;
      state.votes[playerId] = input.verdict;
      ctx.emit({ kind: "voted", sfx: "ui.tick", playerId });
      return checkProgress(state, ctx);
    }
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): LieTv {
    const playing = state.phase !== "intro" && state.phase !== "podium";
    const revealed = state.phase === "reveal" || state.phase === "standings";
    const active = state.phase === "vote" ? voters(state) : [];
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      speakerId: playing ? state.speakerId : null,
      question: playing && state.phase !== "choose" ? state.questions[state.round - 1] ?? null : null,
      doneIds: active.filter((id) => state.votes[id]),
      activeIds: active,
      verdict: revealed ? state.choice : null,
      votes: revealed ? state.votes : null,
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, _ctx, playerId): LiePlayer {
    const playing = state.phase !== "intro" && state.phase !== "podium";
    const revealed = state.phase === "reveal" || state.phase === "standings";
    const isSpeaker = playing && playerId === state.speakerId;
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      speakerId: playing ? state.speakerId : null,
      isSpeaker,
      question: playing && (isSpeaker || state.phase !== "choose") ? state.questions[state.round - 1] ?? null : null,
      myChoice: isSpeaker ? state.choice : null,
      myVote: state.votes[playerId] ?? null,
      verdict: revealed ? state.choice : null,
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
