import { useEffect, useRef, useState } from "react";
import { DF_TITLE_MAX, type DfPlayer } from "@party/shared";
import { useCountdown } from "../../lib/hooks";
import { DrawPad } from "../drawing/DrawPad";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore } from "../shared";
import "./doodlefraud.css";

function DrawStep({ view, client, room }: Pick<PhoneGameProps<DfPlayer>, "view" | "client" | "room">) {
  const autoSubmit = useRef<(() => void) | null>(null);
  const { remainingMs } = useCountdown(client, room.deadline, room.pausedRemainingMs);
  const sent = useRef(false);
  // Hand in whatever's on the pad just before time runs out.
  useEffect(() => {
    if (!sent.current && room.deadline !== null && remainingMs > 0 && remainingMs < 1500) {
      sent.current = true;
      autoSubmit.current?.();
    }
  }, [remainingMs, room.deadline]);
  return (
    <div className="phone-card pop-in">
      <span className="label">Draw this — keep it secret!</span>
      <div className="phone-prompt">{view.myPrompt}</div>
      <DrawPad
        autoSubmitRef={autoSubmit}
        submitLabel="Send my masterpiece"
        onSubmit={(strokes) => {
          sent.current = true;
          client.input({ type: "drawing", strokes });
        }}
      />
    </div>
  );
}

function TitleForm({ onSend }: { onSend(text: string): void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="phone-card pop-in"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSend(text.trim());
      }}
    >
      <h2 className="phone-card-title">Write a fake title</h2>
      <p className="muted" style={{ fontWeight: 600 }}>
        Look at the TV. What could this drawing be? Make it believable enough to fool everyone.
      </p>
      <input className="input" value={text} maxLength={DF_TITLE_MAX} autoFocus placeholder="A totally real title" onChange={(e) => setText(e.target.value)} />
      <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={!text.trim()}>
        Submit my lie
      </button>
    </form>
  );
}

export default function DoodleFraudPhone({ view, client, room, playerId }: PhoneGameProps<DfPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Doodle Fraud">
          <p>Get ready to draw something ridiculous.</p>
        </PhoneMessage>
      );

    case "draw":
      if (view.submittedDrawing) {
        return (
          <PhoneMessage character={me?.character} mood="happy" title="Masterpiece sent!">
            <p>Waiting for the other artists…</p>
          </PhoneMessage>
        );
      }
      return <DrawStep view={view} client={client} room={room} />;

    case "title":
      if (view.isArtist) {
        return (
          <PhoneMessage character={me?.character} mood="cheeky" title="That's your drawing!">
            <p>Sit back while everyone invents fake titles for it.</p>
          </PhoneMessage>
        );
      }
      if (view.myTitle) {
        return (
          <PhoneMessage character={me?.character} mood="think" title="Lie locked in!">
            <p>“{view.myTitle}”</p>
          </PhoneMessage>
        );
      }
      return <TitleForm onSend={(text) => client.input({ type: "title", text })} />;

    case "pick":
      if (view.isArtist) {
        return (
          <PhoneMessage character={me?.character} mood="think" title="Will they get it?">
            <p>You score for everyone who finds your real title.</p>
          </PhoneMessage>
        );
      }
      if (view.myPick) {
        return <PhoneMessage character={me?.character} mood="think" title="Locked in!" />;
      }
      return (
        <div className="phone-card pop-in">
          <h2 className="phone-card-title">Which title is real?</h2>
          <div className="phone-choices">
            {view.options.map((o) => (
              <button key={o.key} type="button" className="choice" onClick={() => client.input({ type: "pick", key: o.key })}>
                <span className="grow">{o.text}</span>
              </button>
            ))}
          </div>
        </div>
      );

    case "reveal":
      return (
        <PhoneMessage character={me?.character} mood={view.gained > 0 ? "win" : "sad"} title={view.gained > 0 ? `+${view.gained}!` : "No points this time"}>
          <p>It was “{view.realPrompt}”.</p>
          {view.isArtist && <p>That was your drawing!</p>}
        </PhoneMessage>
      );

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
