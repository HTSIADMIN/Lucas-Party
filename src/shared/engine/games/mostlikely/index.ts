// Most Likely To… — vote for the friend who best fits the prompt.
//
// Each round everyone votes for another player. The most-voted player(s) are
// the room's pick; voters who sided with the room score (half on a tie). The
// pick takes the prompt home as a title, and the awards ceremony after the
// last round reads them all out before the podium.

import { ML_MATCH_POINTS, ML_TIE_POINTS, type MlAward, type MlPhase, type MlPlayer, type MlTv } from "@party/shared";
import { asRecord, drawFresh, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { PROMPTS } from "./content";

const INTRO_MS = 6500;
const VOTE_MS = 20_000;
const REVEAL_MS = 7500;
const STANDINGS_MS = 4500;
const AWARDS_BASE_MS = 5000;
const AWARDS_PER_PLAYER_MS = 1800;
const AWARDS_MAX_MS = 20_000;
const GRACE_MS = 900;

export interface MlState {
  players: GamePlayer[];
  ids: string[];
  phase: MlPhase;
  round: number;
  totalRounds: number;
  prompts: string[];
  votes: Record<string, string>;
  topIds: string[];
  points: number;
  awards: MlAward[];
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function startRound(state: MlState, ctx: GameContext) {
  state.phase = "vote";
  state.votes = {};
  state.topIds = [];
  state.points = 0;
  state.gained = {};
  ctx.setDeadline(ctx.timer(VOTE_MS));
  ctx.emit({ kind: "round", sfx: state.round === state.totalRounds ? "round.final" : "round.start", text: `Prompt ${state.round}`, haptic: 60 });
}

function resolve(state: MlState, ctx: GameContext) {
  const tally = new Map<string, number>();
  for (const pick of Object.values(state.votes)) tally.set(pick, (tally.get(pick) ?? 0) + 1);
  const max = Math.max(0, ...tally.values());
  state.topIds = max > 0 ? [...tally.entries()].filter(([, n]) => n === max).map(([id]) => id) : [];
  state.points = state.topIds.length === 1 ? ML_MATCH_POINTS : state.topIds.length > 1 ? ML_TIE_POINTS : 0;
  for (const [voter, pick] of Object.entries(state.votes)) {
    if (!state.topIds.includes(pick)) continue;
    state.scores[voter] = (state.scores[voter] ?? 0) + state.points;
    state.gained[voter] = (state.gained[voter] ?? 0) + state.points;
  }
  const prompt = state.prompts[state.round - 1]!;
  for (const id of state.topIds) state.awards.push({ playerId: id, prompt, votes: max });
  state.phase = "reveal";
  ctx.setDeadline(REVEAL_MS);
  ctx.emit({ kind: "reveal", sfx: state.topIds.length ? "reveal.caught" : "fail.buzz", to: state.topIds, haptic: [100, 50, 100] });
}

function afterReveal(state: MlState, ctx: GameContext) {
  if (state.round < state.totalRounds) {
    state.phase = "standings";
    ctx.setDeadline(STANDINGS_MS);
    ctx.emit({ kind: "standings", sfx: "scores.tally" });
    return;
  }
  state.phase = "awards";
  const winners = new Set(state.awards.map((a) => a.playerId)).size;
  ctx.setDeadline(Math.min(AWARDS_MAX_MS, AWARDS_BASE_MS + winners * AWARDS_PER_PLAYER_MS));
  ctx.emit({ kind: "awards", sfx: "reveal.drumroll", text: "The awards ceremony!" });
}

function checkProgress(state: MlState, ctx: GameContext) {
  if (state.phase !== "vote") return;
  const waiting = state.ids.filter((id) => !state.votes[id] && ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

const VOTES_OUT: MlPhase[] = ["reveal", "standings", "awards", "podium"];

export const mostlikely: GameDefinition<MlState> = {
  id: "mostlikely",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const totalRounds = ctx.options.rounds ?? 8;
    const bank = ctx.settings.familyMode ? PROMPTS.filter((p) => !p.spicy) : PROMPTS;
    const state: MlState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds,
      prompts: drawFresh(ctx, "ml:prompts", bank, (p) => p.text, totalRounds).map((p) => p.text),
      votes: {},
      topIds: [],
      points: 0,
      awards: [],
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
      case "vote":
        return resolve(state, ctx);
      case "reveal":
        return afterReveal(state, ctx);
      case "standings":
        state.round++;
        return startRound(state, ctx);
      case "awards":
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
    if (!input || input.type !== "vote" || state.phase !== "vote" || !state.ids.includes(playerId) || state.votes[playerId]) return;
    const target = typeof input.targetId === "string" ? input.targetId : "";
    if (target === playerId || !state.ids.includes(target)) return;
    state.votes[playerId] = target;
    ctx.emit({ kind: "voted", sfx: "ui.tick", playerId });
    checkProgress(state, ctx);
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): MlTv {
    const out = VOTES_OUT.includes(state.phase);
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      prompt: state.phase === "intro" ? null : state.prompts[state.round - 1] ?? null,
      votedIds: Object.keys(state.votes),
      votes: out ? state.votes : null,
      topIds: out ? state.topIds : [],
      points: out ? state.points : 0,
      awards: state.phase === "awards" || state.phase === "podium" ? state.awards : [],
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, _ctx, playerId): MlPlayer {
    const out = VOTES_OUT.includes(state.phase);
    const myVote = state.votes[playerId] ?? null;
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      prompt: state.phase === "intro" ? null : state.prompts[state.round - 1] ?? null,
      myVote,
      topIds: out ? state.topIds : [],
      votesForMe: out ? Object.values(state.votes).filter((v) => v === playerId).length : 0,
      matched: out && myVote !== null && state.topIds.includes(myVote),
      myAwards: state.awards.filter((a) => a.playerId === playerId).map((a) => a.prompt),
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
