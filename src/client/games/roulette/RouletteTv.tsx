import { CHARACTERS, roBetLabel, type RoBet, type RoTv as View } from "@party/shared";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, Scoreboard, playerMap } from "../shared";
import { Wheel, pocketColor } from "./Wheel";
import "./roulette.css";

const ROWS = [3, 2, 1].map((r) => Array.from({ length: 12 }, (_, i) => i * 3 + r));

function Spot({ view, room, bet, label, className = "" }: { view: View; room: TvGameProps["room"]; bet: Omit<RoBet, "amount">; label: string; className?: string }) {
  const map = playerMap(room);
  const here = view.bets.filter((b) => b.type === bet.type && b.value === bet.value);
  const total = here.reduce((s, b) => s + b.amount, 0);
  const hot = bet.type === "straight" && bet.value === view.hot;
  const won = view.result !== null && view.phase !== "spin" && here.some((b) => (b.payout ?? 0) > 0);
  return (
    <div className={`ro-spot ${className} ${hot ? "is-hot" : ""} ${won ? "is-won" : ""}`}>
      <span>{label}</span>
      {total > 0 && (
        <span className="ro-chips">
          {here.slice(0, 4).map((b) => {
            const p = map.get(b.playerId);
            return <span key={b.playerId} className="ro-chip" style={{ background: p ? CHARACTERS[p.character].color : "#ccc" }} />;
          })}
          <b>{total}</b>
        </span>
      )}
    </div>
  );
}

function Table({ view, room }: { view: View; room: TvGameProps["room"] }) {
  return (
    <div className="ro-table">
      <Spot view={view} room={room} bet={{ type: "straight", value: 0 }} label="0" className="ro-zero" />
      <div className="ro-numbers">
        {ROWS.map((row) =>
          row.map((n) => <Spot key={n} view={view} room={room} bet={{ type: "straight", value: n }} label={String(n)} className={pocketColor(n) === "#e0455a" ? "is-red" : "is-black"} />),
        )}
      </div>
      <div className="ro-columns">
        {[3, 2, 1].map((c) => (
          <Spot key={c} view={view} room={room} bet={{ type: "column", value: c }} label="2:1" />
        ))}
      </div>
      <div className="ro-outside">
        {[1, 2, 3].map((d) => (
          <Spot key={d} view={view} room={room} bet={{ type: "dozen", value: d }} label={roBetLabel({ type: "dozen", value: d, amount: 0 })} />
        ))}
      </div>
      <div className="ro-outside is-even">
        {(["low", "even", "red", "black", "odd", "high"] as const).map((t) => (
          <Spot key={t} view={view} room={room} bet={{ type: t }} label={roBetLabel({ type: t, amount: 0 })} className={t === "red" ? "is-red" : t === "black" ? "is-black" : ""} />
        ))}
      </div>
    </div>
  );
}

export default function RouletteTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const ids = room.players.filter((p) => p.inGame).map((p) => p.id);

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Roulette Royale</h1>
          <Telly size={160} pose="cheer" mood="cheeky" />
          <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
            Bet your party chips from your phone, then watch the wheel. Every spin has a <b>hot number</b> — a straight-up bet on it pays <b>50 to 1</b>. Most chips after the last spin wins.
          </div>
        </div>
      );

    case "bet":
      return (
        <div className="tv-center ro-stage">
          <div className="row center" style={{ gap: "1em" }}>
            <span className="tv-pill">
              Spin {view.round} of {view.totalRounds}
            </span>
            <span className="tv-pill ro-hot-pill">🔥 Hot number: {view.hot}</span>
          </div>
          <Table view={view} room={room} />
          <Timer client={client} room={room} size="4.5em" />
          <ProgressRow room={room} ids={ids} doneIds={view.doneIds} size={2.6} />
        </div>
      );

    case "spin":
    case "result":
      return (
        <div className="ro-spin-stage">
          <Wheel result={view.result} spinKey={`spin-${view.round}`} />
          <div className="ro-side">
            {view.phase === "result" && view.result !== null ? (
              <>
                <div className="ro-number slam-in" style={{ background: pocketColor(view.result) }}>
                  {view.result}
                </div>
                {view.result === view.hot && <p className="tv-sub">🔥 The hot number hit!</p>}
                <div className="ro-payouts">
                  {view.scores
                    .filter((s) => s.gained !== 0)
                    .map((s) => (
                      <span key={s.playerId} className={`chip ${s.gained > 0 ? "ro-up" : "ro-down"}`}>
                        {map.get(s.playerId)?.name} {s.gained > 0 ? `+${s.gained}` : s.gained}
                      </span>
                    ))}
                </div>
              </>
            ) : (
              <h1 className="tv-title" style={{ fontSize: "3em" }}>
                No more bets!
              </h1>
            )}
          </div>
        </div>
      );

    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title={`After spin ${view.round}`} unit="chips" />
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} unit="chips" />;
  }
}
