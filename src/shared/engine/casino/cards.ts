// Playing cards, carried over from the Lucas Games casino. Shared by the
// casino party pack (Hold'em Night, Blackjack Bash). Pass `ctx.random` from a
// game so shuffles stay reproducible in tests; it defaults to crypto.

import { randomFloat } from "../random";

export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export interface Card {
  rank: Rank;
  suit: Suit;
}

export const RANKS: readonly Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export const SUITS: readonly Suit[] = ["spades", "hearts", "diamonds", "clubs"];

/** A shuffled shoe of `decks` standard 52-card decks. */
export function freshDeck(decks = 1, random: () => number = randomFloat): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < decks; d++) for (const suit of SUITS) for (const rank of RANKS) cards.push({ rank, suit });
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cards[i], cards[j]] = [cards[j]!, cards[i]!];
  }
  return cards;
}

/** Blackjack value: aces count 11 here; `handValue()` softens them. */
export function cardValue(card: Card): number {
  if (card.rank === "A") return 11;
  if (card.rank === "J" || card.rank === "Q" || card.rank === "K") return 10;
  return Number(card.rank);
}

export function cardLabel(card: Card): string {
  const suit = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" }[card.suit];
  return `${card.rank}${suit}`;
}
