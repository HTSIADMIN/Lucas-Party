// Great Minds — think like the herd.
//
// Every round everyone answers the same simple question. Answers that match
// (case, spacing, punctuation, leading "a/the" and simple plurals ignored) form
// groups; the single biggest group scores, a tie for biggest scores half. If
// exactly one player is alone while a herd exists, they take the Dunce Cap —
// whoever wears it at the end loses points. During the reveal the host can
// merge groups that mean the same thing; scores lock in when the reveal ends.

import {
  GM_ANSWER_MAX,
  GM_DUNCE_PENALTY,
  GM_HERD_POINTS,
  GM_TIED_HERD_POINTS,
  cleanText,
  type GmGroup,
  type GmPhase,
  type GmPlayer,
  type GmTv,
} from "@party/shared";
import { asRecord, drawFresh, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { QUESTIONS } from "./content";

const INTRO_MS = 6500;
const ANSWER_MS = 30_000;
const REVEAL_BASE_MS = 8000;
const REVEAL_PER_GROUP_MS = 800;
const REVEAL_MAX_MS = 15_000;
const AFTER_MERGE_MS = 5000;
const STANDINGS_MS = 5000;
const GRACE_MS = 900;

export interface GmState {
  players: GamePlayer[];
  ids: string[];
  phase: GmPhase;
  round: number;
  totalRounds: number;
  questions: string[];
  /** playerId → answer, in submission order. */
  answers: Record<string, string>;
  order: string[];
  /** Host merges: group key → the key it was merged into. */
  merges: Record<string, string>;
  scores: Record<string, number>;
  gained: Record<string, number>;
  dunceId: string | null;
  dunceMoved: boolean;
}

const ARTICLE_RE = /^(a|an|the|some)\s+/;
const MARKS_RE = /\p{M}/gu;
const NON_ALNUM_RE = /[^\p{L}\p{N}]+/gu;

/** Every spelling an answer could match on: "The Cherries" → cherries, cherrie, cherry… */
export function matchKeys(text: string): string[] {
  const spaced = text.toLowerCase().normalize("NFKD").replace(MARKS_RE, "").trim().replace(ARTICLE_RE, "");
  const key = spaced.replace(NON_ALNUM_RE, "");
  if (!key) return [];
  const keys = new Set([key]);
  if (key.length > 3 && key.endsWith("ies")) keys.add(`${key.slice(0, -3)}y`);
  if (key.length > 3 && key.endsWith("es")) keys.add(key.slice(0, -2));
  if (key.length > 2 && key.endsWith("s") && !key.endsWith("ss")) keys.add(key.slice(0, -1));
  return [...keys];
}

function find(parent: Record<string, string>, key: string): string {
  let k = key;
  for (let guard = 0; parent[k] && parent[k] !== k && guard < 64; guard++) k = parent[k]!;
  return k;
}

/** Groups the answers and works out who the herd is. Derived fresh each time so host merges just work. */
export function computeGroups(state: Pick<GmState, "answers" | "order" | "merges">): { groups: GmGroup[]; herdPoints: number } {
  const answered = state.order.filter((id) => state.answers[id] !== undefined);
  // Auto-match: players who share any spelling key end up together.
  const owner = new Map<string, string>();
  const playerParent: Record<string, string> = {};
  for (const id of answered) playerParent[id] = id;
  for (const id of answered) {
    for (const key of matchKeys(state.answers[id]!)) {
      const other = owner.get(key);
      if (other === undefined) owner.set(key, id);
      else {
        const a = find(playerParent, id);
        const b = find(playerParent, other);
        // The earlier submitter stays the root so group keys are stable.
        if (a === b) continue;
        if (answered.indexOf(a) < answered.indexOf(b)) playerParent[b] = a;
        else playerParent[a] = b;
      }
    }
  }
  // Group key = the root player's main spelling; then apply the host's merges.
  const baseKey = (id: string) => matchKeys(state.answers[id]!)[0] ?? `~${id}`;
  const clusters = new Map<string, string[]>();
  for (const id of answered) {
    const key = find(state.merges, baseKey(find(playerParent, id)));
    clusters.set(key, [...(clusters.get(key) ?? []), id]);
  }
  const groups: GmGroup[] = [...clusters.entries()].map(([key, playerIds]) => {
    const counts = new Map<string, { text: string; n: number }>();
    for (const id of playerIds) {
      const text = state.answers[id]!;
      const entry = counts.get(text.toLowerCase()) ?? { text, n: 0 };
      entry.n++;
      counts.set(text.toLowerCase(), entry);
    }
    const text = [...counts.values()].sort((a, b) => b.n - a.n)[0]!.text;
    return { key, text, playerIds, herd: false };
  });
  groups.sort((a, b) => b.playerIds.length - a.playerIds.length || answered.indexOf(a.playerIds[0]!) - answered.indexOf(b.playerIds[0]!));
  const biggest = groups[0]?.playerIds.length ?? 0;
  if (biggest < 2) return { groups, herdPoints: 0 };
  const herd = groups.filter((g) => g.playerIds.length === biggest);
  for (const g of herd) g.herd = true;
  return { groups, herdPoints: herd.length === 1 ? GM_HERD_POINTS : GM_TIED_HERD_POINTS };
}

/** The cap moves to the one lonely answer — only when a herd exists and exactly one player is alone. */
function dunceAfter(state: GmState, groups: GmGroup[], herdPoints: number): string | null {
  const loners = groups.filter((g) => g.playerIds.length === 1);
  return herdPoints > 0 && loners.length === 1 ? loners[0]!.playerIds[0]! : state.dunceId;
}

function award(state: GmState, playerId: string, points: number) {
  state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
  state.gained[playerId] = (state.gained[playerId] ?? 0) + points;
}

function startRound(state: GmState, ctx: GameContext) {
  state.phase = "answer";
  state.answers = {};
  state.order = [];
  state.merges = {};
  state.gained = {};
  state.dunceMoved = false;
  ctx.setDeadline(ctx.timer(ANSWER_MS));
  ctx.emit({ kind: "round", sfx: state.round === state.totalRounds ? "round.final" : "round.start", text: `Question ${state.round}`, haptic: 60 });
}

function startReveal(state: GmState, ctx: GameContext) {
  state.phase = "reveal";
  const { groups } = computeGroups(state);
  ctx.setDeadline(Math.min(REVEAL_MAX_MS, REVEAL_BASE_MS + groups.length * REVEAL_PER_GROUP_MS));
  ctx.emit({ kind: "reveal", sfx: "reveal.votes" });
}

function commitRound(state: GmState, ctx: GameContext) {
  const { groups, herdPoints } = computeGroups(state);
  state.gained = {};
  for (const g of groups) if (g.herd) for (const id of g.playerIds) award(state, id, herdPoints);
  const dunce = dunceAfter(state, groups, herdPoints);
  state.dunceMoved = dunce !== state.dunceId;
  state.dunceId = dunce;
  if (state.dunceMoved && dunce) {
    const name = state.players.find((p) => p.id === dunce)?.name ?? "Someone";
    ctx.emit({ kind: "dunce", sfx: "fail.buzz", playerId: dunce, text: `${name} gets the Dunce Cap!`, haptic: [120, 60, 120], to: [dunce] });
  }
  if (state.round >= state.totalRounds && state.dunceId) {
    award(state, state.dunceId, -GM_DUNCE_PENALTY);
    const name = state.players.find((p) => p.id === state.dunceId)?.name ?? "Someone";
    ctx.emit({ kind: "duncePenalty", sfx: "fail.jinx", playerId: state.dunceId, text: `${name} ends wearing the Dunce Cap: −${GM_DUNCE_PENALTY}` });
  }
  state.phase = "standings";
  ctx.setDeadline(STANDINGS_MS);
  ctx.emit({ kind: "standings", sfx: "scores.tally" });
}

function checkProgress(state: GmState, ctx: GameContext) {
  if (state.phase !== "answer") return;
  const waiting = state.ids.filter((id) => state.answers[id] === undefined && ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

const REVEALED: GmPhase[] = ["reveal", "standings", "podium"];

export const greatminds: GameDefinition<GmState> = {
  id: "greatminds",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const totalRounds = ctx.options.rounds ?? 8;
    const bank = ctx.settings.familyMode ? QUESTIONS.filter((q) => !q.spicy) : QUESTIONS;
    const state: GmState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds,
      questions: drawFresh(ctx, "gm:questions", bank, (q) => q.text, totalRounds).map((q) => q.text),
      answers: {},
      order: [],
      merges: {},
      scores: Object.fromEntries(ids.map((id) => [id, 0])),
      gained: {},
      dunceId: null,
      dunceMoved: false,
    };
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        return startRound(state, ctx);
      case "answer":
        return startReveal(state, ctx);
      case "reveal":
        return commitRound(state, ctx);
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
      if (state.phase !== "answer" || state.answers[playerId] !== undefined) return;
      const text = cleanText(input.text, GM_ANSWER_MAX);
      if (!text || matchKeys(text).length === 0) return;
      state.answers[playerId] = text;
      state.order.push(playerId);
      ctx.emit({ kind: "answered", sfx: "ui.tick", playerId });
      return checkProgress(state, ctx);
    }
    if (input.type === "merge") {
      if (state.phase !== "reveal" || !ctx.isHost(playerId) || !Array.isArray(input.keys)) return;
      const live = new Set(computeGroups(state).groups.map((g) => g.key));
      const keys = [...new Set(input.keys.filter((k): k is string => typeof k === "string" && live.has(k)))];
      if (keys.length < 2) return;
      const [target, ...rest] = keys;
      for (const key of rest) state.merges[key] = target!;
      ctx.emit({ kind: "merged", sfx: "ui.pop", text: "Close enough! Answers merged." });
      if (ctx.deadline !== null && ctx.deadline - ctx.now() < AFTER_MERGE_MS) ctx.setDeadline(AFTER_MERGE_MS);
    }
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): GmTv {
    const revealed = REVEALED.includes(state.phase);
    const { groups, herdPoints } = revealed ? computeGroups(state) : { groups: [], herdPoints: 0 };
    const provisional = state.phase === "reveal" ? dunceAfter(state, groups, herdPoints) : state.dunceId;
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      question: state.phase === "intro" ? null : state.questions[state.round - 1] ?? null,
      answeredIds: state.order,
      groups,
      noAnswerIds: revealed ? state.ids.filter((id) => state.answers[id] === undefined) : [],
      herdPoints,
      dunceId: provisional,
      dunceMoved: state.phase === "reveal" ? provisional !== state.dunceId : state.phase === "standings" && state.dunceMoved,
      scores: sortedScores(state.scores, state.phase === "standings" || state.phase === "podium" ? state.gained : {}),
    };
  },

  playerView(state, ctx, playerId): GmPlayer {
    const revealed = REVEALED.includes(state.phase);
    const { groups, herdPoints } = revealed ? computeGroups(state) : { groups: [], herdPoints: 0 };
    const mine = groups.find((g) => g.playerIds.includes(playerId));
    const dunce = state.phase === "reveal" ? dunceAfter(state, groups, herdPoints) : state.dunceId;
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      question: state.phase === "intro" ? null : state.questions[state.round - 1] ?? null,
      myAnswer: state.answers[playerId] ?? null,
      groups,
      inHerd: Boolean(mine?.herd),
      matchCount: mine ? mine.playerIds.length - 1 : 0,
      hasDunce: dunce === playerId,
      canMerge: state.phase === "reveal" && ctx.isHost(playerId),
      score: state.scores[playerId] ?? 0,
      gained: state.phase === "reveal" ? (mine?.herd ? herdPoints : 0) : state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
