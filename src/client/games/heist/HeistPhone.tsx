import { useState } from "react";
import type { HeistPlayer } from "@party/shared";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore, nameOf } from "../shared";
import "./heist.css";

function Clues({ clues }: { clues: string[] }) {
  return (
    <div className="phone-card">
      <span className="label">Your clue{clues.length === 1 ? "" : "s"} — say {clues.length === 1 ? "it" : "them"} out loud</span>
      <ul className="heist-clue-list">
        {clues.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  );
}

function Keypad({ view, onSend }: { view: HeistPlayer; onSend(code: string): void }) {
  const [code, setCode] = useState("");
  const add = (d: string) => setCode((c) => (c.length < view.digits ? c + d : c));
  return (
    <div className="phone-card pop-in">
      <h2 className="phone-card-title">You're the safecracker 🔐</h2>
      <div className="heist-entry tabular">{code.padEnd(view.digits, "·")}</div>
      <div className="heist-keys">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "↵"].map((k) => (
          <button
            key={k}
            type="button"
            className={`heist-key ${k === "↵" ? "is-enter" : ""}`}
            disabled={k === "↵" && code.length !== view.digits}
            onClick={() => {
              if (k === "⌫") setCode((c) => c.slice(0, -1));
              else if (k === "↵") {
                onSend(code);
                setCode("");
              } else add(k);
            }}
          >
            {k}
          </button>
        ))}
      </div>
      <p className="muted" style={{ fontWeight: 700, textAlign: "center", margin: 0 }}>
        {view.attemptsLeft} {view.attemptsLeft === 1 ? "try" : "tries"} left
      </p>
    </div>
  );
}

export default function HeistPhone({ view, client, room, playerId }: PhoneGameProps<HeistPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Heist Night">
          <p>Gloves on. Phones out.</p>
        </PhoneMessage>
      );

    case "brief":
      return (
        <>
          <PhoneMessage character={me?.character} mood="think" title={view.isCracker ? "You're the safecracker!" : `${nameOf(room, view.crackerId)} cracks the safe`} />
          <Clues clues={view.clues} />
        </>
      );

    case "crack":
      return (
        <>
          {view.isCracker && <Keypad view={view} onSend={(code) => client.input({ type: "code", code })} />}
          <Clues clues={view.clues} />
          {view.attempts.length > 0 && (
            <div className="phone-card">
              <span className="label">Tries so far</span>
              {view.attempts.map((a, i) => (
                <div key={i} className="heist-try tabular">
                  {a.code} → {a.inPlace} in the right spot
                </div>
              ))}
            </div>
          )}
        </>
      );

    case "result":
      return (
        <PhoneMessage character={me?.character} mood={view.opened ? "win" : "sad"} title={view.opened ? `Open! +${view.gained}` : "ALARM!"}>
          <p>The code was {view.code}.</p>
        </PhoneMessage>
      );

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
