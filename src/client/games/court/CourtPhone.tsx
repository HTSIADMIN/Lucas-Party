import { useState } from "react";
import { CC_ARGUMENT_MAX, type CcPlayer } from "@party/shared";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore, nameOf } from "../shared";
import "./court.css";

function ArgumentForm({ view, defendant, onSend }: { view: CcPlayer; defendant: string; onSend(text: string): void }) {
  const [text, setText] = useState("");
  const prosecuting = view.role === "prosecutor";
  return (
    <form
      className="phone-card pop-in"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSend(text.trim());
      }}
    >
      <span className={`badge ${prosecuting ? "badge-danger" : "badge-info"}`} style={{ justifySelf: "center" }}>
        You're the {prosecuting ? "PROSECUTION ⚖️" : "DEFENSE 🛡️"}
      </span>
      <div className="phone-prompt">
        {defendant} is accused of {view.crime}.
      </div>
      <p className="muted" style={{ fontWeight: 600 }}>
        {prosecuting ? "Convince the jury they did it. Evidence optional." : "Get your client off the hook. Any excuse will do."}
      </p>
      <textarea className="input cc-textarea" value={text} maxLength={CC_ARGUMENT_MAX} autoFocus placeholder={prosecuting ? "Ladies and gentlemen of the jury…" : "My client would never…"} onChange={(e) => setText(e.target.value)} />
      <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={!text.trim()}>
        Rest my case
      </button>
    </form>
  );
}

export default function CourtPhone({ view, client, room, playerId }: PhoneGameProps<CcPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;
  const defendant = nameOf(room, view.defendantId);

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Character Court">
          <p>All rise!</p>
        </PhoneMessage>
      );

    case "charge":
      if (view.role === "prosecutor" || view.role === "defender") {
        if (view.myArgument) return <PhoneMessage character={me?.character} mood="cheeky" title="Case rested!" />;
        return <ArgumentForm view={view} defendant={defendant} onSend={(text) => client.input({ type: "argue", text })} />;
      }
      return (
        <PhoneMessage character={me?.character} mood={view.role === "defendant" ? "shock" : "think"} title={view.role === "defendant" ? "You're on trial!" : "The lawyers are preparing…"}>
          <p>
            {view.role === "defendant" ? "You" : defendant} stand{view.role === "defendant" ? "" : "s"} accused of {view.crime}.
          </p>
        </PhoneMessage>
      );

    case "trial":
      if (view.role === "prosecutor" || view.role === "defender") {
        return (
          <PhoneMessage character={me?.character} mood="think" title="The jury is out…">
            <p>Every vote for your side scores.</p>
          </PhoneMessage>
        );
      }
      if (view.myVote) return <PhoneMessage character={me?.character} mood="think" title={view.myVote === "guilty" ? "You said GUILTY" : "You said NOT GUILTY"} />;
      return (
        <div className="phone-card pop-in">
          <h2 className="phone-card-title">{view.role === "defendant" ? "How do you plead… for yourself?" : `Is ${defendant} guilty?`}</h2>
          <p className="muted" style={{ fontWeight: 600 }}>
            Read both arguments on the TV.
          </p>
          <div className="cc-vote">
            <button type="button" className="cc-vote-btn is-guilty" onClick={() => client.input({ type: "vote", verdict: "guilty" })}>
              Guilty
            </button>
            <button type="button" className="cc-vote-btn is-innocent" onClick={() => client.input({ type: "vote", verdict: "innocent" })}>
              Not guilty
            </button>
          </div>
        </div>
      );

    case "verdict":
      return (
        <PhoneMessage character={me?.character} mood={view.gained > 0 ? "win" : view.role === "defendant" && view.verdict === "guilty" ? "sad" : "idle"} title={view.verdict === "guilty" ? "GUILTY!" : "NOT GUILTY!"}>
          {view.gained > 0 && <p className="phone-gain">+{view.gained}</p>}
        </PhoneMessage>
      );

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
