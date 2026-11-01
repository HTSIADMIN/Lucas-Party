import { useState } from "react";
import { BS_MAX_STRIKES, type BsBomb, type BsManual, type BsPlayer } from "@party/shared";
import { vibrate } from "../../lib/device";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore, nameOf } from "../shared";
import "./bombsquad.css";

type Send = PhoneGameProps<BsPlayer>["client"]["input"];

const WIRE_HEX: Record<string, string> = { red: "#FF4D5E", blue: "#3FB7FF", yellow: "#FFC93C", white: "#F4F1FF", black: "#1B1033" };

function Bomb({ bomb, strikes, send }: { bomb: BsBomb; strikes: number; send: Send }) {
  return (
    <div className="bs-phone-bomb">
      <div className="bs-phone-strikes">
        Strikes: {"✖".repeat(strikes)}
        {"·".repeat(Math.max(0, BS_MAX_STRIKES - strikes))}
      </div>

      <section className={`phone-card bs-module ${bomb.solved.wires ? "is-solved" : ""}`}>
        <h2 className="phone-card-title">Wires {bomb.solved.wires && "✔"}</h2>
        <div className="bs-wires">
          {bomb.wires.map((color, i) => {
            const cut = bomb.cut.includes(i);
            return (
              <button
                key={i}
                type="button"
                className={`bs-wire ${cut ? "is-cut" : ""}`}
                disabled={cut || bomb.solved.wires}
                aria-label={`Wire ${i + 1}, ${color}`}
                onClick={() => {
                  vibrate(30);
                  send({ type: "cut", wire: i });
                }}
              >
                <span className="bs-wire-num">{i + 1}</span>
                <span className="bs-wire-line" style={{ background: WIRE_HEX[color] }} />
                <span className="bs-wire-name">{color}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={`phone-card bs-module ${bomb.solved.keypad ? "is-solved" : ""}`}>
        <h2 className="phone-card-title">Keypad {bomb.solved.keypad && "✔"}</h2>
        <div className="bs-keypad">
          {bomb.keypad.map((symbol) => (
            <button key={symbol} type="button" className={`bs-key ${bomb.pressed.includes(symbol) ? "is-pressed" : ""}`} disabled={bomb.solved.keypad || bomb.pressed.includes(symbol)} onClick={() => send({ type: "key", symbol })}>
              {symbol}
            </button>
          ))}
        </div>
      </section>

      <section className={`phone-card bs-module ${bomb.solved.words ? "is-solved" : ""}`}>
        <h2 className="phone-card-title">Sound-alikes {bomb.solved.words ? "✔" : bomb.word ? `· ${bomb.word.stage}/3` : ""}</h2>
        {bomb.word && (
          <>
            <div className="bs-display">{bomb.word.display}</div>
            <div className="bs-word-buttons">
              {bomb.word.buttons.map((label) => (
                <button key={label} type="button" className="bs-word-btn" onClick={() => send({ type: "word", label })}>
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Manual({ manual }: { manual: BsManual }) {
  const tabs = [manual.wires && "wires", manual.keypad && "keypad", manual.words && "words"].filter(Boolean) as ("wires" | "keypad" | "words")[];
  const [tab, setTab] = useState(tabs[0]);
  if (!tabs.length) return <PhoneMessage title="No manual pages" />;
  return (
    <div className="phone-card bs-manual">
      <div className="bs-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`btn btn-sm ${tab === t ? "btn-accent" : "btn-light"}`} onClick={() => setTab(t)}>
            {t === "wires" ? "Wires" : t === "keypad" ? "Keypad" : "Sound-alikes"}
          </button>
        ))}
      </div>
      {tab === "wires" && manual.wires && (
        <div className="bs-page">
          <p className="muted">Ask how many wires there are, then follow the first rule that applies. Cut exactly one wire.</p>
          {manual.wires.map((group) => (
            <div key={group.count} className="bs-rule-group">
              <b>{group.count} wires</b>
              <ol>
                {group.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
      {tab === "keypad" && manual.keypad && (
        <div className="bs-page">
          <p className="muted">Exactly one column has all four symbols. Press them in that column's order, top to bottom.</p>
          <div className="bs-columns">
            {manual.keypad.map((col, i) => (
              <div key={i} className="bs-column">
                <b>{i + 1}</b>
                {col.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === "words" && manual.words && (
        <div className="bs-page">
          <p className="muted">The screen shows a word. Press the button that matches it here. Three in a row! (Spell things out — they sound alike.)</p>
          <div className="bs-word-table">
            {Object.entries(manual.words).map(([display, press]) => (
              <div key={display} className="bs-word-row">
                <span>{display}</span>
                <span>→</span>
                <b>{press}</b>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BombSquadPhone({ view, client, room, playerId }: PhoneGameProps<BsPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;
  const send: Send = client.input.bind(client);

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="shock" title="Bomb Squad">
          <p>Stay calm. Talk a lot.</p>
        </PhoneMessage>
      );

    case "brief":
      return view.isDefuser ? (
        <PhoneMessage character={me?.character} mood="shock" title="You're the defuser!">
          <p>Keep your screen to yourself. Describe everything you see.</p>
        </PhoneMessage>
      ) : (
        <PhoneMessage character={me?.character} mood="think" title="You're an expert">
          <p>Your manual pages are coming up. {nameOf(room, view.defuserId)} needs you!</p>
        </PhoneMessage>
      );

    case "defuse":
      if (view.isDefuser && view.bomb) return <Bomb bomb={view.bomb} strikes={view.strikes} send={send} />;
      return view.manual ? <Manual manual={view.manual} /> : <PhoneMessage title="Watch the TV!" />;

    case "result":
      return (
        <PhoneMessage character={me?.character} mood={view.outcome === "defused" ? "win" : "sad"} title={view.outcome === "defused" ? `Defused! +${view.gained}` : "BOOM!"} />
      );

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
