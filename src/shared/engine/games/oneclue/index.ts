// One Clue — help the guesser without doubling up.
//
// Each round one player is the guesser; the role passes round the room. Every
// other phone shows the mystery word and takes a one-word clue. Clues that
// match (case, punctuation, a/the and simple plurals ignored) cancel each
// other out — every copy goes. The guesser sees only the survivors and gets
// one guess, or passes. Right: the guesser +200 and every surviving clue +100.
// Pass or wrong: nobody scores. The TV is public and the guesser is watching
// it, so the word and the cancelled clues stay off it until the result.

import {
  OC_CLUE_MAX,
  OC_CLUE_POINTS,
  OC_GUESSER_POINTS,
  OC_GUESS_MAX,
  cleanText,
  ocClueProblem,
  ocMatchKeys,
  ocSameWord,
  type OcClueCard,
  type OcOutcome,
  type OcPhase,
  type OcPlayer,
  type OcTv,
  type RoomEvent,
} from "@party/shared";
import { asRecord, drawFresh, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { WORDS } from "./content";

const INTRO_MS = 7000;
const CLUE_MS = 45_000;
const GUESS_MS = 40_000;
const RESULT_MS = 9500;
const AFTER_ACCEPT_MS = 5000;
const STANDINGS_MS = 5500;
const GRACE_MS = 900;
/** How long a guesser whose phone dropped gets to come back before the round moves on. */
const ABSENT_GUESSER_MS = 10_000;

interface OcWord { word: string; also: string[] }

export interface OcState {
  players: GamePlayer[];
  ids: string[];
  phase: OcPhase;
  round: number;
  totalRounds: number;
  /** Seats in guessing order; the role passes along it. */
  order: string[];
  guessCounts: Record<string, number>;
  guesserId: string;
  /** One mystery word per round, drawn up front. */
  words: OcWord[];
  /** Clue writer → clue, plus the order they came in. */
  clues: Record<string, string>;
  clueOrder: string[];
  /** Writers whose clue matched another, matching clues side by side. */
  cancelled: string[];
  guess: string | null;
  outcome: OcOutcome | null;
  /** The host counted a wrong guess as close enough. */
  accepted: boolean;
  teamRight: number;
  roundsPlayed: number;
  scores: Record<string, number>;
  gained: Record<string, number>;
}

/** Clues that match at least one other clue, as groups of matches in first-seen order. */
export function duplicateGroups(entries: { id: string; text: string }[]): string[][] {
  const keys = entries.map((e) => ocMatchKeys(e.text));
  const parent = entries.map((_, i) => i);
  const root = (i: number): number => {
    let r = i;
    while (parent[r] !== r) r = parent[r]!;
    return r;
  };
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (!keys[i]!.some((k) => keys[j]!.includes(k))) continue;
      const a = root(i);
      const b = root(j);
      // The earliest clue stays the root, so groups come out in first-seen order.
      if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
    }
  }
  const groups = new Map<number, string[]>();
  entries.forEach((e, i) => groups.set(root(i), [...(groups.get(root(i)) ?? []), e.id]));
  return [...groups.values()].filter((g) => g.length > 1);
}

function currentWord(state: OcState): OcWord {
  return state.words[state.round - 1] ?? state.words[0]!;
}

function spellings(word: OcWord): string[] {
  return [word.word, ...word.also];
}

function writers(state: OcState): string[] {
  return state.ids.filter((id) => id !== state.guesserId);
}

function survivors(state: OcState): string[] {
  return state.clueOrder.filter((id) => !state.cancelled.includes(id));
}

function award(state: OcState, playerId: string, points: number) {
  state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
  state.gained[playerId] = (state.gained[playerId] ?? 0) + points;
}

/** The role passes along the order, skipping anyone who's away, and nobody guesses twice before everyone here has had a go. */
function pickGuesser(state: OcState, ctx: GameContext): string {
  const last = state.order.indexOf(state.guesserId);
  const rotation = [...state.order.slice(last + 1), ...state.order.slice(0, last + 1)];
  const here = rotation.filter((id) => ctx.isConnected(id));
  const pool = here.length ? here : rotation;
  const fewest = Math.min(...pool.map((id) => state.guessCounts[id] ?? 0));
  return pool.find((id) => (state.guessCounts[id] ?? 0) === fewest)!;
}

