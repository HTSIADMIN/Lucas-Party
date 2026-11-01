// One word card, shared by the TV board and the phone grids. Kinds are told
// apart by shape as well as colour: Red agents carry a diamond, Blue agents a
// circle, the assassin a skull; bystanders stay plain beige.

import { CHARACTERS, type RoomView, type SpyCard, type SpyCardKind, type SpyVote } from "@party/shared";
import { playerMap } from "../shared";

export const KIND_LABEL: Record<SpyCardKind, string> = {
  red: "Red agent",
  blue: "Blue agent",
  bystander: "Bystander",
  assassin: "Assassin",
};

/** Seat colours of everyone who picked each card, keyed by card index (SPY_END_TURN included). */
export function voteColours(votes: SpyVote[], room: RoomView): Map<number, string[]> {
  const map = playerMap(room);
  const out = new Map<number, string[]>();
  for (const v of votes) {
    const p = map.get(v.playerId);
    out.set(v.index, [...(out.get(v.index) ?? []), p ? CHARACTERS[p.character].color : "var(--surface-3)"]);
  }
  return out;
}

export function VoteDots({ colours }: { colours: string[] }) {
  if (colours.length === 0) return null;
  return (
    <span className="spy-dots" aria-hidden="true">
      {colours.map((c, i) => (
        <span key={i} className="spy-dot" style={{ background: c }} />
      ))}
    </span>
  );
}

interface TileProps {
  card: SpyCard;
  /** Seat colours of the operatives currently picking this card. */
  dots?: string[];
  /** The card that just flipped — plays the flip. */
  last?: boolean;
  selected?: boolean;
  mine?: boolean;
  onPick?(): void;
}

export function SpyCardTile({ card, dots = [], last = false, selected = false, mine = false, onPick }: TileProps) {
  const classes = [
    "spy-card",
    card.kind && `is-${card.kind}`,
    card.kind && !card.flipped && "is-shown",
    card.flipped && "is-flipped",
    last && card.flipped && "is-last",
    dots.length > 0 && "has-votes",
    selected && "is-selected",
    mine && "is-mine",
    card.word.length >= 8 && "is-long",
  ]
    .filter(Boolean)
    .join(" ");
  const body = (
    <>
      <span className="spy-word">{card.word}</span>
      {card.kind && <span className="sr-only">{`, ${KIND_LABEL[card.kind]}${card.flipped ? "" : " (not flipped yet)"}`}</span>}
      {card.kind === "assassin" ? (
        <span className="spy-skull" aria-hidden="true">
          💀
        </span>
      ) : card.kind === "red" || card.kind === "blue" ? (
        <span className="spy-emblem" aria-hidden="true" />
      ) : null}
      <VoteDots colours={dots} />
      {mine && (
        <span className="spy-mine" aria-hidden="true">
          ✓
        </span>
      )}
    </>
  );
  if (onPick) {
    return (
      <button type="button" className={classes} aria-pressed={selected} onClick={onPick}>
        {body}
      </button>
    );
  }
  return <div className={classes}>{body}</div>;
}
