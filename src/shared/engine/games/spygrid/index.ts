// Spy Grid — Codenames-style team word hunt.
//
// Players split into Red and Blue for the whole game. Each board deals 25 words
// and a secret key: 9 agents for the team that starts, 8 for the other, 7
// bystanders and one assassin. Teams take turns. The spymaster (a different
// teammate each board) types a one-word clue and a number; then the team's
// operatives vote on their phones, and a word flips once half of the connected
// operatives (rounded up) pick it. Your own agent lets you keep going, up to
// the number + 1 guesses; a bystander or the other team's agent ends the turn;
// the assassin loses you the board on the spot. First team to find all its
// agents wins the board.

import {
  SPY_AGENT_POINTS,
  SPY_BOARD_SIZE,
  SPY_BYSTANDERS,
  SPY_CLUE_MAX,
  SPY_COUNT_MAX,
  SPY_COUNT_MIN,
  SPY_END_TURN,
  SPY_OTHER_AGENTS,
  SPY_STARTING_AGENTS,
  SPY_TEAMS,
  SPY_TEAM_NAME,
  SPY_WIN_POINTS,
  cleanText,
  spyClueProblem,
  spyVotesNeeded,
  textKey,
  type SpyCardKind,
  type SpyClue,
  type SpyCommonView,
  type SpyFlip,
  type SpyOutcome,
  type SpyPhase,
  type SpyPlayer,
  type SpyTeam,
  type SpyTurnEnd,
  type SpyTurnEndReason,
  type SpyTv,
  type SpyVote,
} from "@party/shared";
import { asRecord, drawFresh, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { WORDS } from "./content";

const INTRO_MS = 8000;
const TEAMS_MS = 7000;
const CLUE_MS = 90_000;
const GUESS_MS = 120_000;
/** After a correct flip the team always gets at least this long to pick the next word. */
const NEXT_GUESS_MIN_MS = 20_000;
const BOARD_END_MS = 9000;
const STANDINGS_MS = 6000;
const GRACE_MS = 900;
/** Spare words drawn per board so near-duplicates ("Ring" / "Spring") never share one. */
const SPARE_WORDS = 5;
/** This many clue phases in a row without a clue and the board is called off. */
const STALL_TURNS = 4;

const TURN_END_SFX: Record<SpyTurnEndReason, string> = {
  bystander: "fail.jinx",
  opponent: "fail.buzz",
  outOfGuesses: "reveal.votes",
  endTurn: "ui.whoosh",
  guessTimeout: "ui.whoosh",
  clueTimeout: "fail.buzz",
};

export interface SpyState {
  players: GamePlayer[];
  ids: string[];
  phase: SpyPhase;
  board: number;
  totalBoards: number;
  teamOf: Record<string, SpyTeam>;
  members: Record<SpyTeam, string[]>;
  /** Boards each player has held the key, so the spymaster role rotates. */
  keyCounts: Record<string, number>;
  /** This board's key holders per team. [0] is the spymaster; anyone after stepped in when they dropped out. */
  spymasters: Record<SpyTeam, string[]>;
  startingTeam: SpyTeam;
  words: string[];
  key: SpyCardKind[];
  flipped: boolean[];
  activeTeam: SpyTeam;
  clue: SpyClue | null;
  guessesLeft: number;
  /** Current picks in the order they were made (a changed vote moves to the end). */
  votes: SpyVote[];
  lastFlip: SpyFlip | null;
  turnEnd: SpyTurnEnd | null;
  history: SpyClue[];
  /** Clue phases in a row that ran out without a clue. */
  idleTurns: number;
  winner: SpyTeam | null;
  outcome: SpyOutcome | null;
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function otherTeam(team: SpyTeam): SpyTeam {
  return team === "red" ? "blue" : "red";
}

function isTeam(kind: SpyCardKind): kind is SpyTeam {
  return kind === "red" || kind === "blue";
}

function award(state: SpyState, playerId: string, points: number) {
  state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
  state.gained[playerId] = (state.gained[playerId] ?? 0) + points;
}

/** Team members who don't hold this board's key. */
function operatives(state: SpyState, team: SpyTeam): string[] {
  return state.members[team].filter((id) => !state.spymasters[team].includes(id));
}

/** The guessing team's operatives whose phones are connected — only their votes count. */
function voters(state: SpyState, ctx: GameContext): string[] {
  return operatives(state, state.activeTeam).filter((id) => ctx.isConnected(id));
}

function agentsLeft(state: SpyState, team: SpyTeam): number {
  return state.key.filter((kind, i) => kind === team && !state.flipped[i]).length;
}

function liveWords(state: SpyState): string[] {
  return state.words.filter((_, i) => !state.flipped[i]);
}

function wordsClash(a: string, b: string): boolean {
  const ka = textKey(a);
  const kb = textKey(b);
  return ka.includes(kb) || kb.includes(ka);
}

/** 25 fresh words for tonight, skipping any that would sit next to a near-duplicate. */
function drawWords(ctx: GameContext): string[] {
  const pool = drawFresh(ctx, "spy:words", WORDS, (w) => w, SPY_BOARD_SIZE + SPARE_WORDS);
  const words: string[] = [];
  for (const word of pool) if (words.length < SPY_BOARD_SIZE && !words.some((w) => wordsClash(w, word))) words.push(word);
  // Practically never needed, but the board must always be full.
  for (const word of pool) if (words.length < SPY_BOARD_SIZE && !words.includes(word)) words.push(word);
  return words;
}

function dealKey(ctx: GameContext, starting: SpyTeam): SpyCardKind[] {
  const kinds: SpyCardKind[] = [
    ...Array.from({ length: SPY_STARTING_AGENTS }, (): SpyCardKind => starting),
    ...Array.from({ length: SPY_OTHER_AGENTS }, (): SpyCardKind => otherTeam(starting)),
    ...Array.from({ length: SPY_BYSTANDERS }, (): SpyCardKind => "bystander"),
    "assassin",
  ];
  return ctx.shuffle(kinds);
}

/** Whoever has held the key least often (ties go to team order), so everyone gets a turn. */
function leastUsed(state: SpyState, ids: string[]): string | undefined {
  let best: string | undefined;
  for (const id of ids) if (best === undefined || (state.keyCounts[id] ?? 0) < (state.keyCounts[best] ?? 0)) best = id;
  return best;
}

/** Nobody left to act: wrap the phase up instead of waiting out the clock. */
function hurry(ctx: GameContext) {
  if (ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

function startBoard(state: SpyState, ctx: GameContext) {
  // Random on the first board, then the other team goes first.
  state.startingTeam = state.board === 1 ? ctx.pick(SPY_TEAMS) : otherTeam(state.startingTeam);
  state.words = drawWords(ctx);
  state.key = dealKey(ctx, state.startingTeam);
  state.flipped = state.words.map(() => false);
  for (const team of SPY_TEAMS) {
    const all = state.members[team];
    const pick = leastUsed(state, all.filter((id) => ctx.isConnected(id))) ?? leastUsed(state, all);
    state.spymasters[team] = pick ? [pick] : [];
    if (pick) state.keyCounts[pick] = (state.keyCounts[pick] ?? 0) + 1;
  }
  state.activeTeam = state.startingTeam;
  state.clue = null;
  state.guessesLeft = 0;
  state.votes = [];
  state.lastFlip = null;
  state.turnEnd = null;
  state.history = [];
  state.idleTurns = 0;
  state.winner = null;
  state.outcome = null;
  state.gained = {};
  state.phase = "teams";
  ctx.setDeadline(TEAMS_MS);
  ctx.emit({ kind: "board", sfx: state.board === state.totalBoards ? "round.final" : "round.start", text: `Board ${state.board}`, haptic: 80 });
  ctx.emit({ kind: "spymaster", text: "You're the spymaster — only you can see the key!", to: [...state.spymasters.red, ...state.spymasters.blue], tv: false, haptic: [60, 40, 60] });
}

/** If the spymaster dropped out, a connected teammate takes the key — as long as someone is left to guess. */
function stepIn(state: SpyState, ctx: GameContext) {
  const team = state.activeTeam;
  if (state.phase !== "clue" || state.spymasters[team].some((id) => ctx.isConnected(id))) return;
  const ready = operatives(state, team).filter((id) => ctx.isConnected(id));
  if (ready.length < 2) return;
  const stand = leastUsed(state, ready)!;
  state.spymasters[team].push(stand);
  state.keyCounts[stand] = (state.keyCounts[stand] ?? 0) + 1;
  ctx.setDeadline(ctx.timer(CLUE_MS));
  ctx.emit({ kind: "stepIn", sfx: "ui.pop", playerId: stand, text: "Your spymaster dropped out — you hold the key now!", to: [stand], haptic: [80, 40, 80] });
}

function startTurn(state: SpyState, ctx: GameContext, team: SpyTeam) {
  state.phase = "clue";
  state.activeTeam = team;
  state.clue = null;
  state.guessesLeft = 0;
  state.votes = [];
  ctx.setDeadline(ctx.timer(CLUE_MS));
  stepIn(state, ctx);
  const givers = state.spymasters[team].filter((id) => ctx.isConnected(id));
  ctx.emit({ kind: "turn", text: "Your turn — give your team a clue!", to: givers, tv: false, haptic: [60, 40, 60] });
  checkProgress(state, ctx);
}

function endTurn(state: SpyState, ctx: GameContext, reason: SpyTurnEndReason) {
  state.turnEnd = { team: state.activeTeam, reason };
  ctx.emit({ kind: "turnOver", sfx: TURN_END_SFX[reason], haptic: 40 });
  startTurn(state, ctx, otherTeam(state.activeTeam));
}

function giveClue(state: SpyState, ctx: GameContext, playerId: string, word: string, count: number) {
  const clue: SpyClue = { team: state.activeTeam, word, count };
  state.clue = clue;
  state.history.push({ ...clue });
  state.guessesLeft = count + 1;
  state.idleTurns = 0;
  state.votes = [];
  state.phase = "guess";
  ctx.setDeadline(ctx.timer(GUESS_MS));
  ctx.emit({ kind: "clue", sfx: "ui.whoosh", playerId, text: `Clue: ${word} · ${count}`, to: operatives(state, state.activeTeam), haptic: [50, 30, 50] });
  checkProgress(state, ctx);
}

function endBoard(state: SpyState, ctx: GameContext, winner: SpyTeam | null, outcome: SpyOutcome) {
  state.winner = winner;
  state.outcome = outcome;
  state.votes = [];
  if (winner) for (const id of state.members[winner]) award(state, id, SPY_WIN_POINTS);
  state.phase = "boardEnd";
  ctx.setDeadline(BOARD_END_MS);
  ctx.emit({
    kind: outcome === "stalled" ? "stalled" : "boardWon",
    sfx: outcome === "assassin" ? "rocket.boom" : outcome === "agents" ? "win.zinger" : "fail.buzz",
    text: winner ? `${SPY_TEAM_NAME[winner]} team wins the board!` : "Board called off — nobody gave a clue",
    haptic: [100, 50, 100],
  });
}

function flip(state: SpyState, ctx: GameContext, index: number) {
  const team = state.activeTeam;
  const kind = state.key[index]!;
  state.flipped[index] = true;
  state.votes = [];
  state.lastFlip = { index, kind, team };
  // Every agent found pays its whole team, whoever flipped it.
  if (isTeam(kind)) for (const id of state.members[kind]) award(state, id, SPY_AGENT_POINTS);
  if (kind === "assassin") return endBoard(state, ctx, otherTeam(team), "assassin");
  if (isTeam(kind) && agentsLeft(state, kind) === 0) return endBoard(state, ctx, kind, "agents");
  if (kind !== team) return endTurn(state, ctx, kind === "bystander" ? "bystander" : "opponent");
  state.guessesLeft--;
  if (state.guessesLeft <= 0) return endTurn(state, ctx, "outOfGuesses");
  ctx.emit({ kind: "agent", sfx: "reveal.votes", haptic: 40, to: state.members[team] });
  const left = ctx.deadline === null ? 0 : ctx.deadline - ctx.now();
  if (left < ctx.timer(NEXT_GUESS_MIN_MS)) ctx.setDeadline(ctx.timer(NEXT_GUESS_MIN_MS));
}

/** The pick enough connected operatives agree on: most votes wins, then whichever was picked first. */
function majority(state: SpyState, here: string[]): number | null {
  const needed = spyVotesNeeded(here.length);
  const tally = new Map<number, number>();
  for (const v of state.votes) if (here.includes(v.playerId)) tally.set(v.index, (tally.get(v.index) ?? 0) + 1);
  let best: number | null = null;
  let most = 0;
  for (const [index, count] of tally) {
    if (count >= needed && count > most) {
      best = index;
      most = count;
    }
  }
  return best;
}

function checkProgress(state: SpyState, ctx: GameContext) {
  if (state.phase === "clue") {
    const team = state.activeTeam;
    const canClue = state.spymasters[team].some((id) => ctx.isConnected(id));
    const canGuess = operatives(state, team).some((id) => ctx.isConnected(id));
    if (!canClue || !canGuess) hurry(ctx);
    return;
  }
  if (state.phase !== "guess") return;
  const here = voters(state, ctx);
  if (here.length === 0) return hurry(ctx);
  const pick = majority(state, here);
  if (pick === null) return;
  if (pick === SPY_END_TURN) return endTurn(state, ctx, "endTurn");
  flip(state, ctx, pick);
}

const BOARD_OVER: SpyPhase[] = ["boardEnd", "standings", "podium"];

/** The parts of the view everyone shares. Unflipped card kinds only go to key holders, or to all once the board is over. */
function commonView(state: SpyState, ctx: GameContext, seesKey: boolean): SpyCommonView {
  const open = seesKey || BOARD_OVER.includes(state.phase);
  const dealt = state.phase !== "intro";
  const turn = state.phase === "clue" || state.phase === "guess";
  const here = state.phase === "guess" ? voters(state, ctx) : [];
  return {
    phase: state.phase,
    board: state.board,
    totalBoards: state.totalBoards,
    cards: state.words.map((word, i) => ({ word, kind: open || state.flipped[i] ? state.key[i]! : null, flipped: state.flipped[i]! })),
    teams: SPY_TEAMS.map((team) => ({
      team,
      memberIds: state.members[team],
      spymasterIds: dealt ? state.spymasters[team] : [],
      agents: state.key.filter((kind) => kind === team).length,
      found: state.key.filter((kind, i) => kind === team && state.flipped[i]).length,
    })),
    startingTeam: dealt ? state.startingTeam : null,
    activeTeam: turn ? state.activeTeam : null,
    clue: state.phase === "guess" ? state.clue : null,
    guessesLeft: state.phase === "guess" ? state.guessesLeft : 0,
    votes: state.votes.filter((v) => here.includes(v.playerId)),
    votesNeeded: here.length > 0 ? spyVotesNeeded(here.length) : 0,
    lastFlip: state.lastFlip,
    turnEnd: state.turnEnd,
    history: state.history,
    winner: state.winner,
    outcome: state.outcome,
  };
}

export const spygrid: GameDefinition<SpyState> = {
  id: "spygrid",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    // Shuffle into two teams; with an odd count a random team gets the extra player.
    const order = ctx.shuffle(ids);
    const bigger = ctx.pick(SPY_TEAMS);
    const half = Math.ceil(order.length / 2);
    const members: Record<SpyTeam, string[]> = { red: [], blue: [] };
    members[bigger] = order.slice(0, half);
    members[otherTeam(bigger)] = order.slice(half);
    const teamOf: Record<string, SpyTeam> = {};
    for (const team of SPY_TEAMS) for (const id of members[team]) teamOf[id] = team;
    const state: SpyState = {
      players,
      ids,
      phase: "intro",
      board: 1,
      totalBoards: Math.max(1, ctx.options.rounds ?? 2),
      teamOf,
      members,
      keyCounts: {},
      spymasters: { red: [], blue: [] },
      startingTeam: "red",
      words: [],
      key: [],
      flipped: [],
      activeTeam: "red",
      clue: null,
      guessesLeft: 0,
      votes: [],
      lastFlip: null,
      turnEnd: null,
      history: [],
      idleTurns: 0,
      winner: null,
      outcome: null,
      scores: Object.fromEntries(ids.map((id) => [id, 0])),
      gained: {},
    };
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        return startBoard(state, ctx);
      case "teams":
        ctx.emit({ kind: "go", sfx: "ui.whoosh" });
        return startTurn(state, ctx, state.startingTeam);
      case "clue":
        // No clue in time: the turn passes. A board where nobody clues at all gets called off.
        state.idleTurns++;
        if (state.idleTurns >= STALL_TURNS) return endBoard(state, ctx, null, "stalled");
        return endTurn(state, ctx, "clueTimeout");
      case "guess":
        return endTurn(state, ctx, "guessTimeout");
      case "boardEnd":
        state.phase = "standings";
        ctx.setDeadline(STANDINGS_MS);
        ctx.emit({ kind: "standings", sfx: "scores.tally" });
        return;
      case "standings":
        if (state.board < state.totalBoards) {
          state.board++;
          return startBoard(state, ctx);
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
        if (state.phase !== "clue" || !state.spymasters[state.activeTeam].includes(playerId) || typeof input.word !== "string") return;
        const count = Number(input.count);
        if (!Number.isInteger(count) || count < SPY_COUNT_MIN || count > SPY_COUNT_MAX) return;
        const word = cleanText(input.word, SPY_CLUE_MAX);
        const problem = spyClueProblem(word, liveWords(state));
        if (problem) {
          ctx.emit({ kind: "clueRejected", text: problem, to: [playerId], tv: false, haptic: [80, 40, 80] });
          return;
        }
        return giveClue(state, ctx, playerId, word, count);
      }
      case "vote": {
        if (state.phase !== "guess" || !operatives(state, state.activeTeam).includes(playerId)) return;
        const index = Number(input.index);
        const valid = index === SPY_END_TURN || (Number.isInteger(index) && index >= 0 && index < state.words.length && !state.flipped[index]);
        if (!valid || state.votes.some((v) => v.playerId === playerId && v.index === index)) return;
        state.votes = [...state.votes.filter((v) => v.playerId !== playerId), { playerId, index }];
        checkProgress(state, ctx);
        // Still counting (nothing flipped yet)? Tick so the room hears the vote land.
        if (state.votes.some((v) => v.playerId === playerId)) ctx.emit({ kind: "voted", sfx: "ui.tick", playerId });
        return;
      }
      case "unvote":
        if (state.phase !== "guess") return;
        state.votes = state.votes.filter((v) => v.playerId !== playerId);
        return;
    }
  },

  onConnectionChange(state, ctx) {
    stepIn(state, ctx);
    checkProgress(state, ctx);
  },

  tvView(state, ctx): SpyTv {
    return { ...commonView(state, ctx, false), scores: sortedScores(state.scores, state.gained) };
  },

  playerView(state, ctx, playerId): SpyPlayer {
    const team = state.teamOf[playerId] ?? "red";
    const isSpymaster = state.phase !== "intro" && state.spymasters[team].includes(playerId);
    return {
      ...commonView(state, ctx, isSpymaster),
      team,
      isSpymaster,
      canClue: state.phase === "clue" && state.activeTeam === team && isSpymaster,
      canVote: state.phase === "guess" && state.activeTeam === team && !isSpymaster,
      myVote: state.phase === "guess" ? (state.votes.find((v) => v.playerId === playerId)?.index ?? null) : null,
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
