import type { CSSProperties } from "react";
import { heActionTag, heActionText, type HeSeat, type HeTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import type { Mood } from "../../art/Face";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, playerMap } from "../shared";
import { CardSlot, PlayingCard, cardKey } from "./PlayingCard";
import "./holdem.css";

// Seats ride an ellipse around the felt, clockwise from the bottom-left, so
// "left of the button" goes the way it would at a real table. Bets sit on a
// smaller ellipse in front of each seat. Units are em of `.he-table`.
const SEAT_RX = 28.5;
const SEAT_RY = 12.4;
const BET_RX = 18;
const BET_RY = 7.4;

function angleOf(index: number, count: number): number {
  return ((90 + (360 * (index + 0.5)) / count) * Math.PI) / 180;
}

function at(rx: number, ry: number, angle: number): CSSProperties {
  return { left: `calc(50% + ${(rx * Math.cos(angle)).toFixed(2)}em)`, top: `calc(50% + ${(ry * Math.sin(angle)).toFixed(2)}em)` };
}

const fmt = (n: number) => n.toLocaleString();

function nameIn(view: View, id: string | null | undefined): string {
  return view.seats.find((s) => s.playerId === id)?.name ?? "Someone";
}

function joinNames(names: string[]): string {
  return names.length <= 1 ? names[0] ?? "Nobody" : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

function Intro({ view }: { view: View }) {
  return (
    <div className="tv-center">
      <h1 className="tv-title slam-in">Hold'em Night</h1>
      <Telly size={150} pose="cheer" mood="cheeky" />
      <div className="card tv-rules">
        <ol>
          <li>Your two cards are on your phone — keep them secret!</li>
          <li>Check, call, raise or fold as the flop, turn and river land here.</li>
          <li>Best five-card hand takes the pot… or bluff everyone out of it.</li>
        </ol>
        <p className="muted">
          Everyone starts with 1,000 chips. Blinds start at 10/20 and double every 6 hands.{" "}
          {view.totalHands ? `${view.totalHands} hands — the biggest stack wins.` : "Last stack standing wins!"}
        </p>
      </div>
    </div>
  );
}

function SeatCards({ seat, view, index, count }: { seat: HeSeat; view: View; index: number; count: number }) {
  if (seat.cards) {
    const best = new Set((seat.bestCards ?? []).map(cardKey));
    return (
      <div className="he-seat-cards is-open">
        {seat.cards.map((c) => (
          <PlayingCard key={cardKey(c)} card={c} className="he-flip" lit={best.has(cardKey(c))} dim={best.size > 0 && !best.has(cardKey(c))} />
        ))}
      </div>
    );
  }
  if (!seat.holding) return null;
  return (
    <div className="he-seat-cards" key={`hand-${view.hand}`}>
      {[0, 1].map((i) => (
        <PlayingCard key={i} faceDown className="he-dealt" style={{ animationDelay: `${(i * count + index) * 70}ms` }} />
      ))}
    </div>
  );
}

/** The little label under a seat: [text, tone class]. */
function seatTag(seat: HeSeat, view: View, turn: boolean): [string, string] | null {
  if (seat.status === "out") return ["OUT", "is-out"];
  if (seat.status === "folded") return ["FOLD", "is-fold"];
  if (turn) return [view.toCall > 0 ? `${fmt(view.toCall)} to call` : "Thinking…", "is-turn"];
  // Tabled hands (all-in runout, showdown) show what they're holding.
  if (seat.cards && seat.handLabel) return [seat.handLabel, view.phase === "result" && seat.won > 0 ? "is-win" : "is-hand"];
  if (seat.status === "allin") return ["ALL IN", "is-allin"];
  if (seat.lastAction) return [heActionTag(seat.lastAction), `is-${seat.lastAction}`];
  return null;
}

function SeatTag({ seat, view, turn }: { seat: HeSeat; view: View; turn: boolean }) {
  const tag = seatTag(seat, view, turn);
  if (!tag) return null;
  return (
    <span key={tag[0]} className={`he-seat-tag ${tag[1]}`}>
      {tag[0]}
    </span>
  );
}

function Seat({ seat, view, room, client, index, count }: TvGameProps<View> & { seat: HeSeat; index: number; count: number }) {
  const player = playerMap(room).get(seat.playerId);
  const away = !player?.connected;
  const out = seat.status === "out";
  const turn = view.phase === "betting" && view.actorId === seat.playerId;
  const result = view.phase === "result";
  const winner = result && seat.won > 0;
  const mood: Mood = out ? "sad" : winner ? "win" : result && seat.delta < 0 ? "sad" : turn ? "think" : seat.status === "allin" ? "shock" : "idle";
  const classes = ["he-seat", `is-${seat.status}`, turn && "is-turn", winner && "is-winner", away && !out && "is-away"].filter(Boolean).join(" ");
  return (
    <div className={classes} style={at(SEAT_RX, SEAT_RY, angleOf(index, count))}>
      <Character key={winner ? `win-${view.hand}` : "seat"} id={seat.character} size="3.2em" mood={mood} motion={winner ? "jump" : turn ? "bob" : "none"} dim={out || away} />
      <div className="he-seat-info">
        <span className="he-seat-name">{seat.name}</span>
        <span className="he-seat-chips tabular">{out ? "Out" : fmt(seat.chips)}</span>
      </div>
      <SeatCards seat={seat} view={view} index={index} count={count} />
      {(seat.isButton || seat.blind) && (
        <div className="he-pucks">
          {seat.isButton && <span className="he-puck is-dealer">D</span>}
          {seat.blind && <span className={`he-puck is-${seat.blind}`}>{seat.blind.toUpperCase()}</span>}
        </div>
      )}
      <SeatTag seat={seat} view={view} turn={turn} />
      {winner && (
        <span key={`won-${view.hand}`} className="he-win tabular">
          +{fmt(seat.won)}
        </span>
      )}
      {turn && (
        <div className="he-seat-timer">
          <Timer client={client} room={room} size="2.8em" />
        </div>
      )}
    </div>
  );
}

function Pot({ view }: { view: View }) {
  const split = view.phase !== "result" && view.pots.length > 1;
  return (
    <div className="he-pot">
      <span className="he-chip is-big" aria-hidden="true" />
      <span key={view.potTotal} className="he-pot-total tabular pop-in">
        {fmt(view.potTotal)}
      </span>
      {split && (
        <span className="he-pot-sides">
          {view.pots.map((p, i) => (
            <span key={i} className="he-pot-side tabular">
              {i === 0 ? "Main" : `Side ${i}`} {fmt(p.amount)}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

function Board({ view }: { view: View }) {
  // At a showdown, light up the main pot winner's five.
  const main = view.phase === "result" && view.showdown ? view.pots[0] : undefined;
  const best = main ? view.seats.find((s) => s.playerId === main.winnerIds[0])?.bestCards : null;
  const lit = best ? new Set(best.map(cardKey)) : null;
  return (
    <div className="he-board">
      {[0, 1, 2, 3, 4].map((i) => {
        const card = view.board[i];
        if (!card) return <CardSlot key={`slot-${i}`} />;
        return (
          <PlayingCard
            key={cardKey(card)}
            card={card}
            className="he-flip"
            style={{ animationDelay: `${(i < 3 ? i : 0) * 140}ms` }}
            lit={lit?.has(cardKey(card))}
            dim={lit ? !lit.has(cardKey(card)) : false}
          />
        );
      })}
    </div>
  );
}

function Caption({ view }: { view: View }) {
  if (view.phase === "street") {
    return (
      <div key={`${view.hand}-${view.board.length}`} className={`he-caption ${view.runout ? "is-allin" : ""}`}>
        {view.runout ? "All in! Running out the board…" : `Here's the ${view.street}!`}
      </div>
    );
  }
  if (!view.log) return null;
  return (
    <div key={`${view.hand}-${view.seq}-${view.log.kind}`} className={`he-caption ${view.log.allIn ? "is-allin" : ""}`}>
      {heActionText(nameIn(view, view.log.playerId), view.log)}
    </div>
  );
}

function Results({ view }: { view: View }) {
  const many = view.pots.length > 1;
  return (
    <div className="he-results">
      {view.pots.map((pot, i) => {
        const who = joinNames(pot.winnerIds.map((id) => nameIn(view, id)));
        const which = many ? ` (${i === 0 ? "main pot" : `side pot ${i}`})` : "";
        const how = !view.showdown ? " — everyone else folded" : pot.eligibleIds.length === 1 ? " — nobody else could win it" : pot.handLabel ? ` with ${pot.handLabel}` : "";
        return (
          <div key={i} className="he-result rise-in" style={{ animationDelay: `${400 + i * 450}ms` }}>
            <b>{who}</b> {pot.winnerIds.length > 1 ? "split" : "wins"} {fmt(pot.amount)}
            {which}
            {how}
          </div>
        );
      })}
    </div>
  );
}

function Banner({ view }: { view: View }) {
  if (view.phase === "street" && view.runout) {
    return (
      <div key={`allin-${view.hand}`} className="he-banner is-danger">
        All in!
      </div>
    );
  }
  if (view.phase === "deal" && (view.finalHand || view.blindsUp)) {
    return (
      <div key={`deal-${view.hand}`} className="he-banner">
        {view.finalHand ? "Final hand!" : `Blinds up! ${fmt(view.smallBlind)}/${fmt(view.bigBlind)}`}
      </div>
    );
  }
  return null;
}

function Info({ view }: { view: View }) {
  const hand = view.finalHand ? "Final hand!" : view.totalHands ? `Hand ${view.hand} of ${view.totalHands}` : `Hand ${view.hand}`;
  const next = view.finalHand ? "" : view.handsUntilBlindsUp === 1 ? " · up next hand" : ` · up in ${view.handsUntilBlindsUp}`;
  return (
    <>
      <div className="he-info">
        <span className="tv-pill">{hand}</span>
        <span className="he-info-line">
          Blinds {fmt(view.smallBlind)}/{fmt(view.bigBlind)}
          {next}
        </span>
      </div>
      {view.headsUp && (
        <div className="he-info is-right">
          <span className="tv-pill he-headsup">Heads-up!</span>
        </div>
      )}
    </>
  );
}

export default function HoldemTv(props: TvGameProps<View>) {
  const { room, view } = props;
  if (!view) return null;
  if (view.phase === "intro") return <Intro view={view} />;
  if (view.phase === "podium") return <Podium room={room} rows={view.standings.map((s) => ({ playerId: s.playerId, score: s.chips }))} unit="chips" />;
  const count = view.seats.length;
  return (
    <div className="he-stage">
      <div className="he-table">
        <div className="he-rail">
          <div className="he-felt" />
        </div>
        <Info view={view} />
        <div className="he-center">
          <Pot view={view} />
          <Board view={view} />
          {view.phase === "result" ? <Results view={view} /> : <Caption view={view} />}
        </div>
        {view.seats.map((seat, i) =>
          seat.bet > 0 ? (
            <div key={`bet-${seat.playerId}-${seat.bet}`} className="he-bet tabular" style={at(BET_RX, BET_RY, angleOf(i, count))}>
              <span className="he-chip" aria-hidden="true" />
              {fmt(seat.bet)}
            </div>
          ) : null,
        )}
        {view.seats.map((seat, i) => (
          <Seat key={seat.playerId} {...props} seat={seat} index={i} count={count} />
        ))}
        <Banner view={view} />
      </div>
    </div>
  );
}
