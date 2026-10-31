// European (single-zero) roulette, carried over from the casino.

import { randomFloat } from "../random";

export const RED_NUMBERS: ReadonlySet<number> = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

/** Pocket order around a European wheel, starting at 0 (for drawing the wheel). */
export const WHEEL_ORDER: readonly number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export type PocketColor = "red" | "black" | "green";

export function colorOf(n: number): PocketColor {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

export type RouletteBetType = "straight" | "red" | "black" | "even" | "odd" | "low" | "high" | "dozen" | "column";

export interface RouletteBet {
  type: RouletteBetType;
  /** 0–36 for straight; 1–3 for dozen/column. */
  value?: number;
  amount: number;
}

export function isValidBet(bet: RouletteBet): boolean {
  if (!Number.isInteger(bet.amount) || bet.amount <= 0) return false;
  switch (bet.type) {
    case "straight":
      return Number.isInteger(bet.value) && bet.value! >= 0 && bet.value! <= 36;
    case "dozen":
    case "column":
      return bet.value === 1 || bet.value === 2 || bet.value === 3;
    case "red":
    case "black":
    case "even":
    case "odd":
    case "low":
    case "high":
      return true;
    default:
      return false;
  }
}

/** Gross return per chip staked if `n` comes up (0 when the bet loses). */
export function betReturn(bet: RouletteBet, n: number): number {
  const live = n !== 0;
  switch (bet.type) {
    case "straight":
      return bet.value === n ? 36 : 0;
    case "red":
      return live && colorOf(n) === "red" ? 2 : 0;
    case "black":
      return live && colorOf(n) === "black" ? 2 : 0;
    case "even":
      return live && n % 2 === 0 ? 2 : 0;
    case "odd":
      return live && n % 2 === 1 ? 2 : 0;
    case "low":
      return n >= 1 && n <= 18 ? 2 : 0;
    case "high":
      return n >= 19 && n <= 36 ? 2 : 0;
    case "dozen":
      return live && Math.ceil(n / 12) === bet.value ? 3 : 0;
    case "column":
      return live && (n % 3 === 0 ? 3 : n % 3) === bet.value ? 3 : 0;
  }
}

export function spinWheel(random: () => number = randomFloat): number {
  return Math.floor(random() * 37);
}
