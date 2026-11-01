import { CHARACTERS, DD_RACERS, DD_WINNER_BONUS, type DdTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, nameOf, playerMap } from "../shared";
import { Track } from "./Track";
import "./dicederby.css";

function OddsBoard({ view, room }: { view: View; room: TvGameProps["room"] }) {
  const map = playerMap(room);
  return (
    <div className="dd-odds">
      {view.standings.map((racer, i) => {
        const backers = view.bets.filter((b) => b.racer === racer);
        return (
          <div key={racer} className="dd-odds-row">
            <span className="dd-odds-place">{i + 1}</span>
            <Character id={racer} size="2em" motion="none" />
            <span className="grow dd-odds-name">{CHARACTERS[racer].name}</span>
            <span className="dd-backers">
              {backers.map((b) => {
                const p = map.get(b.playerId);
                return p ? <Character key={b.playerId} id={p.character} size="1.5em" motion="none" mood="cheeky" /> : null;
              })}
            </span>
            <b className="dd-odds-mult">×{view.odds[racer]}</b>
          </div>
        );
      })}
    </div>
  );
}

export default function DiceDerbyTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const ids = room.players.filter((p) => p.inGame).map((p) => p.id);
  const lastRoll = view.rolls[view.rolls.length - 1];

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center dd-wrap">
          <h1 className="tv-title slam-in">Dice Derby</h1>
          <Telly size={140} pose="cheer" mood="cheeky" />
          <div className="card" style={{ fontSize: "1.2em", maxWidth: "38em", textAlign: "left" }}>
            Five racers, one dice tower. Each leg, <b>bet chips</b> on who'll be in front when the leg ends — underdogs pay more. Every racer rolls 1–3, and a moving racer <b>carries anyone stacked on top</b>. Pick the overall winner for a +{DD_WINNER_BONUS} bonus!
          </div>
          <Track stacks={view.stacks} />
        </div>
      );

    case "pick":
      return (
        <div className="tv-center dd-wrap">
          <h1 className="tv-title" style={{ fontSize: "3em" }}>
            Who wins the whole Derby?
          </h1>
          <p className="tv-sub">Pick secretly on your phone — right picks get +{DD_WINNER_BONUS} at the finish.</p>
          <Track stacks={view.stacks} />
          <Timer client={client} room={room} size="4.5em" />
          <ProgressRow room={room} ids={ids} doneIds={view.doneIds} size={2.8} />
        </div>
      );

    case "bet":
      return (
        <div className="tv-center dd-wrap">
          <span className="tv-pill">Leg {view.leg}</span>
          <h1 className="tv-title" style={{ fontSize: "2.8em" }}>
            Place your bets!
          </h1>
          <Track stacks={view.stacks} />
          <div className="row center" style={{ gap: "1.4em", alignItems: "center" }}>
            <OddsBoard view={view} room={room} />
            <Timer client={client} room={room} size="5em" />
          </div>
          <ProgressRow room={room} ids={ids} doneIds={view.doneIds} size={2.6} />
        </div>
      );

    case "roll":
      return (
        <div className="tv-center dd-wrap">
          <span className="tv-pill">Leg {view.leg} · They're off!</span>
          <Track stacks={view.stacks} highlight={lastRoll?.racer ?? null} />
          {lastRoll ? (
            <div className="dd-roll slam-in" key={view.rolls.length}>
              <Character id={lastRoll.racer} size="3.6em" motion="jump" mood="happy" />
              <span>
                {CHARACTERS[lastRoll.racer].name} rolls <b className="dd-die">{lastRoll.value}</b>
              </span>
            </div>
          ) : (
            <div className="dd-roll">Rolling…</div>
          )}
          <OddsBoard view={view} room={room} />
        </div>
      );

    case "legResult":
      return (
        <div className="tv-center dd-wrap">
          <h1 className="tv-title slam-in" style={{ fontSize: "2.8em" }}>
            {CHARACTERS[view.standings[0]!].name} leads after leg {view.leg}!
          </h1>
          <Track stacks={view.stacks} />
          <div className="dd-payouts">
            {view.bets.map((b) => {
              const net = (b.payout ?? 0) - b.amount;
              return (
                <span key={b.playerId} className={`chip dd-payout ${net > 0 ? "is-win" : net < 0 ? "is-loss" : ""}`}>
                  {map.get(b.playerId)?.name}: {b.amount} on {CHARACTERS[b.racer].name} → {net > 0 ? `+${net}` : net === 0 ? "refund" : net}
                </span>
              );
            })}
          </div>
        </div>
      );

    case "finish": {
      const winner = view.winner ?? DD_RACERS[0];
      const right = Object.entries(view.picks ?? {}).filter(([, r]) => r === winner).map(([id]) => id);
      return (
        <div className="tv-center dd-wrap">
          <h1 className="tv-title slam-in">{CHARACTERS[winner].name} wins the Derby!</h1>
          <Character id={winner} size="9em" motion="jump" mood="win" />
          <Track stacks={view.stacks} />
          <p className="tv-sub">{right.length ? `Called it: ${right.map((id) => nameOf(room, id)).join(", ")} (+${DD_WINNER_BONUS})` : "Nobody picked the winner!"}</p>
        </div>
      );
    }

    case "podium":
      return <Podium room={room} rows={view.scores} unit="chips" />;
  }
}
