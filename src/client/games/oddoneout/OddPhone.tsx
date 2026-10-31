import { useState } from "react";
import { ODD_CLUE_MAX, type OddPlayer } from "@party/shared";
import { Character } from "../../art/Character";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore, nameOf } from "../shared";
import "./odd.css";

function WordGrid({ view, onPick }: { view: OddPlayer; onPick?(index: number): void }) {
  if (!view.topic) return null;
  return (
    <div className="word-grid">
      {view.topic.words.map((w, i) =>
        onPick ? (
          <button key={w} type="button" className="word-cell" onClick={() => onPick(i)}>
            {w}
          </button>
        ) : (
          <div key={w} className={`word-cell ${view.secretIndex === i ? "is-secret" : ""}`}>
            {w}
          </div>
        ),
      )}
    </div>
  );
}

function SecretCard({ view }: { view: OddPlayer }) {
  return (
    <div className="phone-card">
      {view.isOdd ? (
        <>
          <span className="badge badge-danger" style={{ justifySelf: "center" }}>
            You're the faker 🤫
          </span>
          <p style={{ textAlign: "center", fontWeight: 700 }}>You don't know the word. Listen to the clues and blend in!</p>
        </>
      ) : (
        <>
          <span className="muted" style={{ textAlign: "center", fontWeight: 700 }}>
            The secret word is
          </span>
          <div className="secret-word">{view.secretWord}</div>
        </>
      )}
      <span className="label" style={{ textAlign: "center" }}>
        Topic: {view.topic?.name}
      </span>
      <WordGrid view={view} />
    </div>
  );
}

function ClueList({ view, room }: { view: OddPlayer; room: PhoneGameProps["room"] }) {
  const entries = Object.entries(view.clues);
  if (!entries.length) return null;
  return (
    <div className="phone-card">
      <span className="label">Clues so far</span>
      <div className="clue-list">
        {entries.map(([id, clue]) => {
          const p = room.players.find((x) => x.id === id);
          return (
            <div key={id} className="clue-item">
              {p && <Character id={p.character} size={30} motion="none" />}
              {p?.name}
              <b>{clue ?? "…"}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClueForm({ view, onSend }: { view: OddPlayer; onSend(text: string): void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="phone-card pop-in"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSend(text.trim());
      }}
    >
      <h2 className="phone-card-title">Your turn! 🎤</h2>
      <p className="muted" style={{ fontWeight: 600 }}>
        {view.isOdd ? "Fake it — give a clue that sounds like you know the word." : `One word that hints at “${view.secretWord}” — without making it obvious.`}
      </p>
      <input className="input" value={text} maxLength={ODD_CLUE_MAX} autoFocus placeholder="Your clue" onChange={(e) => setText(e.target.value)} />
      <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={!text.trim()}>
        Say it
      </button>
    </form>
  );
}

export default function OddPhone({ view, client, room, playerId }: PhoneGameProps<OddPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Odd One Out">
          <p>One of you won't know the secret word. Could be you…</p>
        </PhoneMessage>
      );

    case "reveal":
      return (
        <>
          <SecretCard view={view} />
          <button type="button" className="btn btn-lg btn-block" disabled={view.done} onClick={() => client.input({ type: "ready" })}>
            {view.done ? "Waiting for everyone…" : "Got it!"}
          </button>
        </>
      );

    case "clue":
      return (
        <>
          {view.myTurn ? (
            <ClueForm view={view} onSend={(text) => client.input({ type: "clue", text })} />
          ) : (
            <div className="phone-card" style={{ textAlign: "center", fontWeight: 700 }}>
              Waiting for {nameOf(room, view.currentTurnId)}'s clue…
            </div>
          )}
          <ClueList view={view} room={room} />
          <SecretCard view={view} />
        </>
      );

    case "discuss":
      return (
        <>
          <ClueList view={view} room={room} />
          <button type="button" className="btn btn-accent btn-lg btn-block" disabled={view.done} onClick={() => client.input({ type: "ready" })}>
            {view.done ? "Waiting for the others…" : "Ready to vote"}
          </button>
          <SecretCard view={view} />
        </>
      );

    case "vote":
      return (
        <div className="phone-card pop-in">
          <h2 className="phone-card-title">Who's the faker?</h2>
          <div className="phone-choices">
            {room.players
              .filter((p) => p.inGame && p.id !== playerId)
              .map((p) => (
                <button key={p.id} type="button" className={`choice ${view.myVote === p.id ? "is-picked" : ""}`} disabled={view.myVote !== null} onClick={() => client.input({ type: "vote", suspectId: p.id })}>
                  <Character id={p.character} size={44} motion="none" />
                  <span className="grow">{p.name}</span>
                  <b>{view.clues[p.id] ?? "…"}</b>
                </button>
              ))}
          </div>
          {view.isOdd && <p className="muted" style={{ fontWeight: 700, textAlign: "center" }}>Psst — vote for someone else to throw them off.</p>}
        </div>
      );

    case "voteReveal":
      return <PhoneMessage character={me?.character} mood="shock" title="The votes are in…" />;

    case "guess":
      if (view.canGuess) {
        return (
          <div className="phone-card pop-in">
            <h2 className="phone-card-title">Caught! Guess the word</h2>
            <p className="muted" style={{ fontWeight: 600 }}>
              Get it right and you steal the round.
            </p>
            <WordGrid view={view} onPick={(index) => client.input({ type: "guess", index })} />
          </div>
        );
      }
      return (
        <PhoneMessage character={me?.character} mood="think" title={`${nameOf(room, view.oddId)} is guessing…`}>
          <p>Will they figure out “{view.secretWord}”?</p>
        </PhoneMessage>
      );

    case "result": {
      const good = view.gained > 0;
      return (
        <PhoneMessage character={me?.character} mood={good ? "win" : "sad"} title={good ? `+${view.gained} points!` : "No points this round"}>
          <p>
            {view.outcome === "escaped" ? `${nameOf(room, view.oddId)} got away with it.` : view.outcome === "stolen" ? `${nameOf(room, view.oddId)} stole it with the right guess!` : `${nameOf(room, view.oddId)} got busted!`}
          </p>
        </PhoneMessage>
      );
    }

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
