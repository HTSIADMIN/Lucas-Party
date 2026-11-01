// Playing cards drawn in CSS + tiny suit SVGs. A card is designed in its own
// em space (4em × 5.6em), so whatever wraps it sets the size with font-size:
// em on the TV, px on phones. A face-down card is `null`; when it turns up the
// card flips over in place (the key stays the same, the CSS transition runs).

import type { CSSProperties } from "react";
import type { BjCard, BjRank, BjSuit } from "@party/shared";
import "./blackjack.css";

/** Stagger between cards in the opening deal. */
const DEAL_STEP_MS = 110;

const RANK_NAME: Record<BjRank, string> = {
  A: "Ace", "2": "Two", "3": "Three", "4": "Four", "5": "Five", "6": "Six", "7": "Seven",
  "8": "Eight", "9": "Nine", "10": "Ten", J: "Jack", Q: "Queen", K: "King",
};

export function SuitIcon({ suit, className }: { suit: BjSuit; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      {suit === "hearts" && <path d="M12 21.2 L10.6 19.9 C5.4 15.2 2 12.1 2 8.3 C2 5.2 4.4 2.8 7.5 2.8 C9.2 2.8 10.9 3.6 12 4.9 C13.1 3.6 14.8 2.8 16.5 2.8 C19.6 2.8 22 5.2 22 8.3 C22 12.1 18.6 15.2 13.4 19.9 Z" />}
      {suit === "diamonds" && <path d="M12 1.8 L20.5 12 L12 22.2 L3.5 12 Z" />}
      {suit === "spades" && (
        <path d="M12 1.8 C9.4 5.6 3 9.4 3 14.2 C3 17 5.2 19.1 7.9 19.1 C9.4 19.1 10.7 18.4 11.5 17.4 C11.3 19.2 10.6 20.6 9.4 22 L14.6 22 C13.4 20.6 12.7 19.2 12.5 17.4 C13.3 18.4 14.6 19.1 16.1 19.1 C18.8 19.1 21 17 21 14.2 C21 9.4 14.6 5.6 12 1.8 Z" />
      )}
      {suit === "clubs" && (
        <>
          <circle cx="12" cy="6.6" r="4.4" />
          <circle cx="6.9" cy="13.6" r="4.4" />
          <circle cx="17.1" cy="13.6" r="4.4" />
          <circle cx="12" cy="12.4" r="2.8" />
          <path d="M11.4 13.5 C11.2 17.6 10.4 20 9 22 L15 22 C13.6 20 12.8 17.6 12.6 13.5 Z" />
        </>
      )}
    </svg>
  );
}

export function PlayingCard({ card, className = "", style }: { card: BjCard | null; className?: string; style?: CSSProperties }) {
  const red = card?.suit === "hearts" || card?.suit === "diamonds";
  const face = card?.rank === "J" || card?.rank === "Q" || card?.rank === "K";
  return (
    <div
      className={`bj-card ${card ? (red ? "is-red" : "is-black") : "is-down"} ${className}`}
      style={style}
      role="img"
      aria-label={card ? `${RANK_NAME[card.rank]} of ${card.suit}` : "Face-down card"}
    >
      <div className="bj-card-inner">
        <div className={`bj-card-face bj-card-front ${face ? "is-court" : ""}`}>
          {card && (
            <>
              <span className="bj-card-corner">
                <span className="bj-card-rank">{card.rank}</span>
                <SuitIcon suit={card.suit} className="bj-card-suit" />
              </span>
              {face ? <span className="bj-card-court">{card.rank}</span> : <SuitIcon suit={card.suit} className="bj-card-pip" />}
              <span className="bj-card-corner is-flipped">
                <span className="bj-card-rank">{card.rank}</span>
                <SuitIcon suit={card.suit} className="bj-card-suit" />
              </span>
            </>
          )}
        </div>
        <div className="bj-card-face bj-card-back" />
      </div>
    </div>
  );
}

/**
 * A fanned hand. `id` must change from hand to hand so a new deal animates in;
 * the opening two cards are staggered in casino order (`dealSlot` of
 * `dealSlots` places at the table), later hits land straight away.
 */
export function Hand({ cards, id, dealSlot = 0, dealSlots = 1 }: { cards: (BjCard | null)[]; id: string; dealSlot?: number; dealSlots?: number }) {
  const fan = cards.length > 6 ? 0.72 : cards.length > 4 ? 0.62 : 0.55;
  return (
    <div className="bj-hand" style={{ ["--fan" as string]: fan } as CSSProperties}>
      {cards.map((card, i) => (
        <PlayingCard key={`${id}-${i}`} card={card} className="bj-deal" style={{ animationDelay: `${i < 2 ? (i * dealSlots + dealSlot) * DEAL_STEP_MS : 0}ms` }} />
      ))}
    </div>
  );
}

/** Two dashed outlines where a hand will land. */
export function EmptyHand() {
  return (
    <div className="bj-hand" aria-hidden="true">
      <span className="bj-card-slot" />
      <span className="bj-card-slot" />
    </div>
  );
}

/** "7/17" while a soft hand can still move, otherwise just the total. */
export function totalLabel(total: number, soft: boolean, settled: boolean): string {
  return soft && total < 21 && !settled ? `${total - 10}/${total}` : String(total);
}

/** "an Ace", "a King", "an 8" — what the dealer is showing. */
export function cardName(card: BjCard | null | undefined): string {
  if (!card) return "nothing";
  const name = card.rank === "A" || card.rank === "J" || card.rank === "Q" || card.rank === "K" ? RANK_NAME[card.rank] : card.rank;
  return `${card.rank === "A" || card.rank === "8" ? "an" : "a"} ${name}`;
}
