import type { CSSProperties, ReactNode } from "react";
import {
  LD_CALL_POINTS,
  LD_OUTLAST_POINTS,
  LD_WILD_FACE,
  LD_WINNER_POINTS,
  ldIsMatch,
  type LdBidValue,
  type LdCall,
  type LdSeat,
  type LdTv as View,
  type PlayerPublic,
} from "@party/shared";
import { Character } from "../../art/Character";
import type { Mood } from "../../art/Face";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, Scoreboard, nameOf, playerMap } from "../shared";
import { Cup, Die, type DieTone } from "./Die";
import "./liarsdice.css";

type Room = TvGameProps["room"];

const SEAT_DIE = "1.9em";
const HISTORY_MAX = 7;

/** How a revealed die reads against the challenged bid. */
function toneFor(value: number, call: LdCall | null): DieTone {
  if (!call) return "plain";
  if (!ldIsMatch(value, call.face)) return "dim";
  return value === LD_WILD_FACE ? "wild" : "match";
}

function BidValue({ bid, die = "1em" }: { bid: LdBidValue; die?: string }) {
  return (
    <span className="ld-bidval">
      <b>{bid.quantity}</b>×<Die value={bid.face} size={die} />
    </span>
  );
}

function Seat({ seat, player, view, order }: { seat: LdSeat; player: PlayerPublic | undefined; view: View; order: number }) {
  const id = seat.playerId;
  const call = view.call;
  const result = view.phase === "result" ? call : null;
  const isTurn = view.turnId === id;
  // Missing from the room (kicked) counts as away: the clock plays for them too.
  const away = !player?.connected;
  const lost = result?.loserId === id;
  const justOut = result?.eliminatedId === id;
  const wonDie = Boolean(result?.gainedDie && result.callerId === id);
  const goodCall = Boolean(result?.correct && result.callerId === id);
  const winner = view.phase === "result" && view.winnerId === id;
  const calling = view.phase === "reveal" && call?.callerId === id;
  const lastBid = view.phase === "bid" || view.phase === "reveal" ? [...view.history].reverse().find((b) => b.playerId === id) : undefined;

  // Face-down dice while bidding, the real ones once the cups lift. Lost dice leave empty slots.
  const dice: ReactNode[] = [];
  if (seat.shown) {
    const last = seat.shown.length - 1;
    seat.shown.forEach((v, i) => dice.push(<Die key={i} value={v} size={SEAT_DIE} tone={toneFor(v, call)} className={lost && i === last ? "is-lost" : undefined} />));
    if (wonDie) dice.push(<Die key="won" value={null} size={SEAT_DIE} tone="hidden" className="is-won" />);
  } else {
    for (let i = 0; i < seat.dice; i++) dice.push(<Die key={i} value={null} size={SEAT_DIE} tone="hidden" />);
  }
  for (let i = dice.length; i < view.startDice; i++) dice.push(<Die key={`slot${i}`} value={null} size={SEAT_DIE} tone="empty" />);

  const cheering = winner || goodCall || wonDie;
  const challenged = view.phase === "reveal" && call?.bidderId === id;
  const mood: Mood = cheering ? "win" : lost || seat.out ? "sad" : isTurn ? "think" : calling ? "cheeky" : challenged ? "shock" : "idle";
  const motion = cheering ? "jump" : lost ? "shake" : isTurn ? "bob" : "none";

  let tag: ReactNode = null;
  if (justOut) tag = <span className="ld-seat-tag is-bad slam-in">Out!</span>;
  else if (seat.out) tag = <span className="ld-seat-tag is-out">Out</span>;
  else if (winner) tag = <span className="ld-seat-tag is-good slam-in">Winner!</span>;
  else if (lost) tag = <span className="ld-seat-tag is-bad pop-in">−1 die</span>;
  else if (wonDie) tag = <span className="ld-seat-tag is-good pop-in">+1 die</span>;
  else if (goodCall) tag = <span className="ld-seat-tag is-good pop-in">+{LD_CALL_POINTS}</span>;
  else if (calling && call) tag = <span className={`ld-seat-tag is-call slam-in ${call.kind === "spotOn" ? "is-spot" : ""}`}>{call.kind === "liar" ? "LIAR!" : "SPOT ON!"}</span>;
  else if (isTurn) tag = <span className="ld-seat-tag is-turn">{away ? "away…" : "thinking…"}</span>;
  else if (lastBid) tag = <span className="ld-seat-tag"><BidValue bid={lastBid} /></span>;

  const classes = ["ld-seat", isTurn && "is-turn", seat.out && !justOut && "is-out", away && "is-away", lost && "is-loser", cheering && "is-winner"];
  return (
    <div className={classes.filter(Boolean).join(" ")} style={{ ["--ld-delay" as string]: `${order * 0.16}s` } as CSSProperties}>
      {tag}
      {player && <Character id={player.character} size="3.4em" mood={mood} motion={motion} dim={away || (seat.out && !justOut)} className="ld-seat-char" />}
      <span className="ld-seat-name">{player?.name ?? "Someone"}</span>
      <div className={`ld-seat-dice ${seat.shown ? "is-shown" : ""}`}>{dice}</div>
    </div>
  );
}

