// Bomb Squad — talk or boom.
//
// Each round a different player defuses a bomb that only their phone shows.
// The manual is split across everyone else's phones (each module's pages go
// to a different expert where possible). Wrong moves are strikes; three
// strikes or running out of time explodes the bomb. Defusing pays everyone,
// with a bonus per second left and a little extra for the defuser.

import {
  BS_DEFUSER_BONUS,
  BS_DEFUSE_POINTS,
  BS_MAX_STRIKES,
  BS_MODULES,
  BS_SECOND_POINTS,
  BS_WORD_STAGES,
  type BsBomb,
  type BsManual,
  type BsModule,
  type BsPhase,
  type BsPlayer,
  type BsTv,
  type BsWireColor,
} from "@party/shared";
import { asRecord, nextTurn, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { KEYPAD_COLUMNS, WIRE_RULES, WORD_GROUPS, WORD_PARTNERS, columnsWith, wireToCut } from "./manual";

const INTRO_MS = 9000;
const BRIEF_MS = 7000;
const BOMB_MS = [180_000, 150_000, 120_000];
const RESULT_MS = 8000;
const STANDINGS_MS = 5000;
const COLORS: BsWireColor[] = ["red", "blue", "yellow", "white", "black"];

interface Puzzle {
  wires: BsWireColor[];
  wireAnswer: number;
  cut: number[];
  keypad: string[];
  keypadAnswer: string[];
  pressed: string[];
  words: { display: string; buttons: string[] }[];
  wordStage: number;
  solved: Record<BsModule, boolean>;
}

export interface BsState {
  players: GamePlayer[];
  ids: string[];
  phase: BsPhase;
  round: number;
  totalRounds: number;
  order: string[];
  turns: Record<string, number>;
  defuserId: string;
  puzzle: Puzzle | null;
  manuals: Record<string, BsManual>;
  strikes: number;
  explodesAt: number | null;
  outcome: "defused" | "exploded" | null;
  secondsLeft: number | null;
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function makePuzzle(ctx: GameContext): Puzzle {
  const wires = Array.from({ length: ctx.randomInt(4, 7) }, () => ctx.pick(COLORS));
  let keypad: string[] = [];
  let column: string[] = [];
  for (let tries = 0; tries < 100; tries++) {
    column = ctx.pick(KEYPAD_COLUMNS);
    keypad = ctx.shuffle(column).slice(0, 4);
    if (columnsWith(keypad).length === 1) break;
  }
  const words = Array.from({ length: BS_WORD_STAGES }, () => {
    const group = ctx.pick(WORD_GROUPS);
    const display = ctx.pick(group);
    const decoy = ctx.pick(WORD_GROUPS.filter((g) => g !== group).flat());
    return { display, buttons: ctx.shuffle([...group, decoy]) };
  });
  return {
    wires,
    wireAnswer: wireToCut(wires),
    cut: [],
    keypad: ctx.shuffle(keypad),
    keypadAnswer: [...keypad].sort((a, b) => column.indexOf(a) - column.indexOf(b)),
    pressed: [],
    words,
    wordStage: 0,
    solved: { wires: false, keypad: false, words: false },
  };
}

/** Splits the manual so each module lands with a different expert where possible. */
function dealManuals(experts: string[]): Record<string, BsManual> {
  const out: Record<string, BsManual> = Object.fromEntries(experts.map((id) => [id, {}]));
  const give = (id: string, module: BsModule) => {
    const m = out[id]!;
    if (module === "wires") m.wires = WIRE_RULES;
    if (module === "keypad") m.keypad = KEYPAD_COLUMNS;
    if (module === "words") m.words = WORD_PARTNERS;
  };
  if (experts.length === 0) return out;
  BS_MODULES.forEach((module, i) => give(experts[i % experts.length]!, module));
  // Extra experts get a copy of something too, so nobody sits idle.
  experts.slice(BS_MODULES.length).forEach((id, i) => give(id, BS_MODULES[i % BS_MODULES.length]!));
  return out;
}

function award(state: BsState, playerId: string, points: number) {
  state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
  state.gained[playerId] = (state.gained[playerId] ?? 0) + points;
}

function startRound(state: BsState, ctx: GameContext) {
  state.defuserId = nextTurn(state.order, state.turns, ctx.isConnected);
  state.puzzle = makePuzzle(ctx);
  state.manuals = dealManuals(ctx.shuffle(state.ids.filter((id) => id !== state.defuserId)));
  state.strikes = 0;
  state.explodesAt = null;
  state.outcome = null;
  state.secondsLeft = null;
  state.gained = {};
  state.phase = "brief";
  ctx.setDeadline(BRIEF_MS);
  ctx.emit({ kind: "round", sfx: state.round === state.totalRounds ? "round.final" : "round.start", text: `Bomb ${state.round}`, haptic: 60 });
}

function arm(state: BsState, ctx: GameContext) {
  const ms = ctx.timer(BOMB_MS[Math.min(state.round - 1, BOMB_MS.length - 1)]!);
  state.phase = "defuse";
  state.explodesAt = ctx.now() + ms;
  ctx.setDeadline(ms);
  ctx.emit({ kind: "armed", sfx: "rocket.countdown", text: "The bomb is armed!", haptic: [100, 50, 100] });
}

function finishBomb(state: BsState, ctx: GameContext, outcome: "defused" | "exploded") {
  state.outcome = outcome;
  state.secondsLeft = state.explodesAt === null ? 0 : Math.max(0, Math.ceil((state.explodesAt - ctx.now()) / 1000));
  if (outcome === "defused") {
    for (const id of state.ids) award(state, id, BS_DEFUSE_POINTS + state.secondsLeft * BS_SECOND_POINTS);
    award(state, state.defuserId, BS_DEFUSER_BONUS);
  }
  state.phase = "result";
  ctx.setDeadline(RESULT_MS);
  ctx.emit({ kind: outcome, sfx: outcome === "defused" ? "win.big" : "rocket.boom", text: outcome === "defused" ? "DEFUSED!" : "BOOM!", haptic: outcome === "defused" ? 80 : [300, 100, 300] });
}

function strike(state: BsState, ctx: GameContext) {
  state.strikes++;
  ctx.emit({ kind: "strike", sfx: "fail.buzz", text: `Strike ${state.strikes}!`, haptic: [150, 60, 150] });
  if (state.strikes >= BS_MAX_STRIKES) finishBomb(state, ctx, "exploded");
}

function solve(state: BsState, ctx: GameContext, module: BsModule) {
  const p = state.puzzle!;
  p.solved[module] = true;
  ctx.emit({ kind: "solved", sfx: "win.zinger", text: "Module disarmed!", to: [state.defuserId], haptic: 60 });
  if (BS_MODULES.every((m) => p.solved[m])) finishBomb(state, ctx, "defused");
}

function bombView(p: Puzzle): BsBomb {
  const word = p.solved.words ? null : { stage: p.wordStage + 1, ...p.words[p.wordStage]! };
  return { wires: p.wires, cut: p.cut, keypad: p.keypad, pressed: p.pressed, word, solved: p.solved };
}

export const bombsquad: GameDefinition<BsState> = {
  id: "bombsquad",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const state: BsState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds: Math.min(ctx.options.rounds ?? 3, Math.max(1, ids.length)),
      order: ctx.shuffle(ids),
      turns: {},
      defuserId: ids[0]!,
      puzzle: null,
      manuals: {},
      strikes: 0,
      explodesAt: null,
      outcome: null,
      secondsLeft: null,
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
      case "brief":
        return arm(state, ctx);
      case "defuse":
        return finishBomb(state, ctx, "exploded");
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

  onSkip(state, ctx) {
    // Skipping a live bomb would be a cheat code; only skip the waits.
    if (state.phase === "defuse") return;
    bombsquad.onDeadline(state, ctx);
  },

  onResume(state, _ctx, pausedForMs) {
    if (state.phase === "defuse" && state.explodesAt !== null) state.explodesAt += pausedForMs;
  },

  onInput(state, ctx, playerId, raw) {
    const input = asRecord(raw);
    const p = state.puzzle;
    if (!input || !p || state.phase !== "defuse" || playerId !== state.defuserId) return;
    if (input.type === "cut") {
      const wire = Number(input.wire);
      if (p.solved.wires || !Number.isInteger(wire) || wire < 0 || wire >= p.wires.length || p.cut.includes(wire)) return;
      p.cut.push(wire);
      return wire === p.wireAnswer ? solve(state, ctx, "wires") : strike(state, ctx);
    }
    if (input.type === "key") {
      if (p.solved.keypad || typeof input.symbol !== "string" || !p.keypad.includes(input.symbol) || p.pressed.includes(input.symbol)) return;
      if (input.symbol !== p.keypadAnswer[p.pressed.length]) return strike(state, ctx);
      p.pressed.push(input.symbol);
      ctx.emit({ kind: "key", sfx: "ui.tick", to: [playerId] });
      if (p.pressed.length === p.keypadAnswer.length) solve(state, ctx, "keypad");
      return;
    }
    if (input.type === "word") {
      if (p.solved.words || typeof input.label !== "string") return;
      const stage = p.words[p.wordStage]!;
      if (!stage.buttons.includes(input.label)) return;
      if (input.label !== WORD_PARTNERS[stage.display]) return strike(state, ctx);
      p.wordStage++;
      ctx.emit({ kind: "word", sfx: "ui.tick", to: [playerId] });
      if (p.wordStage >= BS_WORD_STAGES) solve(state, ctx, "words");
    }
  },

  tvView(state): BsTv {
    const playing = state.phase !== "intro" && state.phase !== "podium";
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      defuserId: playing ? state.defuserId : null,
      explodesAt: state.phase === "defuse" ? state.explodesAt : null,
      strikes: state.strikes,
      solved: state.puzzle?.solved ?? { wires: false, keypad: false, words: false },
      outcome: state.outcome,
      secondsLeft: state.secondsLeft,
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, _ctx, playerId): BsPlayer {
    const playing = state.phase !== "intro" && state.phase !== "podium";
    const isDefuser = playing && playerId === state.defuserId;
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      defuserId: playing ? state.defuserId : null,
      isDefuser,
      bomb: isDefuser && state.puzzle && state.phase === "defuse" ? bombView(state.puzzle) : null,
      manual: playing && !isDefuser ? state.manuals[playerId] ?? null : null,
      strikes: state.strikes,
      outcome: state.outcome,
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
