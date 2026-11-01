import { useState } from "react";
import { CHARACTERS, DD_RACERS, type DdPlayer, type DdRacer } from "@party/shared";
import { Character } from "../../art/Character";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore } from "../shared";
import "./dicederby.css";

function RacerButtons({ view, picked, onPick, showOdds }: { view: DdPlayer; picked: DdRacer | null; onPick(r: DdRacer): void; showOdds: boolean }) {
  return (
    <div className="dd-racers">
      {(showOdds ? view.standings : DD_RACERS).map((racer) => (
        <button key={racer} type="button" className={`choice dd-racer-btn ${picked === racer ? "is-picked" : ""}`} onClick={() => onPick(racer)}>
          <Character id={racer} size={40} motion="none" />
          <span className="grow">{CHARACTERS[racer].name}</span>
          {showOdds && <b>×{view.odds[racer]}</b>}
        </button>
      ))}
    </div>
  );
}

function BetForm({ view, onBet }: { view: DdPlayer; onBet(racer: DdRacer, amount: number): void }) {
  const [racer, setRacer] = useState<DdRacer | null>(null);
  const min = Math.min(5, view.chips);
  const [amount, setAmount] = useState(Math.max(min, Math.round(view.chips / 4)));
  const clamp = (v: number) => Math.max(min, Math.min(view.chips, Math.round(v)));
  return (
    <div className="phone-card pop-in">
      <span className="label">Leg {view.leg} · you have {view.chips} chips</span>
      <h2 className="phone-card-title">Who leads after this leg?</h2>
      <RacerButtons view={view} picked={racer} onPick={setRacer} showOdds />
      <div className="dd-amount tabular">{amount} chips</div>
      <input className="dd-range" type="range" min={min} max={view.chips} value={amount} onChange={(e) => setAmount(clamp(Number(e.target.value)))} aria-label="Bet amount" />
      <div className="row center" style={{ gap: 8 }}>
        {[0.1, 0.25, 0.5, 1].map((f) => (
          <button key={f} type="button" className="btn btn-light btn-sm" onClick={() => setAmount(clamp(view.chips * f))}>
            {f === 1 ? "All in" : `${f * 100}%`}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-accent btn-lg btn-block" disabled={!racer} onClick={() => racer && onBet(racer, amount)}>
        {racer ? `Bet ${amount} on ${CHARACTERS[racer].name}` : "Pick a racer"}
      </button>
    </div>
  );
}

export default function DiceDerbyPhone({ view, client, room, playerId }: PhoneGameProps<DdPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Dice Derby">
          <p>Grab your betting slip.</p>
        </PhoneMessage>
      );

    case "pick":
      if (view.myPick) {
        return (
          <PhoneMessage character={me?.character} mood="cheeky" title={`Backing ${CHARACTERS[view.myPick].name}`}>
            <p>We'll see at the finish line.</p>
          </PhoneMessage>
        );
      }
      return (
        <div className="phone-card pop-in">
          <h2 className="phone-card-title">Pick the Derby winner</h2>
          <p className="muted" style={{ fontWeight: 600 }}>
            Secret pick, free bonus if you're right.
          </p>
          <RacerButtons view={view} picked={null} onPick={(racer) => client.input({ type: "pick", racer })} showOdds={false} />
        </div>
      );

    case "bet":
      if (view.myBet) {
        return (
          <PhoneMessage character={me?.character} mood="think" title={`${view.myBet.amount} on ${CHARACTERS[view.myBet.racer].name}`}>
            <p>Pays ×{view.odds[view.myBet.racer]} if they lead after the leg.</p>
          </PhoneMessage>
        );
      }
      return <BetForm view={view} onBet={(racer, amount) => client.input({ type: "bet", racer, amount })} />;

    case "roll":
      return (
        <PhoneMessage character={view.myBet?.racer ?? me?.character} mood="think" title="Go go go!">
          {view.myBet && (
            <p>
              Your {view.myBet.amount} rides on {CHARACTERS[view.myBet.racer].name}
            </p>
          )}
        </PhoneMessage>
      );

    case "legResult":
    case "finish":
      return (
        <PhoneMessage character={me?.character} mood={view.gained > 0 ? "win" : view.gained < 0 ? "sad" : "idle"} title={view.gained > 0 ? `+${view.gained} chips!` : view.gained < 0 ? `${view.gained} chips` : "Even"}>
          <p>You have {view.chips} chips.</p>
        </PhoneMessage>
      );

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} unit="chips" />;
  }
}
