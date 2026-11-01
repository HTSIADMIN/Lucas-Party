// Mash Bash — a board race powered by minigames.
//
// Each round picks the next minigame from a shuffled rotation (no repeats until
// all five have been played). Phones time and count everything locally and
// send one result. Finish places become spaces moved; landing on a boost or a
// slip space moves you three more or three back. First to the finish ends the
// game; otherwise the furthest player after the last round wins.

import {
  MB_BOOSTS,
  MB_FINISH,
  MB_MEMORY_PADS,
  MB_MIN_REACTION_MS,
  MB_MOVES,
  MB_NO_SHOW_MOVE,
  MB_SLIPS,
  MB_SPACE_EFFECT,
  MB_TAP_MS,
  MB_UNIQUE_MAX,
  type MbGame,
  type MbMoveEvent,
  type MbPhase,
  type MbPlayer,
  type MbResultLine,
  type MbTv,
} from "@party/shared";
import { asRecord, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";

const INTRO_MS = 7000;
const READY_MS = 4500;
const TAP_GRACE_MS = 2500;
const STEADY_MIN_MS = 1800;
const STEADY_MAX_MS = 4500;
const DRAW_WINDOW_MS = 2500;
const CLOCK_MIN_MS = 4000;
const CLOCK_MAX_MS = 8000;
const CLOCK_GRACE_MS = 4000;
const UNIQUE_MS = 15_000;
const MEMORY_STEP_MS = 700;
const MEMORY_PLAY_MS = 15_000;
const RESULT_MS = 6500;
const BOARD_MS = 5000;
const GRACE_MS = 600;
const MAX_TAPS = 120;
const GAMES: MbGame[] = ["tap", "draw", "clock", "unique", "memory"];

type Entry =
  | { kind: "taps"; count: number }
  | { kind: "foul" }
  | { kind: "ms"; ms: number }
  | { kind: "pick"; value: number }
  | { kind: "memory"; correct: number; ms: number };

export interface MbState {
  players: GamePlayer[];
  ids: string[];
  phase: MbPhase;
  round: number;
  totalRounds: number;
  queue: MbGame[];
  game: MbGame;
  target: number | null;
  sequence: number[];
  startedAt: number | null;
  entries: Record<string, Entry>;
  results: MbResultLine[];
  positions: Record<string, number>;
  events: MbMoveEvent[];
  gained: Record<string, number>;
}

function nextGame(state: MbState, ctx: GameContext): MbGame {
  if (state.queue.length === 0) {
    const fresh = ctx.shuffle(GAMES);
    // Don't play the same minigame twice in a row across a reshuffle.
    if (fresh[0] === state.game) fresh.push(fresh.shift()!);
    state.queue = fresh;
  }
  return state.queue.shift()!;
}

function startRound(state: MbState, ctx: GameContext) {
  state.game = nextGame(state, ctx);
  state.target = state.game === "clock" ? Math.round(ctx.randomInt(CLOCK_MIN_MS, CLOCK_MAX_MS + 1) / 10) * 10 : null;
  const length = Math.min(7, 4 + Math.floor((state.round - 1) / 3));
  state.sequence = state.game === "memory" ? Array.from({ length }, () => ctx.randomInt(0, MB_MEMORY_PADS)) : [];
  state.startedAt = null;
  state.entries = {};
  state.results = [];
  state.events = [];
  state.gained = {};
  state.phase = "ready";
  ctx.setDeadline(READY_MS);
  ctx.emit({ kind: "round", sfx: state.round === state.totalRounds ? "round.final" : "round.start", text: `Round ${state.round}`, haptic: 60 });
}

function openWindow(state: MbState, ctx: GameContext, phase: MbPhase, ms: number) {
  state.phase = phase;
  state.startedAt = ctx.now();
  ctx.setDeadline(ms);
}

function startPlay(state: MbState, ctx: GameContext) {
  switch (state.game) {
    case "tap":
      openWindow(state, ctx, "play", MB_TAP_MS + TAP_GRACE_MS);
      return ctx.emit({ kind: "go", sfx: "rocket.launch", text: "MASH!", haptic: 80 });
    case "draw":
      state.phase = "steady";
      return ctx.setDeadline(ctx.randomInt(STEADY_MIN_MS, STEADY_MAX_MS + 1));
    case "clock":
      openWindow(state, ctx, "play", state.target! + CLOCK_GRACE_MS);
      return ctx.emit({ kind: "go", sfx: "rocket.launch", haptic: 80 });
    case "unique":
      openWindow(state, ctx, "play", ctx.timer(UNIQUE_MS));
      return;
    case "memory":
      openWindow(state, ctx, "show", state.sequence.length * MEMORY_STEP_MS + 900);
      return;
  }
}

/** Ranks entries into places (ties share a place) and labels them. */
function rank(state: MbState): MbResultLine[] {
  const lines = new Map<string, MbResultLine>(state.ids.map((id) => [id, { playerId: id, label: "No show", place: null, move: MB_NO_SHOW_MOVE }]));
  const scored: { id: string; key: number[] }[] = [];
  for (const [id, e] of Object.entries(state.entries)) {
    const line = lines.get(id)!;
    switch (e.kind) {
      case "foul":
        line.label = "Flinched!";
        line.move = 0;
        break;
      case "taps":
        line.label = `${e.count} taps`;
        scored.push({ id, key: [-e.count] });
        break;
      case "ms":
        if (state.game === "clock") {
          const diff = Math.abs(e.ms - state.target!);
          line.label = `${(e.ms / 1000).toFixed(2)}s`;
          scored.push({ id, key: [diff] });
        } else {
          line.label = `${e.ms} ms`;
          scored.push({ id, key: [e.ms] });
        }
        break;
      case "pick":
        line.label = `Picked ${e.value}`;
        break;
      case "memory":
        line.label = `${e.correct}/${state.sequence.length}`;
        scored.push({ id, key: [-e.correct, e.ms] });
        break;
    }
  }
  if (state.game === "unique") {
    const picks = Object.entries(state.entries).filter((x): x is [string, Extract<Entry, { kind: "pick" }>] => x[1].kind === "pick");
    const counts = new Map<number, number>();
    for (const [, e] of picks) counts.set(e.value, (counts.get(e.value) ?? 0) + 1);
    const unique = [...new Set(picks.map(([, e]) => e.value).filter((v) => counts.get(v) === 1))].sort((a, b) => a - b);
    for (const [id, e] of picks) {
      const i = unique.indexOf(e.value);
      scored.push({ id, key: [i >= 0 ? i : unique.length] });
    }
  }
  scored.sort((a, b) => a.key[0]! - b.key[0]! || (a.key[1] ?? 0) - (b.key[1] ?? 0));
  scored.forEach((s, i) => {
    const prev = scored[i - 1];
    const tie = prev !== undefined && prev.key.every((k, j) => k === s.key[j]);
    const line = lines.get(s.id)!;
    line.place = prev !== undefined && tie ? lines.get(prev.id)!.place : i + 1;
    line.move = MB_MOVES[Math.min(line.place!, MB_MOVES.length) - 1]!;
  });
  return [...lines.values()].sort((a, b) => (a.place ?? 99) - (b.place ?? 99));
}

function settle(state: MbState, ctx: GameContext) {
  state.results = rank(state);
  state.events = [];
  for (const line of state.results) {
    const from = state.positions[line.playerId] ?? 0;
    let to = Math.min(MB_FINISH, from + line.move);
    if (line.move > 0 && MB_BOOSTS.includes(to)) {
      state.events.push({ playerId: line.playerId, kind: "boost", from: to, to: Math.min(MB_FINISH, to + MB_SPACE_EFFECT) });
      to = Math.min(MB_FINISH, to + MB_SPACE_EFFECT);
    } else if (line.move > 0 && MB_SLIPS.includes(to)) {
      state.events.push({ playerId: line.playerId, kind: "slip", from: to, to: Math.max(0, to - MB_SPACE_EFFECT) });
      to = Math.max(0, to - MB_SPACE_EFFECT);
    }
    state.gained[line.playerId] = to - from;
    state.positions[line.playerId] = to;
  }
  state.phase = "result";
  ctx.setDeadline(RESULT_MS);
  const winner = state.results.find((r) => r.place === 1);
  const name = winner ? state.players.find((p) => p.id === winner.playerId)?.name : null;
  ctx.emit({ kind: "result", sfx: winner ? "win.zinger" : "fail.buzz", text: name ? `${name} wins the round!` : "Nobody scored!" });
}

function checkProgress(state: MbState, ctx: GameContext) {
  if (state.phase !== "play" && state.phase !== "draw") return;
  const waiting = state.ids.filter((id) => !state.entries[id] && ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

export const mashbash: GameDefinition<MbState> = {
  id: "mashbash",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const state: MbState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds: ctx.options.rounds ?? 10,
      queue: [],
      game: "tap",
      target: null,
      sequence: [],
      startedAt: null,
      entries: {},
      results: [],
      positions: Object.fromEntries(ids.map((id) => [id, 0])),
      events: [],
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
        return startPlay(state, ctx);
      case "steady":
        openWindow(state, ctx, "draw", DRAW_WINDOW_MS);
        ctx.emit({ kind: "draw", sfx: "rocket.bail", text: "DRAW!", haptic: 120 });
        return;
      case "show":
        openWindow(state, ctx, "play", ctx.timer(MEMORY_PLAY_MS));
        ctx.emit({ kind: "go", sfx: "ui.pop", text: "Your turn — repeat it!", haptic: 60 });
        return;
      case "play":
      case "draw":
        return settle(state, ctx);
      case "result":
        state.phase = "board";
        ctx.setDeadline(BOARD_MS);
        ctx.emit({ kind: "board", sfx: state.events.length ? "ui.whoosh" : "scores.tally" });
        return;
      case "board": {
        const finished = state.ids.some((id) => (state.positions[id] ?? 0) >= MB_FINISH);
        if (!finished && state.round < state.totalRounds) {
          state.round++;
          return startRound(state, ctx);
        }
        state.phase = "podium";
        ctx.setDeadline(null);
        ctx.finish();
        ctx.emit({ kind: "podium", sfx: "win.big" });
        return;
      }
      case "podium":
        return;
    }
  },

  onInput(state, ctx, playerId, raw) {
    const input = asRecord(raw);
    if (!input || !state.ids.includes(playerId) || state.entries[playerId]) return;
    const ms = Number(input.ms);
    switch (input.type) {
      case "taps": {
        if (state.game !== "tap" || state.phase !== "play") return;
        const count = Math.round(Number(input.count));
        if (!Number.isFinite(count) || count < 0) return;
        state.entries[playerId] = { kind: "taps", count: Math.min(MAX_TAPS, count) };
        break;
      }
      case "early":
        if (state.game !== "draw" || state.phase !== "steady") return;
        state.entries[playerId] = { kind: "foul" };
        ctx.emit({ kind: "flinch", sfx: "fail.jinx", playerId, text: "Flinched!", to: [playerId], tv: false, haptic: [80, 40, 80] });
        return;
      case "shot":
        if (state.game !== "draw" || state.phase !== "draw" || !Number.isFinite(ms) || ms < 0) return;
        state.entries[playerId] = ms < MB_MIN_REACTION_MS ? { kind: "foul" } : { kind: "ms", ms: Math.round(Math.min(ms, DRAW_WINDOW_MS)) };
        break;
      case "stop":
        if (state.game !== "clock" || state.phase !== "play" || !Number.isFinite(ms) || ms < 0) return;
        state.entries[playerId] = { kind: "ms", ms: Math.round(Math.min(ms, state.target! + CLOCK_GRACE_MS)) };
        break;
      case "pick": {
        if (state.game !== "unique" || state.phase !== "play") return;
        const value = Number(input.value);
        if (!Number.isInteger(value) || value < 1 || value > MB_UNIQUE_MAX) return;
        state.entries[playerId] = { kind: "pick", value };
        break;
      }
      case "memory": {
        if (state.game !== "memory" || state.phase !== "play" || !Array.isArray(input.pads)) return;
        const pads = input.pads.slice(0, state.sequence.length).map(Number);
        let correct = 0;
        while (correct < pads.length && pads[correct] === state.sequence[correct]) correct++;
        state.entries[playerId] = { kind: "memory", correct, ms: Number.isFinite(ms) && ms >= 0 ? Math.round(ms) : 999_999 };
        break;
      }
      default:
        return;
    }
    ctx.emit({ kind: "done", sfx: "ui.tick", playerId });
    checkProgress(state, ctx);
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): MbTv {
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      game: state.game,
      target: state.target,
      sequence: state.phase === "show" ? state.sequence : null,
      startedAt: state.startedAt,
      doneIds: Object.keys(state.entries),
      results: state.phase === "result" || state.phase === "board" ? state.results : [],
      positions: state.positions,
      events: state.phase === "board" ? state.events : [],
      scores: sortedScores(state.positions, state.gained),
    };
  },

  playerView(state, _ctx, playerId): MbPlayer {
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      game: state.game,
      target: state.target,
      sequenceLength: state.sequence.length,
      done: Boolean(state.entries[playerId]),
      mine: state.phase === "result" || state.phase === "board" ? state.results.find((r) => r.playerId === playerId) ?? null : null,
      position: state.positions[playerId] ?? 0,
      score: state.positions[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.positions, playerId),
    };
  },

  scores(state) {
    return state.positions;
  },
};
