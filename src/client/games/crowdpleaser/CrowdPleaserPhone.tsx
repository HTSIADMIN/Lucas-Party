import { useState } from "react";
import type { CpPlayer } from "@party/shared";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore } from "../shared";
import "./crowdpleaser.css";

function AnswerForm({ view, onSend }: { view: CpPlayer; onSend(choice: "a" | "b", guess: number): void }) {
  const [choice, setChoice] = useState<"a" | "b" | null>(null);
  const [guess, setGuess] = useState(Math.round(view.voters / 2));
  const q = view.question;
  return (
    <div className="phone-card pop-in">
      <span className="label">
        Poll {view.round} of {view.totalRounds}
      </span>
      <div className="phone-prompt">{q?.text}</div>
      <div className="cp-pick">
        <button type="button" className={`cp-pick-btn is-a ${choice === "a" ? "is-on" : ""}`} onClick={() => setChoice("a")}>
          {q?.a}
        </button>
        <button type="button" className={`cp-pick-btn is-b ${choice === "b" ? "is-on" : ""}`} onClick={() => setChoice("b")}>
          {q?.b}
        </button>
      </div>
      <span className="label">How many of the {view.voters} of you will pick “{q?.a}”?</span>
      <div className="cp-stepper">
        <button type="button" className="btn btn-light" disabled={guess <= 0} onClick={() => setGuess(guess - 1)} aria-label="Fewer">
          −
        </button>
        <span className="cp-stepper-value tabular">{guess}</span>
        <button type="button" className="btn btn-light" disabled={guess >= view.voters} onClick={() => setGuess(guess + 1)} aria-label="More">
          +
        </button>
      </div>
      <button type="button" className="btn btn-accent btn-lg btn-block" disabled={!choice} onClick={() => choice && onSend(choice, guess)}>
        Lock it in
      </button>
    </div>
  );
}

export default function CrowdPleaserPhone({ view, client, room, playerId }: PhoneGameProps<CpPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;
  const q = view.question;

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Crowd Pleaser">
          <p>Know your crowd.</p>
        </PhoneMessage>
      );

    case "answer":
      if (view.myChoice) {
        return (
          <PhoneMessage character={me?.character} mood="think" title="Locked in!">
            <p>
              You picked <b>{view.myChoice === "a" ? q?.a : q?.b}</b> and guessed {view.myGuess} for “{q?.a}”.
            </p>
          </PhoneMessage>
        );
      }
      return <AnswerForm view={view} onSend={(choice, guess) => client.input({ type: "answer", choice, guess })} />;

    case "reveal":
      return (
        <PhoneMessage character={me?.character} mood={view.gained > 0 ? "win" : "sad"} title={view.gained > 0 ? `+${view.gained}!` : "Missed it"}>
          <p>
            {view.countA} picked “{q?.a}”{view.myGuess !== null ? ` — you guessed ${view.myGuess}` : ""}.
          </p>
        </PhoneMessage>
      );

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
