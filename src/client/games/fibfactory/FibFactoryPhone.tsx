import { useState } from "react";
import { FIB_ANSWER_MAX, type FibPlayer } from "@party/shared";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore, nameOf } from "../shared";
import "./fibfactory.css";

function AnswerForm({ view, subjectName, onSend }: { view: FibPlayer; subjectName: string; onSend(text: string): void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="phone-card pop-in"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSend(text.trim());
      }}
    >
      {view.isSubject ? (
        <span className="badge badge-info" style={{ justifySelf: "center" }}>
          You're in the spotlight — tell the TRUTH
        </span>
      ) : (
        <span className="badge badge-danger" style={{ justifySelf: "center" }}>
          Write a LIE that sounds like {subjectName}
        </span>
      )}
      <div className="phone-prompt">{view.question}</div>
      <input className="input" value={text} maxLength={FIB_ANSWER_MAX} autoFocus placeholder={view.isSubject ? "The honest truth" : "A believable fib"} onChange={(e) => setText(e.target.value)} />
      <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={!text.trim()}>
        {view.isSubject ? "That's the truth" : "Submit my fib"}
      </button>
    </form>
  );
}

export default function FibFactoryPhone({ view, client, room, playerId }: PhoneGameProps<FibPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;
  const subjectName = nameOf(room, view.subjectId);

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Fib Factory">
          <p>How well do you know your friends?</p>
        </PhoneMessage>
      );

    case "write":
      if (view.myAnswer) {
        return (
          <PhoneMessage character={me?.character} mood="think" title="Locked in!">
            <p>“{view.myAnswer}”</p>
          </PhoneMessage>
        );
      }
      return <AnswerForm view={view} subjectName={subjectName} onSend={(text) => client.input({ type: "answer", text })} />;

    case "pick":
      if (view.isSubject) {
        return (
          <PhoneMessage character={me?.character} mood="cheeky" title="Do they know you?">
            <p>You score for every friend who finds your truth.</p>
          </PhoneMessage>
        );
      }
      if (view.myPick) return <PhoneMessage character={me?.character} mood="think" title="Locked in!" />;
      return (
        <div className="phone-card pop-in">
          <h2 className="phone-card-title">Which one is true about {subjectName}?</h2>
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
      if (view.skipped) return <PhoneMessage character={me?.character} mood="sad" title="Round skipped" />;
      return (
        <PhoneMessage character={me?.character} mood={view.gained > 0 ? "win" : "sad"} title={view.gained > 0 ? `+${view.gained}!` : "No points this time"}>
          <p>The truth: “{view.truth}”</p>
        </PhoneMessage>
      );

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
