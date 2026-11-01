// Full Moon — Werewolf-style social deduction, narrated by Telly.
//
// Werewolves hide among the villagers. Every night each living player taps a
// name on their phone: the wolves pick a victim (the most-picked target dies,
// random among ties), the seer peeks at one player's true nature, the doctor
// guards one player (never the same one two nights running) and villagers
// pick a "suspect" that does nothing — so nobody can spot a role by who's
// tapping. At dawn the TV reveals who was found, and what they were. By day
// the village talks, then votes someone out: plurality wins, but a tie or a
// Skip win spares everyone. Villagers win when the wolves are gone; wolves win
// once they match the villagers.
//
// Secrecy: the TV view never holds a living player's role or anyone's night
// move, and nothing public changes when a night pick is switched. Points are
// only settled at the finale — the TV's score strip is public, so mid-game
// points would give away who voted for a wolf (or who the seer is).

import {
  FM_MAX_DAYS,
  FM_ROLE_ORDER,
  FM_SEER_FIND_POINTS,
  FM_SKIP,
  FM_SURVIVOR_POINTS,
  FM_WIN_POINTS,
  FM_WOLF_VOTE_POINTS,
  fmTeamOf,
  type FmBreakdown,
  type FmDeath,
  type FmEnding,
  type FmGhostInfo,
  type FmPhase,
  type FmPlayer,
  type FmRole,
  type FmSeat,
  type FmTeam,
  type FmTv,
  type FmVerdict,
  type FmVision,
} from "@party/shared";
import { asRecord, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";

const INTRO_MS = 7000;
const ROLES_MS = 12_000;
const NIGHT_MS = 30_000;
const DAWN_MS = 7000;
const DISCUSS_MS = 90_000;
const VOTE_MS = 30_000;
const VERDICT_MS = 8000;
const FINALE_MS = 10_000;
const GRACE_MS = 900;
/** A beat longer at night, so a werewolf can still switch to match the pack. */
const NIGHT_GRACE_MS = 2000;

export interface FmState {
  players: GamePlayer[];
  ids: string[];
  phase: FmPhase;
  day: number;
  roles: Record<string, FmRole>;
  /** Absent = alive. */
  deaths: Record<string, FmDeath>;
  /** "Got it" on the role card, then "Ready to vote" each day. */
  ready: string[];
  /** Tonight's taps, every role: player → target. Switchable until dawn. */
  picks: Record<string, string>;
  /** The doctor's guard from the night before — can't be repeated. */
  lastProtectedId: string | null;
  visions: FmVision[];
  victimId: string | null;
  votes: Record<string, string>;
  verdict: FmVerdict | null;
  eliminatedId: string | null;
  /** voter → day votes cast for a werewolf, paid out at the end. */
  wolfVotes: Record<string, number>;
  winner: FmTeam | null;
  ending: FmEnding | null;
  scores: Record<string, number>;
  breakdown: Record<string, FmBreakdown>;
}

/** 1 werewolf for 5–6 players, 2 for 7–8; one seer, one doctor, the rest villagers. */
export function roleCountsFor(n: number): Record<FmRole, number> {
  const wolf = n >= 7 ? 2 : 1;
  const seer = n - wolf >= 2 ? 1 : 0;
  const doctor = n - wolf - seer >= 2 ? 1 : 0;
  return { wolf, seer, doctor, villager: Math.max(0, n - wolf - seer - doctor) };
}

function isAlive(state: FmState, id: string): boolean {
  return !state.deaths[id];
}

function living(state: FmState): string[] {
  return state.ids.filter((id) => !state.deaths[id]);
}

function isWolf(state: FmState, id: string): boolean {
  return state.roles[id] === "wolf";
}

/** Who `playerId` may tap tonight. */
function nightTargets(state: FmState, playerId: string): string[] {
  const alive = living(state);
  switch (state.roles[playerId]) {
    case "wolf":
      return alive.filter((id) => !isWolf(state, id));
    case "doctor":
      return alive.filter((id) => id !== state.lastProtectedId);
    default:
      return alive.filter((id) => id !== playerId);
  }
}

function voteTargets(state: FmState, playerId: string): string[] {
  return living(state).filter((id) => id !== playerId);
}

function pendingIds(state: FmState): string[] {
  switch (state.phase) {
    case "roles":
      return state.ids.filter((id) => !state.ready.includes(id));
    case "night":
      return living(state).filter((id) => !state.picks[id] && nightTargets(state, id).length > 0);
    case "discuss":
      return living(state).filter((id) => !state.ready.includes(id));
    case "vote":
      return living(state).filter((id) => !state.votes[id]);
    default:
      return [];
  }
}

const WAITING_PHASES: FmPhase[] = ["roles", "night", "discuss", "vote"];

function checkProgress(state: FmState, ctx: GameContext) {
  if (!WAITING_PHASES.includes(state.phase)) return;
  const waiting = pendingIds(state).filter((id) => ctx.isConnected(id));
  const grace = state.phase === "night" ? NIGHT_GRACE_MS : GRACE_MS;
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > grace) ctx.setDeadline(grace);
}