function startRound(state: OcState, ctx: GameContext) {
  state.guesserId = pickGuesser(state, ctx);
  state.guessCounts[state.guesserId] = (state.guessCounts[state.guesserId] ?? 0) + 1;
  state.clues = {};
  state.clueOrder = [];
  state.cancelled = [];
  state.guess = null;
  state.outcome = null;
  state.accepted = false;
  state.gained = {};
  state.phase = "clue";
  ctx.setDeadline(ctx.timer(CLUE_MS));
  ctx.emit({ kind: "round", sfx: state.round === state.totalRounds ? "round.final" : "round.start", text: `Round ${state.round}`, haptic: 60 });
  ctx.emit({ kind: "guesser", playerId: state.guesserId, text: "You're the guesser! Don't peek at anyone's phone 🙈", to: [state.guesserId], tv: false, haptic: [60, 40, 60] });
  // Nobody here to write clues? Don't sit through the timer.
  checkProgress(state, ctx);
}

/** A guesser whose phone dropped gets a short window to come back, not the whole timer. */
function capForAbsentGuesser(ctx: GameContext) {
  if (ctx.deadline !== null && ctx.deadline - ctx.now() > ABSENT_GUESSER_MS) ctx.setDeadline(ABSENT_GUESSER_MS);
}

function startGuess(state: OcState, ctx: GameContext) {
  state.cancelled = duplicateGroups(state.clueOrder.map((id) => ({ id, text: state.clues[id]! }))).flat();
  if (survivors(state).length === 0) return finishRound(state, ctx, "noClues");
  state.phase = "guess";
  ctx.setDeadline(ctx.timer(GUESS_MS));
  if (!ctx.isConnected(state.guesserId)) capForAbsentGuesser(ctx);
  ctx.emit({ kind: "clues", sfx: state.cancelled.length ? "fail.jinx" : "reveal.votes", haptic: 40 });
  ctx.emit({ kind: "yourGuess", text: "Your turn — what's the word?", to: [state.guesserId], tv: false, haptic: [80, 40, 80] });
}

/** Right guess: the guesser and every clue that survived score, and the team tally ticks up. */
function payOut(state: OcState) {
  state.teamRight++;
  award(state, state.guesserId, OC_GUESSER_POINTS);
  for (const id of survivors(state)) award(state, id, OC_CLUE_POINTS);
}

const RESULT_EVENTS: Record<OcOutcome, RoomEvent> = {
  correct: { kind: "correct", sfx: "win.zinger", haptic: [60, 40, 120] },
  wrong: { kind: "wrong", sfx: "fail.buzz", haptic: 120 },
  pass: { kind: "pass", sfx: "fail.jinx" },
  timeout: { kind: "timeout", sfx: "fail.buzz" },
  noClues: { kind: "noClues", sfx: "fail.jinx" },
};

function finishRound(state: OcState, ctx: GameContext, outcome: OcOutcome) {
  state.outcome = outcome;
  state.roundsPlayed++;
  if (outcome === "correct") payOut(state);
  state.phase = "result";
  ctx.setDeadline(RESULT_MS);
  ctx.emit({ ...RESULT_EVENTS[outcome] });
}

