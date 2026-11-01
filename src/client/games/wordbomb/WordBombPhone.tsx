import { useState } from "react";
import { WB_WORD_MAX, type WbPlayer } from "@party/shared";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore, nameOf } from "../shared";
import "./wordbomb.css";

function WordForm({ syllable, onSend }: { syllable: string; onSend(text: string): void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="phone-card pop-in wb-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSend(text.trim());
      }}
    >
      <span className="label">You have the bomb! Type a word with</span>
      <div className="wb-phone-syllable">{syllable}</div>
      <input className="input wb-input" value={text} maxLength={WB_WORD_MAX} autoFocus autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="A real word…" onChange={(e) => setText(e.target.value)} />
      <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={!text.trim()}>
        Pass it on!
      </button>
    </form>
  );
}

export default function WordBombPhone({ view, client, room, playerId }: PhoneGameProps<WbPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;

  if (view.phase === "intro") {
    return (
      <PhoneMessage character={me?.character} mood="shock" title="Word Bomb">
        <p>Warm up your vocabulary.</p>
      </PhoneMessage>
    );
  }
  if (view.phase === "podium") return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  if (!view.alive) {
    return (
      <PhoneMessage character={me?.character} mood="sad" title="You're out!">
        <p>Cheer (or heckle) from the sidelines.</p>
      </PhoneMessage>
    );
  }

  return (
    <>
      {view.isHolder && view.syllable ? (
        <WordForm key={`${view.syllable}-${view.usedCount}`} syllable={view.syllable} onSend={(text) => client.input({ type: "word", text })} />
      ) : (
        <PhoneMessage character={me?.character} mood={view.phase === "boom" ? "shock" : "think"} title={view.phase === "boom" ? "BOOM!" : `${nameOf(room, view.holderId)} has the bomb`}>
          {view.syllable && <p className="wb-phone-syllable is-small">{view.syllable}</p>}
          <p className="wb-lives">{"❤".repeat(view.lives)}</p>
        </PhoneMessage>
      )}
      {view.challengeable.length > 0 && (
        <div className="phone-card">
          <span className="label">Not a real word?</span>
          {view.challengeable.map((w) => (
            <button key={w.at} type="button" className="btn btn-danger btn-block" onClick={() => client.input({ type: "challenge", at: w.at })}>
              No way: “{w.word}”!
            </button>
          ))}
        </div>
      )}
    </>
  );
}