function winnerNow(state: FmState): { winner: FmTeam; ending: FmEnding } | null {
  const alive = living(state);
  const wolves = alive.filter((id) => isWolf(state, id)).length;
  if (wolves === 0) return { winner: "village", ending: "cleared" };
  if (wolves >= alive.length - wolves) return { winner: "wolves", ending: "overrun" };
  return null;
}

function startRoles(state: FmState, ctx: GameContext) {
  state.phase = "roles";
  state.ready = [];
  ctx.setDeadline(ctx.timer(ROLES_MS));
  ctx.emit({ kind: "roles", sfx: "ui.whoosh", haptic: 80 });
}

function startNight(state: FmState, ctx: GameContext) {
  state.phase = "night";
  state.picks = {};
  state.victimId = null;
  ctx.setDeadline(ctx.timer(NIGHT_MS));
  // The same buzz on every phone, so nobody's pocket gives their role away.
  ctx.emit({ kind: "night", sfx: "fail.jinx", text: `Night ${state.day}`, haptic: 60 });
}

function resolveNight(state: FmState, ctx: GameContext) {
  const alive = living(state);
  const holder = (role: FmRole) => alive.find((id) => state.roles[id] === role) ?? null;
  // The pack's most-picked target dies, random among ties. No picks, no attack.
  const tally = new Map<string, number>();
  for (const id of alive) {
    const target = state.picks[id];
    if (target && isWolf(state, id)) tally.set(target, (tally.get(target) ?? 0) + 1);
  }
  const max = Math.max(0, ...tally.values());
  const attacked = max > 0 ? ctx.pick([...tally.entries()].filter(([, n]) => n === max).map(([id]) => id)) : null;
  const doctor = holder("doctor");
  const guarded = doctor ? (state.picks[doctor] ?? null) : null;
  state.lastProtectedId = guarded;
  const seer = holder("seer");
  const peek = seer ? state.picks[seer] : undefined;
  if (peek) state.visions.push({ day: state.day, targetId: peek, wolf: isWolf(state, peek) });
  state.victimId = attacked !== null && attacked !== guarded ? attacked : null;
  if (state.victimId) state.deaths[state.victimId] = { day: state.day, cause: "wolves" };

  state.phase = "dawn";
  ctx.setDeadline(DAWN_MS);
  // Saved or never attacked, the TV says the same thing: nobody died.
  if (state.victimId) {
    ctx.emit({ kind: "dawn", sfx: "reveal.caught", playerId: state.victimId });
    ctx.emit({ kind: "found", text: "The werewolves got you… you're a ghost now.", to: [state.victimId], tv: false, haptic: [120, 60, 120] });
  } else {
    ctx.emit({ kind: "dawn", sfx: "reveal.escape" });
  }
}

function startDay(state: FmState, ctx: GameContext) {
  state.phase = "discuss";
  state.ready = [];
  ctx.setDeadline(ctx.timer(DISCUSS_MS));
  ctx.emit({ kind: "day", sfx: "ui.pop", text: `Day ${state.day}`, haptic: 50 });
}

function startVote(state: FmState, ctx: GameContext) {
  state.phase = "vote";
  state.votes = {};
  state.verdict = null;
  state.eliminatedId = null;
  ctx.setDeadline(ctx.timer(VOTE_MS));
  ctx.emit({ kind: "vote", sfx: "ui.pop", haptic: 50 });
}