function checkProgress(state: OcState, ctx: GameContext) {
  if (state.phase !== "clue") return;
  const waiting = writers(state).filter((id) => state.clues[id] === undefined && ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

/** Public cards: survivors face up during the guess, cancelled ones blank until the result. */
function clueCards(state: OcState): OcClueCard[] {
  if (state.phase !== "guess" && state.phase !== "result") return [];
  const reveal = state.phase === "result";
  const live = survivors(state).map((id): OcClueCard => ({ playerId: id, text: state.clues[id]!, cancelled: false }));
  const dead = state.cancelled.map((id): OcClueCard => (reveal ? { playerId: id, text: state.clues[id]!, cancelled: true } : { playerId: null, text: null, cancelled: true }));
  return [...live, ...dead];
}

export const oneclue: GameDefinition<OcState> = {
  id: "oneclue",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const rounds = ctx.options.rounds ?? 0;
    const totalRounds = rounds > 0 ? rounds : ids.length;
    const bank = ctx.settings.familyMode ? WORDS.filter((w) => !w.spicy) : WORDS;
    const state: OcState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds,
      order: ctx.shuffle(ids),
      guessCounts: {},
      guesserId: "",
      words: drawFresh(ctx, "oc:words", bank, (w) => w.word, totalRounds).map((w) => ({ word: w.word, also: [...(w.also ?? [])] })),
      clues: {},
      clueOrder: [],
      cancelled: [],
      guess: null,
      outcome: null,
      accepted: false,
      teamRight: 0,
      roundsPlayed: 0,
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
        return startGuess(state, ctx);
      case "guess":
        return finishRound(state, ctx, "timeout");
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
    if (!input || !state.ids.includes(playerId)) return;
    switch (input.type) {
      case "clue": {
        if (state.phase !== "clue" || playerId === state.guesserId || state.clues[playerId] !== undefined) return;
        const text = cleanText(input.text, OC_CLUE_MAX);
        const problem = ocClueProblem(text, spellings(currentWord(state)));
        if (problem === "empty") return;
        if (problem) {
          const why = problem === "words" ? "One word only — no spaces!" : "Too obvious — that's too close to the mystery word!";
          ctx.emit({ kind: "clueRejected", text: why, to: [playerId], tv: false, haptic: [80, 40, 80] });
          return;
        }
        state.clues[playerId] = text;
        state.clueOrder.push(playerId);
        ctx.emit({ kind: "clue", sfx: "ui.tick", playerId });
        return checkProgress(state, ctx);
      }
      case "guess": {
        if (state.phase !== "guess" || playerId !== state.guesserId) return;
        const text = cleanText(input.text, OC_GUESS_MAX);
        if (ocMatchKeys(text).length === 0) return;
        state.guess = text;
        const right = spellings(currentWord(state)).some((w) => ocSameWord(text, w));
        return finishRound(state, ctx, right ? "correct" : "wrong");
      }
      case "pass":
        if (state.phase !== "guess" || playerId !== state.guesserId) return;
        return finishRound(state, ctx, "pass");
      case "accept":
        // The host can rule a typo or near miss "close enough", once.
        if (state.phase !== "result" || state.outcome !== "wrong" || !ctx.isHost(playerId)) return;
        state.outcome = "correct";
        state.accepted = true;
        payOut(state);
        ctx.emit({ kind: "accepted", sfx: "win.zinger", text: "Close enough — the host counts it!", haptic: [60, 40, 120] });
        if (ctx.deadline !== null && ctx.deadline - ctx.now() < AFTER_ACCEPT_MS) ctx.setDeadline(AFTER_ACCEPT_MS);
        return;
    }
  },

  onConnectionChange(state, ctx, playerId, connected) {
    if (!connected && state.phase === "guess" && playerId === state.guesserId) capForAbsentGuesser(ctx);
    checkProgress(state, ctx);
  },

  tvView(state): OcTv {
    const playing = state.phase !== "intro";
    const result = state.phase === "result";
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      guesserId: playing ? state.guesserId : null,
      writerIds: playing ? writers(state) : [],
      submittedIds: state.phase === "clue" ? [...state.clueOrder] : [],
      cards: clueCards(state),
      missingIds: result ? writers(state).filter((id) => state.clues[id] === undefined) : [],
      word: result ? currentWord(state).word : null,
      guess: result ? state.guess : null,
      outcome: result ? state.outcome : null,
      accepted: result && state.accepted,
      teamRight: state.teamRight,
      roundsPlayed: state.roundsPlayed,
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, ctx, playerId): OcPlayer {
    const playing = state.phase !== "intro";
    const isGuesser = playing && playerId === state.guesserId;
    const result = state.phase === "result";
    const writing = state.phase === "clue" || state.phase === "guess" || result;
    // The guesser only learns the word when everyone else does.
    const knowsWord = result || (writing && !isGuesser);
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      guesserId: playing ? state.guesserId : null,
      isGuesser,
      word: knowsWord ? currentWord(state).word : null,
      myClue: writing ? state.clues[playerId] ?? null : null,
      myClueCancelled: (state.phase === "guess" || result) && state.cancelled.includes(playerId),
      cluesIn: state.phase === "clue" ? state.clueOrder.length : 0,
      writerCount: playing ? writers(state).length : 0,
      cards: clueCards(state),
      canGuess: state.phase === "guess" && isGuesser,
      guess: result ? state.guess : null,
      outcome: result ? state.outcome : null,
      canAccept: result && state.outcome === "wrong" && ctx.isHost(playerId),
      teamRight: state.teamRight,
      roundsPlayed: state.roundsPlayed,
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
