import { useState } from "react";
import { RO_MAX_BETS, roBetLabel, type RoBet, type RoPlayer } from "@party/shared";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore } from "../shared";
import { pocketColor } from "./Wheel";
import "./roulette.css";

const AMOUNTS = [10, 50, 100, 250];
const OUTSIDE: Omit<RoBet, "amount">[] = [
  { type: "red" },
  { type: "black" },
  { type: "odd" },
  { type: "even" },
  { type: "low" },
  { type: "high" },
  { type: "dozen", value: 1 },
  { type: "dozen", value: 2 },
  { type: "dozen", value: 3 },
  { type: "column", value: 1 },
  { type: "column", value: 2 },
  { type: "column", value: 3 },
];

function BetBoard({ view, client }: { view: RoPlayer; client: PhoneGameProps<RoPlayer>["client"] }) {
  const [amount, setAmount] = useState(50);
  const stake = Math.min(amount, view.chips);
  const full = view.myBets.length >= RO_MAX_BETS;
  const place = (spot: Omit<RoBet, "amount">) => {
    if (stake <= 0) return;
    client.input({ type: "bet", bet: { ...spot, amount: stake } });
  };
  const total = view.myBets.reduce((s, b) => s + b.amount, 0);
  return (
    <div className="phone-card pop-in ro-board">
      <div className="row between">
        <span className="label">{view.chips} chips left</span>
        <span className="badge badge-danger">🔥 {view.hot} pays 50:1</span>
      </div>
      <div className="ro-amounts">
        {AMOUNTS.map((a) => (
          <button key={a} type="button" className={`ro-amount ${amount === a ? "is-on" : ""}`} onClick={() => setAmount(a)}>
            {a}
          </button>
        ))}
        <button type="button" className={`ro-amount ${amount >= view.chips ? "is-on" : ""}`} onClick={() => setAmount(view.chips)}>
          All
        </button>
      </div>
      <div className="ro-outside-btns">
        {OUTSIDE.map((spot) => (
          <button key={`${spot.type}${spot.value ?? ""}`} type="button" className={`ro-bet-btn ${spot.type === "red" ? "is-red" : spot.type === "black" ? "is-black" : ""}`} disabled={stake <= 0} onClick={() => place(spot)}>
            {roBetLabel({ ...spot, amount: 0 })}
          </button>
        ))}
      </div>
      <div className="ro-number-btns">
        {Array.from({ length: 37 }, (_, n) => (
          <button key={n} type="button" className={`ro-num ${n === view.hot ? "is-hot" : ""}`} style={{ background: pocketColor(n) }} disabled={stake <= 0} onClick={() => place({ type: "straight", value: n })}>
            {n}
          </button>
        ))}
      </div>
      {view.myBets.length > 0 && (
        <div className="ro-mybets">
          {view.myBets.map((b) => (
            <span key={`${b.type}${b.value ?? ""}`} className="chip">
              {roBetLabel(b)}: {b.amount}
            </span>
          ))}
          <b>Total {total}</b>
        </div>
      )}
      {full && <p className="muted" style={{ fontWeight: 700, margin: 0 }}>Max {RO_MAX_BETS} spots — stack chips on the same ones.</p>}
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-light grow" disabled={view.myBets.length === 0} onClick={() => client.input({ type: "clear" })}>
          Clear
        </button>
        <button type="button" className="btn btn-accent grow" onClick={() => client.input({ type: "done" })}>
          Done
        </button>
      </div>
    </div>
  );
}

export default function RoulettePhone({ view, client, room, playerId }: PhoneGameProps<RoPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Roulette Royale">
          <p>Place your bets, darling.</p>
        </PhoneMessage>
      );

    case "bet":
      if (view.done) {
        return (
          <PhoneMessage character={me?.character} mood="think" title="Bets are in!">
            <p>{view.myBets.length ? view.myBets.map((b) => `${roBetLabel(b)} ${b.amount}`).join(" · ") : "Sitting this spin out."}</p>
          </PhoneMessage>
        );
      }
      return <BetBoard view={view} client={client} />;

    case "spin":
      return <PhoneMessage character={me?.character} mood="think" title="Round and round…" />;

    case "result":
      return (
        <PhoneMessage character={me?.character} mood={view.gained > 0 ? "win" : view.gained < 0 ? "sad" : "idle"} title={view.gained > 0 ? `+${view.gained}!` : view.gained < 0 ? `${view.gained}` : "Even"}>
          <p>The ball landed on {view.result}. You have {view.chips} chips.</p>
        </PhoneMessage>
      );

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} unit="chips" />;
  }
}
