import type { CSSProperties } from "react";
import { BJ_START_CHIPS, CHARACTERS, type BjSeat, type BjTv as View, type PlayerPublic } from "@party/shared";
import { Character } from "../../art/Character";
import type { Mood } from "../../art/Face";
import { Telly, type TellyPose } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, Scoreboard, playerMap } from "../shared";
import { EmptyHand, Hand, cardName, totalLabel } from "./PlayingCard";
import "./blackjack.css";

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toLocaleString()}`;

/** Telly deals tonight: what they say and how they feel about it. */
function dealerLine(view: View): { text: string; mood: Mood; pose: TellyPose } {
  const total = view.dealerTotal ?? 0;
  const contested = view.seats.some((s) => s.status === "stood");
  switch (view.phase) {
    case "bet":
      return { text: view.finalHand ? "Final hand — make it count!" : "Place your bets, folks!", mood: "happy", pose: "wave" };
    case "play":
      return { text: `I'm showing ${cardName(view.dealer[0])}. Hit, stand or double!`, mood: "cheeky", pose: "idle" };
    case "dealer":
      if (view.dealerBlackjack) return { text: "Blackjack! Sorry, folks.", mood: "win", pose: "cheer" };
      if (view.dealerBust) return { text: `${total}! I bust!`, mood: "shock", pose: "idle" };
      if (!contested) return { text: "Nothing left to beat.", mood: "idle", pose: "idle" };
      return total < 17 ? { text: `${total}… I have to hit.`, mood: "think", pose: "idle" } : { text: `${total}. I stand.`, mood: "cheeky", pose: "idle" };
    default:
      if (view.dealerBlackjack) return { text: "Dealer blackjack!", mood: "win", pose: "cheer" };
      if (view.dealerBust) return { text: "I bust! Everyone still in wins.", mood: "sad", pose: "idle" };
      // Under 17 here means everyone busted, so the dealer never had to draw.
      return total < 17 ? { text: `Nobody left to beat — I keep ${total}.`, mood: "cheeky", pose: "idle" } : { text: `I stand on ${total}.`, mood: "happy", pose: "idle" };
  }
}

/** `slots` = seats at the table + the dealer, who is dealt last in each pass. */
function DealerArea({ view, room, client, slots }: TvGameProps<View> & { slots: number }) {
  const line = dealerLine(view);
  const revealed = view.dealerTotal !== null;
  const timed = view.phase === "bet" || view.phase === "play";
  return (
    <div className="bj-dealer">
      <div className="bj-dealer-host">
        <Telly className="bj-telly" size={120} mood={line.mood} pose={line.pose} />
        <div key={line.text} className="bj-say pop-in">
          {line.text}
        </div>
      </div>
      <div className="bj-dealer-hand">
        {view.dealer.length ? <Hand cards={view.dealer} id={`dealer-${view.hand}`} dealSlot={slots - 1} dealSlots={slots} /> : <EmptyHand />}
        {revealed ? (
          <span className={`bj-total ${view.dealerBust ? "is-bust" : view.dealerBlackjack ? "is-bj" : ""}`}>
            {view.dealerBlackjack ? "Blackjack" : view.dealerBust ? `Bust · ${view.dealerTotal}` : totalLabel(view.dealerTotal!, view.dealerSoft, view.dealerTotal! >= 17 || view.phase === "results")}
          </span>
        ) : view.dealerShows !== null ? (
          <span className="bj-total is-hidden">Shows {view.dealer[0]?.rank === "A" ? "A" : view.dealerShows}</span>
        ) : null}
      </div>
      <div className="bj-dealer-side">
        <span className="tv-pill">{view.finalHand ? "Final hand!" : `Hand ${view.hand} of ${view.totalHands}`}</span>
        {timed && <Timer client={client} room={room} size="4.6em" />}
      </div>
    </div>
  );
}

interface SeatLook { label: string | null; tone: string; mood: Mood }

function seatLook(seat: BjSeat, phase: View["phase"]): SeatLook {
  if (phase === "bet") return seat.bet !== null ? { label: "Bet placed", tone: "ready", mood: "happy" } : { label: "Betting…", tone: "waiting", mood: "think" };
  if (seat.sittingOut) return { label: "Sitting out", tone: "waiting", mood: "idle" };
  if (phase === "results" && seat.outcome) {
    const delta = seat.delta ?? 0;
    if (seat.outcome === "blackjack") return { label: `Blackjack ${signed(delta)}`, tone: "bj", mood: "win" };
    if (seat.outcome === "win") return { label: `Win ${signed(delta)}`, tone: "win", mood: "win" };
    if (seat.outcome === "push") return { label: "Push", tone: "push", mood: "idle" };
    return { label: `${seat.status === "bust" ? "Bust" : "Lose"} ${signed(delta)}`, tone: "lose", mood: "sad" };
  }
  switch (seat.status) {
    case "blackjack":
      return { label: "Blackjack!", tone: "bj", mood: "win" };
    case "bust":
      return { label: "Bust!", tone: "bust", mood: "sad" };
    case "stood":
      // While the dealer plays, everyone still in sweats it out.
      return phase === "play" ? { label: seat.doubled ? "Doubled" : "Stand", tone: "stood", mood: "idle" } : { label: null, tone: "stood", mood: "shock" };
    case "playing":
      return { label: "Thinking…", tone: "thinking", mood: "think" };
    default:
      return { label: null, tone: "waiting", mood: "idle" };
  }
}

