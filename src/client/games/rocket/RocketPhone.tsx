import { useEffect, useRef, useState } from "react";
import { rocketMultiplierAt, rocketPayout, type RocketPlayer } from "@party/shared";
import { vibrate } from "../../lib/device";
import { useAnimationFrame, useCountdown } from "../../lib/hooks";
import { Segmented, Toggle } from "../../ui/controls";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore } from "../shared";
import "./rocket.css";

const AUTO_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Off" },
  { value: 1.5, label: "1.5×" },
  { value: 2, label: "2×" },
  { value: 3, label: "3×" },
  { value: 5, label: "5×" },
];

function BetForm({ view, onLock }: { view: RocketPlayer; onLock(amount: number, double: boolean, autoTarget: number | null): void }) {
  const [amount, setAmount] = useState(() => view.bet ?? view.minBet);
  const [double, setDouble] = useState(view.doubled);
  const [auto, setAuto] = useState(view.autoTarget ?? 0);
  const clamp = (n: number) => Math.max(view.minBet, Math.min(view.chips, Math.round(n)));
  useEffect(() => setAmount((a) => clamp(a)), [view.chips, view.minBet]); // eslint-disable-line react-hooks/exhaustive-deps
  const quick = [
    ["Min", view.minBet],
    ["25%", view.chips * 0.25],
    ["50%", view.chips * 0.5],
    ["All in", view.chips],
  ] as const;
  return (
    <div className="phone-card pop-in">
      <div className="rk-chips">
        You have <b>{view.chips.toLocaleString()}</b> chips
      </div>
      {view.finalRound && <span className="badge badge-danger" style={{ justifySelf: "center" }}>Moonshot · min bet 50%</span>}
      <div className="bet-amount tabular">{amount.toLocaleString()}</div>
      <input className="rk-range" type="range" min={view.minBet} max={view.chips} step={Math.max(1, Math.round(view.chips / 100))} value={amount} onChange={(e) => setAmount(clamp(Number(e.target.value)))} aria-label="Bet amount" />
      <div className="bet-quick">
        {quick.map(([label, value]) => (
          <button key={label} type="button" className="btn btn-light btn-sm" onClick={() => setAmount(clamp(value))}>
            {label}
          </button>
        ))}
      </div>
      <Toggle checked={double && view.doubleAvailable} disabled={!view.doubleAvailable} onChange={setDouble} label={view.doubleAvailable ? "Double Down (2× profit, once per game)" : "Double Down used"} />
      <div className="host-row">
        <span className="label">Autopilot bail</span>
        <Segmented<number> label="Autopilot" value={auto} onChange={setAuto} options={AUTO_OPTIONS} />
      </div>
      <button type="button" className="btn btn-accent btn-lg btn-block" onClick={() => onLock(amount, double && view.doubleAvailable, auto || null)}>
        {view.locked ? "Update bet" : "Lock it in"}
      </button>
      {view.locked && (
        <p className="muted" style={{ textAlign: "center", fontWeight: 700 }}>
          ✅ Locked: {view.bet?.toLocaleString()} chips{view.doubled ? " · Double Down" : ""}
          {view.autoTarget ? ` · auto-bail at ${view.autoTarget}×` : ""}
        </p>
      )}
    </div>
  );
}

function BailButton({ view, onBail, client }: { view: RocketPlayer; onBail(): void; client: PhoneGameProps["client"] }) {
  const [now, setNow] = useState(() => client.serverNow());
  const live = view.bailedAt === null && view.flightStartedAt !== null;
  useAnimationFrame(live, setNow, client);
  const pressed = useRef(false);
  const mult = view.flightStartedAt ? rocketMultiplierAt(now - view.flightStartedAt) : 1;
  if (view.bailedAt !== null) {
    return (
      <PhoneMessage mood="happy" title={`Bailed at ${view.bailedAt.toFixed(2)}×`}>
        <p className="phone-gain">+{((view.payout ?? 0) - (view.bet ?? 0)).toLocaleString()} chips</p>
        <p>Safe! Now watch everyone else sweat.</p>
      </PhoneMessage>
    );
  }
  const bet = view.bet ?? 0;
  return (
    <button
      type="button"
      className="bail-btn"
      onPointerDown={() => {
        if (pressed.current) return;
        pressed.current = true;
        // If the tap got lost on a flaky connection, let them hit it again.
        window.setTimeout(() => (pressed.current = false), 1200);
        vibrate(40);
        onBail();
      }}
    >
      <span className="bail-btn-label">BAIL OUT</span>
      <span className="bail-btn-mult tabular">{mult.toFixed(2)}×</span>
      <span className="bail-btn-pay tabular">+{(rocketPayout(bet, mult, view.doubled) - bet).toLocaleString()} chips</span>
    </button>
  );
}

export default function RocketPhone({ view, client, room, playerId }: PhoneGameProps<RocketPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  const { seconds } = useCountdown(client, room.deadline, room.pausedRemainingMs);
  if (!view) return null;
  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Rocket Riot!">
          <p>Bet chips, ride the rocket, smash BAIL OUT before it blows.</p>
        </PhoneMessage>
      );
    case "bet":
      return <BetForm key={view.round} view={view} onLock={(amount, double, autoTarget) => client.input({ type: "bet", amount, double, autoTarget })} />;
    case "countdown":
      return (
        <PhoneMessage character={me?.character} mood="shock" title={`Launch in ${Math.max(1, seconds)}…`}>
          <p>
            Riding with {view.bet?.toLocaleString()} chips{view.doubled ? " (Double Down!)" : ""}.
          </p>
        </PhoneMessage>
      );
    case "flight":
      return <BailButton view={view} client={client} onBail={() => client.input({ type: "bail", at: client.serverNow() })} />;
    case "boom": {
      const won = view.bailedAt !== null;
      return (
        <PhoneMessage character={me?.character} mood={won ? "win" : "sad"} title={won ? "You made it!" : "Toasted! 💥"}>
          <p className={`phone-gain ${view.lastDelta < 0 ? "is-loss" : ""}`}>
            {view.lastDelta >= 0 ? "+" : ""}
            {view.lastDelta.toLocaleString()} chips
          </p>
          <p>It blew at {view.crashPoint?.toFixed(2)}×</p>
        </PhoneMessage>
      );
    }
    default:
      return <PhoneScore character={me?.character} score={view.chips} rank={view.rank} gained={view.lastDelta} unit="chips" />;
  }
}
