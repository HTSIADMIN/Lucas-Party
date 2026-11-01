import { useEffect, useRef, useState } from "react";
import { MB_CLOCK_VISIBLE_MS, MB_GAME_INFO, MB_TAP_MS, MB_UNIQUE_MAX, type MbPlayer } from "@party/shared";
import { vibrate } from "../../lib/device";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore } from "../shared";
import { PADS } from "./pads";
import "./mashbash.css";

type Send = PhoneGameProps<MbPlayer>["client"]["input"];

/** Counts taps for five seconds from the moment it appeared, then sends the total. */
function TapRace({ send }: { send: Send }) {
  const count = useRef(0);
  const [shown, setShown] = useState(0);
  const [left, setLeft] = useState(MB_TAP_MS);
  const done = useRef(false);
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => {
      const remaining = MB_TAP_MS - (performance.now() - start);
      setLeft(Math.max(0, remaining));
      if (remaining <= 0 && !done.current) {
        done.current = true;
        window.clearInterval(id);
        sendRef.current({ type: "taps", count: count.current });
      }
    }, 50);
    return () => window.clearInterval(id);
  }, []);
  return (
    <button
      type="button"
      className="mb-btn is-tap"
      onPointerDown={() => {
        if (done.current) return;
        count.current++;
        setShown(count.current);
      }}
    >
      <span className="mb-btn-big tabular">{shown}</span>
      <span className="mb-btn-small tabular">{(left / 1000).toFixed(1)}s</span>
    </button>
  );
}

/** One big button timed from the moment it appeared on this phone. */
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
      if (ms >= MB_CLOCK_VISIBLE_MS) window.clearInterval(id);
    }, 30);
    return () => window.clearInterval(id);
  }, [showClock]);
  return (
    <button
      type="button"
      className={`mb-btn ${className}`}
      onPointerDown={() => {
        if (fired.current) return;
        fired.current = true;
        vibrate(30);
        onTap(Math.round(performance.now() - start.current));
      }}
    >
      {showClock && <span className="mb-btn-small tabular">{elapsed < MB_CLOCK_VISIBLE_MS ? (elapsed / 1000).toFixed(2) : "?.??"}</span>}
      <span className="mb-btn-big">{label}</span>
    </button>
  );
}

function MemoryPads({ length, send }: { length: number; send: Send }) {
  const start = useRef(performance.now());
  const [pads, setPads] = useState<number[]>([]);
  return (
    <div className="phone-card pop-in">
      <h2 className="phone-card-title">Repeat the pattern</h2>
      <div className="mb-dots">
        {Array.from({ length }, (_, i) => (
          <span key={i} className={`mb-dot ${i < pads.length ? "is-on" : ""}`} />
        ))}
      </div>
      <div className="mb-pads is-phone">
        {PADS.map((pad, i) => (
          <button
            key={pad.name}
            type="button"
            className="mb-pad"
            style={{ background: pad.color }}
            aria-label={pad.name}
            onPointerDown={() => {
              if (pads.length >= length) return;
              const next = [...pads, i];
              setPads(next);
              vibrate(15);
              if (next.length === length) send({ type: "memory", pads: next, ms: Math.round(performance.now() - start.current) });
            }}
          >
            {pad.symbol}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MashBashPhone({ view, client, room, playerId }: PhoneGameProps<MbPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;
  const info = MB_GAME_INFO[view.game];
  const send: Send = client.input.bind(client);

  if (view.done && ["play", "draw", "steady"].includes(view.phase)) {
    return <PhoneMessage character={me?.character} mood="think" title="Done!" />;
  }

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Mash Bash">
          <p>Warm up those thumbs.</p>
        </PhoneMessage>
      );

    case "ready":
      return (
        <PhoneMessage character={me?.character} mood="think" title={info.name}>
          <p>{view.game === "clock" ? `Stop at ${((view.target ?? 0) / 1000).toFixed(2)}s. The clock vanishes after 3 seconds.` : info.howTo}</p>
        </PhoneMessage>
      );

    case "steady":
      return <TimedButton key="wait" label="Wait…" className="is-wait" onTap={() => send({ type: "early" })} />;

    case "draw":
      return <TimedButton key="draw" label="DRAW!" className="is-draw" onTap={(ms) => send({ type: "shot", ms })} />;

    case "show":
      return <PhoneMessage character={me?.character} mood="think" title="Watch the TV!" />;

    case "play":
      switch (view.game) {
        case "tap":
          return <TapRace send={send} />;
        case "clock":
          return <TimedButton key="stop" label="STOP" className="is-stop" showClock onTap={(ms) => send({ type: "stop", ms })} />;
        case "unique":
          return (
            <div className="phone-card pop-in">
              <h2 className="phone-card-title">Lowest number nobody else picks wins</h2>
              <div className="mb-numbers">
                {Array.from({ length: MB_UNIQUE_MAX }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" className="mb-number" onClick={() => send({ type: "pick", value: n })}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          );
        case "memory":
          return <MemoryPads length={view.sequenceLength} send={send} />;
        default:
          return null;
      }

    case "result":
    case "board":
      return (
        <PhoneMessage character={me?.character} mood={view.mine?.place === 1 ? "win" : (view.mine?.move ?? 0) > 0 ? "happy" : "sad"} title={view.mine?.place ? `#${view.mine.place} — +${view.gained} spaces` : `+${view.gained} spaces`}>
          <p>
            {view.mine?.label} · You're on space {view.position}
          </p>
        </PhoneMessage>
      );

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} unit="spaces" />;
  }
}
