// Full Moon — Werewolf-style social deduction. Secret roles and night moves
// live on the phones; the TV runs the village. Werewolves hunt at night, the
// seer peeks, the doctor guards; by day the village argues and votes someone
// out. Villagers win when every werewolf is gone, werewolves once they match
// the villagers.

export type FmRole = "wolf" | "seer" | "doctor" | "villager";
export type FmTeam = "village" | "wolves";

export const FM_ROLE_ORDER: readonly FmRole[] = ["wolf", "seer", "doctor", "villager"];

export interface FmRoleInfo {
  name: string;
  plural: string;
  /** "They were a Villager" vs "They were the Seer". */
  article: "a" | "the";
  emoji: string;
  goal: string;
  team: FmTeam;
}

export const FM_ROLES: Record<FmRole, FmRoleInfo> = {
  wolf: {
    name: "Werewolf", plural: "Werewolves", article: "a", emoji: "🐺", team: "wolves",
    goal: "Pick a victim with your pack each night. By day, act innocent.",
  },
  seer: {
    name: "Seer", plural: "Seers", article: "the", emoji: "🔮", team: "village",
    goal: "Each night, peek at one player to learn if they're a werewolf.",
  },
  doctor: {
    name: "Doctor", plural: "Doctors", article: "the", emoji: "🩺", team: "village",
    goal: "Each night, protect one player from the werewolves.",
  },
  villager: {
    name: "Villager", plural: "Villagers", article: "a", emoji: "🧑‍🌾", team: "village",
    goal: "Sniff out the werewolves and vote them out by day.",
  },
};

export function fmTeamOf(role: FmRole): FmTeam {
  return FM_ROLES[role].team;
}

export const FM_WIN_POINTS = 500;
export const FM_SURVIVOR_POINTS = 100;
/** Per day vote cast for a werewolf, whether or not they went out. */
export const FM_WOLF_VOTE_POINTS = 50;
/** The seer, per werewolf found (each wolf counts once). */
export const FM_SEER_FIND_POINTS = 50;
/** The "nobody today" ballot. Seat ids never collide with it. */
export const FM_SKIP = "skip";
/** If the werewolves are still loose after this many days, they win. Stops an idle room looping forever. */
export const FM_MAX_DAYS = 6;

export type FmPhase = "intro" | "roles" | "night" | "dawn" | "discuss" | "vote" | "verdict" | "finale" | "podium";

/** eliminated = one player had the most votes; tie = the top spot was shared (Skip counts); skipped = Skip won outright; none = nobody voted. */
export type FmVerdict = "eliminated" | "tie" | "skipped" | "none";

/** cleared = no werewolves left; overrun = werewolves matched the villagers; outlasted = the werewolves survived every day. */
export type FmEnding = "cleared" | "overrun" | "outlasted";

export interface FmDeath {
  day: number;
  cause: "wolves" | "vote";
}

/** One villager on the board. `role` is public only once they're dead (or at the end; ghost phones see everyone). */
export interface FmSeat {
  id: string;
  alive: boolean;
  role: FmRole | null;
  death: FmDeath | null;
}

export interface FmVision {
  day: number;
  targetId: string;
  wolf: boolean;
}

/** Ghosts watch everything: tonight's moves and the ballots as they land. */
export interface FmGhostInfo {
  wolfPicks: Record<string, string>;
  seerPick: string | null;
  doctorPick: string | null;
  votes: Record<string, string>;
}

export interface FmBreakdown {
  team: number;
  survived: number;
  wolfVotes: number;
  visions: number;
  total: number;
}

export interface FmScoreLine { playerId: string; score: number; gained: number }

export interface FmTv {
  phase: FmPhase;
  /** Night N is followed by day N. */
  day: number;
  seats: FmSeat[];
  roleCounts: Record<FmRole, number>;
  aliveCount: number;
  /** Night: how many living players have chosen — a count, never who. */
  nightDone: number;
  /** Roles / discuss / vote: who has tapped through. Always empty at night. */
  doneIds: string[];
  /** Dawn: who was found. Null = a quiet night. */
  victimId: string | null;
  /** Verdict: voter → player id or FM_SKIP. */
  votes: Record<string, string> | null;
  verdict: FmVerdict | null;
  eliminatedId: string | null;
  winner: FmTeam | null;
  ending: FmEnding | null;
  scores: FmScoreLine[];
}

export interface FmPlayer {
  phase: FmPhase;
  day: number;
  /** Your own role. Null until roles are dealt. */
  role: FmRole | null;
  alive: boolean;
  /** Public board — every role filled in for ghosts and at the end. */
  seats: FmSeat[];
  roleCounts: Record<FmRole, number>;
  /** Werewolves only: the whole pack, you included. */
  packIds: string[];
  /** Night: who you can tap. */
  nightTargets: string[];
  myPick: string | null;
  /** Werewolves at night: what each living packmate has picked so far. */
  packPicks: Record<string, string>;
  /** Doctor only: the guard from the previous night (can't repeat). */
  lastProtectedId: string | null;
  /** Seer only: every vision so far. A night's vision appears at dawn. */
  visions: FmVision[];
  /** You've done this phase's thing (got it / picked / ready / voted). */
  done: boolean;
  voteTargets: string[];
  myVote: string | null;
  victimId: string | null;
  votes: Record<string, string> | null;
  verdict: FmVerdict | null;
  eliminatedId: string | null;
  /** Ghosts only. */
  ghost: FmGhostInfo | null;
  winner: FmTeam | null;
  ending: FmEnding | null;
  breakdown: FmBreakdown | null;
  score: number;
  gained: number;
  rank: number;
}

export type FmInput =
  | { type: "ready" }
  | { type: "pick"; targetId: string }
  | { type: "vote"; targetId: string };
