import { useState } from "react";
import { GM_ANSWER_MAX, GM_DUNCE_PENALTY, type GmPlayer } from "@party/shared";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore } from "../shared";
import { DunceCap } from "./DunceCap";
import "./greatminds.css";

function AnswerForm({ view, onSend }: { view: GmPlayer; onSend(text: string): void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="phone-card pop-in"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSend(text.trim());
      }}
    >
      <span className="label">
        Question {view.round} of {view.totalRounds}
      </span>
      <div className="phone-prompt">{view.question}</div>
      <input className="input" value={text} maxLength={GM_ANSWER_MAX} autoFocus placeholder="What will most people say?" onChange={(e) => setText(e.target.value)} />
      <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={!text.trim()}>
        Lock it in
      </button>
    </form>
  );
}

/** Host-only: pick groups that mean the same thing and merge them. */
function MergePanel({ view, onMerge }: { view: GmPlayer; onMerge(keys: string[]): void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const live = picked.filter((k) => view.groups.some((g) => g.key === k));
  if (view.groups.length < 2) return null;
  return (
    <div className="phone-card">
      <span className="label">Host: same answer, different words?</span>
      <div className="gm-merge-list">
        {view.groups.map((g) => {
          const on = live.includes(g.key);
          return (
            <button key={g.key} type="button" className={`gm-merge-item ${on ? "is-on" : ""}`} aria-pressed={on} onClick={() => setPicked(on ? live.filter((k) => k !== g.key) : [...live, g.key])}>
              <span className="grow">{g.text}</span>
              <b>×{g.playerIds.length}</b>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="btn btn-block"
        disabled={live.length < 2}
        onClick={() => {
          onMerge(live);
          setPicked([]);
        }}
      >
        Merge {live.length >= 2 ? live.length : ""} answers
      </button>
    </div>
  );
}

function Result({ view, playerId, character }: { view: GmPlayer; playerId: string; character?: PhoneGameProps["room"]["players"][number]["character"] }) {
  const said = view.groups.find((g) => g.playerIds.includes(playerId))?.text ?? view.myAnswer;
  if (!view.myAnswer) return <PhoneMessage character={character} mood="sad" title="No answer this time" />;
  return (
    <PhoneMessage
      character={character}
      mood={view.inHerd ? "win" : view.matchCount === 0 ? "sad" : "happy"}
      title={view.inHerd ? `+${view.gained} — Herd!` : view.matchCount === 0 ? "Lone wolf…" : "Close, but no herd"}
    >
      <p>
        {view.matchCount === 0 ? `Nobody else said “${said}”.` : `${view.matchCount} other${view.matchCount === 1 ? "" : "s"} said “${said}”.`}
      </p>
      {view.hasDunce && (
        <p className="gm-phone-dunce">
          <DunceCap size="1.6em" /> You're wearing the Dunce Cap
        </p>
      )}
    </PhoneMessage>
  );
}

export default function GreatMindsPhone({ view, client, room, playerId }: PhoneGameProps<GmPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Great Minds">
          <p>Don't be clever. Be popular.</p>
        </PhoneMessage>
      );

    case "answer":
      if (view.myAnswer) {
        return (
          <PhoneMessage character={me?.character} mood="think" title="Locked in!">
            <p>
              You said <b>“{view.myAnswer}”</b>. Waiting for the herd…
            </p>
          </PhoneMessage>
        );
      }
      return <AnswerForm view={view} onSend={(text) => client.input({ type: "answer", text })} />;

    case "reveal":
      return (
        <>
          <Result view={view} playerId={playerId} character={me?.character} />
          {view.canMerge && <MergePanel view={view} onMerge={(keys) => client.input({ type: "merge", keys })} />}
        </>
      );

    default:
      return (
        <>
          <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />
          {view.hasDunce && (
            <p className="gm-phone-dunce">
              <DunceCap size="1.6em" /> Dunce Cap{view.round >= view.totalRounds ? ` (−${GM_DUNCE_PENALTY})` : " — pass it on!"}
            </p>
          )}
        </>
      );
  }
}
