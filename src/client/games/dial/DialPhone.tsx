import { useState } from "react";
import { CHARACTERS, DIAL_BANDS, DIAL_CLUE_MAX, type DialPlayer } from "@party/shared";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore, nameOf } from "../shared";
import { Dial } from "./Dial";
import "./dial.css";

function ClueForm({ view, onSend }: { view: DialPlayer; onSend(text: string): void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="phone-card pop-in"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSend(text.trim());
      }}
    >
      <h2 className="phone-card-title">You're the psychic! 🔮</h2>
      <Dial card={view.card} target={view.target} needle={view.target} />
      <p className="muted" style={{ fontWeight: 600 }}>
        Give a clue that points at the red zone — something that sits right there between “{view.card?.left}” and “{view.card?.right}”.
      </p>
      <input className="input" value={text} maxLength={DIAL_CLUE_MAX} autoFocus placeholder="Your clue" onChange={(e) => setText(e.target.value)} />
      <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={!text.trim()}>
        Send clue
      </button>
    </form>
  );
}

function GuessForm({ view, onLock }: { view: DialPlayer; onLock(value: number): void }) {
  const [value, setValue] = useState(50);
  return (
    <div className="phone-card pop-in">
      <span className="label">The clue</span>
      <div className="phone-prompt dial-phone-clue">“{view.clue}”</div>
      <Dial card={view.card} needle={value} onChange={setValue} />
      <input className="dial-range" type="range" min={0} max={100} value={value} onChange={(e) => setValue(Number(e.target.value))} aria-label="Dial position" />
      <button type="button" className="btn btn-accent btn-lg btn-block" onClick={() => onLock(value)}>
        Lock it in
      </button>
    </div>
  );
}

export default function DialPhone({ view, client, room, playerId }: PhoneGameProps<DialPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;
  const myColor = me ? CHARACTERS[me.character].color : "#ccc";

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Dial It In">
          <p>Read the psychic's mind. Or be the psychic.</p>
        </PhoneMessage>
      );

    case "clue":
      if (view.isPsychic) return <ClueForm view={view} onSend={(text) => client.input({ type: "clue", text })} />;
      return (
        <PhoneMessage character={me?.character} mood="think" title={`${nameOf(room, view.psychicId)} is thinking…`}>
          <p>
            {view.card?.left} ↔ {view.card?.right}
          </p>
        </PhoneMessage>
      );

    case "guess":
      if (view.isPsychic) {
        return (
          <div className="phone-card">
            <span className="label">Your clue</span>
            <div className="phone-prompt dial-phone-clue">“{view.clue}”</div>
            <Dial card={view.card} target={view.target} />
            <p className="muted" style={{ fontWeight: 700, textAlign: "center" }}>
              No hints! Watch them squirm.
            </p>
          </div>
        );
      }
      if (view.myGuess !== null) {
        return (
          <PhoneMessage character={me?.character} mood="think" title="Locked in!">
            <Dial card={view.card} markers={[{ key: playerId, value: view.myGuess, color: myColor }]} className="dial-small" />
          </PhoneMessage>
        );
      }
      return <GuessForm view={view} onLock={(value) => client.input({ type: "guess", value })} />;

    case "reveal": {
      if (view.skipped) return <PhoneMessage character={me?.character} mood="sad" title="Round skipped" />;
      const points = view.myPoints ?? 0;
      const title = view.isPsychic ? `+${points} for your clue` : view.myGuess === null ? "No guess this time" : points > 0 ? `+${points} — ${DIAL_BANDS.find((b) => b.points === points)?.label ?? ""}` : "Missed it!";
      return (
        <PhoneMessage character={me?.character} mood={points >= 60 ? "win" : points > 0 ? "happy" : "sad"} title={title}>
          <Dial card={view.card} target={view.target} markers={view.myGuess !== null ? [{ key: playerId, value: view.myGuess, color: myColor }] : []} className="dial-small" />
        </PhoneMessage>
      );
    }

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
