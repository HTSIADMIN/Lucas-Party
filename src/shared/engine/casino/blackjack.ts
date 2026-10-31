// Blackjack hand math, carried over from the casino. The party version
// (Blackjack Bash: everyone at one table against the TV's dealer) builds its
// round flow on top of these.

import { cardValue, type Card } from "./cards";

export interface HandValue {
  total: number;
  /** An ace is still counting as 11. */
  soft: boolean;
}

export function handValue(hand: readonly Card[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    total += cardValue(card);
    if (card.rank === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export function isBlackjack(hand: readonly Card[]): boolean {
  return hand.length === 2 && handValue(hand).total === 21;
}

export function isBust(hand: readonly Card[]): boolean {
  return handValue(hand).total > 21;
}

/** House rule from the casino: the dealer stands on every 17, soft or hard. */
export function dealerShouldHit(hand: readonly Card[]): boolean {
  return handValue(hand).total < 17;
}

export type BlackjackOutcome = "blackjack" | "win" | "push" | "lose";

/** Player hand vs the dealer's finished hand. */
export function outcomeOf(player: readonly Card[], dealer: readonly Card[]): BlackjackOutcome {
  if (isBust(player)) return "lose";
  const playerBj = isBlackjack(player);
  const dealerBj = isBlackjack(dealer);
  if (playerBj && dealerBj) return "push";
  if (playerBj) return "blackjack";
  if (dealerBj) return "lose";
  const p = handValue(player).total;
  const d = handValue(dealer).total;
  if (d > 21 || p > d) return "win";
  return p === d ? "push" : "lose";
}

/** Gross return per chip staked: blackjack pays 3:2. */
export const BLACKJACK_RETURN: Record<BlackjackOutcome, number> = { blackjack: 2.5, win: 2, push: 1, lose: 0 };
