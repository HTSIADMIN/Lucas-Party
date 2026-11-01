// Saloon Showdown — reflex rounds.
//
// Rounds alternate Quick Draw and Stop the Clock; the last round is always a
// Quick Draw "Final Showdown" worth double. Times come from the phones (they
// time from the moment their own screen changed), the TV only ranks them.
// Tapping before DRAW is a flinch: no time and a small penalty.

import {
  SD_BULLSEYE_BONUS,
  SD_BULLSEYE_MS,
  SD_FOUL_POINTS,
  SD_MIN_REACTION_MS,
  SD_PLACE_POINTS,
  type SdKind,
  type SdPhase,
  type SdPlayer,
  type SdResultLine,
  type SdTv,
} from "@party/shared";
import { asRecord, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";

const INTRO_MS = 7000;
const READY_MS = 3800;
const STEADY_MIN_MS = 1800;
const STEADY_MAX_MS = 4500;
const FAKE_MS = 1100;
const FAKE_CHANCE = 0.35;
const DRAW_WINDOW_MS = 2500;
const CLOCK_MIN_MS = 5000;
const CLOCK_MAX_MS = 9000;
const CLOCK_GRACE_MS = 4000;
const RESULT_MS = 6000;
const STANDINGS_MS = 4000;
const GRACE_MS = 600;
const FAKES = ["DRAWER!", "DRAMA!", "DRAGON!", "DRIZZLE!", "DRAFT!", "DROOL!", "DRUMS!", "DRAT!", "DRESSER!", "DRIVE-THRU!"];

interface Shot {
  ms: number | null;
  foul: boolean;
}

export interface SdState {
  players: GamePlayer[];
  ids: string[];
  phase: SdPhase;
  round: number;
  totalRounds: number;
  kind: SdKind;
  target: number | null;
  fake: string | null;
  /** A fake-out is still to come in this steady phase. */
  fakePending: boolean;
  clockStartedAt: number | null;
  shots: Record<string, Shot>;
  results: SdResultLine[];
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function isFinal(state: SdState): boolean {
  return state.round === state.totalRounds;
}

function kindFor(state: SdState): SdKind {
  return isFinal(state) || state.round % 2 === 1 ? "draw" : "clock";
}

function startRound(state: SdState, ctx: GameContext) {
  state.kind = kindFor(state);
  state.target = state.kind === "clock" ? Math.round(ctx.randomInt(CLOCK_MIN_MS, CLOCK_MAX_MS + 1) / 10) * 10 : null;
  state.fake = null;
  state.fakePending = state.kind === "draw" && ctx.random() < FAKE_CHANCE;
  state.clockStartedAt = null;
  state.shots = {};
  state.results = [];
  state.gained = {};
  state.phase = "ready";
  ctx.setDeadline(READY_MS);
  ctx.emit({
    kind: "round",
    sfx: isFinal(state) ? "round.final" : "round.start",
    text: isFinal(state) ? "Final Showdown — double points!" : state.kind === "draw" ? "Quick Draw" : "Stop the Clock",
    haptic: 60,
  });
}

function steady(state: SdState, ctx: GameContext) {
  state.phase = "steady";
  state.fake = null;
  ctx.setDeadline(ctx.randomInt(STEADY_MIN_MS, STEADY_MAX_MS + 1));
}

function placePoints(place: number): number {
  return SD_PLACE_POINTS[Math.min(place, SD_PLACE_POINTS.length) - 1]!;
}

function settle(state: SdState, ctx: GameContext) {
  const multiplier = isFinal(state) ? 2 : 1;
  const lines: SdResultLine[] = state.ids.map((playerId) => {
    const shot = state.shots[playerId];
    const ms = shot && !shot.foul ? shot.ms : null;
    const diff = state.kind === "clock" && ms !== null && state.target !== null ? Math.abs(ms - state.target) : null;
    return { playerId, ms, foul: Boolean(shot?.foul), diff, place: null, points: shot?.foul ? SD_FOUL_POINTS : 0 };
  });
  const ranked = lines.filter((l) => l.ms !== null).sort((a, b) => (state.kind === "draw" ? a.ms! - b.ms! : a.diff! - b.diff!));
  ranked.forEach((line, i) => {
    // Exact ties share a place.
    const prev = ranked[i - 1];
    const same = prev !== undefined && (state.kind === "draw" ? prev.ms === line.ms : prev.diff === line.diff);
    line.place = prev !== undefined && same ? prev.place : i + 1;
    line.points = placePoints(line.place!) * multiplier;
    if (state.kind === "clock" && line.diff! <= SD_BULLSEYE_MS) line.points += SD_BULLSEYE_BONUS;
  });
  for (const line of lines) {
    state.scores[line.playerId] = (state.scores[line.playerId] ?? 0) + line.points;
    state.gained[line.playerId] = line.points;
  }
  state.results = [...ranked, ...lines.filter((l) => l.ms === null)];
  state.phase = "result";
  ctx.setDeadline(RESULT_MS);
  const winner = ranked[0];
  const name = winner ? state.players.find((p) => p.id === winner.playerId)?.name : null;
  ctx.emit({
    kind: "result",
    sfx: winner ? "win.zinger" : "fail.buzz",
    text: name ? (state.kind === "draw" ? `${name} is the fastest draw!` : `${name} has the best clock!`) : "Nobody made it!",
  });
}

function checkProgress(state: SdState, ctx: GameContext) {
  if (state.phase !== "draw" && state.phase !== "clock") return;
  const waiting = state.ids.filter((id) => !state.shots[id] && ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

export const showdown: GameDefinition<SdState> = {
  id: "showdown",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const state: SdState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds: ctx.options.rounds ?? 8,
      kind: "draw",
      target: null,
      fake: null,
      fakePending: false,
      clockStartedAt: null,
      shots: {},
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
        return startRound(state, ctx);
      case "ready":
        if (state.kind === "draw") return steady(state, ctx);
        state.phase = "clock";
        state.clockStartedAt = ctx.now();
        ctx.setDeadline(state.target! + CLOCK_GRACE_MS);
        ctx.emit({ kind: "go", sfx: "rocket.launch", haptic: 80 });
        return;
      case "steady":
        if (state.fakePending) {
          state.fakePending = false;
          state.phase = "fake";
          state.fake = ctx.pick(FAKES);
          ctx.setDeadline(FAKE_MS);
          ctx.emit({ kind: "fake", sfx: "ui.whoosh" });
          return;
        }
        state.phase = "draw";
        ctx.setDeadline(DRAW_WINDOW_MS);
        ctx.emit({ kind: "draw", sfx: "rocket.bail", text: "DRAW!", haptic: 120 });
        return;
      case "fake":
        return steady(state, ctx);
      case "draw":
      case "clock":
        return settle(state, ctx);
      case "result":
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
    if (!input || !state.ids.includes(playerId) || state.shots[playerId]) return;
    const ms = Number(input.ms);
    if (input.type === "early") {
      if (state.phase !== "steady" && state.phase !== "fake") return;
      state.shots[playerId] = { ms: null, foul: true };
      ctx.emit({ kind: "flinch", sfx: "fail.jinx", playerId, text: "Flinched!", to: [playerId], tv: false, haptic: [80, 40, 80] });
      return;
    }
    if (input.type === "shot") {
      if (state.phase !== "draw" || !Number.isFinite(ms)) return;
      state.shots[playerId] = ms < SD_MIN_REACTION_MS ? { ms: null, foul: true } : { ms: Math.round(Math.min(ms, DRAW_WINDOW_MS)), foul: false };
      ctx.emit({ kind: "shot", sfx: "chip.place", playerId });
      return checkProgress(state, ctx);
    }
    if (input.type === "stop") {
      if (state.phase !== "clock" || !Number.isFinite(ms) || ms < 0) return;
      state.shots[playerId] = { ms: Math.round(Math.min(ms, state.target! + CLOCK_GRACE_MS)), foul: false };
      ctx.emit({ kind: "stopped", sfx: "ui.tick", playerId });
      return checkProgress(state, ctx);
    }
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): SdTv {
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      kind: state.kind,
      final: isFinal(state),
      target: state.target,
      fake: state.phase === "fake" ? state.fake : null,
      clockStartedAt: state.clockStartedAt,
      doneIds: Object.keys(state.shots),
      results: state.phase === "result" ? state.results : [],
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, _ctx, playerId): SdPlayer {
    const mine = state.phase === "result" ? state.results.find((r) => r.playerId === playerId) ?? null : null;
    const shot = state.shots[playerId];
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      kind: state.kind,
      final: isFinal(state),
      target: state.target,
      fake: state.phase === "fake" ? state.fake : null,
      done: Boolean(shot),
      mine: mine ?? (shot ? { playerId, ms: shot.ms, foul: shot.foul, diff: null, place: null, points: 0 } : null),
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
