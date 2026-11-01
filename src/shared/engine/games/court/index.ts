// Character Court — order in the court!
//
// Each round a different player is the defendant. Two other players are
// drafted as prosecutor and defender (rotating so everyone argues) and write
// their argument; the rest of the room — the defendant included — is the jury.
// Lawyers score per juror won; an acquittal pays the defendant; a guilty
// verdict comes with a sentence. Ties go to the defense (innocent until
// proven guilty).

import {
  CC_ACQUITTAL_POINTS,
  CC_ARGUMENT_MAX,
  CC_VOTE_POINTS,
  cleanText,
  type CcPhase,
  type CcPlayer,
  type CcTv,
  type CcVerdict,
} from "@party/shared";
import { asRecord, drawFresh, nextTurn, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { CRIMES, SENTENCES } from "./content";

const INTRO_MS = 7000;
const CHARGE_MS = 60_000;
const TRIAL_MS = 25_000;
const VERDICT_MS = 9000;
const STANDINGS_MS = 4500;
const GRACE_MS = 1000;
const SILENT_PROSECUTION = "The prosecution stares at the ceiling and says nothing.";
const SILENT_DEFENSE = "The defense shrugs. \"They seem nice?\"";

export interface CcState {
  players: GamePlayer[];
  ids: string[];
  phase: CcPhase;
  round: number;
  totalRounds: number;
  order: string[];
  turns: Record<string, number>;
  crimes: string[];
  defendantId: string;
  prosecutorId: string;
  defenderId: string;
  /** How many times each player has been a lawyer, so the role rotates. */
  lawyerCounts: Record<string, number>;
  arguments: Record<string, string>;
  votes: Record<string, CcVerdict>;
  verdict: CcVerdict | null;
  sentence: string | null;
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function award(state: CcState, playerId: string, points: number) {
  state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
  state.gained[playerId] = (state.gained[playerId] ?? 0) + points;
}

function jurors(state: CcState): string[] {
  return state.ids.filter((id) => id !== state.prosecutorId && id !== state.defenderId);
}

function roleOf(state: CcState, playerId: string): CcPlayer["role"] {
  if (playerId === state.defendantId) return "defendant";
  if (playerId === state.prosecutorId) return "prosecutor";
  if (playerId === state.defenderId) return "defender";
  return "juror";
}

function startRound(state: CcState, ctx: GameContext) {
  state.defendantId = nextTurn(state.order, state.turns, ctx.isConnected);
  // Lawyers: the players who've argued least, preferring connected ones.
  const candidates = ctx
    .shuffle(state.ids.filter((id) => id !== state.defendantId))
    .sort((a, b) => Number(ctx.isConnected(b)) - Number(ctx.isConnected(a)) || (state.lawyerCounts[a] ?? 0) - (state.lawyerCounts[b] ?? 0));
  state.prosecutorId = candidates[0]!;
  state.defenderId = candidates[1]!;
  for (const id of [state.prosecutorId, state.defenderId]) state.lawyerCounts[id] = (state.lawyerCounts[id] ?? 0) + 1;
  state.arguments = {};
  state.votes = {};
  state.verdict = null;
  state.sentence = null;
  state.gained = {};
  state.phase = "charge";
  ctx.setDeadline(ctx.timer(CHARGE_MS));
  ctx.emit({ kind: "round", sfx: state.round === state.totalRounds ? "round.final" : "round.start", text: `Case #${state.round}`, haptic: 60 });
  ctx.emit({ kind: "drafted", sfx: "ui.pop", text: "You've been drafted as a lawyer!", to: [state.prosecutorId, state.defenderId], tv: false, haptic: [60, 40, 60] });
}

function startTrial(state: CcState, ctx: GameContext) {
  state.arguments[state.prosecutorId] ??= SILENT_PROSECUTION;
  state.arguments[state.defenderId] ??= SILENT_DEFENSE;
  state.phase = "trial";
  ctx.setDeadline(ctx.timer(TRIAL_MS));
  ctx.emit({ kind: "trial", sfx: "ui.whoosh", text: "The jury will now decide!", haptic: 50 });
}

function deliverVerdict(state: CcState, ctx: GameContext) {
  const guilty = Object.values(state.votes).filter((v) => v === "guilty").length;
  const innocent = Object.values(state.votes).length - guilty;
  state.verdict = guilty > innocent ? "guilty" : "innocent";
  award(state, state.prosecutorId, guilty * CC_VOTE_POINTS);
  award(state, state.defenderId, innocent * CC_VOTE_POINTS);
  if (state.verdict === "innocent") award(state, state.defendantId, CC_ACQUITTAL_POINTS);
  else state.sentence = ctx.pick(SENTENCES);
  state.phase = "verdict";
  ctx.setDeadline(VERDICT_MS);
  ctx.emit({ kind: "verdict", sfx: state.verdict === "guilty" ? "reveal.caught" : "reveal.escape", text: state.verdict === "guilty" ? "GUILTY!" : "NOT GUILTY!" });
}

function pending(state: CcState): string[] {
  if (state.phase === "charge") return [state.prosecutorId, state.defenderId].filter((id) => !state.arguments[id]);
  if (state.phase === "trial") return jurors(state).filter((id) => !state.votes[id]);
  return [];
}

function checkProgress(state: CcState, ctx: GameContext) {
  if (state.phase !== "charge" && state.phase !== "trial") return;
  const waiting = pending(state).filter((id) => ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

export const court: GameDefinition<CcState> = {
  id: "court",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const rounds = ctx.options.rounds ?? 0;
    const totalRounds = rounds > 0 ? rounds : ids.length;
    const bank = ctx.settings.familyMode ? CRIMES.filter((c) => !c.spicy) : CRIMES;
    const state: CcState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds,
      order: ctx.shuffle(ids),
      turns: {},
      crimes: drawFresh(ctx, "cc:crimes", bank, (c) => c.text, totalRounds).map((c) => c.text),
      defendantId: ids[0]!,
      prosecutorId: ids[1]!,
      defenderId: ids[2] ?? ids[1]!,
      lawyerCounts: {},
      arguments: {},
      votes: {},
      verdict: null,
      sentence: null,
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
      case "charge":
        return startTrial(state, ctx);
      case "trial":
        return deliverVerdict(state, ctx);
      case "verdict":
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
    if (input.type === "argue") {
      if (state.phase !== "charge" || (playerId !== state.prosecutorId && playerId !== state.defenderId) || state.arguments[playerId]) return;
      const text = cleanText(input.text, CC_ARGUMENT_MAX);
      if (!text) return;
      state.arguments[playerId] = text;
      ctx.emit({ kind: "argued", sfx: "ui.tick", playerId });
      return checkProgress(state, ctx);
    }
    if (input.type === "vote") {
      if (state.phase !== "trial" || !jurors(state).includes(playerId) || state.votes[playerId]) return;
      if (input.verdict !== "guilty" && input.verdict !== "innocent") return;
      state.votes[playerId] = input.verdict;
      ctx.emit({ kind: "voted", sfx: "ui.tick", playerId });
      return checkProgress(state, ctx);
    }
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): CcTv {
    const playing = state.phase !== "intro" && state.phase !== "podium";
    const argued = ["trial", "verdict", "standings"].includes(state.phase);
    const revealed = state.phase === "verdict" || state.phase === "standings";
    const active = state.phase === "charge" ? [state.prosecutorId, state.defenderId] : state.phase === "trial" ? jurors(state) : [];
    const waiting = pending(state);
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      defendantId: playing ? state.defendantId : null,
      prosecutorId: playing ? state.prosecutorId : null,
      defenderId: playing ? state.defenderId : null,
      crime: playing ? state.crimes[state.round - 1] ?? null : null,
      prosecution: argued ? state.arguments[state.prosecutorId] ?? null : null,
      defense: argued ? state.arguments[state.defenderId] ?? null : null,
      doneIds: active.filter((id) => !waiting.includes(id)),
      activeIds: active,
      votes: revealed ? state.votes : null,
      verdict: revealed ? state.verdict : null,
      sentence: revealed ? state.sentence : null,
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, _ctx, playerId): CcPlayer {
    const playing = state.phase !== "intro" && state.phase !== "podium";
    const argued = ["trial", "verdict", "standings"].includes(state.phase);
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      role: playing ? roleOf(state, playerId) : null,
      defendantId: playing ? state.defendantId : null,
      crime: playing ? state.crimes[state.round - 1] ?? null : null,
      myArgument: state.arguments[playerId] ?? null,
      prosecution: argued ? state.arguments[state.prosecutorId] ?? null : null,
      defense: argued ? state.arguments[state.defenderId] ?? null : null,
      myVote: state.votes[playerId] ?? null,
      verdict: state.phase === "verdict" || state.phase === "standings" ? state.verdict : null,
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
