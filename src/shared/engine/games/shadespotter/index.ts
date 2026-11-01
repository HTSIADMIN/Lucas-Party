// Shade Spotter — name that shade.
//
// A big grid of colours fills the TV. Each round a different player is the
// cue-giver: their phone shows a secret cell and they describe it in one
// word. Everyone else taps the shade they think it is. The first picks then go
// up on the TV, the cue-giver adds a two-word cue to steer the room, and
// everyone picks again somewhere new. Every pick pays by how far it lands from
// the target — bullseye 100, next door 60, two away 30 — and the cue-giver
// earns 20 for each pick that lands next door or better. No first cue in time
// and the round is skipped; no second cue and only the first picks count.

import {
  SHADE_CELLS,
  SHADE_CUE_GIVER_RANGE,
  cleanText,
  isShadeCell,
  shadeCueGiverPoints,
  shadeCueProblem,
  shadeDistance,
  shadePoints,
  type ShadePhase,
  type ShadePick,
  type ShadePlayer,
  type ShadeStep,
  type ShadeTv,
} from "@party/shared";
import { asRecord, drawFresh, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";

const INTRO_MS = 7000;
const CUE_MS = 45_000;
const GUESS_MS = 30_000;
const REVEAL_MS = 11_000;
const SKIPPED_MS = 5000;
const STANDINGS_MS = 5000;
const GRACE_MS = 900;
/** A cue-giver whose phone drops mid-cue gets this long to come back before we move on. */
const AWAY_MS = 8000;
/** Raw cue text is trimmed to this before the word rules apply. */
const CUE_INPUT_MAX = 80;

const ALL_CELLS = Array.from({ length: SHADE_CELLS }, (_, i) => i);
const REVEALED: ShadePhase[] = ["reveal", "standings", "podium"];

export interface ShadeState {
  players: GamePlayer[];
  ids: string[];
  phase: ShadePhase;
  round: number;
  totalRounds: number;
  /** Seating order the cue-giver role travels round. */
  order: string[];
  /** Rounds each player has been the cue-giver. */
  turns: Record<string, number>;
  /** One secret cell per round, drawn up front. */
  targets: number[];
  cueGiverId: string;
  target: number;
  cues: string[];
  /** playerId → cell for each step. */
  firstPicks: Record<string, number>;
  secondPicks: Record<string, number>;
  /** This round's points per guesser, both picks together. */
  points: Record<string, number>;
  cueGiverPoints: number;
  skipped: boolean;
  noSecondCue: boolean;
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function award(state: ShadeState, playerId: string, points: number) {
  state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
  state.gained[playerId] = (state.gained[playerId] ?? 0) + points;
}

function guessers(state: ShadeState): string[] {
  return state.ids.filter((id) => id !== state.cueGiverId);
}

/** Which pick the guessers owe right now, if any. */
function pickStep(state: ShadeState): ShadeStep | null {
  return state.phase === "guess1" ? 1 : state.phase === "guess2" ? 2 : null;
}

function picksFor(state: ShadeState, step: ShadeStep): Record<string, number> {
  return step === 1 ? state.firstPicks : state.secondPicks;
}

/**
 * Fewest turns first, walking the seating order on from the last cue-giver —
 * so everyone goes once before anyone goes twice, and a player who was away
 * on their turn gets it when they're back.
 */
function nextCueGiver(state: ShadeState, ctx: GameContext): string {
  const here = state.order.filter((id) => ctx.isConnected(id));
  const pool = here.length > 0 ? here : state.order;
  const fewest = Math.min(...pool.map((id) => state.turns[id] ?? 0));
  const start = state.order.indexOf(state.cueGiverId) + 1;
  for (let i = 0; i < state.order.length; i++) {
    const id = state.order[(start + i) % state.order.length]!;
    if (pool.includes(id) && (state.turns[id] ?? 0) === fewest) return id;
  }
  return pool[0]!;
}

/** Gives a cue-giver who isn't connected a short window instead of the full timer. */
function hurryIfAway(state: ShadeState, ctx: GameContext) {
  if (!ctx.isConnected(state.cueGiverId) && ctx.deadline !== null && ctx.deadline - ctx.now() > AWAY_MS) ctx.setDeadline(AWAY_MS);
}

function startRound(state: ShadeState, ctx: GameContext) {
  state.cueGiverId = nextCueGiver(state, ctx);
  state.turns[state.cueGiverId] = (state.turns[state.cueGiverId] ?? 0) + 1;
  state.target = state.targets[state.round - 1] ?? ctx.randomInt(0, SHADE_CELLS);
  state.cues = [];
  state.firstPicks = {};
  state.secondPicks = {};
  state.points = {};
  state.cueGiverPoints = 0;
  state.skipped = false;
  state.noSecondCue = false;
  state.gained = {};
  state.phase = "cue1";
  ctx.setDeadline(ctx.timer(CUE_MS));
  ctx.emit({ kind: "round", sfx: state.round === state.totalRounds ? "round.final" : "round.start", text: `Round ${state.round}`, haptic: 60 });
  ctx.emit({ kind: "cueGiver", sfx: "ui.pop", playerId: state.cueGiverId, text: "You're the cue-giver!", to: [state.cueGiverId], tv: false, haptic: [60, 40, 60] });
  hurryIfAway(state, ctx);
}

function giveCue(state: ShadeState, ctx: GameContext, cue: string) {
  state.cues.push(cue);
  state.phase = state.cues.length === 1 ? "guess1" : "guess2";
  ctx.setDeadline(ctx.timer(GUESS_MS));
  ctx.emit({ kind: "cue", sfx: "ui.whoosh", text: cue, haptic: 50 });
  checkProgress(state, ctx);
}

/** First picks go up on the TV while the cue-giver works on a two-word cue. */
function startSecondCue(state: ShadeState, ctx: GameContext) {
  state.phase = "cue2";
  ctx.setDeadline(ctx.timer(CUE_MS));
  ctx.emit({ kind: "firstPicks", sfx: "reveal.votes" });
  ctx.emit({ kind: "cueAgain", sfx: "ui.pop", playerId: state.cueGiverId, text: "Now steer them with up to two words!", to: [state.cueGiverId], tv: false, haptic: [60, 40, 60] });
  hurryIfAway(state, ctx);
}

function reveal(state: ShadeState, ctx: GameContext) {
  let close = 0;
  let bullseye = false;
  for (const picks of [state.firstPicks, state.secondPicks]) {
    for (const [id, cell] of Object.entries(picks)) {
      const points = shadePoints(cell, state.target);
      state.points[id] = (state.points[id] ?? 0) + points;
      if (shadeDistance(cell, state.target) <= SHADE_CUE_GIVER_RANGE) close++;
      if (points === 100) bullseye = true;
    }
  }
  for (const [id, points] of Object.entries(state.points)) award(state, id, points);
  state.cueGiverPoints = shadeCueGiverPoints(close);
  award(state, state.cueGiverId, state.cueGiverPoints);
  state.phase = "reveal";
  ctx.setDeadline(REVEAL_MS);
  ctx.emit({ kind: "reveal", sfx: bullseye ? "win.zinger" : "reveal.votes", text: bullseye ? "Bullseye!" : undefined });
}

function skip(state: ShadeState, ctx: GameContext) {
  state.skipped = true;
  state.phase = "reveal";
  ctx.setDeadline(SKIPPED_MS);
  ctx.emit({ kind: "skipped", sfx: "fail.buzz", text: "No cue in time — round skipped" });
}

function checkProgress(state: ShadeState, ctx: GameContext) {
  const step = pickStep(state);
  if (!step) return;
  const picks = picksFor(state, step);
  const waiting = guessers(state).filter((id) => picks[id] === undefined && ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

/** What the whole room may see: first picks once the second cue is under way, every pick at the reveal. */
function publicPicks(state: ShadeState): ShadePick[] {
  const revealing = state.phase === "reveal" && !state.skipped;
  if (!revealing && state.phase !== "cue2" && state.phase !== "guess2") return [];
  const list: ShadePick[] = [];
  const steps: ShadeStep[] = revealing ? [1, 2] : [1];
  for (const step of steps) {
    for (const [playerId, cell] of Object.entries(picksFor(state, step))) {
      list.push({ playerId, step, cell, points: revealing ? shadePoints(cell, state.target) : 0 });
    }
  }
  return list;
}

export const shadespotter: GameDefinition<ShadeState> = {
  id: "shadespotter",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const rounds = ctx.options.rounds ?? 0;
    const totalRounds = rounds > 0 ? rounds : ids.length;
    const state: ShadeState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds,
      order: ctx.shuffle(ids),
      turns: {},
      targets: drawFresh(ctx, "shade:targets", ALL_CELLS, String, totalRounds),
      cueGiverId: "",
      target: 0,
      cues: [],
      firstPicks: {},
      secondPicks: {},
      points: {},
      cueGiverPoints: 0,
      skipped: false,
      noSecondCue: false,
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
      case "cue1":
        return skip(state, ctx);
      case "guess1":
        return startSecondCue(state, ctx);
      case "cue2":
        state.noSecondCue = true;
        ctx.emit({ kind: "noSecondCue", sfx: "fail.buzz", text: "No second cue — first picks only" });
        return reveal(state, ctx);
      case "guess2":
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
    if (input.type === "cue") {
      if ((state.phase !== "cue1" && state.phase !== "cue2") || playerId !== state.cueGiverId) return;
      const step: ShadeStep = state.phase === "cue1" ? 1 : 2;
      const cue = cleanText(input.text, CUE_INPUT_MAX);
      if (!cue) return;
      const problem = shadeCueProblem(cue, step);
      if (problem) {
        ctx.emit({ kind: "cueRejected", text: problem, to: [playerId], tv: false, haptic: [80, 40, 80] });
        return;
      }
      return giveCue(state, ctx, cue);
    }
    if (input.type === "pick") {
      const step = pickStep(state);
      if (!step || playerId === state.cueGiverId) return;
      const picks = picksFor(state, step);
      if (picks[playerId] !== undefined || !isShadeCell(input.cell)) return;
      // The second pick has to land somewhere new.
      if (step === 2 && state.firstPicks[playerId] === input.cell) return;
      picks[playerId] = input.cell;
      ctx.emit({ kind: "locked", sfx: "ui.tick", playerId });
      return checkProgress(state, ctx);
    }
  },

  onConnectionChange(state, ctx, playerId, connected) {
    if (!connected && playerId === state.cueGiverId && (state.phase === "cue1" || state.phase === "cue2")) return hurryIfAway(state, ctx);
    checkProgress(state, ctx);
  },

  tvView(state): ShadeTv {
    const playing = state.phase !== "intro";
    const step = pickStep(state);
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      cueGiverId: playing ? state.cueGiverId : null,
      cues: state.cues,
      guesserIds: playing ? guessers(state) : [],
      lockedIds: step ? Object.keys(picksFor(state, step)) : [],
      picks: publicPicks(state),
      target: REVEALED.includes(state.phase) ? state.target : null,
      cueGiverPoints: REVEALED.includes(state.phase) ? state.cueGiverPoints : 0,
      skipped: state.skipped,
      noSecondCue: state.noSecondCue,
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, _ctx, playerId): ShadePlayer {
    const playing = state.phase !== "intro";
    const isCueGiver = playing && playerId === state.cueGiverId;
    const revealed = REVEALED.includes(state.phase);
    const step = pickStep(state);
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      isCueGiver,
      cueGiverId: playing ? state.cueGiverId : null,
      cues: state.cues,
      target: isCueGiver || revealed ? state.target : null,
      myPicks: [state.firstPicks[playerId] ?? null, state.secondPicks[playerId] ?? null],
      canPick: step !== null && !isCueGiver && picksFor(state, step)[playerId] === undefined,
      picks: publicPicks(state),
      guesserIds: playing ? guessers(state) : [],
      lockedIds: step ? Object.keys(picksFor(state, step)) : [],
      myPoints: state.phase === "reveal" && !state.skipped ? (isCueGiver ? state.cueGiverPoints : state.points[playerId] ?? null) : null,
      cueGiverPoints: revealed ? state.cueGiverPoints : 0,
      skipped: state.skipped,
      noSecondCue: state.noSecondCue,
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
