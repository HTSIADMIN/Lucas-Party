import type { QzPlayer } from "@party/shared";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore } from "../shared";
import "./trivia.css";

const LETTERS = ["A", "B", "C", "D"] as const;

export default function TriviaPhone({ view, client, room, playerId }: PhoneGameProps<QzPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;
  const q = view.question;

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Telly Trivia">
          <p>Fast fingers, big brain.</p>
        </PhoneMessage>
      );

    case "question":
      if (view.myChoice !== null) {
        return (
          <PhoneMessage character={me?.character} mood="think" title={`Locked in: ${LETTERS[view.myChoice]}`}>
            <p>{q?.options[view.myChoice]}</p>
          </PhoneMessage>
        );
      }
      return (
        <div className="phone-card pop-in">
          <span className="label">{view.final ? "Final question · double points" : `Question ${view.round} of ${view.totalRounds}`}</span>
          <div className="phone-prompt">{q?.text}</div>
          <div className="qz-answers">
            {q?.options.map((text, i) => (
              <button key={i} type="button" className={`qz-answer is-${LETTERS[i]!.toLowerCase()}`} onClick={() => client.input({ type: "answer", choice: i })}>
                <span className="qz-letter">{LETTERS[i]}</span>
                <span className="grow">{text}</span>
              </button>
            ))}
          </div>
        </div>
      );

    case "reveal": {
      const right = view.myChoice !== null && view.myChoice === view.answer;
      return (
        <PhoneMessage character={me?.character} mood={right ? "win" : "sad"} title={right ? `+${view.gained}!` : view.myChoice === null ? "Too slow!" : "Not quite!"}>
          {view.answer !== null && q && (
            <p>
              Answer: {LETTERS[view.answer]} — {q.options[view.answer]}
            </p>
          )}
        </PhoneMessage>
      );
    }

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
