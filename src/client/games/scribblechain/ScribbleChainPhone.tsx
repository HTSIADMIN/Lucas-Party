import { useEffect, useRef, useState, type ReactNode } from "react";
import { SC_TEXT_MAX, type ScPlayer } from "@party/shared";
import { useCountdown } from "../../lib/hooks";
import { DrawPad } from "../drawing/DrawPad";
import { Drawing } from "../drawing/Drawing";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore, nameOf } from "../shared";
import "./scribblechain.css";

function TextStep({ title, hint, initial, children, onSend }: { title: string; hint: string; initial?: string; children?: ReactNode; onSend(text: string): void }) {
  const [text, setText] = useState(initial ?? "");
  return (
    <form
      className="phone-card pop-in"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSend(text.trim());
      }}
    >
      <h2 className="phone-card-title">{title}</h2>
      {children}
      <p className="muted" style={{ fontWeight: 600 }}>
        {hint}
      </p>
      <input className="input" value={text} maxLength={SC_TEXT_MAX} autoFocus placeholder="Type here" onChange={(e) => setText(e.target.value)} />
      <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={!text.trim()}>
        Pass it on
      </button>
    </form>
  );
}

function DrawStep({ view, client, room }: Pick<PhoneGameProps<ScPlayer>, "view" | "client" | "room">) {
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
      <span className="label">Draw this</span>
      <div className="phone-prompt">“{view.prompt}”</div>
      <DrawPad
        autoSubmitRef={autoSubmit}
        submitLabel="Pass it on"
        onSubmit={(strokes) => {
          sent.current = true;
          client.input({ type: "drawing", strokes });
        }}
      />
    </div>
  );
}

export default function ScribbleChainPhone({ view, client, room, playerId }: PhoneGameProps<ScPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;
  const step = `Step ${view.step + 1} of ${view.totalSteps}`;

  if (view.task && view.submitted) {
    return (
      <PhoneMessage character={me?.character} mood="happy" title="Passed on!">
        <p>Waiting for everyone else…</p>
      </PhoneMessage>
    );
  }

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Scribble Chain">
          <p>Write it. Draw it. Lose it.</p>
        </PhoneMessage>
      );

    case "write":
      return (
        <TextStep key="write" title="Start a chain" hint={`${step}. Write a silly sentence for someone to draw — or use ours.`} initial="" onSend={(text) => client.input({ type: "text", text })}>
          {view.suggestion && (
            <button type="button" className="btn btn-light btn-sm" onClick={() => client.input({ type: "text", text: view.suggestion! })}>
              Surprise me: “{view.suggestion}”
            </button>
          )}
        </TextStep>
      );

    case "draw":
      return <DrawStep key={`draw-${view.step}`} view={view} client={client} room={room} />;

    case "describe":
      return (
        <TextStep key={`describe-${view.step}`} title="What is this?" hint={`${step}. Describe the drawing in a sentence.`} onSend={(text) => client.input({ type: "text", text })}>
          <Drawing strokes={view.drawing ?? []} className="sc-phone-drawing" />
        </TextStep>
      );

    case "vote":
      if (view.myVote !== null) return <PhoneMessage character={me?.character} mood="think" title="Vote locked!" />;
      return (
        <div className="phone-card pop-in">
          <h2 className="phone-card-title">Best moment?</h2>
          <p className="muted" style={{ fontWeight: 600 }}>
            Numbers match the chain on the TV.
          </p>
          <div className="phone-choices">
            {view.labels
              .filter((l) => l.authorId !== playerId)
              .map((l) => (
                <button key={l.index} type="button" className="choice" onClick={() => client.input({ type: "vote", index: l.index })}>
                  <span className="choice-key">{l.index + 1}</span>
                  <span className="grow">{l.kind === "text" ? `“${l.text}”` : `${nameOf(room, l.authorId)}'s drawing`}</span>
                </button>
              ))}
          </div>
        </div>
      );

    case "reveal":
      return <PhoneMessage character={me?.character} mood="think" title="Watch the TV!" />;

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
