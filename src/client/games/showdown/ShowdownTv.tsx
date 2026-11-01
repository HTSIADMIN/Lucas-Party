import { SD_CLOCK_VISIBLE_MS, SD_FOUL_POINTS, type SdTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { useServerNow, type ClockLike } from "../../lib/hooks";
import type { TvGameProps } from "../registry";
import { Podium, Scoreboard, nameOf, playerMap } from "../shared";
import { formatTime } from "./format";
import "./showdown.css";

function ClockFace({ client, startedAt }: { client: ClockLike; startedAt: number }) {
  const now = useServerNow(client, 40);
  const elapsed = Math.max(0, now - startedAt);
  const visible = elapsed < SD_CLOCK_VISIBLE_MS;
  return <div className={`sd-clock tabular ${visible ? "" : "is-dark"}`}>{visible ? (elapsed / 1000).toFixed(2) : "?.??"}</div>;
}

function Lineup({ room, view, flinchedOnly = false }: { room: TvGameProps["room"]; view: View; flinchedOnly?: boolean }) {
  const map = playerMap(room);
  const ids = room.players.filter((p) => p.inGame).map((p) => p.id);
  return (
    <div className="sd-lineup">
      {ids.map((id) => {
        const p = map.get(id);
        const done = view.doneIds.includes(id);
        const flinched = done && (flinchedOnly || view.phase === "steady" || view.phase === "fake");
        return (
          <div key={id} className={`sd-slinger ${done ? "is-done" : ""}`}>
            {done && <span className={`sd-tag ${flinched ? "is-foul" : ""}`}>{flinched ? "Flinched!" : view.kind === "draw" ? "BANG!" : "Stopped"}</span>}
            {p && <Character id={p.character} size="4.2em" motion={done ? "none" : "bob"} mood={flinched ? "sad" : done ? "cheeky" : "think"} />}
            <span className="token-name">{p?.name}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ShowdownTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const title = view.final ? "Final Showdown!" : view.kind === "draw" ? "Quick Draw" : "Stop the Clock";

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Saloon Showdown</h1>
          <Telly size={170} pose="cheer" mood="cheeky" />
          <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
            <b>Quick Draw:</b> watch your phone and tap the instant it says <b>DRAW!</b> — tap early and you flinch. <b>Stop the Clock:</b> a clock starts, vanishes after 3 seconds, and you stop it as close to the target as you can. The last round is worth double.
          </div>
        </div>
      );

    case "ready":
      return (
        <div className="tv-center">
          <span className="tv-pill">
            Round {view.round} of {view.totalRounds}
          </span>
          <h1 className="tv-title slam-in sd-title">{title}</h1>
          <p className="tv-sub">
            {view.kind === "draw" ? (
              <>
                Watch your <b>phone</b>, not the TV. Tap the instant it says DRAW!
              </>
            ) : (
              <>
                Stop the clock at <b className="sd-target">{((view.target ?? 0) / 1000).toFixed(2)}s</b> — it disappears after 3 seconds.
              </>
            )}
          </p>
          <Lineup room={room} view={view} />
        </div>
      );

    case "steady":
      return (
        <div className="tv-center">
          <div className="sd-big sd-steady">Steady…</div>
          <Lineup room={room} view={view} />
        </div>
      );

    case "fake":
      return (
        <div className="tv-center">
          <div className="sd-big sd-fake">{view.fake}</div>
          <Lineup room={room} view={view} />
        </div>
      );

    case "draw":
      return (
        <div className="tv-center">
          <div className="sd-big sd-draw">DRAW!</div>
          <Lineup room={room} view={view} />
        </div>
      );

    case "clock":
      return (
        <div className="tv-center">
          <p className="tv-sub">
            Stop at <b className="sd-target">{((view.target ?? 0) / 1000).toFixed(2)}s</b>
          </p>
          {view.clockStartedAt !== null && <ClockFace client={client} startedAt={view.clockStartedAt} />}
          <Lineup room={room} view={view} />
        </div>
      );

    case "result": {
      const winner = view.results.find((r) => r.place === 1);
      return (
        <div className="tv-center sd-result">
          <h1 className="tv-title slam-in" style={{ fontSize: "3em" }}>
            {winner ? (view.kind === "draw" ? `${nameOf(room, winner.playerId)}: fastest draw!` : `${nameOf(room, winner.playerId)} nailed the clock!`) : "Nobody made it!"}
          </h1>
          {view.kind === "clock" && <p className="tv-sub">Target: {((view.target ?? 0) / 1000).toFixed(2)}s</p>}
          <ol className="sd-results card">
            {view.results.map((r, i) => {
              const p = map.get(r.playerId);
              return (
                <li key={r.playerId} className={`sd-row rise-in ${r.foul ? "is-foul" : ""} ${r.place === 1 ? "is-winner" : ""}`} style={{ animationDelay: `${i * 120}ms` }}>
                  <span className="sd-place">{r.place ?? "–"}</span>
                  {p && <Character id={p.character} size="2.4em" motion="none" mood={r.place === 1 ? "win" : r.foul ? "sad" : "idle"} />}
                  <span className="grow sd-name">{p?.name}</span>
                  <span className="sd-time tabular">
                    {formatTime(r, view.kind)}
                    {view.kind === "clock" && r.diff !== null && <small> (±{(r.diff / 1000).toFixed(2)})</small>}
                  </span>
                  <b className={`sd-points tabular ${r.points < 0 ? "is-loss" : ""}`}>{r.points > 0 ? `+${r.points}` : r.foul ? SD_FOUL_POINTS : "0"}</b>
                </li>
              );
            })}
          </ol>
        </div>
      );
    }

    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title={`After round ${view.round}`} />
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} />;
  }
}
