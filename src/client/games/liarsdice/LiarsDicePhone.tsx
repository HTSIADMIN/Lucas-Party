import { useEffect, useState, type CSSProperties } from "react";
import { LD_FACES, LD_MIN_FACE, LD_WILD_FACE, ldIsMatch, ldIsRaise, ldMinQuantity, type LdBidValue, type LdCall, type LdInput, type LdPlayer, type PlayerPublic } from "@party/shared";
import { Character } from "../../art/Character";
import type { Mood } from "../../art/Face";
import { Timer } from "../../ui/Timer";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore, nameOf } from "../shared";
import { Die, type DieTone } from "./Die";
import "./liarsdice.css";

type Room = PhoneGameProps["room"];
type CharacterId = PlayerPublic["character"];

function toneFor(value: number, face: number | null): DieTone {
  if (face === null || !ldIsMatch(value, face)) return "plain";
  return value === LD_WILD_FACE ? "wild" : "match";
}

/** Your dice, big. Highlights the ones that count toward `face` (wild ones included). */
function Hand({ dice, face = null, rolling = false }: { dice: number[]; face?: number | null; rolling?: boolean }) {
  if (!dice.length) return null;
  return (
    <div className={`ld-hand ${rolling ? "is-rolling" : ""}`}>
      {dice.map((v, i) => (
        <Die key={i} value={v} size={58} tone={toneFor(v, face)} style={{ ["--i" as string]: i } as CSSProperties} />
      ))}
    </div>
  );
}

function BidValue({ bid, die = 30 }: { bid: LdBidValue; die?: number }) {
  return (
    <span className="ld-bidval">
      <b>{bid.quantity}</b>×<Die value={bid.face} size={die} />
    </span>
  );
}

function CurrentBid({ view, room, playerId }: { view: LdPlayer; room: Room; playerId: string }) {
  if (!view.bid) return <p className="ld-current muted">No bids yet</p>;
  return (
    <div className="ld-current">
      <span>{view.bid.playerId === playerId ? "You" : nameOf(room, view.bid.playerId)} bid</span>
      <BidValue bid={view.bid} die={34} />
    </div>
  );
}

/** Your turn: challenge the bid, or step the quantity and pick a face for a raise. */
function BidForm({ view, room, client, playerId }: { view: LdPlayer; room: Room; client: PhoneGameProps["client"]; playerId: string }) {
  const prev = view.bid;
  const total = view.totalDice;
  // Starts on the smallest legal raise.
  const [face, setFace] = useState(view.minRaise?.face ?? LD_MIN_FACE);
  const [quantity, setQuantity] = useState(view.minRaise?.quantity ?? 1);
  // One tap per move; if it got lost on a flaky connection, the buttons come back.
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!busy) return;
    const timer = window.setTimeout(() => setBusy(false), 1500);
    return () => window.clearTimeout(timer);
  }, [busy]);
  const send = (input: LdInput) => {
    setBusy(true);
    client.input(input);
  };
  const floor = ldMinQuantity(prev, face);
  const legal = ldIsRaise(prev, { quantity, face }, total);
  const mine = view.myDice.filter((v) => ldIsMatch(v, face)).length;
  const others = Math.max(0, total - view.myDice.length);
  const pickFace = (f: number) => {
    setFace(f);
    setQuantity((q) => Math.max(q, ldMinQuantity(prev, f)));
  };

  return (
    <div className="phone-card pop-in">
      <div className="ld-turn-head">
        <h2 className="phone-card-title">Your move!</h2>
        <Timer client={client} room={room} size={56} />
      </div>
      <Hand dice={view.myDice} face={face} />
      {prev ? <CurrentBid view={view} room={room} playerId={playerId} /> : <p className="ld-current muted">You open the bidding — any bid goes.</p>}
      <div className="ld-actions">
        <button type="button" className="btn btn-danger btn-lg" disabled={!view.canCall || busy} onClick={() => send({ type: "liar" })}>
          LIAR!
        </button>
        <button type="button" className="btn btn-success btn-lg" disabled={!view.canCall || busy} onClick={() => send({ type: "spotOn" })}>
          Spot on!
        </button>
      </div>
      {view.minRaise ? (
        <>
          <span className="label">{prev ? "…or raise it." : "Your bid:"} How many on the whole table?</span>
          <div className="ld-stepper">
            <button type="button" className="btn btn-light" aria-label="Fewer dice" disabled={quantity <= floor} onClick={() => setQuantity((q) => Math.max(floor, q - 1))}>
              −
            </button>
            <div className="ld-qty tabular">
              {quantity}
              <small>of {total} dice</small>
            </div>
            <button type="button" className="btn btn-light" aria-label="More dice" disabled={quantity >= total} onClick={() => setQuantity((q) => Math.min(total, q + 1))}>
              +
            </button>
          </div>
          <div className="ld-faces" role="group" aria-label="Face">
            {LD_FACES.map((f) => (
              <button key={f} type="button" className={`ld-face ${face === f ? "is-picked" : ""}`} aria-pressed={face === f} aria-label={`${f}s`} disabled={ldMinQuantity(prev, f) > total} onClick={() => pickFace(f)}>
                <Die value={f} size={48} />
              </button>
            ))}
          </div>
          <p className="ld-note">
            You have {mine} · expect about {Math.round(others / 3)} in the other {others} {others === 1 ? "die" : "dice"}
          </p>
          <button type="button" className="btn btn-accent btn-lg btn-block" disabled={!legal || busy} onClick={() => send({ type: "bid", quantity, face })}>
            {prev ? "Raise to" : "Bid"} <BidValue bid={{ quantity, face }} die={30} />
          </button>
        </>
      ) : (
        <p className="ld-note">The bid can't go any higher — call it!</p>
      )}
    </div>
  );
}

