// Saloon Showdown — reflex rounds for the whole room.
//
// Quick Draw: wait through "Steady…" (and the odd fake-out), then tap the
// instant DRAW! appears. Stop the Clock: a clock starts, vanishes after 3
// seconds, and you stop it as close to the target as you can. Both are timed on
// each phone from the moment its own screen changed, so Wi-Fi lag doesn't
// decide who wins. The last round is the Final Showdown, worth double.

export type SdKind = "draw" | "clock";

export type SdPhase = "intro" | "ready" | "steady" | "fake" | "draw" | "clock" | "result" | "standings" | "podium";

/** Points by finishing place in a round (anyone further back gets the last value). */
export const SD_PLACE_POINTS = [100, 60, 30, 10] as const;
export const SD_FOUL_POINTS = -20;
/** Stop the Clock within this many ms of the target for a bonus. */
export const SD_BULLSEYE_MS = 50;
export const SD_BULLSEYE_BONUS = 50;
/** Taps faster than this can't be reactions — they count as a flinch. */
export const SD_MIN_REACTION_MS = 90;
/** The clock is visible for this long, then you're counting in your head. */
export const SD_CLOCK_VISIBLE_MS = 3000;

export interface SdResultLine {
  playerId: string;
  /** Reaction time (draw) or stop time (clock), as measured on the phone. */
  ms: number | null;
  foul: boolean;
  /** Stop the Clock: distance from the target. */
  diff: number | null;
  place: number | null;
  points: number;
}

export interface SdScoreLine { playerId: string; score: number; gained: number }

export interface SdTv {
  phase: SdPhase;
  round: number;
  totalRounds: number;
  kind: SdKind;
  final: boolean;
  /** Stop the Clock target in ms. */
  target: number | null;
  /** Fake-out word flashed during the steady phase. */
  fake: string | null;
  /** Room-clock time the clock started (for the TV's running display). */
  clockStartedAt: number | null;
  doneIds: string[];
  results: SdResultLine[];
  scores: SdScoreLine[];
}

export interface SdPlayer {
  phase: SdPhase;
  round: number;
  totalRounds: number;
  kind: SdKind;
  final: boolean;
  target: number | null;
  fake: string | null;
  done: boolean;
  mine: SdResultLine | null;
  score: number;
  gained: number;
  rank: number;
}

export type SdInput = { type: "early" } | { type: "shot"; ms: number } | { type: "stop"; ms: number };