/** Seats around a felt table: the top row runs left→right, the bottom row right→left, so turns go round clockwise. */
function Table({ view, room, children }: { view: View; room: Room; children: ReactNode }) {
  const map = playerMap(room);
  const half = Math.ceil(view.seats.length / 2);
  const seat = (s: LdSeat, order: number) => <Seat key={s.playerId} seat={s} player={map.get(s.playerId)} view={view} order={order} />;
  return (
    <div className={`ld-table is-${view.phase}`}>
      <div className="ld-seats">{view.seats.slice(0, half).map((s, i) => seat(s, i))}</div>
      <div className="ld-felt">{children}</div>
      <div className="ld-seats is-bottom">{view.seats.slice(half).map((s, i) => seat(s, half + i))}</div>
    </div>
  );
}

function TableCount({ view }: { view: View }) {
  return (
    <div className="ld-felt-side">
      <span className="ld-total tabular">{view.totalDice}</span>
      <span className="ld-total-label">dice on the table</span>
      <span className="ld-wild">
        <Die value={LD_WILD_FACE} size="1.5em" tone="wild" /> ones are wild
      </span>
    </div>
  );
}

function History({ view, room }: { view: View; room: Room }) {
  if (!view.history.length) return null;
  const map = playerMap(room);
  const skipped = Math.max(0, view.history.length - HISTORY_MAX);
  const shown = view.history.slice(skipped);
  return (
    <div className="ld-history">
      {skipped > 0 && <span className="ld-hist is-more">+{skipped} earlier</span>}
      {shown.map((b, i) => {
        const p = map.get(b.playerId);
        return (
          <span key={skipped + i} className={`ld-hist ${i === shown.length - 1 ? "is-latest" : ""} ${b.auto ? "is-auto" : ""}`}>
            {p && <Character id={p.character} size="1.5em" motion="none" />}
            <BidValue bid={b} die="1.1em" />
          </span>
        );
      })}
    </div>
  );
}

/** The challenged bid next to what the cups actually held. */
function Versus({ call, live }: { call: LdCall; live: boolean }) {
  const status = call.count < call.quantity ? "is-short" : call.count === call.quantity ? "is-exact" : "is-over";
  return (
    <div className={`ld-versus ${live ? "is-live" : ""}`}>
      <div className="ld-versus-box">
        <span className="ld-versus-label">The bid</span>
        <span className="ld-versus-value">
          <BidValue bid={call} die="0.85em" />
        </span>
      </div>
      <div className={`ld-versus-box is-count ${status}`}>
        <span className="ld-versus-label">On the table</span>
        <span className="ld-versus-value tabular">{call.count}</span>
      </div>
    </div>
  );
}

function verdict(call: LdCall, room: Room): { headline: string; line: string } {
  const caller = nameOf(room, call.callerId);
  const bidder = nameOf(room, call.bidderId);
  if (call.kind === "liar") {
    return call.correct
      ? { headline: "Busted!", line: `Only ${call.count} — ${bidder} loses a die` }
      : { headline: "It's true!", line: `${call.count} on the table — ${caller} loses a die` };
  }
  if (!call.correct) return { headline: "Not quite!", line: `${call.count}, not ${call.quantity} — ${caller} loses a die` };
  return { headline: "Spot on!", line: call.gainedDie ? `Exactly ${call.count} — ${caller} wins a die back` : `Exactly ${call.count} — ${caller}'s cup is already full` };
}