function Waiting({ view, room, playerId }: { view: LdPlayer; room: Room; playerId: string }) {
  const turn = room.players.find((p) => p.id === view.turnId);
  return (
    <>
      <div className="phone-card ld-wait">
        {turn && <Character id={turn.character} size={52} mood="think" />}
        <b className="grow">Waiting for {nameOf(room, view.turnId)}…</b>
      </div>
      <div className="phone-card">
        <span className="label">Your dice</span>
        <Hand dice={view.myDice} face={view.bid?.face ?? null} />
        <CurrentBid view={view} room={room} playerId={playerId} />
        <p className="ld-note">{view.totalDice} dice on the table · ones are wild</p>
      </div>
    </>
  );
}

function Spectator({ view, character }: { view: LdPlayer; character?: CharacterId }) {
  return (
    <PhoneMessage character={character} mood="sad" title="You're out of dice">
      <p>Stick around — the table plays on without you.</p>
      {view.bid && (
        <p>
          Current bid: <BidValue bid={view.bid} die={26} />
        </p>
      )}
    </PhoneMessage>
  );
}

function Reveal({ view, call, room, playerId }: { view: LdPlayer; call: LdCall; room: Room; playerId: string }) {
  const caller = call.callerId === playerId ? "You" : nameOf(room, call.callerId);
  const whose = call.bidderId === playerId ? "your" : `${nameOf(room, call.bidderId)}'s`;
  return (
    <div className="phone-card pop-in">
      <div className={`ld-phone-call ${call.kind === "spotOn" ? "is-spot" : ""}`}>{call.kind === "liar" ? "LIAR!" : "SPOT ON!"}</div>
      <div className="ld-current">
        <span>
          {caller} called {whose}
        </span>
        <BidValue bid={call} die={30} />
      </div>
      {view.myDice.length > 0 && (
        <>
          <span className="label">Your dice</span>
          <Hand dice={view.myDice} face={call.face} />
        </>
      )}
      <p className="ld-note">Counting every {call.face} and every wild one… eyes on the TV!</p>
    </div>
  );
}

function Result({ view, call, room, playerId, character }: { view: LdPlayer; call: LdCall; room: Room; playerId: string; character?: CharacterId }) {
  const mine = call.callerId === playerId;
  const loser = nameOf(room, call.loserId);
  // Why I lost a die: a wrong call of mine, or my bid got caught.
  const why = mine ? (call.kind === "liar" ? `The bid was good — ${call.count} on the table.` : `${call.count} on the table, not ${call.quantity}.`) : `Only ${call.count} on the table.`;
  let mood: Mood = "happy";
  let title = "Safe!";
  let line = call.loserId ? `${loser} ${call.eliminatedId ? "is out of dice" : "loses a die"}.` : `${nameOf(room, call.callerId)} nailed it — exactly ${call.count}.`;
  if (view.winnerId === playerId) {
    mood = "win";
    title = "You win! 🎲";
    line = "Last player with dice on the table.";
  } else if (call.eliminatedId === playerId) {
    mood = "sad";
    title = "You're out!";
    line = `${why} That was your last die.`;
  } else if (call.loserId === playerId) {
    mood = "sad";
    title = "You lose a die";
    line = why;
  } else if (mine && call.correct) {
    mood = "win";
    title = call.kind === "liar" ? "Nice call!" : "Spot on!";
    line = call.kind === "liar" ? `Only ${call.count} — ${loser} loses a die.` : call.gainedDie ? `Exactly ${call.count} — you win a die back!` : `Exactly ${call.count}! Your cup's already full.`;
  } else if (view.out) {
    // Already out: just narrate.
    mood = "idle";
    title = call.loserId ? `${loser} loses a die` : "Spot on!";
  }
  return (
    <PhoneMessage character={character} mood={mood} title={title}>
      <p>{line}</p>
      {view.gained > 0 && <p className="phone-gain">+{view.gained} points</p>}
      {!view.out && (
        <p>
          {view.diceLeft} {view.diceLeft === 1 ? "die" : "dice"} left
        </p>
      )}
    </PhoneMessage>
  );
}

export default function LiarsDicePhone({ view, client, room, playerId }: PhoneGameProps<LdPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Liar's Dice">
          <p>Your dice are secret. Your poker face isn't.</p>
          <p>Ones are wild!</p>
        </PhoneMessage>
      );

    case "roll":
      if (view.out) return <Spectator view={view} character={me?.character} />;
      return (
        <div className="phone-card pop-in">
          <h2 className="phone-card-title">Round {view.round}: your dice</h2>
          <Hand key={view.round} dice={view.myDice} rolling />
          <p className="ld-note">
            Keep them secret! {view.totalDice} dice on the table · {view.openerId === playerId ? "you open the bidding" : `${nameOf(room, view.openerId)} opens`}
          </p>
        </div>
      );

    case "bid":
      if (view.out) return <Spectator view={view} character={me?.character} />;
      if (view.myTurn) return <BidForm key={view.history.length} view={view} room={room} client={client} playerId={playerId} />;
      return <Waiting view={view} room={room} playerId={playerId} />;

    case "reveal":
      return view.call ? <Reveal view={view} call={view.call} room={room} playerId={playerId} /> : null;

    case "result":
      return view.call ? <Result view={view} call={view.call} room={room} playerId={playerId} character={me?.character} /> : null;

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
