// Doodle Fraud — draw it, fake it, find it.
//
// Everyone draws their own secret prompt at the same time. Then each drawing
// gets its turn: the other players write fake titles, the real prompt is
// shuffled in with the lies (plus house lies when the lineup is thin), and
// everyone picks what they think is real. Finding the truth pays the guesser
// and the artist; every player fooled pays the lie's author.

import {
  DF_ARTIST_POINTS,
  DF_FOOL_POINTS,
  DF_TITLE_MAX,
  DF_TRUTH_POINTS,
  cleanText,
  sanitizeDrawing,
  textKey,
  type DfOption,
  type DfPhase,
  type DfPlayer,
  type DfRevealOption,
  type DfTv,
  type DrawStroke,
} from "@party/shared";
import { asRecord, drawFresh, rankOf, sortedScores, type GameContext, type GameDefinition, type GamePlayer } from "../../types";
import { PROMPTS } from "./content";

const INTRO_MS = 7000;
const DRAW_MS = 90_000;
const TITLE_MS = 40_000;
const PICK_MS = 25_000;
const REVEAL_MS = 10_000;
const STANDINGS_MS = 4500;
const GRACE_MS = 1500;
const MIN_OPTIONS = 3;
const HOUSE_POOL = 8;

interface LineupOption extends DfOption {
  real: boolean;
  authorIds: string[];
}

export interface DfState {
  players: GamePlayer[];
  ids: string[];
  phase: DfPhase;
  round: number;
  totalRounds: number;
  prompts: Record<string, string>;
  drawings: Record<string, DrawStroke[]>;
  /** The order drawings are shown in. */
  order: string[];
  titles: Record<string, string>;
  options: LineupOption[];
  picks: Record<string, string>;
  houseLies: string[];
  scores: Record<string, number>;
  gained: Record<string, number>;
}

function artistOf(state: DfState): string {
  return state.order[state.round - 1]!;
}

function award(state: DfState, playerId: string, points: number) {
  state.scores[playerId] = (state.scores[playerId] ?? 0) + points;
  state.gained[playerId] = (state.gained[playerId] ?? 0) + points;
}

/** Same title, give or take case, spacing and punctuation — or one hiding inside the other. */
function tooClose(a: string, b: string): boolean {
  const ka = textKey(a);
  const kb = textKey(b);
  return ka === kb || (ka.length >= 6 && kb.includes(ka)) || (kb.length >= 6 && ka.includes(kb));
}

/** Who the current step is still waiting on. */
function pending(state: DfState): string[] {
  switch (state.phase) {
    case "draw":
      return state.ids.filter((id) => !state.drawings[id]);
    case "title":
      return state.ids.filter((id) => id !== artistOf(state) && state.titles[id] === undefined);
    case "pick":
      return state.ids.filter((id) => id !== artistOf(state) && state.picks[id] === undefined);
    default:
      return [];
  }
}

function checkProgress(state: DfState, ctx: GameContext) {
  if (!["draw", "title", "pick"].includes(state.phase)) return;
  const waiting = pending(state).filter((id) => ctx.isConnected(id));
  if (waiting.length === 0 && ctx.deadline !== null && ctx.deadline - ctx.now() > GRACE_MS) ctx.setDeadline(GRACE_MS);
}

function startTitles(state: DfState, ctx: GameContext) {
  state.phase = "title";
  state.titles = {};
  state.picks = {};
  state.options = [];
  state.gained = {};
  ctx.setDeadline(ctx.timer(TITLE_MS));
  ctx.emit({ kind: "drawing", sfx: state.round === state.totalRounds ? "round.final" : "round.start", text: `Drawing ${state.round} of ${state.totalRounds}`, haptic: 60 });
}

function startPicks(state: DfState, ctx: GameContext) {
  const real = state.prompts[artistOf(state)]!;
  const lineup: LineupOption[] = [{ key: "", text: real, real: true, authorIds: [] }];
  for (const [playerId, text] of Object.entries(state.titles)) {
    const same = lineup.find((o) => !o.real && textKey(o.text) === textKey(text));
    if (same) same.authorIds.push(playerId);
    else lineup.push({ key: "", text, real: false, authorIds: [playerId] });
  }
  while (lineup.length < MIN_OPTIONS && state.houseLies.length) {
    const text = state.houseLies.shift()!;
    if (!lineup.some((o) => tooClose(o.text, text))) lineup.push({ key: "", text, real: false, authorIds: [] });
  }
  state.options = ctx.shuffle(lineup).map((o, i) => ({ ...o, key: `o${i}` }));
  state.phase = "pick";
  ctx.setDeadline(ctx.timer(PICK_MS));
  ctx.emit({ kind: "pick", sfx: "ui.whoosh", haptic: 50 });
}

function reveal(state: DfState, ctx: GameContext) {
  const artist = artistOf(state);
  for (const [picker, key] of Object.entries(state.picks)) {
    const option = state.options.find((o) => o.key === key);
    if (!option) continue;
    if (option.real) {
      award(state, picker, DF_TRUTH_POINTS);
      award(state, artist, DF_ARTIST_POINTS);
    } else {
      for (const author of option.authorIds) award(state, author, DF_FOOL_POINTS);
    }
  }
  state.phase = "reveal";
  ctx.setDeadline(REVEAL_MS);
  ctx.emit({ kind: "reveal", sfx: "reveal.drumroll" });
}

