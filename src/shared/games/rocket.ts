// Rocket Riot — the solo Crash game rebuilt as a couch game.
// The curve lives here so the server, the TV and every phone compute the exact
// same multiplier from the shared launch timestamp.

/** m(t) = e^(GROWTH·t): 2× at ~5.8s, 5× at ~13.4s, 10× at ~19.2s. */
export const ROCKET_GROWTH = 0.12;
export const ROCKET_MAX_MULT = 30;
export const ROCKET_START_CHIPS = 1000;
export const ROCKET_MIN_BET_SHARE = 0.1;
export const ROCKET_FINAL_MIN_BET_SHARE = 0.5;
export const ROCKET_DAREDEVIL_BONUS = 0.1;
/** Players who go broke get topped up so they stay in the game. */
export const ROCKET_POCKET_LINT = 100;

export function rocketMultiplierAt(elapsedMs: number): number {
  if (elapsedMs <= 0) return 1;
  return Math.exp((ROCKET_GROWTH * elapsedMs) / 1000);
}

export function rocketTimeFor(multiplier: number): number {
  if (multiplier <= 1) return 0;
  return (Math.log(multiplier) / ROCKET_GROWTH) * 1000;
}

export function floorMult(m: number): number {
  return Math.floor(m * 100 + 1e-9) / 100;
}

export function minBetFor(chips: number, finalRound: boolean): number {
  const share = finalRound ? ROCKET_FINAL_MIN_BET_SHARE : ROCKET_MIN_BET_SHARE;
  return Math.max(1, Math.min(chips, Math.ceil((chips * share) / 10) * 10));
}

/** Payout for a bet that bailed at `mult`, with Double Down doubling the profit. */
export function rocketPayout(bet: number, mult: number, doubled: boolean): number {
  const raw = Math.floor(bet * mult);
  return doubled ? bet + 2 * (raw - bet) : raw;
}

export type RocketPhase = "intro" | "bet" | "countdown" | "flight" | "boom" | "standings" | "podium";

export interface RocketRider {
  playerId: string;
  bet: number;
  doubled: boolean;
  bailedAt: number | null;
  payout: number | null;
  daredevil: boolean;
}

export interface RocketStanding { playerId: string; chips: number; delta: number }

export interface RocketTv {
  phase: RocketPhase;
  round: number;
  totalRounds: number;
  finalRound: boolean;
  flightStartedAt: number | null;
  /** Revealed once the rocket explodes. */
  crashPoint: number | null;
  /** Flight time at the explosion. Earlier than the crash point's time when everyone bailed and the flight was cut short. */
  explodedAtMs: number | null;
  riders: RocketRider[];
  standings: RocketStanding[];
  history: number[];
  lockedIds: string[];
}

export interface RocketPlayer {
  phase: RocketPhase;
  round: number;
  totalRounds: number;
  finalRound: boolean;
  chips: number;
  minBet: number;
  bet: number | null;
  locked: boolean;
  doubled: boolean;
  doubleAvailable: boolean;
  autoTarget: number | null;
  flightStartedAt: number | null;
  bailedAt: number | null;
  payout: number | null;
  crashPoint: number | null;
  rank: number;
  lastDelta: number;
}

export type RocketInput =
  | { type: "bet"; amount: number; double: boolean; autoTarget: number | null }
  /** `at` = when the player pressed, in host time (phones keep a synced clock). */
  | { type: "bail"; at?: number };

/** How much network delay a bail can be credited for (phone → TV is relayed). */
export const ROCKET_BAIL_LATENCY_CREDIT_MS = 600;
