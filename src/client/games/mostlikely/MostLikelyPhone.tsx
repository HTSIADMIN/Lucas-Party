import type { MlPlayer } from "@party/shared";
import { Character } from "../../art/Character";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore, nameOf } from "../shared";
import "./mostlikely.css";

export default function MostLikelyPhone({ view, client, room, playerId }: PhoneGameProps<MlPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Most Likely To…">
          <p>Be honest. Your friends will be.</p>
        </PhoneMessage>
      );

    case "vote":
      if (view.myVote) {
        return (
          <PhoneMessage character={me?.character} mood="cheeky" title="Vote locked!">
            <p>
              You picked <b>{nameOf(room, view.myVote)}</b>. Let's see if the room agrees…
            </p>
          </PhoneMessage>
        );
      }
      return (
        <div className="phone-card pop-in">
          <span className="label">Who's most likely to…</span>
          <div className="phone-prompt">{view.prompt}?</div>
          <div className="phone-choices">
            {room.players
              .filter((p) => p.inGame && p.id !== playerId)
              .map((p) => (
                <button key={p.id} type="button" className="choice" onClick={() => client.input({ type: "vote", targetId: p.id })}>
                  <Character id={p.character} size={44} motion="none" />
                  <span className="grow">{p.name}</span>
                </button>
              ))}
          </div>
        </div>
      );

    case "reveal": {
      const picked = view.topIds.includes(playerId);
      const title = picked ? "The room picked YOU!" : view.matched ? `+${view.gained} — you read the room!` : view.topIds.length ? `The room picked ${nameOf(room, view.topIds[0])}` : "Nobody voted!";
      return (
        <PhoneMessage character={me?.character} mood={picked ? "shock" : view.matched ? "win" : "idle"} title={title}>
          {picked && <p>{view.votesForMe === 1 ? "1 vote" : `${view.votesForMe} votes`} for “most likely to {view.prompt}”.</p>}
          {picked && view.matched && <p className="phone-gain">+{view.gained}</p>}
          {!picked && !view.matched && view.myVote && <p>You picked {nameOf(room, view.myVote)}.</p>}
        </PhoneMessage>
      );
    }

    case "awards":
      return (
        <div className="phone-card pop-in">
          <h2 className="phone-card-title">Your titles</h2>
          {view.myAwards.length ? (
            <ul className="ml-phone-titles">
              {view.myAwards.map((t) => (
                <li key={t}>Most likely to {t}</li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ fontWeight: 700 }}>
              None! Suspiciously normal.
            </p>
          )}
        </div>
      );

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