export const doodlefraud: GameDefinition<DfState> = {
  id: "doodlefraud",

  create(ctx, players) {
    const ids = players.map((p) => p.id);
    const bank = ctx.settings.familyMode ? PROMPTS.filter((p) => !p.spicy) : PROMPTS;
    const drawn = drawFresh(ctx, "df:prompts", bank, (p) => p.text, ids.length + HOUSE_POOL).map((p) => p.text);
    const state: DfState = {
      players,
      ids,
      phase: "intro",
      round: 1,
      totalRounds: ids.length,
      prompts: Object.fromEntries(ids.map((id, i) => [id, drawn[i]!])),
      drawings: {},
      order: ctx.shuffle(ids),
      titles: {},
      options: [],
      picks: {},
      houseLies: drawn.slice(ids.length),
      scores: Object.fromEntries(ids.map((id) => [id, 0])),
      gained: {},
    };
    ctx.setDeadline(INTRO_MS);
    return state;
  },

  onDeadline(state, ctx) {
    switch (state.phase) {
      case "intro":
        state.phase = "draw";
        ctx.setDeadline(ctx.timer(DRAW_MS));
        ctx.emit({ kind: "draw", sfx: "round.start", text: "Draw your secret prompt!", haptic: 80 });
        return;
      case "draw":
        // Anyone who didn't send a drawing hands in a blank canvas. Abstract art!
        for (const id of state.ids) state.drawings[id] ??= [];
        return startTitles(state, ctx);
      case "title":
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
          return startTitles(state, ctx);
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
      case "drawing": {
        if (state.phase !== "draw" || state.drawings[playerId]) return;
        const strokes = sanitizeDrawing(input.strokes);
        if (!strokes) return;
        state.drawings[playerId] = strokes;
        ctx.emit({ kind: "drew", sfx: "ui.tick", playerId });
        return checkProgress(state, ctx);
      }
      case "title": {
        if (state.phase !== "title" || playerId === artistOf(state) || state.titles[playerId] !== undefined) return;
        const text = cleanText(input.text, DF_TITLE_MAX);
        if (!text || !textKey(text)) return;
        if (tooClose(text, state.prompts[artistOf(state)]!)) {
          ctx.emit({ kind: "tooClose", text: "Whoa — that's basically the real title! Write a lie instead.", to: [playerId], tv: false, haptic: [80, 40, 80] });
          return;
        }
        state.titles[playerId] = text;
        ctx.emit({ kind: "titled", sfx: "ui.tick", playerId });
        return checkProgress(state, ctx);
      }
      case "pick": {
        if (state.phase !== "pick" || playerId === artistOf(state) || state.picks[playerId] !== undefined) return;
        const option = state.options.find((o) => o.key === input.key);
        if (!option || option.authorIds.includes(playerId)) return;
        state.picks[playerId] = option.key;
        ctx.emit({ kind: "picked", sfx: "ui.tick", playerId });
        return checkProgress(state, ctx);
      }
    }
  },

  onConnectionChange(state, ctx) {
    checkProgress(state, ctx);
  },

  tvView(state): DfTv {
    const showing = ["title", "pick", "reveal", "standings"].includes(state.phase);
    const revealed = state.phase === "reveal" || state.phase === "standings";
    const waiting = pending(state);
    const active = state.phase === "draw" ? state.ids : showing ? state.ids.filter((id) => id !== artistOf(state)) : [];
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      artistId: showing || state.phase === "podium" ? artistOf(state) : null,
      drawing: showing ? state.drawings[artistOf(state)] ?? [] : null,
      doneIds: active.filter((id) => !waiting.includes(id)),
      activeIds: active,
      options: state.phase === "pick" ? state.options.map(({ key, text }) => ({ key, text })) : [],
      reveal: revealed
        ? state.options.map<DfRevealOption>((o) => ({
            key: o.key,
            text: o.text,
            real: o.real,
            authorIds: o.authorIds,
            pickerIds: Object.entries(state.picks).filter(([, k]) => k === o.key).map(([id]) => id),
          }))
        : [],
      realPrompt: revealed ? state.prompts[artistOf(state)]! : null,
      scores: sortedScores(state.scores, state.gained),
    };
  },

  playerView(state, _ctx, playerId): DfPlayer {
    const showing = ["title", "pick", "reveal", "standings"].includes(state.phase);
    const revealed = state.phase === "reveal" || state.phase === "standings";
    return {
      phase: state.phase,
      round: state.round,
      totalRounds: state.totalRounds,
      myPrompt: state.phase === "draw" ? state.prompts[playerId] ?? null : null,
      submittedDrawing: Boolean(state.drawings[playerId]),
      isArtist: showing && artistOf(state) === playerId,
      myTitle: state.titles[playerId] ?? null,
      options: state.phase === "pick" ? state.options.filter((o) => !o.authorIds.includes(playerId)).map(({ key, text }) => ({ key, text })) : [],
      myPick: state.picks[playerId] ?? null,
      realPrompt: revealed ? state.prompts[artistOf(state)]! : null,
      score: state.scores[playerId] ?? 0,
      gained: state.gained[playerId] ?? 0,
      rank: rankOf(state.scores, playerId),
    };
  },

  scores(state) {
    return state.scores;
  },
};
