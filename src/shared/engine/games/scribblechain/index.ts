// Scribble Chain — write it, draw it, lose it.
//
// Step 0 everyone writes an opening sentence for their own chain. On step s,
// chain c is handled by player (c + s) mod N, so every chain visits every
// player exactly once and nobody works on a chain twice in a row. Odd steps
// draw the previous sentence, even steps describe the previous drawing.
// Afterwards each chain replays on the TV and the room votes for its best
// moment (not your own); every vote is worth points to that entry's author.

import {
  SC_TEXT_MAX,
  SC_VOTE_POINTS,
  cleanText,
  sanitizeDrawing,
  type ScEntry,
  type ScEntryLabel,
  type ScPhase,
  type ScPlayer,
  type ScTask,
  type ScTv,
} from "@party/shared";
import { asRecord, drawFresh, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { PROMPTS } from "../doodlefraud/content";

const INTRO_MS = 7000;
const WRITE_MS = 40_000;
const DRAW_MS = 75_000;
const DESCRIBE_MS = 40_000;
const REVEAL_BASE_MS = 3000;
const REVEAL_PER_ENTRY_MS = 1600;
const VOTE_MS = 15_000;
const STANDINGS_MS = 5000;
const GRACE_MS = 1200;
const MISSING_TEXT = "…no idea…";

interface Chain {
  ownerId: string;
  entries: ScEntry[];
}

export interface ScState {
  players: GamePlayer[];
  ids: string[];
  phase: ScPhase;
  step: number;
  totalSteps: number;
  chains: Chain[];
  suggestions: Record<string, string>;
  submitted: Record<string, true>;
  chainIndex: number;
  votes: Record<string, number>;
  voteCounts: number[] | null;
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function taskFor(step: number): ScTask {
  return step === 0 ? "write" : step % 2 === 1 ? "draw" : "describe";
}

/** The chain this player works on during the current step. */
function chainOf(state: ScState, playerId: string): Chain | null {
  const i = state.ids.indexOf(playerId);
  if (i < 0) return null;
  const n = state.ids.length;
  return state.chains[(i - state.step + n * 8) % n] ?? null;
}

function startStep(state: ScState, ctx: GameContext) {
  const task = taskFor(state.step);
  state.phase = task;
  state.submitted = {};
  ctx.setDeadline(ctx.timer(task === "draw" ? DRAW_MS : task === "write" ? WRITE_MS : DESCRIBE_MS));
  ctx.emit({
    kind: "step",
    sfx: state.step === 0 ? "round.start" : "ui.whoosh",
    text: task === "write" ? "Write a silly sentence!" : task === "draw" ? "Draw what you're handed!" : "What on earth is this drawing?",
    haptic: 60,
  });
}

/** Fills in anything missing when a step's timer runs out, then moves on. */
function finishStep(state: ScState, ctx: GameContext) {
  const task = taskFor(state.step);
  for (const id of state.ids) {
    const chain = chainOf(state, id)!;
    if (chain.entries.length > state.step) continue;
    if (task === "draw") chain.entries.push({ kind: "drawing", authorId: id, strokes: [] });
    else chain.entries.push({ kind: "text", authorId: id, text: task === "write" ? state.suggestions[id]! : MISSING_TEXT });
  }
  if (state.step + 1 < state.totalSteps) {
    state.step++;
    return startStep(state, ctx);
  }
  state.chainIndex = 0;
  startReveal(state, ctx);
}

function startReveal(state: ScState, ctx: GameContext) {
  state.phase = "reveal";
  state.votes = {};
  state.voteCounts = null;
  state.gained = {};
  const chain = state.chains[state.chainIndex]!;
  ctx.setDeadline(REVEAL_BASE_MS + chain.entries.length * REVEAL_PER_ENTRY_MS);
  ctx.emit({ kind: "reveal", sfx: "reveal.drumroll", text: `Chain ${state.chainIndex + 1} of ${state.chains.length}` });
}

function closeVotes(state: ScState, ctx: GameContext) {
  const chain = state.chains[state.chainIndex]!;
  state.voteCounts = chain.entries.map(() => 0);
  for (const index of Object.values(state.votes)) {
    state.voteCounts[index]! += 1;
    const author = chain.entries[index]!.authorId;
    state.scores[author] = (state.scores[author] ?? 0) + SC_VOTE_POINTS;
    state.gained[author] = (state.gained[author] ?? 0) + SC_VOTE_POINTS;
  }
  state.phase = "standings";
  ctx.setDeadline(STANDINGS_MS);
  ctx.emit({ kind: "standings", sfx: "scores.tally" });
}

function pending(state: ScState): string[] {
  if (state.phase === "write" || state.phase === "draw" || state.phase === "describe") return state.ids.filter((id) => !state.submitted[id]);
  if (state.phase === "vote") {
    const chain = state.chains[state.chainIndex]!;
    // Only players with something to vote for (not just their own entries).
    return state.ids.filter((id) => state.votes[id] === undefined && chain.entries.some((e) => e.authorId !== id));
  }
  return [];
}

function checkProgress(state: ScState, ctx: GameContext) {
  if (!["write", "draw", "describe", "vote"].includes(state.phase)) return;
  const waiting = pending(state).filter((id) => ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

function labelsOf(entries: ScEntry[]): ScEntryLabel[] {
  return entries.map((e, index) => ({ index, kind: e.kind, authorId: e.authorId, text: e.kind === "text" ? e.text : null }));
}

export const scribblechain: GameDefinition<ScState> = {
  id: "scribblechain",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const bank = ctx.settings.familyMode ? PROMPTS.filter((p) => !p.spicy) : PROMPTS;
    const openers = drawFresh(ctx, "sc:openers", bank, (p) => p.text, ids.length).map((p) => p.text);
    const steps = ctx.options.rounds && ctx.options.rounds > 0 ? Math.min(ctx.options.rounds, ids.length) : ids.length;
    const state: ScState = {
      players,
      ids,
      phase: "intro",
      step: 0,
      totalSteps: Math.max(2, steps),
      chains: ids.map((ownerId) => ({ ownerId, entries: [] })),
      suggestions: Object.fromEntries(ids.map((id, i) => [id, openers[i % openers.length]!])),
      submitted: {},
      chainIndex: 0,
      votes: {},
      voteCounts: null,
      scores: Object.fromEntries(ids.map((id) => [id, 0])),
      gained: {},
    };
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        return startStep(state, ctx);
      case "write":
      case "draw":
      case "describe":
        return finishStep(state, ctx);
      case "reveal":
        state.phase = "vote";
        ctx.setDeadline(ctx.timer(VOTE_MS));
        ctx.emit({ kind: "vote", sfx: "ui.pop", text: "Vote for the best moment!", haptic: 50 });
        return checkProgress(state, ctx);
      case "vote":
        return closeVotes(state, ctx);
      case "standings":
        if (state.chainIndex + 1 < state.chains.length) {
          state.chainIndex++;
          return startReveal(state, ctx);
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
    if (input.type === "vote") {
      if (state.phase !== "vote" || state.votes[playerId] !== undefined) return;
      const entries = state.chains[state.chainIndex]!.entries;
      const index = Number(input.index);
      if (!Number.isInteger(index) || index < 0 || index >= entries.length || entries[index]!.authorId === playerId) return;
      state.votes[playerId] = index;
      ctx.emit({ kind: "voted", sfx: "ui.tick", playerId });
      return checkProgress(state, ctx);
    }
    const task = taskFor(state.step);
    if (state.phase !== task || state.submitted[playerId]) return;
    const chain = chainOf(state, playerId)!;
    if (input.type === "drawing" && task === "draw") {
      const strokes = sanitizeDrawing(input.strokes);
      if (!strokes) return;
      chain.entries.push({ kind: "drawing", authorId: playerId, strokes });
    } else if (input.type === "text" && task !== "draw") {
      const text = cleanText(input.text, SC_TEXT_MAX);
      if (!text) return;
      chain.entries.push({ kind: "text", authorId: playerId, text });
    } else {
      return;
    }
    state.submitted[playerId] = true;
    ctx.emit({ kind: "submitted", sfx: "ui.tick", playerId });
    checkProgress(state, ctx);
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): ScTv {
    const replaying = ["reveal", "vote", "standings"].includes(state.phase) && state.chains.every((c) => c.entries.length >= state.totalSteps);
    const chain = replaying ? state.chains[state.chainIndex]! : null;
    const working = ["write", "draw", "describe"].includes(state.phase);
    const waiting = pending(state);
    return {
      phase: state.phase,
      step: state.step,
      totalSteps: state.totalSteps,
      chainIndex: state.chainIndex,
      totalChains: state.chains.length,
      doneIds: working || state.phase === "vote" ? state.ids.filter((id) => !waiting.includes(id)) : [],
      activeIds: working || state.phase === "vote" ? state.ids : [],
      chainOwnerId: chain?.ownerId ?? null,
      entries: chain?.entries ?? [],
      voteCounts: state.phase === "standings" ? state.voteCounts : null,
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, _ctx, playerId): ScPlayer {
    const working = state.phase === "write" || state.phase === "draw" || state.phase === "describe";
    const chain = working ? chainOf(state, playerId) : null;
    const previous = chain && state.step > 0 ? chain.entries[state.step - 1] : undefined;
    const voting = state.phase === "vote";
    return {
      phase: state.phase,
      step: state.step,
      totalSteps: state.totalSteps,
      task: working ? taskFor(state.step) : null,
      suggestion: state.phase === "write" ? state.suggestions[playerId] ?? null : null,
      prompt: state.phase === "draw" && previous?.kind === "text" ? previous.text : null,
      drawing: state.phase === "describe" && previous?.kind === "drawing" ? previous.strokes : null,
      submitted: Boolean(state.submitted[playerId]),
      chainIndex: state.chainIndex,
      totalChains: state.chains.length,
      labels: voting ? labelsOf(state.chains[state.chainIndex]!.entries) : [],
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