/** Plurality with at least one vote. Skip counts like a candidate: if it wins or ties for the top, nobody goes. */
function resolveVote(state: FmState, ctx: GameContext) {
  const tally = new Map<string, number>();
  for (const [voter, target] of Object.entries(state.votes)) {
    tally.set(target, (tally.get(target) ?? 0) + 1);
    if (target !== FM_SKIP && isWolf(state, target)) state.wolfVotes[voter] = (state.wolfVotes[voter] ?? 0) + 1;
  }
  const max = Math.max(0, ...tally.values());
  const top = [...tally.entries()].filter(([, n]) => n === max).map(([id]) => id);
  state.eliminatedId = null;
  if (max === 0) state.verdict = "none";
  else if (top.length > 1) state.verdict = "tie";
  else if (top[0] === FM_SKIP) state.verdict = "skipped";
  else {
    const out = top[0]!;
    state.verdict = "eliminated";
    state.eliminatedId = out;
    state.deaths[out] = { day: state.day, cause: "vote" };
  }

  state.phase = "verdict";
  ctx.setDeadline(VERDICT_MS);
  if (state.eliminatedId) {
    ctx.emit({ kind: "verdict", sfx: "reveal.caught", playerId: state.eliminatedId });
    ctx.emit({ kind: "votedOut", text: "The village voted you out… you're a ghost now.", to: [state.eliminatedId], tv: false, haptic: [120, 60, 120] });
  } else {
    ctx.emit({ kind: "verdict", sfx: "fail.buzz" });
  }
}

function afterVerdict(state: FmState, ctx: GameContext) {
  const result = winnerNow(state);
  if (result) return startFinale(state, ctx, result.winner, result.ending);
  if (state.day >= FM_MAX_DAYS) return startFinale(state, ctx, "wolves", "outlasted");
  state.day++;
  startNight(state, ctx);
}

/** Every role comes out, and the points land all at once. */
function startFinale(state: FmState, ctx: GameContext, winner: FmTeam, ending: FmEnding) {
  state.winner = winner;
  state.ending = ending;
  const wolvesFound = new Set(state.visions.filter((v) => v.wolf).map((v) => v.targetId)).size;
  for (const id of state.ids) {
    const role = state.roles[id]!;
    const team = fmTeamOf(role) === winner ? FM_WIN_POINTS : 0;
    const survived = isAlive(state, id) ? FM_SURVIVOR_POINTS : 0;
    const wolfVotes = (state.wolfVotes[id] ?? 0) * FM_WOLF_VOTE_POINTS;
    const visions = role === "seer" ? wolvesFound * FM_SEER_FIND_POINTS : 0;
    const total = team + survived + wolfVotes + visions;
    state.breakdown[id] = { team, survived, wolfVotes, visions, total };
    state.scores[id] = total;
  }
  state.phase = "finale";
  ctx.setDeadline(FINALE_MS);
  ctx.emit({ kind: "finale", sfx: winner === "village" ? "win.zinger" : "reveal.drumroll", text: winner === "village" ? "The village wins!" : "The werewolves win!" });
}

/** The public board. Roles show for the dead — or for everyone when `showAll`. */
function seatsFor(state: FmState, showAll: boolean): FmSeat[] {
  return state.ids.map((id) => {
    const death = state.deaths[id] ?? null;
    return { id, alive: !death, role: showAll || death ? state.roles[id]! : null, death };
  });
}

/** What a ghost watches: tonight's moves and the ballots as they land. */
function ghostInfo(state: FmState): FmGhostInfo {
  const info: FmGhostInfo = { wolfPicks: {}, seerPick: null, doctorPick: null, votes: state.phase === "vote" ? { ...state.votes } : {} };
  if (state.phase !== "night") return info;
  for (const id of living(state)) {
    const pick = state.picks[id];
    if (!pick) continue;
    const role = state.roles[id];
    if (role === "wolf") info.wolfPicks[id] = pick;
    else if (role === "seer") info.seerPick = pick;
    else if (role === "doctor") info.doctorPick = pick;
  }
  return info;
}

const ENDED: FmPhase[] = ["finale", "podium"];

