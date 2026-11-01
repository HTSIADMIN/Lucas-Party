import { useEffect, useState } from "react";
import type { BjPlayer, PlayerPublic } from "@party/shared";
import { vibrate } from "../../lib/device";
import { Timer } from "../../ui/Timer";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore } from "../shared";
import { Hand, cardName, totalLabel } from "./PlayingCard";
import "./blackjack.css";

type Client = PhoneGameProps["client"];
type Room = PhoneGameProps["room"];

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toLocaleString()}`;

function handLabel(view: BjPlayer) {
  return view.finalHand ? "Final hand!" : `Hand ${view.hand} of ${view.totalHands}`;
}

/** `lastBet` starts the slider where you bet last hand — most people keep a steady stake. */
function BetForm({ view, room, client, lastBet, onBet }: { view: BjPlayer; room: Room; client: Client; lastBet: number | null; onBet(amount: number): void }) {
  const clamp = (n: number) => Math.max(view.minBet, Math.min(view.chips, Math.round(n)));
  const [amount, setAmount] = useState(() => view.bet ?? clamp(lastBet ?? view.minBet));
  useEffect(() => setAmount((a) => clamp(a)), [view.chips, view.minBet]); // eslint-disable-line react-hooks/exhaustive-deps
  const quick = [
    ["Min", view.minBet],
    ["25%", view.chips * 0.25],
    ["50%", view.chips * 0.5],
    ["All in", view.chips],
  ] as const;
  return (
    <div className="phone-card pop-in">
      <div className="bj-phone-top">
        <span className="label">{handLabel(view)}</span>
        <Timer client={client} room={room} size={44} />
      </div>
      <div className="bj-phone-stack">
        You have <b className="tabular">{view.chips.toLocaleString()}</b> chips
      </div>
      <div className="bet-amount tabular">{amount.toLocaleString()}</div>
      <input
        className="bj-range"
        type="range"
        min={view.minBet}
        max={view.chips}
        step={Math.max(1, Math.round(view.chips / 100))}
        value={amount}
        onChange={(e) => setAmount(clamp(Number(e.target.value)))}
        aria-label="Bet amount"
      />
      <div className="bet-quick">
        {quick.map(([label, value]) => (
          <button key={label} type="button" className="btn btn-light btn-sm" onClick={() => setAmount(clamp(value))}>
            {label}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-accent btn-lg btn-block" onClick={() => onBet(amount)}>
        {view.locked ? "Update bet" : "Place bet"}
      </button>
      <p className="bj-phone-note">
        {view.locked ? `✅ Bet placed: ${view.bet?.toLocaleString()} chips` : `Minimum ${view.minBet.toLocaleString()} — no bet in time means the minimum.`}
      </p>
      <p className="bj-phone-note muted">{view.peekLeft ? "👀 Peek ready: once per game, sneak a look at the dealer's hidden card." : "👀 Peek used this game."}</p>
    </div>
  );
}

/** Hit / Stand / Double / Peek. Each tap carries the hand size, so a repeat can't land twice. */
function Actions({ view, client }: { view: BjPlayer; client: Client }) {
  const [sentAt, setSentAt] = useState<number | null>(null);
  // If a tap got lost on a flaky connection, wake the buttons back up.
  useEffect(() => {
    if (sentAt === null) return;
    const id = window.setTimeout(() => setSentAt(null), 1500);
    return () => window.clearTimeout(id);
  }, [sentAt]);
  const busy = sentAt === view.cards.length;
  const send = (type: "hit" | "stand" | "double") => {
    vibrate(30);
    setSentAt(view.cards.length);
    client.input({ type, cards: view.cards.length });
  };
  return (
    <div className="phone-sticky bj-actions">
      {view.canPeek && (
        <button type="button" className="btn btn-light btn-block" onClick={() => client.input({ type: "peek" })}>
          👀 Peek at the hole card · once per game
        </button>
      )}
      {view.cards.length === 2 && (
        <button type="button" className="btn btn-accent btn-lg btn-block" disabled={busy || !view.canDouble} onClick={() => send("double")}>
          {view.canDouble ? `Double · bet ${((view.bet ?? 0) * 2).toLocaleString()}` : "Double (not enough chips)"}
        </button>
      )}
      <div className="bj-actions-row">
        <button type="button" className="btn btn-success btn-xl" disabled={busy} onClick={() => send("hit")}>
          Hit
        </button>
        <button type="button" className="btn btn-danger btn-xl" disabled={busy} onClick={() => send("stand")}>
          Stand
        </button>
      </div>
    </div>
  );
}

function dealerText(view: BjPlayer): string {
  if (view.dealerTotal === null) return `shows ${cardName(view.dealer[0])}`;
  if (view.dealerBlackjack) return "has blackjack";
  if (view.dealerBust) return `busts with ${view.dealerTotal}`;
  if (view.phase === "results" && view.dealerTotal >= 17) return `stands on ${view.dealerTotal}`;
  return `has ${totalLabel(view.dealerTotal, view.dealerSoft, view.dealerTotal >= 17 || view.phase === "results")}`;
}

function statusText(view: BjPlayer): string {
  if (view.phase === "play") {
    if (view.status === "playing") return "Your move!";
    if (view.status === "blackjack") return "Blackjack! Pays 3:2.";
    if (view.status === "bust") return "Bust! Better luck next hand.";
    return view.doubled ? "Doubled down. Waiting for the table…" : "Standing. Waiting for the table…";
  }
  if (view.phase === "dealer") {
    if (view.dealerBlackjack) return "The dealer peeked: blackjack.";
    if (view.status === "bust") return "Bust.";
    if (view.status === "blackjack") return "Blackjack!";
    return "Dealer's turn… fingers crossed!";
  }
  return "";
}

function resultTitle(view: BjPlayer): { title: string; mood: "win" | "happy" | "idle" | "sad" } {
  switch (view.outcome) {
    case "blackjack":
      return { title: "Blackjack!", mood: "win" };
    case "win":
      return { title: view.dealerBust ? "Dealer busts!" : "You win!", mood: "win" };
    case "push":
      return { title: "Push", mood: "idle" };
    default:
      return { title: view.status === "bust" ? "Bust!" : view.dealerBlackjack ? "Dealer blackjack" : "Dealer wins", mood: "sad" };
  }
}

function TableView({ view, room, client }: { view: BjPlayer; room: Room; client: Client }) {
  const settled = view.status !== "playing" || view.phase !== "play";
  const result = view.phase === "results" && view.outcome ? resultTitle(view) : null;
  const status = statusText(view);
  return (
    <>
      {result && (
        <div className={`bj-phone-result pop-in is-${result.mood}`}>
          <h2 className="phone-message-title">{result.title}</h2>
          <p className={`phone-gain ${(view.delta ?? 0) < 0 ? "is-loss" : ""}`}>
            {view.outcome === "push" ? "Bet back" : `${signed(view.delta ?? 0)} chips`}
          </p>
        </div>
      )}
      <div className="phone-card bj-phone-table">
        <div className="bj-phone-top">
          <span className="label">{handLabel(view)}</span>
          {view.phase === "play" ? <Timer client={client} room={room} size={44} /> : <span className="bj-phone-stack">{view.chips.toLocaleString()} chips</span>}
        </div>
        <section className="bj-phone-row">
          <span className="label">Dealer {dealerText(view)}</span>
          <div className="bj-phone-cards is-dealer">
            <Hand cards={view.dealer} id={`dealer-${view.hand}`} dealSlot={1} dealSlots={2} />
          </div>
          {view.peeked && view.phase === "play" && <p className="bj-peek-note">👀 Only you can see the hole card</p>}
        </section>
        <section className="bj-phone-row">
          <span className="label">
            Your hand · bet {view.bet?.toLocaleString()}
            {view.doubled ? " (doubled)" : ""}
          </span>
          <div className="bj-phone-cards">
            <Hand cards={view.cards} id={`mine-${view.hand}`} dealSlot={0} dealSlots={2} />
          </div>
          <div className="bj-phone-total">
            <span className={`bj-total ${view.status === "bust" ? "is-bust" : view.status === "blackjack" ? "is-bj" : ""}`}>{totalLabel(view.total, view.soft, settled)}</span>
            {status && <span className="bj-phone-status">{status}</span>}
          </div>
        </section>
      </div>
      {view.canAct && <Actions view={view} client={client} />}
    </>
  );
}

export default function BlackjackPhone({ view, client, room, playerId }: PhoneGameProps<BjPlayer>) {
  const me: PlayerPublic | undefined = room.players.find((p) => p.id === playerId);
  const [lastBet, setLastBet] = useState<number | null>(null);
  if (!view) return null;
  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Blackjack Bash!">
          <p>Beat the dealer to 21. Everyone plays at once, right here on your phone.</p>
        </PhoneMessage>
      );
    case "bet":
      return (
        <BetForm
          key={view.hand}
          view={view}
          room={room}
          client={client}
          lastBet={lastBet}
          onBet={(amount) => {
            setLastBet(amount);
            client.input({ type: "bet", amount });
          }}
        />
      );
    case "play":
    case "dealer":
    case "results":
      if (view.sittingOut) {
        return (
          <PhoneMessage character={me?.character} mood="think" title="Sitting this hand out">
            <p>Your phone was away for the deal. You're back in next hand!</p>
          </PhoneMessage>
        );
      }
      return <TableView view={view} room={room} client={client} />;
    default:
      return <PhoneScore character={me?.character} score={view.chips} rank={view.rank} gained={view.lastDelta} unit="chips" />;
  }
}
