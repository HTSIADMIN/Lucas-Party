import { MB_CLOCK_VISIBLE_MS, MB_GAME_INFO, type MbTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { useServerNow, type ClockLike } from "../../lib/hooks";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, nameOf, playerMap } from "../shared";
import { Board } from "./Board";
import { PADS } from "./pads";
import "./mashbash.css";

const MEMORY_STEP_MS = 700;

function MemoryShow({ client, view }: { client: ClockLike; view: View }) {
  const now = useServerNow(client, 50);
  const step = view.startedAt === null ? -1 : Math.floor((now - view.startedAt - 300) / MEMORY_STEP_MS);
  const lit = view.sequence && step >= 0 && step < view.sequence.length && (now - view.startedAt! - 300) % MEMORY_STEP_MS < MEMORY_STEP_MS * 0.7 ? view.sequence[step] : null;
  return (
    <div className="mb-pads">
      {PADS.map((pad, i) => (
        <div key={pad.name} className={`mb-pad ${lit === i ? "is-lit" : ""}`} style={{ background: pad.color }}>
          {pad.symbol}
        </div>
      ))}
    </div>
  );
}

function ClockFace({ client, startedAt }: { client: ClockLike; startedAt: number }) {
  const now = useServerNow(client, 40);
  const elapsed = Math.max(0, now - startedAt);
  const visible = elapsed < MB_CLOCK_VISIBLE_MS;
  return <div className={`mb-big tabular ${visible ? "" : "is-dim"}`}>{visible ? (elapsed / 1000).toFixed(2) : "?.??"}</div>;
}

export default function MashBashTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const ids = room.players.filter((p) => p.inGame).map((p) => p.id);
  const info = MB_GAME_INFO[view.game];

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Mash Bash</h1>
          <Telly size={150} pose="cheer" mood="cheeky" />
          <div className="card" style={{ fontSize: "1.25em", maxWidth: "36em", textAlign: "left" }}>
            A race to the finish line! Every round is a quick minigame on your phone — <b>tap races, quick draws, clocks, number bluffs and memory</b>. Win the round to move further. Watch out for <b>boost</b> and <b>slip</b> spaces.
          </div>
          <Board room={room} positions={view.positions} />
        </div>
      );

    case "ready":
      return (
        <div className="tv-center">
          <span className="tv-pill">
            Round {view.round} of {view.totalRounds}
          </span>
          <h1 className="tv-title slam-in mb-game-title">{info.name}</h1>
          <p className="tv-sub">{view.game === "clock" ? `Stop at ${((view.target ?? 0) / 1000).toFixed(2)}s — it vanishes after 3 seconds.` : info.howTo}</p>
          <ProgressRow room={room} ids={ids} doneIds={[]} size={3} />
        </div>
      );

    case "steady":
      return (
        <div className="tv-center">
          <div className="mb-big mb-steady">Steady…</div>
          <ProgressRow room={room} ids={ids} doneIds={view.doneIds} size={3} />
        </div>
      );

    case "draw":
      return (
        <div className="tv-center">
          <div className="mb-big mb-draw">DRAW!</div>
          <ProgressRow room={room} ids={ids} doneIds={view.doneIds} size={3} />
        </div>
      );

    case "show":
      return (
        <div className="tv-center">
          <h1 className="tv-title" style={{ fontSize: "3em" }}>
            Watch closely…
          </h1>
          <MemoryShow client={client} view={view} />
        </div>
      );

    case "play":
      return (
        <div className="tv-center">
          <h1 className="tv-title" style={{ fontSize: "3em" }}>
            {view.game === "tap" ? "MASH!" : view.game === "memory" ? "Repeat the pattern!" : view.game === "unique" ? "Pick a number, 1 to 8" : info.name}
          </h1>
          {view.game === "clock" && view.startedAt !== null && (
            <>
              <p className="tv-sub">Stop at {((view.target ?? 0) / 1000).toFixed(2)}s</p>
              <ClockFace client={client} startedAt={view.startedAt} />
            </>
          )}
          {(view.game === "unique" || view.game === "memory") && <Timer client={client} room={room} size="5em" />}
          {view.game === "memory" && (
            <div className="mb-pads is-dim">
              {PADS.map((pad) => (
                <div key={pad.name} className="mb-pad" style={{ background: pad.color }}>
                  {pad.symbol}
                </div>
              ))}
            </div>
          )}
          <ProgressRow room={room} ids={ids} doneIds={view.doneIds} size={3.2} />
        </div>
      );

    case "result": {
      const winner = view.results.find((r) => r.place === 1);
      return (
        <div className="tv-center mb-result">
          <h1 className="tv-title slam-in" style={{ fontSize: "2.8em" }}>
            {winner ? `${nameOf(room, winner.playerId)} wins ${info.name}!` : "Nobody scored!"}
          </h1>
          <ol className="mb-results card">
            {view.results.map((r, i) => {
              const p = map.get(r.playerId);
              return (
                <li key={r.playerId} className={`mb-row rise-in ${r.place === 1 ? "is-winner" : ""}`} style={{ animationDelay: `${i * 110}ms` }}>
                  <span className="mb-place">{r.place ?? "–"}</span>
                  {p && <Character id={p.character} size="2.3em" motion="none" mood={r.place === 1 ? "win" : r.move === 0 ? "sad" : "idle"} />}
                  <span className="grow mb-name">{p?.name}</span>
                  <span className="mb-label tabular">{r.label}</span>
                  <b className="mb-move tabular">+{r.move}</b>
                </li>
              );
            })}
          </ol>
        </div>
      );
    }

    case "board":
      return (
        <div className="tv-center mb-board-wrap">
          <h1 className="tv-title" style={{ fontSize: "2.6em" }}>
            {view.round >= view.totalRounds ? "Final positions" : `After round ${view.round}`}
          </h1>
          <Board room={room} positions={view.positions} highlight={view.results.filter((r) => r.move > 0).map((r) => r.playerId)} />
          {view.events.length > 0 && (
            <div className="mb-events">
              {view.events.map((e) => (
                <span key={e.playerId} className={`chip mb-event is-${e.kind} slam-in`}>
                  {nameOf(room, e.playerId)} {e.kind === "boost" ? "hit a boost! +3" : "slipped! −3"}
                </span>
              ))}
            </div>
          )}
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} unit="spaces" />;
  }
}
