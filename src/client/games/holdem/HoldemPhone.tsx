import { useEffect, useRef, useState } from "react";
import { heActionText, heRaiseTo, type HeAction, type HeInput, type HePlayer } from "@party/shared";
import { vibrate } from "../../lib/device";
import { Timer } from "../../ui/Timer";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore, nameOf } from "../shared";
import { CardSlot, PlayingCard } from "./PlayingCard";
import "./holdem.css";

type Room = PhoneGameProps["room"];
type Client = PhoneGameProps["client"];

const fmt = (n: number) => n.toLocaleString();

function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

function joinNames(names: string[]): string {
  return names.length <= 1 ? names[0] ?? "Nobody" : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/**
 * Your hole cards (tap to hide them from nosy neighbours), best hand, the board
 * and the numbers. On your turn it shrinks so the controls fit on one screen.
 */
function HandCard({ view, compact }: { view: HePlayer; compact: boolean }) {
  const [hidden, setHidden] = useState(false);
  const handInfo = view.finalHand ? "Final hand" : view.totalHands ? `Hand ${view.hand} of ${view.totalHands}` : `Hand ${view.hand}`;
  return (
    <div className={`phone-card he-hand ${compact ? "is-compact" : ""}`}>
      {!compact && (
        <div className="he-hand-top">
          <span className="badge">{handInfo}</span>
          <span className="badge">
            Blinds {fmt(view.smallBlind)}/{fmt(view.bigBlind)}
          </span>
          {view.isButton && <span className="badge badge-host">Dealer</span>}
          {view.blind && <span className="badge badge-info">{view.blind === "sb" ? "Small blind" : "Big blind"}</span>}
        </div>
      )}
      <button type="button" className={`he-hole ${view.status === "folded" ? "is-folded" : ""}`} onClick={() => setHidden((h) => !h)} aria-pressed={hidden} aria-label={hidden ? "Show my cards" : "Hide my cards"}>
        {view.cards.length === 2 ? (
          view.cards.map((c, i) => <PlayingCard key={`${view.hand}-${i}-${hidden}`} card={c} faceDown={hidden} className="he-flip" />)
        ) : (
          <>
            <CardSlot />
            <CardSlot />
          </>
        )}
      </button>
      <p className="he-hand-label">{hidden ? "Tap your cards to peek" : view.status === "folded" ? "Folded" : view.handLabel}</p>
      {view.board.length > 0 && (
        <div className="he-mini-board" aria-label="The board">
          {[0, 1, 2, 3, 4].map((i) => {
            const c = view.board[i];
            return c ? <PlayingCard key={i} card={c} /> : <CardSlot key={i} />;
          })}
        </div>
      )}
      {!compact && (
        <div className="he-stats">
          <div className="he-stat">
            <span>Chips</span>
            <b className="tabular">{fmt(view.chips)}</b>
          </div>
          <div className="he-stat">
            <span>Pot</span>
            <b className="tabular">{fmt(view.potTotal)}</b>
          </div>
          <div className="he-stat">
            <span>To call</span>
            <b className="tabular">{view.toCall > 0 ? fmt(view.toCall) : "—"}</b>
          </div>
        </div>
      )}
    </div>
  );
}

function Actions({ view, client, room }: { view: HePlayer; client: Client; room: Room }) {
  const min = view.minRaiseTo;
  const max = view.maxRaiseTo;
  const step = Math.max(1, view.smallBlind);
  const clamp = (n: number) => Math.max(min, Math.min(max, Math.round(n)));
  const [amount, setAmount] = useState(min);
  const [sent, setSent] = useState(false);
  const retry = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (retry.current !== null) window.clearTimeout(retry.current);
    },
    [],
  );

  const send = (action: HeAction, raiseTo?: number) => {
    if (sent) return;
    setSent(true);
    vibrate(30);
    const input: HeInput = { type: "act", action, amount: raiseTo };
    client.input(input);
    // If the tap got lost on a flaky connection, let them try again.
    retry.current = window.setTimeout(() => setSent(false), 1500);
  };

  const quick: [string, number][] = [
    ["Min", min],
    ["½ pot", clamp(heRaiseTo(view.potTotal, view.currentBet, view.toCall, 0.5))],
    ["Pot", clamp(heRaiseTo(view.potTotal, view.currentBet, view.toCall, 1))],
    ["All in", max],
  ];
  const sizing = view.canRaise && max > min;
  const raiseLabel = amount >= max ? `All in ${fmt(max)}` : view.isBet ? `Bet ${fmt(amount)}` : `Raise to ${fmt(amount)}`;
  const callLabel = view.toCall >= view.chips ? `Call all in ${fmt(view.toCall)}` : `Call ${fmt(view.toCall)}`;

  return (
    <>
      {sizing && (
        <div className="phone-card he-raise pop-in">
          <div className="he-raise-row">
            <button type="button" className="btn btn-light btn-icon" aria-label="Less" onClick={() => setAmount((a) => clamp(a - step))}>
              −
            </button>
            <div className="he-raise-amount">
              <span className="label">{view.isBet ? "Bet" : "Raise to"}</span>
              <span className="bet-amount tabular">{fmt(amount)}</span>
            </div>
            <button type="button" className="btn btn-light btn-icon" aria-label="More" onClick={() => setAmount((a) => clamp(a + step))}>
              +
            </button>
          </div>
          <input
            className="he-range"
            type="range"
            min={min}
            max={max}
            step={step}
            value={amount}
            aria-label="Raise amount"
            // The slider moves in small-blind steps; the far end always means all in.
            onChange={(e) => {
              const v = Number(e.target.value);
              setAmount(max - v < step ? max : clamp(v));
            }}
          />
          <div className="bet-quick">
            {quick.map(([label, value]) => (
              <button key={label} type="button" className={`btn btn-sm ${amount === value ? "btn-accent" : "btn-light"}`} onClick={() => setAmount(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Every decision lives in the thumb bar; the card above only sizes the raise. */}
      <div className="phone-sticky he-actions">
        <div className="he-turn-row">
          <span className="he-turn-label">Your move!</span>
          <span className="he-turn-pot tabular">Pot {fmt(view.potTotal)}</span>
          <Timer client={client} room={room} size={44} />
        </div>
        <div className={`he-action-row ${view.canRaise ? "is-three" : ""}`}>
          <button type="button" className="btn btn-danger he-act" disabled={sent} onClick={() => send("fold")}>
            Fold
          </button>
          {view.canCheck ? (
            <button type="button" className="btn btn-success he-act" disabled={sent} onClick={() => send("check")}>
              Check
            </button>
          ) : (
            <button type="button" className="btn btn-success he-act" disabled={sent} onClick={() => send("call")}>
              {callLabel}
            </button>
          )}
          {view.canRaise && (
            <button type="button" className="btn btn-accent he-act" disabled={sent} onClick={() => (sizing && amount < max ? send("raise", amount) : send("allin"))}>
              {sizing ? raiseLabel : `All in ${fmt(max)}`}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function Outcome({ view, room, playerId }: { view: HePlayer; room: Room; playerId: string }) {
  const others = [...new Set(view.results.flatMap((p) => p.winnerIds))].filter((id) => id !== playerId);
  const theirs = joinNames(others.map((id) => nameOf(room, id)));
  const main = view.results[0];
  const title = view.won > 0 ? `You won ${fmt(view.won)}!` : view.chips === 0 ? "Out of chips!" : view.status === "folded" ? "You folded this one" : "Not this time";
  return (
    <div className="phone-card he-status pop-in">
      <div className="he-status-title">{title}</div>
      {view.delta !== 0 && (
        <p className={`phone-gain ${view.delta < 0 ? "is-loss" : ""}`}>
          {view.delta > 0 ? "+" : "−"}
          {fmt(Math.abs(view.delta))} this hand
        </p>
      )}
      {view.won > 0 && view.showdown && view.handLabel && <p className="he-status-line">With {view.handLabel}.</p>}
      {others.length > 0 &&
        (view.won > 0 ? (
          <p className="he-status-line">{theirs} won a piece too.</p>
        ) : (
          <p className="he-status-line">
            {theirs} {others.length > 1 ? "take it" : "takes it"}
            {view.showdown && main?.handLabel ? ` with ${main.handLabel}` : ""}.
          </p>
        ))}
      {view.chips === 0 && <p className="he-status-line">Thanks for playing — stick around and watch the rest!</p>}
    </div>
  );
}

function Status({ view, room, client, playerId }: { view: HePlayer; room: Room; client: Client; playerId: string }) {
  const lastLine = view.log ? heActionText(nameOf(room, view.log.playerId), view.log) : null;
  switch (view.phase) {
    case "deal":
      return (
        <div className="phone-card he-status pop-in">
          <div className="he-status-title">New hand!</div>
          <p className="he-status-line">
            {view.blind === "sb"
              ? `You posted the small blind (${fmt(view.bet)}).`
              : view.blind === "bb"
                ? `You posted the big blind (${fmt(view.bet)}).`
                : "Peek at your cards — the betting starts in a moment."}
          </p>
        </div>
      );
    case "street":
      return (
        <div className="phone-card he-status">
          <div className="he-status-title">{view.runout ? "All in — running it out!" : `The ${view.street}!`}</div>
          <p className="he-status-line">Eyes on the TV.</p>
        </div>
      );
    case "result":
      return <Outcome view={view} room={room} playerId={playerId} />;
    default: {
      const title = view.status === "folded" ? "You folded" : view.status === "allin" ? "You're all in!" : `Waiting for ${nameOf(room, view.actorId)}…`;
      return (
        <div className="phone-card he-status">
          <div className="he-wait">
            <span className="he-status-title">{title}</span>
            {view.actorId && <Timer client={client} room={room} size={40} />}
          </div>
          {lastLine && <p className="he-status-line">{lastLine}</p>}
        </div>
      );
    }
  }
}

export default function HoldemPhone({ view, client, room, playerId }: PhoneGameProps<HePlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;
  if (view.phase === "intro") {
    return (
      <PhoneMessage character={me?.character} mood="cheeky" title="Hold'em Night!">
        <p>Your two secret cards land right here. Check, call, raise — or bluff.</p>
      </PhoneMessage>
    );
  }
  if (view.phase === "podium") return <PhoneScore character={me?.character} score={view.chips} rank={view.rank} gained={0} unit="chips" />;
  if (view.status === "out" && view.phase !== "result") {
    return (
      <PhoneMessage character={me?.character} mood="sad" title="You're out!">
        {view.place !== null && <p>You finished {ordinal(view.place)}.</p>}
        <p>
          {view.playersLeft} {view.playersLeft === 1 ? "player is" : "players are"} still in. Watch the TV and heckle responsibly.
        </p>
      </PhoneMessage>
    );
  }
  return (
    <>
      <HandCard view={view} compact={view.myTurn} />
      {view.myTurn ? <Actions key={view.seq} view={view} client={client} room={room} /> : <Status view={view} room={room} client={client} playerId={playerId} />}
    </>
  );
}
