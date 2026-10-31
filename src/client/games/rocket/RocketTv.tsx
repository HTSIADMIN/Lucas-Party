import { useState } from "react";
import { rocketMultiplierAt, rocketTimeFor, type RocketRider, type RocketTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { useAnimationFrame, useCountdown } from "../../lib/hooks";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, Scoreboard, playerMap } from "../shared";
import "./rocket.css";

const W = 1000;
const H = 560;
const PAD = 40;

function scale(elapsed: number, mult: number) {
  const tMax = Math.max(8000, elapsed * 1.18);
  const mMax = Math.max(2, mult * 1.22);
  return {
    x: (t: number) => PAD + (t / tMax) * (W - PAD * 2),
    y: (m: number) => H - PAD - ((m - 1) / (mMax - 1)) * (H - PAD * 2),
  };
}

function Rocket({ x, y, angle, boom }: { x: number; y: number; angle: number; boom: boolean }) {
  if (boom) {
    return (
      <g transform={`translate(${x} ${y})`}>
        <polygon points="0,-70 16,-22 66,-30 26,6 52,52 0,26 -52,52 -26,6 -66,-30 -16,-22" fill="#FFC93C" stroke="#1B1033" strokeWidth="6" strokeLinejoin="round" />
        <polygon points="0,-38 9,-12 36,-16 14,4 28,28 0,14 -28,28 -14,4 -36,-16 -9,-12" fill="#FF4D5E" />
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path className="rk-flame" d="M-10 30 L0 64 L10 30 Z" fill="#FFC93C" stroke="#1B1033" strokeWidth="4" strokeLinejoin="round" />
      <path d="M-14 18 L-28 36 L-12 32 Z M14 18 L28 36 L12 32 Z" fill="#FF4D5E" stroke="#1B1033" strokeWidth="4" strokeLinejoin="round" />
      <path d="M0 -44 C17 -26 19 8 13 32 L-13 32 C-19 8 -17 -26 0 -44 Z" fill="#FFF6E3" stroke="#1B1033" strokeWidth="5" strokeLinejoin="round" />
      <path d="M0 -44 C8 -35 12 -27 13 -18 L-13 -18 C-12 -27 -8 -35 0 -44 Z" fill="#FF4D5E" stroke="#1B1033" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="0" cy="2" r="8" fill="#5FEFE4" stroke="#1B1033" strokeWidth="4" />
    </g>
  );
}

function Sky({ view, room, client }: TvGameProps<View>) {
  const [now, setNow] = useState(() => client.serverNow());
  useAnimationFrame(view.phase === "flight", setNow, client);
  const map = playerMap(room);
  const started = view.flightStartedAt;
  const boom = view.crashPoint !== null;
  const elapsed = !started ? 0 : boom ? view.explodedAtMs ?? rocketTimeFor(view.crashPoint!) : Math.max(0, now - started);
  const mult = rocketMultiplierAt(elapsed);
  const s = scale(elapsed, mult);
  const steps = 48;
  let d = `M ${s.x(0)} ${s.y(1)}`;
  for (let i = 1; i <= steps; i++) {
    const t = (elapsed * i) / steps;
    d += ` L ${s.x(t).toFixed(1)} ${s.y(rocketMultiplierAt(t)).toFixed(1)}`;
  }
  const tip = { x: s.x(elapsed), y: s.y(mult) };
  const back = elapsed > 200 ? { x: s.x(elapsed - 200), y: s.y(rocketMultiplierAt(elapsed - 200)) } : { x: tip.x - 10, y: tip.y };
  const angle = (Math.atan2(tip.y - back.y, tip.x - back.x) * 180) / Math.PI + 90;
  const shortCut = boom && view.crashPoint! > mult + 0.05;
  const shown = boom && !shortCut ? view.crashPoint! : mult;

  return (
    <div className="rk-sky">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {[1, 2, 3, 4].map((i) => (
          <line key={i} x1={PAD} x2={W - PAD} y1={(H / 5) * i} y2={(H / 5) * i} stroke="#fff" strokeOpacity="0.07" strokeWidth="2" />
        ))}
        <path d={`${d} L ${tip.x} ${H - PAD} L ${PAD} ${H - PAD} Z`} fill="#FF4FA3" fillOpacity="0.14" />
        <path d={d} fill="none" stroke={boom ? "#FF4D5E" : "#FFC93C"} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        {view.riders
          .filter((r) => r.bailedAt !== null)
          .map((r) => {
            const t = rocketTimeFor(r.bailedAt!);
            const p = map.get(r.playerId);
            if (!p || t > elapsed + 1) return null;
            return (
              <g key={r.playerId} className="rk-chute" transform={`translate(${s.x(t)} ${s.y(r.bailedAt!) - 70})`}>
                <path d="M-34 0 C-34 -28 34 -28 34 0 Z" fill="#fff" stroke="#1B1033" strokeWidth="4" />
                <path d="M-34 0 L-8 36 M34 0 L8 36" stroke="#1B1033" strokeWidth="2.5" />
                <Character id={p.character} x={-24} y={22} size={48} mood="happy" motion="none" />
              </g>
            );
          })}
        {started && <Rocket x={tip.x} y={tip.y} angle={angle} boom={boom} />}
      </svg>
      <div className={`rk-mult ${boom ? "is-boom" : mult >= 2 ? "is-hot" : ""}`}>{boom ? `BOOM ${shown.toFixed(2)}×` : `${mult.toFixed(2)}×`}</div>
      {shortCut && <div className="rk-note">Everyone bailed! It would have reached {view.crashPoint!.toFixed(2)}×</div>}
      {!started && <div className="rk-note">On the launch pad…</div>}
    </div>
  );
}

function RiderList({ room, riders, boom }: { room: TvGameProps["room"]; riders: RocketRider[]; boom: boolean }) {
  const map = playerMap(room);
  return (
    <div className="rk-riders">
      {riders.map((r) => {
        const p = map.get(r.playerId);
        const bailed = r.bailedAt !== null;
        const toast = boom && !bailed;
        return (
          <div key={r.playerId} className={`rk-rider ${bailed ? "is-bailed" : ""} ${toast ? "is-toast" : ""} ${r.daredevil ? "is-daredevil" : ""}`}>
            {p && <Character id={p.character} size="2.8em" motion={bailed ? "none" : "bob"} mood={toast ? "sad" : bailed ? "happy" : "shock"} />}
            <span>
              <span className="rk-rider-name">{p?.name}</span>
              <br />
              <span className="rk-rider-bet">
                bet {r.bet.toLocaleString()}
                {r.doubled ? " · 2×" : ""}
              </span>
            </span>
            <span className="rk-rider-status">
              {bailed ? (
                <>
                  {r.bailedAt!.toFixed(2)}×<br />
                  <small>+{(r.payout! - r.bet).toLocaleString()}{r.daredevil ? " 🔥" : ""}</small>
                </>
              ) : toast ? (
                "💥"
              ) : (
                "🚀"
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function History({ history }: { history: number[] }) {
  if (!history.length) return null;
  return (
    <div className="rk-history">
      {history.map((m, i) => (
        <span key={i} className={`rk-chip ${m < 1.5 ? "is-low" : m >= 3 ? "is-high" : ""}`}>
          {m.toFixed(2)}×
        </span>
      ))}
    </div>
  );
}

function Countdown({ room, client }: TvGameProps<View>) {
  const { seconds } = useCountdown(client, room.deadline, room.pausedRemainingMs);
  return (
    <div className="tv-center">
      <span key={seconds} className="rk-countdown">
        {Math.max(1, seconds)}
      </span>
      <p className="tv-sub">Hands on the BAIL OUT button…</p>
    </div>
  );
}

export default function RocketTv(props: TvGameProps<View>) {
  const { room, view, client } = props;
  if (!view) return null;
  const ids = room.players.filter((p) => p.inGame).map((p) => p.id);
  const rows = view.standings.map((s) => ({ playerId: s.playerId, score: s.chips, gained: s.delta }));

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Rocket Riot</h1>
          <Telly size={150} pose="cheer" mood="win" />
          <div className="card tv-rules">
            <ol>
              <li>Bet some of your 1,000 chips.</li>
              <li>The multiplier climbs while the rocket flies.</li>
              <li>
                Hit <b>BAIL OUT</b> before it explodes!
              </li>
            </ol>
            <p className="muted">Double Down once per game. The last one off before the boom earns the 🔥 Daredevil bonus.</p>
          </div>
        </div>
      );
    case "bet":
      return (
        <div className="tv-center">
          <h1 className="tv-title">{view.finalRound ? "MOONSHOT!" : `Launch ${view.round} of ${view.totalRounds}`}</h1>
          <p className="tv-sub">{view.finalRound ? "Final launch — minimum bet is half your chips!" : "Place your bets on your phone"}</p>
          <Timer client={client} room={room} size="6em" />
          <ProgressRow room={room} ids={ids} doneIds={view.lockedIds} size={4.6} />
          <History history={view.history} />
        </div>
      );
    case "countdown":
      return <Countdown {...props} />;
    case "flight":
    case "boom":
      return (
        <div className="rk-stage">
          <Sky {...props} />
          <RiderList room={room} riders={view.riders} boom={view.phase === "boom"} />
        </div>
      );
    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={rows} title={`After launch ${view.round}`} unit="chips" />
          <History history={view.history} />
        </div>
      );
    case "podium":
      return <Podium room={room} rows={rows} unit="chips" />;
  }
}
