import { useState } from "react";
import { epCleanPitch, type EpPlayer } from "@party/shared";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore } from "../shared";
import "./emojipitch.css";

const LETTERS = ["A", "B", "C", "D"] as const;

function PitchForm({ view, onSend }: { view: EpPlayer; onSend(emoji: string): void }) {
  const [text, setText] = useState("");
  const clean = epCleanPitch(text);
  return (
    <form
      className="phone-card pop-in"
      onSubmit={(e) => {
        e.preventDefault();
        if (clean) onSend(clean);
      }}
    >
      <span className="label">Your secret prompt</span>
      <div className="phone-prompt">{view.myPrompt}</div>
      <p className="muted" style={{ fontWeight: 600 }}>
        Pitch it in 1–3 emoji. No letters, no numbers — open your emoji keyboard!
      </p>
      <input className="input ep-input" value={text} autoFocus inputMode="text" placeholder="😱 👻 🏚️" onChange={(e) => setText(e.target.value)} />
      <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={!clean}>
        {clean ? `Pitch ${clean}` : "Emoji only, 1–3"}
      </button>
    </form>
  );
}

export default function EmojiPitchPhone({ view, client, room, playerId }: PhoneGameProps<EpPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Emoji Pitch">
          <p>Find your emoji keyboard. You'll need it.</p>
        </PhoneMessage>
      );

    case "pitch":
      if (view.myPitch) {
        return (
          <PhoneMessage character={me?.character} mood="happy" title="Pitched!">
            <p className="ep-mine">{view.myPitch}</p>
          </PhoneMessage>
        );
      }
      return <PitchForm view={view} onSend={(emoji) => client.input({ type: "pitch", emoji })} />;

    case "guess":
      if (view.isPitcher) {
        return (
          <PhoneMessage character={me?.character} mood="cheeky" title="That's yours!">
            <p>You score for every right guess.</p>
          </PhoneMessage>
        );
      }
      if (view.myPick !== null) return <PhoneMessage character={me?.character} mood="think" title={`Locked in: ${LETTERS[view.myPick]}`} />;
      return (
        <div className="phone-card pop-in">
          <h2 className="phone-card-title">What's the pitch?</h2>
          <div className="phone-choices">
            {view.options.map((text, i) => (
              <button key={i} type="button" className="choice" onClick={() => client.input({ type: "pick", index: i })}>
                <span className="choice-key">{LETTERS[i]}</span>
                <span className="grow">{text}</span>
              </button>
            ))}
          </div>
        </div>
      );

    case "reveal": {
      const right = view.myPick !== null && view.myPick === view.answer;
      return (
        <PhoneMessage character={me?.character} mood={view.gained > 0 ? "win" : "sad"} title={view.gained > 0 ? `+${view.gained}!` : right ? "Right!" : "Not this time"}>
          {view.answer !== null && <p>It was “{view.options[view.answer]}”.</p>}
        </PhoneMessage>
      );
    }

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
