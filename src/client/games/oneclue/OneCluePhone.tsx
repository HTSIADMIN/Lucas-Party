import { useState } from "react";
import { OC_CLUE_MAX, OC_GUESS_MAX, ocClueProblem, type CharacterId, type OcInput, type OcPlayer } from "@party/shared";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore, nameOf } from "../shared";
import "./oneclue.css";

type Room = PhoneGameProps["room"];

function ClueForm({ view, guesserName, onSend }: { view: OcPlayer; guesserName: string; onSend(text: string): void }) {
  const [text, setText] = useState("");
  const clue = text.trim();
  // Same rules the TV enforces, checked as you type.
  const problem = clue ? ocClueProblem(clue, view.word ? [view.word] : []) : "empty";
  return (
    <form
      className="phone-card pop-in"
      onSubmit={(e) => {
        e.preventDefault();
        if (!problem) onSend(clue);
      }}
    >
      <span className="label">
        Round {view.round} of {view.totalRounds} · {guesserName} is guessing
      </span>
      <span className="oc-phone-lead">The mystery word is</span>
      <div className="secret-word">{view.word}</div>
      <input className="input" value={text} maxLength={OC_CLUE_MAX} autoFocus autoComplete="off" placeholder="Your one-word clue" onChange={(e) => setText(e.target.value)} />
      {problem === "words" ? (
        <div className="form-error">One word only!</div>
      ) : problem === "obvious" ? (
        <div className="form-error">Too close to the mystery word!</div>
      ) : (
        <p className="oc-phone-hint">Matching clues cancel out — be clever, not obvious!</p>
      )}
      <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={problem !== null}>
        Lock it in
      </button>
    </form>
  );
}

function GuessForm({ view, room, onGuess, onPass }: { view: OcPlayer; room: Room; onGuess(text: string): void; onPass(): void }) {
  const [text, setText] = useState("");
  const live = view.cards.filter((c) => !c.cancelled);
  const cancelled = view.cards.length - live.length;
  return (
    <div className="phone-card pop-in">
      <h2 className="phone-card-title">What's the word?</h2>
      <div className="oc-phone-clues">
        {live.map((c, i) => (
          <div key={c.playerId ?? i} className="oc-phone-clue">
            <b>{c.text}</b>
            <span>{nameOf(room, c.playerId)}</span>
          </div>
        ))}
        {Array.from({ length: cancelled }, (_, i) => (
          <div key={`x${i}`} className="oc-phone-clue is-cancelled">
            ✕ Cancelled
          </div>
        ))}
      </div>
      <form
        className="oc-phone-guess"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) onGuess(text.trim());
        }}
      >
        <input className="input" value={text} maxLength={OC_GUESS_MAX} autoComplete="off" placeholder="Your guess" onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={!text.trim()}>
          Guess!
        </button>
      </form>
      <button type="button" className="btn btn-light btn-block" onClick={onPass}>
        Pass
      </button>
    </div>
  );
}

function missTitle(view: OcPlayer): string {
  switch (view.outcome) {
    case "pass":
      return "You passed";
    case "timeout":
      return "Out of time!";
    case "noClues":
      return view.cards.length ? "Every clue cancelled!" : "No clues came in";
    default:
      return "Not quite!";
  }
}

function Result({ view, room, character, onAccept }: { view: OcPlayer; room: Room; character?: CharacterId; onAccept(): void }) {
  const guesser = nameOf(room, view.guesserId);
  const right = view.outcome === "correct";
  const title = view.isGuesser
    ? right
      ? `+${view.gained} — you got it!`
      : missTitle(view)
    : right
      ? view.gained > 0
        ? `+${view.gained} — your clue helped!`
        : `${guesser} got it!`
      : "No points this round";
  return (
    <>
      <PhoneMessage character={character} mood={view.gained > 0 ? "win" : right ? "happy" : "sad"} title={title}>
        <p>
          The word was <span className="oc-phone-word">{view.word}</span>
        </p>
        {view.isGuesser && !right && view.guess && <p>You guessed “{view.guess}”.</p>}
        {!view.isGuesser && view.myClue && <p>{view.myClueCancelled ? `Your clue “${view.myClue}” got cancelled.` : `Your clue: “${view.myClue}”`}</p>}
      </PhoneMessage>
      {view.canAccept && (
        <div className="phone-card pop-in">
          <span className="label">
            Host: {guesser} guessed “{view.guess}”. Typo or near miss?
          </span>
          <button type="button" className="btn btn-success btn-block" onClick={onAccept}>
            Close enough — count it
          </button>
        </div>
      )}
    </>
  );
}

export default function OneCluePhone({ view, client, room, playerId }: PhoneGameProps<OcPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;
  const send = (input: OcInput) => client.input(input);
  const guesserName = nameOf(room, view.guesserId);

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="One Clue">
          <p>One word to help a friend. Just don't say what everyone else says!</p>
        </PhoneMessage>
      );

    case "clue":
      if (view.isGuesser) {
        return (
          <PhoneMessage character={me?.character} mood="think" title="You're guessing! 🙈">
            <p>Close your eyes… well, don't look at anyone's phone.</p>
            <p>
              {view.cluesIn} of {view.writerCount} clues in
            </p>
          </PhoneMessage>
        );
      }
      if (view.myClue) {
        return (
          <PhoneMessage character={me?.character} mood="happy" title="Locked in!">
            <p>
              Your clue: <b>“{view.myClue}”</b>
            </p>
            <p>Fingers crossed nobody else said it…</p>
          </PhoneMessage>
        );
      }
      return <ClueForm view={view} guesserName={guesserName} onSend={(text) => send({ type: "clue", text })} />;

    case "guess":
      if (view.canGuess) return <GuessForm view={view} room={room} onGuess={(text) => send({ type: "guess", text })} onPass={() => send({ type: "pass" })} />;
      return (
        <PhoneMessage character={me?.character} mood="think" title={`${guesserName} is guessing…`}>
          {view.myClue ? (
            <p>{view.myClueCancelled ? `Your clue “${view.myClue}” got cancelled — someone said it too!` : `Your clue “${view.myClue}” made it through!`}</p>
          ) : (
            <p>No clue from you this round.</p>
          )}
          <p>Shh! Will they get “{view.word}”?</p>
        </PhoneMessage>
      );

    case "result":
      return <Result view={view} room={room} character={me?.character} onAccept={() => send({ type: "accept" })} />;

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
