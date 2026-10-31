import { useEffect, useState } from "react";
import { PUNCHLINE_ANSWER_MAX, type PunchlinePlayer } from "@party/shared";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore } from "../shared";
import "./punchline.css";

function AnswerBox({ prompt, onSubmit, onPanic, label }: { prompt: string; onSubmit(text: string): void; onPanic(): void; label: string }) {
  const [text, setText] = useState("");
  useEffect(() => setText(""), [prompt]);
  const trimmed = text.trim();
  return (
    <form
      className="phone-card pop-in"
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed) onSubmit(trimmed);
      }}
    >
      <span className="badge badge-host" style={{ width: "max-content" }}>
        {label}
      </span>
      <p className="phone-prompt">{prompt}</p>
      <textarea
        className="input pl-phone-input"
        value={text}
        maxLength={PUNCHLINE_ANSWER_MAX}
        placeholder="Type something funny…"
        autoFocus
        onChange={(e) => setText(e.target.value.replace(/\n/g, " "))}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (trimmed) onSubmit(trimmed);
          }
        }}
      />
      <span className="phone-count">
        {text.length}/{PUNCHLINE_ANSWER_MAX}
      </span>
      <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={!trimmed}>
        Send it
      </button>
      <button type="button" className="btn btn-light btn-sm pl-panic-btn" onClick={onPanic}>
        😱 Panic button — fill it for me (half points)
      </button>
    </form>
  );
}

export default function PunchlinePhone({ view, client, room, playerId }: PhoneGameProps<PunchlinePlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;

  switch (view.phase) {
    case "intro":
    case "finalIntro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title={view.phase === "finalIntro" ? "The Last Laugh!" : `Round ${view.round}`}>
          <p>{view.phase === "finalIntro" ? "Everyone answers the same prompt." : "Get your funny ready…"}</p>
        </PhoneMessage>
      );

    case "write": {
      const next = view.prompts.find((p) => p.answer === null);
      if (!next) {
        return (
          <PhoneMessage character={me?.character} mood="happy" title="All done!">
            {view.prompts.map((p) => (
              <p key={p.id} style={{ fontWeight: 600 }}>
                “{p.answer}”{p.panic ? " 😱" : ""}
              </p>
            ))}
            <p>Watch the TV while everyone finishes.</p>
          </PhoneMessage>
        );
      }
      const index = view.prompts.indexOf(next);
      return (
        <AnswerBox
          key={next.id}
          label={`Prompt ${index + 1} of ${view.prompts.length}`}
          prompt={next.text}
          onSubmit={(text) => client.input({ type: "answer", promptId: next.id, text })}
          onPanic={() => client.input({ type: "panic", promptId: next.id })}
        />
      );
    }

    case "finalWrite":
      if (view.answer !== null) {
        return (
          <PhoneMessage character={me?.character} mood="happy" title="Locked in!">
            <p>“{view.answer}”</p>
          </PhoneMessage>
        );
      }
      return <AnswerBox label="Final prompt" prompt={view.prompt} onSubmit={(text) => client.input({ type: "finalAnswer", text })} onPanic={() => client.input({ type: "finalPanic" })} />;

    case "vote":
      if (view.role === "author") {
        return (
          <PhoneMessage character={me?.character} mood="shock" title="That's yours!">
            <p>Sit tight while everyone votes on your face-off.</p>
          </PhoneMessage>
        );
      }
      return (
        <div className="phone-card pop-in">
          <p className="phone-prompt">{view.prompt}</p>
          <div className="phone-choices">
            {view.options.map((o) => (
              <button
                key={o.key}
                type="button"
                className={`choice ${view.myVote === o.key ? "is-picked" : ""}`}
                disabled={view.myVote !== null}
                onClick={() => client.input({ type: "vote", matchupId: view.matchupId, choice: o.key })}
              >
                <span className={`choice-key ${o.key === "B" ? "is-b" : ""}`}>{o.key}</span>
                {o.text}
              </button>
            ))}
          </div>
          {view.myVote && <p className="muted" style={{ textAlign: "center", fontWeight: 700 }}>Vote locked in!</p>}
        </div>
      );

    case "finalVote":
      return (
        <div className="phone-card pop-in">
          <p className="phone-prompt">{view.prompt}</p>
          <p className="muted" style={{ fontWeight: 700 }}>
            Pick your favourite:
          </p>
          <div className="phone-choices">
            {view.entries.map((e) => (
              <button
                key={e.key}
                type="button"
                className={`choice ${view.myVote === e.key ? "is-picked" : ""}`}
                disabled={e.mine || view.myVote !== null}
                onClick={() => client.input({ type: "finalVote", key: e.key })}
              >
                <span className="choice-key">{e.key}</span>
                {e.text}
                {e.mine ? " (yours)" : ""}
              </button>
            ))}
          </div>
        </div>
      );

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
