// Odd One Out — hidden-word bluffing.
//
// Each round one player is the faker. Everyone else sees which of the 16
// words on the topic card is secret. Clues go round one player at a time,
// then a short discussion, then a vote. The faker escapes if the room accuses
// anyone else (or ties); if caught, they can still steal the round by
// guessing the secret word.

import {
  ODD_CLUE_MAX,
  cleanText,
  textKey,
  type OddOutcome,
  type OddPhase,
  type OddPlayer,
  type OddTopic,
  type OddTv,
} from "@party/shared";
import { asRecord, drawFresh, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { TOPICS } from "./content";

const INTRO_MS = 7000;
const REVEAL_MS = 10_000;
const CLUE_MS = 30_000;
const DISCUSS_MS = 45_000;
const VOTE_MS = 25_000;
const VOTE_REVEAL_MS = 6500;
const GUESS_MS = 25_000;
const RESULT_MS = 8000;
const STANDINGS_MS = 5500;
const GRACE_MS = 900;

const ESCAPE_POINTS = 300;
const STEAL_POINTS = 200;
const CATCH_POINTS = 200;
const ASSIST_POINTS = 50;

export interface OddState {
  players: GamePlayer[];
  ids: string[];
  phase: OddPhase;
  round: number;
  totalRounds: number;
  topic: OddTopic | null;
  secretIndex: number;
  oddId: string;
  turnOrder: string[];
  turn: number;
  clues: Record<string, string | null>;
  ready: string[];
  votes: Record<string, string>;
  accusedId: string | null;
  guessIndex: number | null;
  outcome: OddOutcome | null;
  scores: Record<string, number>;
  gained: Record<string, number>;
  oddCounts: Record<string, number>;
}

function award(state: OddState, playerId: string, points: number) {
  state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
  state.gained[playerId] = (state.gained[playerId] ?? 0) + points;
}

function startRound(state: OddState, ctx: GameContext) {
  const [topic] = drawFresh(ctx, "odd:topics", TOPICS, (t) => t.name, 1);
  state.topic = topic!;
  state.secretIndex = ctx.randomInt(0, topic!.words.length);
  // Everyone gets a turn as the faker before anyone gets a second.
  const fewest = Math.min(...state.ids.map((id) => state.oddCounts[id] ?? 0));
  state.oddId = ctx.pick(state.ids.filter((id) => (state.oddCounts[id] ?? 0) === fewest));
  state.oddCounts[state.oddId] = (state.oddCounts[state.oddId] ?? 0) + 1;
  // The faker never has to clue first — that would be brutal.
  const order = ctx.shuffle(state.ids);
  if (order[0] === state.oddId) order.push(order.shift()!);
  state.turnOrder = order;
  state.turn = -1;
  state.clues = {};
  state.ready = [];
  state.votes = {};
  state.accusedId = null;
  state.guessIndex = null;
  state.outcome = null;
  state.gained = {};
  state.phase = "reveal";
  ctx.setDeadline(REVEAL_MS);
  ctx.emit({ kind: "round", sfx: "round.start", text: `Round ${state.round}: ${topic!.name}`, haptic: 80 });
}

function nextTurn(state: OddState, ctx: GameContext) {
  state.turn++;
  while (state.turn < state.turnOrder.length && !ctx.isConnected(state.turnOrder[state.turn]!)) {
    state.clues[state.turnOrder[state.turn]!] = null;
    state.turn++;
  }
  if (state.turn >= state.turnOrder.length) {
    state.phase = "discuss";
    state.ready = [];
    ctx.setDeadline(ctx.timer(DISCUSS_MS));
    ctx.emit({ kind: "discuss", sfx: "ui.whoosh", text: "Who's faking it?" });
    return;
  }
  state.phase = "clue";
  const current = state.turnOrder[state.turn]!;
  ctx.setDeadline(ctx.timer(CLUE_MS));
  ctx.emit({ kind: "turn", sfx: "ui.pop", playerId: current, haptic: [60, 40, 60], to: [current] });
}

function resolveVotes(state: OddState, ctx: GameContext) {
  const tally = new Map<string, number>();
  for (const suspect of Object.values(state.votes)) tally.set(suspect, (tally.get(suspect) ?? 0) + 1);
  const max = Math.max(0, ...tally.values());
  const top = [...tally.entries()].filter(([, n]) => n === max).map(([id]) => id);
  state.accusedId = max > 0 && top.length === 1 ? top[0]! : null;
  state.phase = "voteReveal";
  ctx.setDeadline(VOTE_REVEAL_MS);
  ctx.emit({ kind: "voteReveal", sfx: "reveal.drumroll" });
}

function afterVoteReveal(state: OddState, ctx: GameContext) {
  if (state.accusedId === state.oddId) {
    state.phase = "guess";
    ctx.setDeadline(ctx.timer(GUESS_MS));
    ctx.emit({ kind: "caught", sfx: "reveal.caught", playerId: state.oddId, text: "Caught! Can they guess the word?", haptic: [100, 50, 100], to: [state.oddId] });
    if (!ctx.isConnected(state.oddId)) ctx.setDeadline(GRACE_MS);
    return;
  }
  finishRound(state, ctx, "escaped");
}

function finishRound(state: OddState, ctx: GameContext, outcome: OddOutcome) {
  state.outcome = outcome;
  const catchers = Object.entries(state.votes).filter(([, s]) => s === state.oddId).map(([id]) => id);
  if (outcome === "escaped") award(state, state.oddId, ESCAPE_POINTS);
  if (outcome === "stolen") {
    award(state, state.oddId, STEAL_POINTS);
    for (const id of catchers) award(state, id, ASSIST_POINTS);
  }
  if (outcome === "caught") for (const id of catchers) award(state, id, CATCH_POINTS);
  state.phase = "result";
  ctx.setDeadline(RESULT_MS);
  ctx.emit({
    kind: outcome,
    sfx: outcome === "caught" ? "win.zinger" : "reveal.escape",
    text: outcome === "escaped" ? "The faker got away!" : outcome === "stolen" ? "Stolen! The faker knew it!" : "Busted!",
  });
}

function pendingIds(state: OddState): string[] {
  switch (state.phase) {
    case "reveal":
    case "discuss":
      return state.ids.filter((id) => !state.ready.includes(id));
    case "vote":
      return state.ids.filter((id) => !state.votes[id]);
    default:
      return [];
  }
}

function checkProgress(state: OddState, ctx: GameContext) {
  if (!["reveal", "discuss", "vote"].includes(state.phase)) return;
  const waiting = pendingIds(state).filter((id) => ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

export const oddoneout: GameDefinition<OddState> = {
  id: "oddoneout",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const state: OddState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds: ctx.options.rounds ?? 4,
      topic: null,
      secretIndex: 0,
      oddId: ids[0]!,
      turnOrder: [],
      turn: -1,
      clues: {},
      ready: [],
      votes: {},
      accusedId: null,
      guessIndex: null,
      outcome: null,
      scores: Object.fromEntries(ids.map((id) => [id, 0])),
      gained: {},
      oddCounts: {},
    };
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        return startRound(state, ctx);
      case "reveal":
        return nextTurn(state, ctx);
      case "clue":
        state.clues[state.turnOrder[state.turn]!] = null;
        return nextTurn(state, ctx);
      case "discuss":
        state.phase = "vote";
        ctx.setDeadline(ctx.timer(VOTE_MS));
        ctx.emit({ kind: "vote", sfx: "ui.pop", haptic: 50 });
        return;
      case "vote":
        return resolveVotes(state, ctx);
      case "voteReveal":
        return afterVoteReveal(state, ctx);
      case "guess":
        return finishRound(state, ctx, state.guessIndex === state.secretIndex ? "stolen" : "caught");
      case "result":
        state.phase = "standings";
        ctx.emit({ kind: "standings", sfx: "scores.tally" });
        return ctx.setDeadline(STANDINGS_MS);
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
      case "ready":
        if (state.phase !== "reveal" && state.phase !== "discuss") return;
        if (!state.ready.includes(playerId)) state.ready.push(playerId);
        return checkProgress(state, ctx);
      case "clue": {
        if (state.phase !== "clue" || state.turnOrder[state.turn] !== playerId) return;
        const text = cleanText(input.text, ODD_CLUE_MAX);
        if (!text) return;
        const secret = textKey(state.topic!.words[state.secretIndex]!);
        if (playerId !== state.oddId && textKey(text).includes(secret)) {
          ctx.emit({ kind: "clueRejected", text: "Too obvious — you can't say the secret word!", to: [playerId], tv: false, haptic: [80, 40, 80] });
          return;
        }
        state.clues[playerId] = text;
        ctx.emit({ kind: "clue", sfx: "ui.tick", playerId });
        return nextTurn(state, ctx);
      }
      case "vote": {
        if (state.phase !== "vote" || state.votes[playerId]) return;
        const suspect = typeof input.suspectId === "string" ? input.suspectId : "";
        if (suspect === playerId || !state.ids.includes(suspect)) return;
        state.votes[playerId] = suspect;
        ctx.emit({ kind: "voted", sfx: "ui.tick", playerId });
        return checkProgress(state, ctx);
      }
      case "guess": {
        if (state.phase !== "guess" || playerId !== state.oddId || state.guessIndex !== null) return;
        const index = Number(input.index);
        if (!Number.isInteger(index) || index < 0 || index >= state.topic!.words.length) return;
        state.guessIndex = index;
        return finishRound(state, ctx, index === state.secretIndex ? "stolen" : "caught");
      }
    }
  },

  onConnectionChange(state, ctx, playerId, connected) {
    if (!connected && state.phase === "clue" && state.turnOrder[state.turn] === playerId) {
      state.clues[playerId] = null;
      return nextTurn(state, ctx);
    }
    checkProgress(state, ctx);
  },

  tvView(state): OddTv {
    const revealOdd = state.phase === "guess" || state.phase === "result" || state.phase === "standings" || state.phase === "podium";
    const revealAll = state.phase === "result" || state.phase === "standings" || state.phase === "podium";
    const votesOut = state.phase === "voteReveal" || state.phase === "guess" || revealAll;
    const pending = pendingIds(state);
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      topic: state.topic,
      turnOrder: state.turnOrder,
      currentTurnId: state.phase === "clue" ? state.turnOrder[state.turn] ?? null : null,
      clues: state.clues,
      doneIds: ["reveal", "discuss", "vote"].includes(state.phase) ? state.ids.filter((id) => !pending.includes(id)) : [],
      votes: votesOut ? state.votes : null,
      accusedId: votesOut ? state.accusedId : null,
      oddId: revealOdd ? state.oddId : null,
      secretIndex: revealAll ? state.secretIndex : null,
      guessIndex: revealAll ? state.guessIndex : null,
      outcome: revealAll ? state.outcome : null,
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, _ctx, playerId): OddPlayer {
    const isOdd = playerId === state.oddId && state.phase !== "intro";
    const revealAll = state.phase === "result" || state.phase === "standings" || state.phase === "podium";
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      isOdd,
      topic: state.topic,
      secretWord: !isOdd && state.topic ? state.topic.words[state.secretIndex]! : null,
      currentTurnId: state.phase === "clue" ? state.turnOrder[state.turn] ?? null : null,
      myTurn: state.phase === "clue" && state.turnOrder[state.turn] === playerId,
      clues: state.clues,
      done: !pendingIds(state).includes(playerId),
      myVote: state.votes[playerId] ?? null,
      canGuess: state.phase === "guess" && isOdd && state.guessIndex === null,
      guessIndex: revealAll ? state.guessIndex : null,
      accusedId: state.phase === "voteReveal" || state.phase === "guess" || revealAll ? state.accusedId : null,
      oddId: revealAll || state.phase === "guess" ? state.oddId : null,
      secretIndex: revealAll ? state.secretIndex : !isOdd ? state.secretIndex : null,
      outcome: revealAll ? state.outcome : null,
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