export default function LiarsDiceTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Liar's Dice</h1>
          <Telly size={160} pose="cheer" mood="cheeky" />
          <div className="card tv-rules">
            <ol>
              <li>Everyone rolls {view.startDice} secret dice — peek at yours on your phone.</li>
              <li>
                Take turns bidding how many of a face are on the <b>whole table</b>. Every bid must go higher.
              </li>
              <li>
                Don't buy it? Call <b>LIAR!</b> Think it's exact? Call <b>SPOT ON!</b>
              </li>
            </ol>
            <p className="muted ld-rules-note">
              <Die value={LD_WILD_FACE} size="1.4em" tone="wild" /> Ones are wild. Whoever's wrong loses a die — the last player with dice wins.
            </p>
          </div>
        </div>
      );

    case "roll": {
      const headsUp = view.seats.length > 2 && view.seats.filter((s) => !s.out).length === 2;
      return (
        <Table view={view} room={room}>
          <TableCount view={view} />
          <div className="ld-felt-main">
            <span className="tv-pill">{headsUp ? "Heads-up!" : `Round ${view.round}`}</span>
            <div className="ld-cups">
              {[0, 1, 2].map((i) => (
                <Cup key={i} size="4.2em" className="ld-cup-shake" />
              ))}
            </div>
            <p className="ld-felt-line">Shake 'em up — peek at your dice!</p>
            <p className="ld-felt-sub">{nameOf(room, view.openerId)} opens the bidding</p>
          </div>
          <div className="ld-felt-side" />
        </Table>
      );
    }

    case "bid": {
      const bid = view.bid;
      const turnName = nameOf(room, view.turnId);
      const away = !room.players.find((p) => p.id === view.turnId)?.connected;
      return (
        <Table view={view} room={room}>
          <TableCount view={view} />
          <div className="ld-felt-main">
            <p className="ld-felt-line">{bid ? `${nameOf(room, bid.playerId)} bids${bid.auto ? " (time ran out)" : ""}` : `${turnName} opens the bidding`}</p>
            <div key={view.history.length} className="ld-bid slam-in">
              {bid ? (
                <>
                  <span className="ld-bid-qty tabular">{bid.quantity}</span>
                  <span className="ld-bid-x">×</span>
                  <Die value={bid.face} size="5em" />
                </>
              ) : (
                <span className="ld-bid-qty">?</span>
              )}
            </div>
            <p className="ld-felt-sub">{away ? `${turnName} is away — the clock will play for them` : bid ? `${turnName}: raise it, call LIAR! or SPOT ON!` : "Any bid to start"}</p>
            <History view={view} room={room} />
          </div>
          <div className="ld-felt-side">
            <Timer client={client} room={room} size="5.5em" />
          </div>
        </Table>
      );
    }

    case "reveal": {
      const call = view.call;
      if (!call) return null;
      const caller = nameOf(room, call.callerId);
      const bidder = nameOf(room, call.bidderId);
      return (
        <Table view={view} room={room}>
          <TableCount view={view} />
          <div className="ld-felt-main">
            <div className={`ld-call slam-in ${call.kind === "spotOn" ? "is-spot" : ""}`}>{call.kind === "liar" ? "LIAR!" : "SPOT ON!"}</div>
            <p className="ld-felt-line">
              {call.auto ? "Time's up! " : ""}
              {call.kind === "liar" ? `${caller} doesn't buy ${bidder}'s bid` : `${caller} says ${bidder}'s bid is exactly right`}
            </p>
            <Versus call={call} live />
          </div>
          <div className="ld-felt-side" />
        </Table>
      );
    }

    case "result": {
      const call = view.call;
      if (!call) return null;
      const { headline, line } = verdict(call, room);
      return (
        <Table view={view} room={room}>
          <TableCount view={view} />
          <div className="ld-felt-main">
            <div className="ld-verdict slam-in">{headline}</div>
            <Versus call={call} live={false} />
            <p className="ld-felt-line">{line}</p>
            {view.winnerId ? (
              <p className="ld-felt-big pop-in">{nameOf(room, view.winnerId)} is the last one standing!</p>
            ) : call.eliminatedId ? (
              <p className="ld-felt-big pop-in">{nameOf(room, call.eliminatedId)} is out of dice!</p>
            ) : null}
          </div>
          <div className="ld-felt-side" />
        </Table>
      );
    }

    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title="Final scores" />
          <p className="tv-sub ld-score-note">
            +{LD_OUTLAST_POINTS} for every player you outlasted · +{LD_WINNER_POINTS} for the last cup standing · +{LD_CALL_POINTS} per correct call
          </p>
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} />;
  }
}
