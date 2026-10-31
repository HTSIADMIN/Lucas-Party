// Dial It In — read the psychic's mind.
//
// Each round a different player is the psychic. They see a spectrum card and a
// secret target on a 0–100 dial and type a one-line clue. Everyone else locks
// in a guess on their phone. Guesses pay by distance (bullseye 100, close 60,
// warm 30); the psychic earns the average of the guessers' points. No clue in
// time and the round is skipped.

import {
  DIAL_CLUE_MAX,
  cleanText,
  dialPoints,
  type DialCard,
  type DialPhase,
  type DialPlayer,
  type DialTv,
} from "@party/shared";
import { asRecord, drawFresh, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { CARDS } from "./content";

const INTRO_MS = 7000;
const CLUE_MS = 50_000;
const GUESS_MS = 35_000;
const REVEAL_MS = 9000;
const SKIPPED_MS = 4500;
const STANDINGS_MS = 5000;
const GRACE_MS = 900;
/** Targets stay off the very edges so every scoring band fits on the dial. */
const TARGET_MIN = 4;
const TARGET_MAX = 96;

export interface DialState {
  players: GamePlayer[];
  ids: string[];
  phase: DialPhase;
  round: number;
  totalRounds: number;
  /** Psychic rotation. */
  order: string[];
  cards: DialCard[];
  psychicId: string;
  target: number;
  clue: string | null;
  guesses: Record<string, number>;
  points: Record<string, number>;
  psychicPoints: number;
  skipped: boolean;
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function award(state: DialState, playerId: string, points: number) {
  state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
  state.gained[playerId] = (state.gained[playerId] ?? 0) + points;
}

function guessers(state: DialState): string[] {
  return state.ids.filter((id) => id !== state.psychicId);
}

function startRound(state: DialState, ctx: GameContext) {
  // Next in the rotation who's actually here; fall back to the planned one.
  const planned = (state.round - 1) % state.order.length;
  const rotation = [...state.order.slice(planned), ...state.order.slice(0, planned)];
  state.psychicId = rotation.find((id) => ctx.isConnected(id)) ?? rotation[0]!;
  state.target = ctx.randomInt(TARGET_MIN, TARGET_MAX + 1);
  state.clue = null;
  state.guesses = {};
  state.points = {};
  state.psychicPoints = 0;
  state.skipped = false;
  state.gained = {};
  state.phase = "clue";
  ctx.setDeadline(ctx.timer(CLUE_MS));
  ctx.emit({ kind: "round", sfx: state.round === state.totalRounds ? "round.final" : "round.start", text: `Round ${state.round}`, haptic: 60 });
  ctx.emit({ kind: "psychic", sfx: "ui.pop", playerId: state.psychicId, text: "You're the psychic!", to: [state.psychicId], tv: false, haptic: [60, 40, 60] });
}

function startGuessing(state: DialState, ctx: GameContext) {
  state.phase = "guess";
  ctx.setDeadline(ctx.timer(GUESS_MS));
  ctx.emit({ kind: "clue", sfx: "ui.whoosh", text: state.clue ?? undefined, haptic: 50 });
}

function reveal(state: DialState, ctx: GameContext) {
  const scored = Object.entries(state.guesses);
  for (const [id, value] of scored) {
    state.points[id] = dialPoints(value, state.target);
    award(state, id, state.points[id]!);
  }
  const total = scored.reduce((sum, [id]) => sum + state.points[id]!, 0);
  state.psychicPoints = scored.length ? Math.round(total / scored.length / 5) * 5 : 0;
  award(state, state.psychicId, state.psychicPoints);
  state.phase = "reveal";
  ctx.setDeadline(REVEAL_MS);
  const bullseye = scored.some(([id]) => state.points[id] === 100);
  ctx.emit({ kind: "reveal", sfx: bullseye ? "win.zinger" : "reveal.votes", text: bullseye ? "Bullseye!" : undefined });
}

function skip(state: DialState, ctx: GameContext) {
  state.skipped = true;
  state.phase = "reveal";
  ctx.setDeadline(SKIPPED_MS);
  ctx.emit({ kind: "skipped", sfx: "fail.buzz", text: "The psychic went quiet — round skipped" });
}

function checkProgress(state: DialState, ctx: GameContext) {
  if (state.phase !== "guess") return;
  const waiting = guessers(state).filter((id) => state.guesses[id] === undefined && ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

const REVEALED: DialPhase[] = ["reveal", "standings", "podium"];

export const dial: GameDefinition<DialState> = {
  id: "dial",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const rounds = ctx.options.rounds ?? 0;
    const totalRounds = rounds > 0 ? rounds : ids.length;
    const bank = ctx.settings.familyMode ? CARDS.filter((c) => !c.spicy) : CARDS;
    const state: DialState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds,
      order: ctx.shuffle(ids),
      cards: drawFresh(ctx, "dial:cards", bank, (c) => `${c.left}|${c.right}`, totalRounds).map((c) => ({ left: c.left, right: c.right })),
      psychicId: ids[0]!,
      target: 50,
      clue: null,
      guesses: {},
      points: {},
      psychicPoints: 0,
      skipped: false,
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
      case "clue":
        return skip(state, ctx);
      case "guess":
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
    if (input.type === "clue") {
      if (state.phase !== "clue" || playerId !== state.psychicId) return;
      const text = cleanText(input.text, DIAL_CLUE_MAX);
      if (!text) return;
      state.clue = text;
      return startGuessing(state, ctx);
    }
    if (input.type === "guess") {
      if (state.phase !== "guess" || playerId === state.psychicId || state.guesses[playerId] !== undefined) return;
      const value = Number(input.value);
      if (!Number.isFinite(value)) return;
      state.guesses[playerId] = Math.round(Math.min(100, Math.max(0, value)));
      ctx.emit({ kind: "locked", sfx: "ui.tick", playerId });
      return checkProgress(state, ctx);
    }
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): DialTv {
    const revealed = REVEALED.includes(state.phase) && !state.skipped;
    const playing = state.phase !== "intro";
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      psychicId: playing ? state.psychicId : null,
      card: playing ? state.cards[state.round - 1] ?? null : null,
      clue: state.clue,
      guesserIds: playing ? guessers(state) : [],
      lockedIds: Object.keys(state.guesses),
      target: REVEALED.includes(state.phase) ? state.target : null,
      guesses: revealed ? Object.entries(state.guesses).map(([playerId, value]) => ({ playerId, value, points: state.points[playerId] ?? 0 })) : [],
      psychicPoints: revealed ? state.psychicPoints : 0,
      skipped: state.skipped,
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, _ctx, playerId): DialPlayer {
    const playing = state.phase !== "intro";
    const isPsychic = playing && playerId === state.psychicId;
    const revealed = REVEALED.includes(state.phase);
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      isPsychic,
      psychicId: playing ? state.psychicId : null,
      card: playing ? state.cards[state.round - 1] ?? null : null,
      clue: state.clue,
      target: isPsychic || revealed ? state.target : null,
      myGuess: state.guesses[playerId] ?? null,
      myPoints: revealed && !state.skipped ? (isPsychic ? state.psychicPoints : state.points[playerId] ?? null) : null,
      psychicPoints: revealed && !state.skipped ? state.psychicPoints : 0,
      skipped: state.skipped,
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
