import { useEffect, useRef, useState } from "react";
import { SD_CLOCK_VISIBLE_MS, type SdPlayer } from "@party/shared";
import { vibrate } from "../../lib/device";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore } from "../shared";
import { formatTime } from "./format";
import "./showdown.css";

/** Big button that times from the moment it appeared on this phone. */
function TimedButton({ label, className, onTap, showClock = false }: { label: string; className: string; onTap(ms: number): void; showClock?: boolean }) {
  const start = useRef(0);
  const fired = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    start.current = performance.now();
    if (!showClock) return;
    const id = window.setInterval(() => {
      const ms = performance.now() - start.current;
      setElapsed(ms);
      if (ms >= SD_CLOCK_VISIBLE_MS) window.clearInterval(id);
    }, 30);
    return () => window.clearInterval(id);
  }, [showClock]);
  return (
    <button
      type="button"
      className={`sd-btn ${className}`}
      onPointerDown={() => {
        if (fired.current) return;
        fired.current = true;
        vibrate(30);
        onTap(Math.round(performance.now() - start.current));
      }}
    >
      {showClock && <span className="sd-btn-clock tabular">{elapsed < SD_CLOCK_VISIBLE_MS ? (elapsed / 1000).toFixed(2) : "?.??"}</span>}
      <span className="sd-btn-label">{label}</span>
    </button>
  );
}

export default function ShowdownPhone({ view, client, room, playerId }: PhoneGameProps<SdPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;
  const doneLine = view.mine;

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Saloon Showdown">
          <p>Keep your eyes on this screen. Fast fingers win.</p>
        </PhoneMessage>
      );

    case "ready":
      return (
        <PhoneMessage character={me?.character} mood="think" title={view.final ? "Final Showdown!" : view.kind === "draw" ? "Quick Draw" : "Stop the Clock"}>
          <p>{view.kind === "draw" ? "Watch THIS screen. Tap the instant it says DRAW!" : `Stop at ${((view.target ?? 0) / 1000).toFixed(2)}s. The clock vanishes after 3 seconds.`}</p>
        </PhoneMessage>
      );

    case "steady":
    case "fake":
      if (view.done) return <PhoneMessage character={me?.character} mood="sad" title="Flinched!" />;
      return <TimedButton key="wait" label={view.fake ?? "Wait for it…"} className={view.fake ? "is-fake" : "is-wait"} onTap={() => client.input({ type: "early" })} />;

    case "draw":
      if (view.done) return <PhoneMessage character={me?.character} mood={doneLine?.foul ? "sad" : "cheeky"} title={doneLine?.foul ? "Too fast to be real!" : `BANG! ${doneLine?.ms ?? ""} ms`} />;
      return <TimedButton key="draw" label="DRAW!" className="is-draw" onTap={(ms) => client.input({ type: "shot", ms })} />;

    case "clock":
      if (view.done) return <PhoneMessage character={me?.character} mood="think" title={`Stopped at ${((doneLine?.ms ?? 0) / 1000).toFixed(2)}s`} />;
      return <TimedButton key="stop" label="STOP" className="is-stop" showClock onTap={(ms) => client.input({ type: "stop", ms })} />;

    case "result": {
      const line = view.mine;
      const good = (line?.points ?? 0) > 0;
      const title = !line ? "No shot" : line.foul ? `Flinched! ${line.points}` : good ? `+${line.points}` : "No points";
      return (
        <PhoneMessage character={me?.character} mood={line?.place === 1 ? "win" : good ? "happy" : "sad"} title={title}>
          {line && !line.foul && line.ms !== null && (
            <p>
              {formatTime(line, view.kind)}
              {view.kind === "clock" && line.diff !== null ? ` — off by ${(line.diff / 1000).toFixed(2)}s` : ""}
              {line.place ? ` · #${line.place}` : ""}
            </p>
          )}
        </PhoneMessage>
      );
    }

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
