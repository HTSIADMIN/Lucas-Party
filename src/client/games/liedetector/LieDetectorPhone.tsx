import type { LiePlayer } from "@party/shared";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore, nameOf } from "../shared";
import "./liedetector.css";

export default function LieDetectorPhone({ view, client, room, playerId }: PhoneGameProps<LiePlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;
  const speaker = nameOf(room, view.speakerId);

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Lie Detector">
          <p>Practice your poker face.</p>
        </PhoneMessage>
      );

    case "choose":
      if (!view.isSpeaker) {
        return (
          <PhoneMessage character={me?.character} mood="think" title={`${speaker} is on the stand`}>
            <p>Watch their face…</p>
          </PhoneMessage>
        );
      }
      return (
        <div className="phone-card pop-in">
          <span className="label">Your question (keep it secret for a sec)</span>
          <div className="phone-prompt">{view.question}</div>
          <p className="muted" style={{ fontWeight: 700 }}>
            Will you tell the truth or lie when you answer out loud?
          </p>
          <div className="lie-choice">
            <button type="button" className="lie-choice-btn is-truth" onClick={() => client.input({ type: "choose", choice: "truth" })}>
              Truth
            </button>
            <button type="button" className="lie-choice-btn is-lie" onClick={() => client.input({ type: "choose", choice: "lie" })}>
              Lie
            </button>
          </div>
        </div>
      );

    case "talk":
      if (!view.isSpeaker) {
        return (
          <PhoneMessage character={me?.character} mood="think" title="Listen closely…">
            <p>{speaker} is answering. Truth or lie?</p>
          </PhoneMessage>
        );
      }
      return (
        <div className="phone-card pop-in">
          <span className={`badge ${view.myChoice === "lie" ? "badge-danger" : "badge-live"}`} style={{ justifySelf: "center" }}>
            You chose: {view.myChoice === "lie" ? "LIE" : "TRUTH"}
          </span>
          <div className="phone-prompt">{view.question}</div>
          <p className="muted" style={{ fontWeight: 700 }}>
            {view.myChoice === "lie" ? "Answer out loud with the opposite of the truth — add details and sell it!" : "Answer out loud honestly — tell the real story."}
          </p>
          <button type="button" className="btn btn-accent btn-lg btn-block" onClick={() => client.input({ type: "doneTalking" })}>
            I'm done talking
          </button>
        </div>
      );

    case "vote":
      if (view.isSpeaker) {
        return (
          <PhoneMessage character={me?.character} mood="cheeky" title="Poker face!">
            <p>They're voting. Don't crack.</p>
          </PhoneMessage>
        );
      }
      if (view.myVote) return <PhoneMessage character={me?.character} mood="think" title={`You said ${view.myVote}`} />;
      return (
        <div className="phone-card pop-in">
          <h2 className="phone-card-title">Was {speaker} telling the truth?</h2>
          <div className="lie-choice">
            <button type="button" className="lie-choice-btn is-truth" onClick={() => client.input({ type: "vote", verdict: "truth" })}>
              Truth
            </button>
            <button type="button" className="lie-choice-btn is-lie" onClick={() => client.input({ type: "vote", verdict: "lie" })}>
              Lie
            </button>
          </div>
        </div>
      );

    case "reveal":
      return (
        <PhoneMessage character={me?.character} mood={view.gained > 0 ? "win" : "sad"} title={view.gained > 0 ? `+${view.gained}!` : "Fooled!"}>
          <p>It was the {view.verdict === "lie" ? "LIE" : "TRUTH"}.</p>
        </PhoneMessage>
      );

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
