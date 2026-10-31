// Punchline Panic — head-to-head joke writing.
//
// Rounds 1–2: N prompts for N players. Prompt i goes to players i and i+1
// (mod N) of a shuffled order, so everyone answers exactly two and every
// prompt is a duel. Non-authors vote A or B; points scale with the round.
// Round 3 ("Last Laugh"): one prompt for all, one favourite vote each.

import {
  PUNCHLINE_ANSWER_MAX,
  cleanText,
  textKey,
  type FinalEntry,
  type MatchupOutcome,
  type PunchlinePhase,
  type PunchlinePlayer,
  type PunchlineTv,
  type RevealSide,
  type Side,
} from "@party/shared";
import { asRecord, drawFresh, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { FINAL_PROMPTS, PROMPTS, SAFETY_ANSWERS, type Prompt } from "./content";

const INTRO_MS = 5000;
const WRITE_MS = 80_000;
const VOTE_MS = 20_000;
const REVEAL_MS = 7000;
const SHORT_REVEAL_MS = 4500;
const SCORES_MS = 7000;
const FINAL_WRITE_MS = 60_000;
const FINAL_VOTE_MS = 30_000;
const FINAL_REVEAL_MS = 12_000;
const ALL_DONE_GRACE_MS = 1200;

const POINTS_PER_VOTE = 100;
const ZINGER_BONUS = 250;
const FINAL_POINTS_PER_VOTE = 400;
const HEAD_TO_HEAD_ROUNDS = 2;

interface Answer { text: string; panic: boolean }

interface Matchup {
  id: string;
  prompt: string;
  authors: [string, string];
  /** Author order on screen: ab[0] is option A. Randomised so A isn't always the same author slot. */
  ab: [string, string];
  answers: Record<string, Answer>;
  votes: Record<string, Side>;
  reveal: { outcome: MatchupOutcome; sides: [RevealSide, RevealSide] } | null;
}

interface Final {
  prompt: string;
  answers: Record<string, Answer>;
  /** Display order of authors who answered; key = letter by index. */
  order: string[];
  votes: Record<string, string>;
  points: Record<string, number>;
  revealed: boolean;
}

export interface PunchlineState {
  players: GamePlayer[];
  ids: string[];
  phase: PunchlinePhase;
  round: number;
  matchups: Matchup[];
  current: number;
  final: Final | null;
  scores: Record<string, number>;
  gained: Record<string, number>;
  usedSafety: string[];
}

const KEYS = "ABCDEFGH";

function promptKey(p: Prompt): string {
  return p.text;
}

function prompts(ctx: GameContext, bank: Prompt[], memoryKey: string, count: number): string[] {
  const allowed = ctx.settings.familyMode ? bank.filter((p) => !p.spicy) : bank;
  return drawFresh(ctx, memoryKey, allowed, promptKey, count).map((p) => p.text);
}

function award(state: PunchlineState, playerId: string, points: number) {
  if (points <= 0) return;
  state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
  state.gained[playerId] = (state.gained[playerId] ?? 0) + points;
}

function safetyAnswer(state: PunchlineState, ctx: GameContext): string {
  const fresh = SAFETY_ANSWERS.filter((a) => !state.usedSafety.includes(a));
  const text = ctx.pick(fresh.length ? fresh : SAFETY_ANSWERS);
  state.usedSafety.push(text);
  return text;
}

// ── Phase transitions ─────────────────────────────────────────────────────

function startRound(state: PunchlineState, ctx: GameContext, round: number) {
  state.round = round;
  state.gained = {};
  const order = ctx.shuffle(state.ids);
  const n = order.length;
  const texts = prompts(ctx, PROMPTS, "punchline:prompts", n);
  state.matchups = texts.map((prompt, i) => {
    const authors: [string, string] = [order[i]!, order[(i + 1) % n]!];
    const ab: [string, string] = ctx.random() < 0.5 ? [authors[0], authors[1]] : [authors[1], authors[0]];
    return { id: `r${round}m${i}`, prompt, authors, ab, answers: {}, votes: {}, reveal: null };
  });
  state.current = 0;
  state.phase = "intro";
  ctx.setDeadline(INTRO_MS);
  ctx.emit({ kind: "round", sfx: "round.start", text: `Round ${round}` });
}

function startWriting(state: PunchlineState, ctx: GameContext) {
  state.phase = "write";
  ctx.setDeadline(ctx.timer(WRITE_MS));
  ctx.emit({ kind: "write", sfx: "ui.whoosh", haptic: 60 });
}

function voters(state: PunchlineState, m: Matchup): string[] {
  return state.ids.filter((id) => id !== m.authors[0] && id !== m.authors[1]);
}

function startVoting(state: PunchlineState, ctx: GameContext, index: number) {
  state.current = index;
  const m = state.matchups[index]!;
  const a = m.answers[m.ab[0]];
  const b = m.answers[m.ab[1]];
  if (!a || !b || textKey(a.text) === textKey(b.text)) {
    // No contest to vote on: resolve straight to the reveal.
    resolveMatchup(state, ctx, m);
    state.phase = "reveal";
    ctx.setDeadline(SHORT_REVEAL_MS);
    return;
  }
  state.phase = "vote";
  ctx.setDeadline(ctx.timer(VOTE_MS));
  ctx.emit({ kind: "vote", sfx: "ui.pop", haptic: 40 });
  if (!voters(state, m).some((id) => ctx.isConnected(id))) ctx.setDeadline(ALL_DONE_GRACE_MS);
}

function resolveMatchup(state: PunchlineState, ctx: GameContext, m: Matchup) {
  const ppv = POINTS_PER_VOTE * state.round;
  const eligible = voters(state, m);
  const sideFor = (key: Side, authorId: string): RevealSide => {
    const answer = m.answers[authorId];
    return {
      key,
      authorId,
      text: answer?.text ?? null,
      panic: answer?.panic ?? false,
      voterIds: Object.entries(m.votes).filter(([, side]) => side === key).map(([id]) => id),
      points: 0,
      winner: false,
    };
  };
  const sides: [RevealSide, RevealSide] = [sideFor("A", m.ab[0]), sideFor("B", m.ab[1])];
  let outcome: MatchupOutcome = "normal";

  if (!sides[0].text && !sides[1].text) {
    outcome = "empty";
  } else if (!sides[0].text || !sides[1].text) {
    outcome = "forfeit";
    const present = sides[0].text ? sides[0] : sides[1];
    present.winner = true;
    present.points = ppv * Math.max(1, eligible.length);
  } else if (textKey(sides[0].text) === textKey(sides[1].text)) {
    outcome = "jinx";
  } else {
    const total = sides[0].voterIds.length + sides[1].voterIds.length;
    for (const side of sides) side.points = side.voterIds.length * ppv;
    const [x, y] = sides;
    if (x.voterIds.length !== y.voterIds.length) {
      const win = x.voterIds.length > y.voterIds.length ? x : y;
      win.winner = true;
      if (total >= 2 && win.voterIds.length === total) {
        outcome = "zinger";
        win.points += ZINGER_BONUS * state.round;
      }
    }
  }

  for (const side of sides) {
    if (side.panic) side.points = Math.floor(side.points / 2 / 10) * 10;
    award(state, side.authorId, side.points);
  }
  m.reveal = { outcome, sides };
  const sfx = outcome === "zinger" ? "win.zinger" : outcome === "jinx" ? "fail.jinx" : outcome === "empty" ? "fail.buzz" : "reveal.votes";
  ctx.emit({ kind: outcome, sfx, text: outcome === "zinger" ? "ZINGER!" : outcome === "jinx" ? "JINX!" : undefined });
}

function startFinal(state: PunchlineState, ctx: GameContext) {
  state.round = HEAD_TO_HEAD_ROUNDS + 1;
  state.gained = {};
  const [prompt] = prompts(ctx, FINAL_PROMPTS, "punchline:finals", 1);
  state.final = { prompt: prompt!, answers: {}, order: [], votes: {}, points: {}, revealed: false };
  state.phase = "finalIntro";
  ctx.setDeadline(INTRO_MS);
  ctx.emit({ kind: "round", sfx: "round.final", text: "The Last Laugh" });
}

function startFinalVote(state: PunchlineState, ctx: GameContext) {
  const final = state.final!;
  final.order = ctx.shuffle(state.ids.filter((id) => final.answers[id]));
  if (final.order.length < 2) {
    resolveFinal(state, ctx);
    return;
  }
  state.phase = "finalVote";
  ctx.setDeadline(ctx.timer(FINAL_VOTE_MS));
  ctx.emit({ kind: "vote", sfx: "ui.pop", haptic: 40 });
}

function resolveFinal(state: PunchlineState, ctx: GameContext) {
  const final = state.final!;
  for (const authorId of final.order) {
    const votes = Object.values(final.votes).filter((key) => keyToAuthor(final, key) === authorId).length;
    let points = votes * FINAL_POINTS_PER_VOTE;
    if (final.answers[authorId]?.panic) points = Math.floor(points / 2 / 10) * 10;
    final.points[authorId] = points;
    award(state, authorId, points);
  }
  final.revealed = true;
  state.phase = "finalReveal";
  ctx.setDeadline(FINAL_REVEAL_MS);
  ctx.emit({ kind: "reveal", sfx: "reveal.votes" });
}

function keyToAuthor(final: Final, key: string): string | undefined {
  const i = KEYS.indexOf(key);
  return i >= 0 ? final.order[i] : undefined;
}

function finishGame(state: PunchlineState, ctx: GameContext) {
  state.phase = "podium";
  ctx.setDeadline(null);
  ctx.finish();
  ctx.emit({ kind: "podium", sfx: "win.big" });
}

/** Advances early once every connected player has finished the current task. */
function checkProgress(state: PunchlineState, ctx: GameContext) {
  const pending = waitingOn(state).filter((id) => ctx.isConnected(id));
  if (pending.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > ALL_DONE_GRACE_MS) {
    ctx.setDeadline(ALL_DONE_GRACE_MS);
  }
}

function waitingOn(state: PunchlineState): string[] {
  switch (state.phase) {
    case "write":
      return state.ids.filter((id) => state.matchups.some((m) => m.authors.includes(id) && !m.answers[id]));
    case "vote": {
      const m = state.matchups[state.current]!;
      return voters(state, m).filter((id) => !m.votes[id]);
    }
    case "finalWrite":
      return state.ids.filter((id) => !state.final!.answers[id]);
    case "finalVote":
      return state.ids.filter((id) => !state.final!.votes[id]);
    default:
      return [];
  }
}

// ── Definition ────────────────────────────────────────────────────────────

export const punchline: GameDefinition<PunchlineState> = {
  id: "punchline",

  create(ctx, players) {
    const state: PunchlineState = {
      players,
      ids: players.map((p) => p.id),
      phase: "intro",
      round: 1,
      matchups: [],
      current: 0,
      final: null,
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      gained: {},
      usedSafety: [],
    };
    startRound(state, ctx, 1);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        return startWriting(state, ctx);
      case "write":
        return startVoting(state, ctx, 0);
      case "vote": {
        resolveMatchup(state, ctx, state.matchups[state.current]!);
        state.phase = "reveal";
        return ctx.setDeadline(REVEAL_MS);
      }
      case "reveal":
        if (state.current + 1 < state.matchups.length) return startVoting(state, ctx, state.current + 1);
        state.phase = "scores";
        ctx.emit({ kind: "scores", sfx: "scores.tally" });
        return ctx.setDeadline(SCORES_MS);
      case "scores":
        return state.round < HEAD_TO_HEAD_ROUNDS ? startRound(state, ctx, state.round + 1) : startFinal(state, ctx);
      case "finalIntro":
        state.phase = "finalWrite";
        ctx.emit({ kind: "write", sfx: "ui.whoosh", haptic: 60 });
        return ctx.setDeadline(ctx.timer(FINAL_WRITE_MS));
      case "finalWrite":
        return startFinalVote(state, ctx);
      case "finalVote":
        return resolveFinal(state, ctx);
      case "finalReveal":
        return finishGame(state, ctx);
      case "podium":
        return;
    }
  },

  onInput(state, ctx, playerId, raw) {
    const input = asRecord(raw);
    if (!input) return;
    switch (input.type) {
      case "answer":
      case "panic": {
        if (state.phase !== "write") return;
        const m = state.matchups.find((x) => x.id === input.promptId);
        if (!m || !m.authors.includes(playerId) || m.answers[playerId]) return;
        if (input.type === "panic") {
          m.answers[playerId] = { text: safetyAnswer(state, ctx), panic: true };
        } else {
          const text = cleanText(input.text, PUNCHLINE_ANSWER_MAX);
          if (!text) return;
          m.answers[playerId] = { text, panic: false };
        }
        ctx.emit({ kind: "submitted", sfx: "ui.tick", playerId });
        return checkProgress(state, ctx);
      }
      case "vote": {
        if (state.phase !== "vote") return;
        const m = state.matchups[state.current]!;
        if (input.matchupId !== m.id || m.authors.includes(playerId) || m.votes[playerId]) return;
        if (input.choice !== "A" && input.choice !== "B") return;
        m.votes[playerId] = input.choice;
        ctx.emit({ kind: "voted", sfx: "ui.tick", playerId });
        return checkProgress(state, ctx);
      }
      case "finalAnswer":
      case "finalPanic": {
        const final = state.final;
        if (state.phase !== "finalWrite" || !final || final.answers[playerId]) return;
        if (input.type === "finalPanic") {
          final.answers[playerId] = { text: safetyAnswer(state, ctx), panic: true };
        } else {
          const text = cleanText(input.text, PUNCHLINE_ANSWER_MAX);
          if (!text) return;
          final.answers[playerId] = { text, panic: false };
        }
        ctx.emit({ kind: "submitted", sfx: "ui.tick", playerId });
        return checkProgress(state, ctx);
      }
      case "finalVote": {
        const final = state.final;
        if (state.phase !== "finalVote" || !final || final.votes[playerId]) return;
        const key = typeof input.key === "string" ? input.key : "";
        const author = keyToAuthor(final, key);
        if (!author || author === playerId) return;
        final.votes[playerId] = key;
        ctx.emit({ kind: "voted", sfx: "ui.tick", playerId });
        return checkProgress(state, ctx);
      }
    }
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): PunchlineTv {
    const m = state.matchups[state.current];
    const inDuel = (state.phase === "vote" || state.phase === "reveal") && m;
    const final = state.final;
    const pending = waitingOn(state);
    const tracked = ["write", "vote", "finalWrite", "finalVote"].includes(state.phase);
    let finalEntries: FinalEntry[] | null = null;
    if (final && (state.phase === "finalVote" || state.phase === "finalReveal" || state.phase === "podium")) {
      finalEntries = final.order.map((authorId, i) => {
        const key = KEYS[i]!;
        const entry: FinalEntry = { key, text: final.answers[authorId]?.text ?? null };
        if (final.revealed) {
          entry.authorId = authorId;
          entry.voterIds = Object.entries(final.votes).filter(([, k]) => k === key).map(([id]) => id);
          entry.points = final.points[authorId] ?? 0;
        }
        return entry;
      });
    }
    return {
      phase: state.phase,
      round: state.round,
      matchupNumber: state.current + 1,
      matchupCount: state.matchups.length,
      prompt: inDuel ? m.prompt : final && state.phase.startsWith("final") ? final.prompt : null,
      options: inDuel ? m.ab.map((authorId, i) => ({ key: (i === 0 ? "A" : "B") as Side, text: m.answers[authorId]?.text ?? null })) : null,
      waitingOnIds: tracked ? pending : [],
      doneIds: tracked ? state.ids.filter((id) => !pending.includes(id) && (state.phase !== "vote" || !m?.authors.includes(id))) : [],
      reveal: state.phase === "reveal" && m ? m.reveal : null,
      final: finalEntries,
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, _ctx, playerId): PunchlinePlayer {
    const summary = () => ({
      score: state.scores[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
      gained: state.gained[playerId] ?? 0,
    });
    switch (state.phase) {
      case "intro":
      case "finalIntro":
        return { phase: state.phase, round: state.round };
      case "write":
        return {
          phase: "write",
          prompts: state.matchups
            .filter((m) => m.authors.includes(playerId))
            .map((m) => ({ id: m.id, text: m.prompt, answer: m.answers[playerId]?.text ?? null, panic: m.answers[playerId]?.panic ?? false })),
        };
      case "finalWrite": {
        const final = state.final!;
        return { phase: "finalWrite", prompt: final.prompt, answer: final.answers[playerId]?.text ?? null, panic: final.answers[playerId]?.panic ?? false };
      }
      case "vote": {
        const m = state.matchups[state.current]!;
        return {
          phase: "vote",
          matchupId: m.id,
          prompt: m.prompt,
          options: m.ab.map((authorId, i) => ({ key: (i === 0 ? "A" : "B") as Side, text: m.answers[authorId]?.text ?? null })),
          role: m.authors.includes(playerId) ? "author" : state.ids.includes(playerId) ? "voter" : "spectator",
          myVote: m.votes[playerId] ?? null,
        };
      }
      case "finalVote": {
        const final = state.final!;
        return {
          phase: "finalVote",
          prompt: final.prompt,
          entries: final.order.map((authorId, i) => ({ key: KEYS[i]!, text: final.answers[authorId]?.text ?? null, mine: authorId === playerId })),
          myVote: final.votes[playerId] ?? null,
        };
      }
      default:
        return { phase: state.phase, ...summary() };
    }
  },

  scores(state) {
    return state.scores;
  },
};