export const fullmoon: GameDefinition<FmState> = {
  id: "fullmoon",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const counts = roleCountsFor(ids.length);
    const deck = ctx.shuffle(FM_ROLE_ORDER.flatMap((role) => Array.from({ length: counts[role] }, () => role)));
    const state: FmState = {
      players,
      ids,
      phase: "intro",
      day: 1,
      roles: Object.fromEntries(ids.map((id, i) => [id, deck[i] ?? "villager"])),
      deaths: {},
      ready: [],
      picks: {},
      lastProtectedId: null,
      visions: [],
      victimId: null,
      votes: {},
      verdict: null,
      eliminatedId: null,
      wolfVotes: {},
      winner: null,
      ending: null,
      scores: Object.fromEntries(ids.map((id) => [id, 0])),
      breakdown: {},
    };
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        return startRoles(state, ctx);
      case "roles":
        return startNight(state, ctx);
      case "night":
        return resolveNight(state, ctx);
      case "dawn": {
        const result = winnerNow(state);
        if (result) return startFinale(state, ctx, result.winner, result.ending);
        return startDay(state, ctx);
      }
      case "discuss":
        return startVote(state, ctx);
      case "vote":
        return resolveVote(state, ctx);
      case "verdict":
        return afterVerdict(state, ctx);
      case "finale":
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
    const target = typeof input.targetId === "string" ? input.targetId : "";
    switch (input.type) {
      case "ready":
        // "Got it" on the role card, or "Ready to vote" by day (the living only).
        if (state.phase !== "roles" && !(state.phase === "discuss" && isAlive(state, playerId))) return;
        if (state.ready.includes(playerId)) return;
        state.ready.push(playerId);
        ctx.emit({ kind: "ready", sfx: "ui.tick", playerId });
        return checkProgress(state, ctx);
      case "pick": {
        if (state.phase !== "night" || !isAlive(state, playerId) || !nightTargets(state, playerId).includes(target)) return;
        const first = !state.picks[playerId];
        state.picks[playerId] = target;
        // Only a first pick makes a sound, and never says who: a switch would give a werewolf away.
        if (first) ctx.emit({ kind: "picked", sfx: "ui.tick" });
        return checkProgress(state, ctx);
      }
      case "vote":
        if (state.phase !== "vote" || !isAlive(state, playerId) || state.votes[playerId]) return;
        if (target !== FM_SKIP && !voteTargets(state, playerId).includes(target)) return;
        state.votes[playerId] = target;
        ctx.emit({ kind: "voted", sfx: "ui.tick", playerId });
        return checkProgress(state, ctx);
    }
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): FmTv {
    const ended = ENDED.includes(state.phase);
    const verdict = state.phase === "verdict";
    const alive = living(state);
    const pending = pendingIds(state);
    // Who's done is public by day; at night the TV only ever gets a count.
    const doneFrom = state.phase === "roles" ? state.ids : state.phase === "discuss" || state.phase === "vote" ? alive : [];
    return {
      phase: state.phase,
      day: state.day,
      seats: seatsFor(state, ended),
      roleCounts: roleCountsFor(state.ids.length),
      aliveCount: alive.length,
      nightDone: state.phase === "night" ? alive.filter((id) => state.picks[id]).length : 0,
      doneIds: doneFrom.filter((id) => !pending.includes(id)),
      victimId: state.phase === "dawn" ? state.victimId : null,
      votes: verdict ? { ...state.votes } : null,
      verdict: verdict ? state.verdict : null,
      eliminatedId: verdict ? state.eliminatedId : null,
      winner: ended ? state.winner : null,
      ending: ended ? state.ending : null,
      scores: sortedScores(state.scores, ended ? state.scores : {}),
    };
  },

  playerView(state, _ctx, playerId): FmPlayer {
    const dealt = state.phase !== "intro";
    const role = dealt ? (state.roles[playerId] ?? null) : null;
    const alive = isAlive(state, playerId);
    const ended = ENDED.includes(state.phase);
    const ghost = dealt && !alive && !ended;
    const night = state.phase === "night";
    const verdict = state.phase === "verdict";
    const wolf = role === "wolf";
    const packPicks: Record<string, string> = {};
    if (wolf && night) {
      for (const id of living(state)) {
        const pick = state.picks[id];
        if (id !== playerId && pick && isWolf(state, id)) packPicks[id] = pick;
      }
    }
    return {
      phase: state.phase,
      day: state.day,
      role,
      alive,
      seats: seatsFor(state, ghost || ended),
      roleCounts: roleCountsFor(state.ids.length),
      packIds: wolf ? state.ids.filter((id) => isWolf(state, id)) : [],
      nightTargets: night && alive ? nightTargets(state, playerId) : [],
      myPick: night ? (state.picks[playerId] ?? null) : null,
      packPicks,
      lastProtectedId: role === "doctor" ? state.lastProtectedId : null,
      visions: role === "seer" ? state.visions.slice() : [],
      done: !pendingIds(state).includes(playerId),
      voteTargets: state.phase === "vote" && alive ? voteTargets(state, playerId) : [],
      myVote: state.phase === "vote" || verdict ? (state.votes[playerId] ?? null) : null,
      victimId: state.phase === "dawn" ? state.victimId : null,
      votes: verdict ? { ...state.votes } : null,
      verdict: verdict ? state.verdict : null,
      eliminatedId: verdict ? state.eliminatedId : null,
      ghost: ghost ? ghostInfo(state) : null,
      winner: ended ? state.winner : null,
      ending: ended ? state.ending : null,
      breakdown: ended ? (state.breakdown[playerId] ?? null) : null,
      score: state.scores[playerId] ?? 0,
      gained: ended ? (state.scores[playerId] ?? 0) : 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
