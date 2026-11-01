// Fib Factory (friends edition) — find the truth about your friends.
//
// Each round a different player is in the spotlight. They answer a question
// about themselves truthfully while everyone else writes a lie that sounds
// like them. The truth is shuffled in with the lies (matching lies merge) and
// everyone but the spotlight player picks what they think is true. Finding
// the truth pays you and the spotlight player; fooling someone pays the liar.
// No truth in time and the round is skipped.

import {
  FIB_ANSWER_MAX,
  FIB_FOOL_POINTS,
  FIB_KNOWN_POINTS,
  FIB_TRUTH_POINTS,
  cleanText,
  textKey,
  type FibOption,
  type FibPhase,
  type FibPlayer,
  type FibTv,
} from "@party/shared";
import { asRecord, drawFresh, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { QUESTIONS } from "./content";

const INTRO_MS = 7000;
const WRITE_MS = 45_000;
const PICK_MS = 25_000;
const REVEAL_MS = 10_000;
const SKIPPED_MS = 4000;
const STANDINGS_MS = 4500;
const GRACE_MS = 1200;

interface LineupOption extends FibOption {
  truth: boolean;
  authorIds: string[];
}

export interface FibState {
  players: GamePlayer[];
  ids: string[];
  phase: FibPhase;
  round: number;
  totalRounds: number;
  order: string[];
  questions: string[];
  subjectId: string;
  answers: Record<string, string>;
  options: LineupOption[];
  picks: Record<string, string>;
  skipped: boolean;
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function award(state: FibState, playerId: string, points: number) {
  state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
  state.gained[playerId] = (state.gained[playerId] ?? 0) + points;
}

function tooClose(a: string, b: string): boolean {
  const ka = textKey(a);
  const kb = textKey(b);
  return ka === kb || (ka.length >= 5 && kb.includes(ka)) || (kb.length >= 5 && ka.includes(kb));
}

function pending(state: FibState): string[] {
  if (state.phase === "write") return state.ids.filter((id) => state.answers[id] === undefined);
  if (state.phase === "pick") return state.ids.filter((id) => id !== state.subjectId && state.picks[id] === undefined);
  return [];
}

function checkProgress(state: FibState, ctx: GameContext) {
  if (state.phase !== "write" && state.phase !== "pick") return;
  const waiting = pending(state).filter((id) => ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

function startRound(state: FibState, ctx: GameContext) {
  const planned = (state.round - 1) % state.order.length;
  const rotation = [...state.order.slice(planned), ...state.order.slice(0, planned)];
  state.subjectId = rotation.find((id) => ctx.isConnected(id)) ?? rotation[0]!;
  state.answers = {};
  state.options = [];
  state.picks = {};
  state.skipped = false;
  state.gained = {};
  state.phase = "write";
  ctx.setDeadline(ctx.timer(WRITE_MS));
  ctx.emit({ kind: "round", sfx: state.round === state.totalRounds ? "round.final" : "round.start", text: `Round ${state.round}`, haptic: 60 });
  ctx.emit({ kind: "spotlight", sfx: "ui.pop", text: "You're in the spotlight — tell the truth!", to: [state.subjectId], tv: false, haptic: [60, 40, 60] });
}

function startPicks(state: FibState, ctx: GameContext) {
  const truth = state.answers[state.subjectId];
  if (truth === undefined) {
    state.skipped = true;
    state.phase = "reveal";
    ctx.setDeadline(SKIPPED_MS);
    ctx.emit({ kind: "skipped", sfx: "fail.buzz", text: "No truth, no round!" });
    return;
  }
  const lineup: LineupOption[] = [{ key: "", text: truth, truth: true, authorIds: [] }];
  for (const [playerId, text] of Object.entries(state.answers)) {
    if (playerId === state.subjectId) continue;
    // Wrote the truth before it was in? Mind reader: a small bonus, and the lie is dropped.
    if (tooClose(text, truth)) {
      award(state, playerId, FIB_FOOL_POINTS);
      ctx.emit({ kind: "mindReader", text: `Your "lie" was the truth! +${FIB_FOOL_POINTS}`, to: [playerId], tv: false, haptic: 60 });
      continue;
    }
    const same = lineup.find((o) => !o.truth && textKey(o.text) === textKey(text));
    if (same) same.authorIds.push(playerId);
    else lineup.push({ key: "", text, truth: false, authorIds: [playerId] });
  }
  state.options = ctx.shuffle(lineup).map((o, i) => ({ ...o, key: `o${i}` }));
  state.phase = "pick";
  ctx.setDeadline(ctx.timer(PICK_MS));
  ctx.emit({ kind: "pick", sfx: "ui.whoosh", haptic: 50 });
}

function reveal(state: FibState, ctx: GameContext) {
  for (const [picker, key] of Object.entries(state.picks)) {
    const option = state.options.find((o) => o.key === key);
    if (!option) continue;
    if (option.truth) {
      award(state, picker, FIB_TRUTH_POINTS);
      award(state, state.subjectId, FIB_KNOWN_POINTS);
    } else {
      for (const author of option.authorIds) award(state, author, FIB_FOOL_POINTS);
    }
  }
  state.phase = "reveal";
  ctx.setDeadline(REVEAL_MS);
  ctx.emit({ kind: "reveal", sfx: "reveal.drumroll" });
}

export const fibfactory: GameDefinition<FibState> = {
  id: "fibfactory",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const rounds = ctx.options.rounds ?? 0;
    const totalRounds = rounds > 0 ? rounds : ids.length;
    const bank = ctx.settings.familyMode ? QUESTIONS.filter((q) => !q.spicy) : QUESTIONS;
    const state: FibState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds,
      order: ctx.shuffle(ids),
      questions: drawFresh(ctx, "fib:questions", bank, (q) => q.text, totalRounds).map((q) => q.text),
      subjectId: ids[0]!,
      answers: {},
      options: [],
      picks: {},
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
      case "write":
        return startPicks(state, ctx);
      case "pick":
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
    if (input.type === "answer") {
      if (state.phase !== "write" || state.answers[playerId] !== undefined) return;
      const text = cleanText(input.text, FIB_ANSWER_MAX);
      if (!text || !textKey(text)) return;
      const truth = state.answers[state.subjectId];
      if (playerId !== state.subjectId && truth !== undefined && tooClose(text, truth)) {
        ctx.emit({ kind: "tooClose", text: "Spooky — that's basically the truth! Write a lie instead.", to: [playerId], tv: false, haptic: [80, 40, 80] });
        return;
      }
      state.answers[playerId] = text;
      ctx.emit({ kind: "answered", sfx: "ui.tick", playerId });
      return checkProgress(state, ctx);
    }
    if (input.type === "pick") {
      if (state.phase !== "pick" || playerId === state.subjectId || state.picks[playerId] !== undefined) return;
      const option = state.options.find((o) => o.key === input.key);
      if (!option || option.authorIds.includes(playerId)) return;
      state.picks[playerId] = option.key;
      ctx.emit({ kind: "picked", sfx: "ui.tick", playerId });
      return checkProgress(state, ctx);
    }
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): FibTv {
    const playing = state.phase !== "intro" && state.phase !== "podium";
    const revealed = (state.phase === "reveal" || state.phase === "standings") && !state.skipped;
    const waiting = pending(state);
    const active = state.phase === "write" ? state.ids : state.phase === "pick" ? state.ids.filter((id) => id !== state.subjectId) : [];
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      subjectId: playing ? state.subjectId : null,
      question: playing ? state.questions[state.round - 1] ?? null : null,
      doneIds: active.filter((id) => !waiting.includes(id)),
      activeIds: active,
      options: state.phase === "pick" ? state.options.map(({ key, text }) => ({ key, text })) : [],
      reveal: revealed
        ? state.options.map((o) => ({
            key: o.key,
            text: o.text,
            truth: o.truth,
            authorIds: o.authorIds,
            pickerIds: Object.entries(state.picks).filter(([, k]) => k === o.key).map(([id]) => id),
          }))
        : [],
      skipped: state.skipped,
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, _ctx, playerId): FibPlayer {
    const playing = state.phase !== "intro" && state.phase !== "podium";
    const revealed = (state.phase === "reveal" || state.phase === "standings") && !state.skipped;
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      subjectId: playing ? state.subjectId : null,
      isSubject: playing && state.subjectId === playerId,
      question: playing ? state.questions[state.round - 1] ?? null : null,
      myAnswer: state.answers[playerId] ?? null,
      options: state.phase === "pick" ? state.options.filter((o) => !o.authorIds.includes(playerId)).map(({ key, text }) => ({ key, text })) : [],
      myPick: state.picks[playerId] ?? null,
      truth: revealed ? state.answers[state.subjectId] ?? null : null,
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