function Seat({ seat, player, view, slot, slots }: { seat: BjSeat; player: PlayerPublic; view: View; slot: number; slots: number }) {
  const look = seatLook(seat, view.phase);
  const settled = seat.status !== "playing" || view.phase !== "play";
  const winner = view.phase === "results" && (seat.outcome === "win" || seat.outcome === "blackjack");
  return (
    <div
      className={`bj-seat is-${look.tone} ${player.connected ? "" : "is-away"} ${winner ? "is-winner" : ""}`}
      style={{ ["--seat" as string]: CHARACTERS[player.character].color } as CSSProperties}
    >
      {seat.peeked && view.phase !== "bet" && (
        <span className="bj-peek-tag" title="Peeked at the hole card">
          👀
        </span>
      )}
      <div className="bj-seat-hand">
        {seat.cards.length ? (
          <Hand cards={seat.cards} id={`${view.hand}-${seat.playerId}`} dealSlot={slot} dealSlots={slots} />
        ) : view.phase === "bet" && seat.bet !== null ? (
          <span className="bj-seat-stake pop-in tabular">{seat.bet.toLocaleString()}</span>
        ) : (
          <EmptyHand />
        )}
      </div>
      <div className="bj-seat-line">
        {seat.cards.length > 0 && <span className={`bj-total ${seat.status === "bust" ? "is-bust" : seat.status === "blackjack" ? "is-bj" : ""}`}>{totalLabel(seat.total, seat.soft, settled)}</span>}
        {look.label && (
          <span key={`${view.phase}-${look.label}`} className={`bj-status is-${look.tone} pop-in`}>
            {look.label}
          </span>
        )}
      </div>
      <div className="bj-seat-plate">
        <Character key={`${view.hand}-${view.phase}`} id={player.character} size="2.4em" mood={look.mood} motion={winner ? "jump" : look.tone === "thinking" || look.tone === "waiting" ? "bob" : "none"} dim={!player.connected} />
        <span className="bj-seat-who">
          <span className="bj-seat-name">{player.name}</span>
          <span className="bj-seat-chips tabular">{seat.chips.toLocaleString()} chips</span>
        </span>
        {seat.bet !== null && view.phase !== "bet" && (
          <span className={`bj-bet tabular ${seat.doubled ? "is-doubled" : ""}`}>
            {seat.bet.toLocaleString()}
            {seat.doubled && <small>2×</small>}
          </span>
        )}
      </div>
    </div>
  );
}

function Table(props: TvGameProps<View>) {
  const { view, room } = props;
  const map = playerMap(room);
  const seats = view.seats.filter((s) => map.has(s.playerId));
  const crowded = seats.length > 4;
  const cols = crowded ? Math.ceil(seats.length / 2) : Math.max(1, seats.length);
  return (
    <div className={`bj-table ${crowded ? "is-crowded" : ""}`}>
      <DealerArea {...props} slots={seats.length + 1} />
      <div className="bj-seats" style={{ ["--cols" as string]: cols } as CSSProperties}>
        {seats.map((seat, i) => (
          <Seat key={seat.playerId} seat={seat} player={map.get(seat.playerId)!} view={view} slot={i} slots={seats.length + 1} />
        ))}
      </div>
    </div>
  );
}

export default function BlackjackTv(props: TvGameProps<View>) {
  const { room, view } = props;
  if (!view) return null;
  const rows = view.standings.map((s) => ({ playerId: s.playerId, score: s.chips, gained: s.delta }));

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Blackjack Bash</h1>
          <Telly className="bj-intro-telly" size={150} pose="cheer" mood="cheeky" />
          <div className="card tv-rules">
            <ol>
              <li>Bet some of your {BJ_START_CHIPS.toLocaleString()} chips.</li>
              <li>
                Everyone plays at once: <b>hit</b>, <b>stand</b> or <b>double</b> on your phone.
              </li>
              <li>Beat the dealer's hand without going over 21. Blackjack pays 3:2!</li>
            </ol>
            <p className="muted">
              The dealer stands on all 17s. Once per game you can 👀 <b>Peek</b> at the dealer's hidden card — on your phone only.
            </p>
          </div>
        </div>
      );
    case "bet":
    case "play":
    case "dealer":
    case "results":
      return <Table {...props} />;
    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={rows} title={`After hand ${view.hand} of ${view.totalHands}`} unit="chips" />
        </div>
      );
    case "podium":
      return <Podium room={room} rows={rows} unit="chips" />;
  }
}
