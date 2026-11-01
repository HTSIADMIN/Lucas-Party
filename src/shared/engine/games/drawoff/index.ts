// Draw Off — one prompt, every interpretation.
//
// Each round everyone draws the same prompt. The gallery (shuffled, artists
// hidden) goes up on the TV; everyone votes for a favourite that isn't theirs.
// Every vote pays the artist; the single most-voted drawing earns a bonus.
// Players who didn't draw hand in a blank canvas but can still vote.

import {
  DO_FAVOURITE_BONUS,
  DO_VOTE_POINTS,
  sanitizeDrawing,
  type DoEntry,
  type DoPhase,
  type DoPlayer,
  type DoTv,
  type DrawStroke,
} from "@party/shared";
import { asRecord, drawFresh, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { PROMPTS } from "../doodlefraud/content";

const INTRO_MS = 7000;
const DRAW_MS = 60_000;
const GALLERY_MS = 25_000;
const REVEAL_MS = 9000;
const STANDINGS_MS = 4500;
const GRACE_MS = 1200;

export interface DoState {
  players: GamePlayer[];
  ids: string[];
  phase: DoPhase;
  round: number;
  totalRounds: number;
  prompts: string[];
  drawings: Record<string, DrawStroke[]>;
  entries: DoEntry[];
  votes: Record<string, number>;
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function award(state: DoState, playerId: string, points: number) {
  state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
  state.gained[playerId] = (state.gained[playerId] ?? 0) + points;
}

function numberOf(state: DoState, playerId: string): number | null {
  return state.entries.find((e) => e.playerId === playerId)?.number ?? null;
}

function pending(state: DoState): string[] {
  if (state.phase === "draw") return state.ids.filter((id) => !state.drawings[id]);
  if (state.phase === "gallery") return state.ids.filter((id) => state.votes[id] === undefined && state.entries.some((e) => e.playerId !== id));
  return [];
}

function checkProgress(state: DoState, ctx: GameContext) {
  if (state.phase !== "draw" && state.phase !== "gallery") return;
  const waiting = pending(state).filter((id) => ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

function startDraw(state: DoState, ctx: GameContext) {
  state.phase = "draw";
  state.drawings = {};
  state.entries = [];
  state.votes = {};
  state.gained = {};
  ctx.setDeadline(ctx.timer(DRAW_MS));
  ctx.emit({ kind: "draw", sfx: state.round === state.totalRounds ? "round.final" : "round.start", text: `Draw: ${state.prompts[state.round - 1]}`, haptic: 60 });
}

function openGallery(state: DoState, ctx: GameContext) {
  for (const id of state.ids) state.drawings[id] ??= [];
  state.entries = ctx.shuffle(state.ids).map((playerId, i) => ({ number: i + 1, playerId, strokes: state.drawings[playerId]!, votes: null }));
  state.phase = "gallery";
  ctx.setDeadline(ctx.timer(GALLERY_MS));
  ctx.emit({ kind: "gallery", sfx: "ui.whoosh", text: "Vote for your favourite!", haptic: 50 });
}

function reveal(state: DoState, ctx: GameContext) {
  for (const e of state.entries) e.votes = 0;
  for (const n of Object.values(state.votes)) {
    const e = state.entries.find((x) => x.number === n);
    if (!e) continue;
    e.votes! += 1;
    award(state, e.playerId, DO_VOTE_POINTS);
  }
  const top = Math.max(0, ...state.entries.map((e) => e.votes ?? 0));
  const favourites = state.entries.filter((e) => top > 0 && e.votes === top);
  if (favourites.length === 1) award(state, favourites[0]!.playerId, DO_FAVOURITE_BONUS);
  state.phase = "reveal";
  ctx.setDeadline(REVEAL_MS);
  ctx.emit({ kind: "reveal", sfx: "win.zinger" });
}

export const drawoff: GameDefinition<DoState> = {
  id: "drawoff",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const totalRounds = ctx.options.rounds ?? 3;
    const bank = ctx.settings.familyMode ? PROMPTS.filter((p) => !p.spicy) : PROMPTS;
    const state: DoState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds,
      prompts: drawFresh(ctx, "do:prompts", bank, (p) => p.text, totalRounds).map((p) => p.text),
      drawings: {},
      entries: [],
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
        return startDraw(state, ctx);
      case "draw":
        return openGallery(state, ctx);
      case "gallery":
        return reveal(state, ctx);
      case "reveal":
        state.phase = "standings";
        ctx.setDeadline(STANDINGS_MS);
        ctx.emit({ kind: "standings", sfx: "scores.tally" });
        return;
      case "standings":
        if (state.round < state.totalRounds) {
          state.round++;
          return startDraw(state, ctx);
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
    if (input.type === "drawing") {
      if (state.phase !== "draw" || state.drawings[playerId]) return;
      const strokes = sanitizeDrawing(input.strokes);
      if (!strokes) return;
      state.drawings[playerId] = strokes;
      ctx.emit({ kind: "drew", sfx: "ui.tick", playerId });
      return checkProgress(state, ctx);
    }
    if (input.type === "vote") {
      if (state.phase !== "gallery" || state.votes[playerId] !== undefined) return;
      const n = Number(input.number);
      const entry = state.entries.find((e) => e.number === n);
      if (!entry || entry.playerId === playerId) return;
      state.votes[playerId] = n;
      ctx.emit({ kind: "voted", sfx: "ui.tick", playerId });
      return checkProgress(state, ctx);
    }
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): DoTv {
    const showing = ["gallery", "reveal", "standings"].includes(state.phase);
    const revealed = state.phase === "reveal" || state.phase === "standings";
    const waiting = pending(state);
    const active = state.phase === "draw" || state.phase === "gallery" ? state.ids : [];
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      prompt: state.phase === "intro" || state.phase === "podium" ? null : state.prompts[state.round - 1] ?? null,
      doneIds: active.filter((id) => !waiting.includes(id)),
      activeIds: active,
      // Artists stay anonymous until the reveal, so the gallery vote is about the art.
      entries: showing ? state.entries.map((e) => ({ ...e, playerId: revealed ? e.playerId : "" })) : [],
      showArtists: revealed,
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, _ctx, playerId): DoPlayer {
    const mine = numberOf(state, playerId);
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      prompt: state.phase === "intro" || state.phase === "podium" ? null : state.prompts[state.round - 1] ?? null,
      submitted: Boolean(state.drawings[playerId]),
      choices: state.phase === "gallery" ? state.entries.filter((e) => e.playerId !== playerId).map((e) => e.number) : [],
      myNumber: state.phase === "gallery" || state.phase === "reveal" ? mine : null,
      myVote: state.votes[playerId] ?? null,
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
