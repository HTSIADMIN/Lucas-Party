import { useEffect, useRef } from "react";
import type { DoPlayer } from "@party/shared";
import { useCountdown } from "../../lib/hooks";
import { DrawPad } from "../drawing/DrawPad";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore } from "../shared";
import "./drawoff.css";

function DrawStep({ view, client, room }: Pick<PhoneGameProps<DoPlayer>, "view" | "client" | "room">) {
  const autoSubmit = useRef<(() => void) | null>(null);
  const sent = useRef(false);
  const { remainingMs } = useCountdown(client, room.deadline, room.pausedRemainingMs);
  useEffect(() => {
    if (!sent.current && room.deadline !== null && remainingMs > 0 && remainingMs < 1500) {
      sent.current = true;
      autoSubmit.current?.();
    }
  }, [remainingMs, room.deadline]);
  return (
    <div className="phone-card pop-in">
      <span className="label">Everyone's drawing</span>
      <div className="phone-prompt">{view.prompt}</div>
      <DrawPad
        autoSubmitRef={autoSubmit}
        submitLabel="Hang it in the gallery"
        onSubmit={(strokes) => {
          sent.current = true;
          client.input({ type: "drawing", strokes });
        }}
      />
    </div>
  );
}

export default function DrawOffPhone({ view, client, room, playerId }: PhoneGameProps<DoPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Draw Off">
          <p>Same prompt. Your take.</p>
        </PhoneMessage>
      );

    case "draw":
      if (view.submitted) return <PhoneMessage character={me?.character} mood="happy" title="Hung in the gallery!" />;
      return <DrawStep key={view.round} view={view} client={client} room={room} />;

    case "gallery":
      if (view.myVote !== null) return <PhoneMessage character={me?.character} mood="think" title={`You voted #${view.myVote}`} />;
      return (
        <div className="phone-card pop-in">
          <h2 className="phone-card-title">Favourite drawing?</h2>
          <p className="muted" style={{ fontWeight: 600 }}>
            Numbers match the TV.{view.myNumber ? ` Yours is #${view.myNumber} — no voting for yourself!` : ""}
          </p>
          <div className="do-votes">
            {view.choices.map((n) => (
              <button key={n} type="button" className="do-vote" onClick={() => client.input({ type: "vote", number: n })}>
                #{n}
              </button>
            ))}
          </div>
        </div>
      );

    case "reveal":
      return <PhoneMessage character={me?.character} mood={view.gained > 0 ? "win" : "idle"} title={view.gained > 0 ? `+${view.gained}!` : "No votes this time"} />;

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
