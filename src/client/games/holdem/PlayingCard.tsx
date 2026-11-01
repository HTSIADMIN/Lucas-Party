// Playing cards for Hold'em Night: a CSS card with the rank in the corner and
// a small SVG suit, so it reads cleanly from the couch on any TV browser (no
// emoji fonts involved). Size one with font-size — a card is 2.5em × 3.5em.

import type { CSSProperties } from "react";
import type { HeCard, HeSuit } from "@party/shared";

const RANK_NAME: Record<string, string> = { A: "Ace", K: "King", Q: "Queen", J: "Jack" };

export function cardKey(card: HeCard): string {
  return `${card.rank}-${card.suit}`;
}

export function cardName(card: HeCard): string {
  return `${RANK_NAME[card.rank] ?? card.rank} of ${card.suit}`;
}

function SuitShape({ suit }: { suit: HeSuit }) {
  switch (suit) {
    case "hearts":
      return <path d="M50 91 C50 91 6 63 6 33 C6 17 18 7 31 7 C40 7 46 12 50 20 C54 12 60 7 69 7 C82 7 94 17 94 33 C94 63 50 91 50 91 Z" />;
    case "diamonds":
      return <path d="M50 4 L87 50 L50 96 L13 50 Z" />;
    case "spades":
      return <path d="M50 5 C50 5 92 34 92 60 C92 75 81 84 69 84 C61 84 55 80 52 75 C53 84 57 91 65 95 L35 95 C43 91 47 84 48 75 C45 80 39 84 31 84 C19 84 8 75 8 60 C8 34 50 5 50 5 Z" />;
    case "clubs":
      return (
        <>
          <circle cx="50" cy="29" r="20" />
          <circle cx="28" cy="59" r="20" />
          <circle cx="72" cy="59" r="20" />
          <path d="M45 52 C45 74 41 86 32 95 L68 95 C59 86 55 74 55 52 Z" />
        </>
      );
  }
}

export function SuitIcon({ suit, className }: { suit: HeSuit; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden="true">
      <SuitShape suit={suit} />
    </svg>
  );
}

interface CardProps {
  /** Null or `faceDown` draws the back. */
  card?: HeCard | null;
  faceDown?: boolean;
  /** Part of the winning five. */
  lit?: boolean;
  dim?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function PlayingCard({ card, faceDown, lit, dim, className = "", style }: CardProps) {
  if (!card || faceDown) return <span className={`he-card is-back ${className}`} style={style} role="img" aria-label="Face-down card" />;
  const red = card.suit === "hearts" || card.suit === "diamonds";
  const classes = ["he-card", red && "is-red", lit && "is-lit", dim && "is-dim", className].filter(Boolean).join(" ");
  return (
    <span className={classes} style={style} role="img" aria-label={cardName(card)}>
      <span className="he-card-rank">{card.rank}</span>
      <SuitIcon suit={card.suit} className="he-card-corner" />
      <SuitIcon suit={card.suit} className="he-card-pip" />
    </span>
  );
}

/** An empty spot on the board. */
export function CardSlot({ className = "" }: { className?: string }) {
  return <span className={`he-card is-empty ${className}`} aria-hidden="true" />;
}
