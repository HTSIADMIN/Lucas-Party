import { useState } from "react";
import {
  CHARACTERS,
  SHADE_CUE_GIVER_RANGE,
  SHADE_CUE_MAX,
  cleanText,
  shadeBandLabel,
  shadeCueProblem,
  shadeDistance,
  type ShadePlayer,
  type ShadeStep,
} from "@party/shared";
import { Timer } from "../../ui/Timer";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore, nameOf } from "../shared";
import { ColorGrid, ShadeSwatch, nudgeCell, pickMarkers, type ShadeMarker } from "./ColorGrid";
import "./shadespotter.css";

type Props = PhoneGameProps<ShadePlayer>;

/** The cue-giver's turn: their secret shade, the scoring area, and the cue box. */
function CueForm({ view, room, client }: Props) {
  const step: ShadeStep = view.phase === "cue2" ? 2 : 1;
  const [text, setText] = useState("");
  const cue = cleanText(text, SHADE_CUE_MAX[step]);
  const problem = cue ? shadeCueProblem(cue, step) : null;
  if (view.target === null) return null;
  return (
    <>
      <form
        className="phone-card pop-in"
        onSubmit={(e) => {
          e.preventDefault();
          if (cue && !problem) client.input({ type: "cue", text: cue });
        }}
      >
        <div className="shade-phone-head">
          <h2 className="phone-card-title">{step === 1 ? "You're the cue-giver! 🎨" : "Steer them in!"}</h2>
          <Timer client={client} room={room} size={42} />
        </div>
        <ShadeSwatch cell={view.target} size="lg" caption="Your secret shade — only you can see it" />
        <p className="shade-phone-hint">
          {step === 1 ? (
            <>
              Describe it in <b>one word</b>. No coordinates!
            </>
          ) : (
            <>
              You said <b>“{view.cues[0]}”</b> — their first picks are on the grid below. Now add <b>up to two words</b>.
            </>
          )}
        </p>
        <input className="input" value={text} maxLength={SHADE_CUE_MAX[step]} placeholder={step === 1 ? "One word" : "Up to two words"} autoComplete="off" enterKeyHint="send" onChange={(e) => setText(e.target.value)} />
        {problem && <div className="form-error">{problem}</div>}
        <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={!cue || problem !== null}>
          Send cue
        </button>
      </form>
      <ColorGrid size="phone" className="shade-bleed" target={view.target} spotlight markers={pickMarkers(view.picks, room)} />
    </>
  );
}

/** While everyone guesses, the cue-giver just watches (and squirms). */
function CueGiverWatch({ view, room, client }: Props) {
  if (view.target === null) return null;
  return (
    <>
      <div className="phone-card">
        <div className="shade-phone-head">
          <h2 className="phone-card-title">No hints! 🤐</h2>
          <Timer client={client} room={room} size={42} />
        </div>
        <ShadeSwatch cell={view.target} size="lg" caption="Your secret shade" />
        <p className="shade-phone-hint">
          {view.lockedIds.length} of {view.guesserIds.length} locked in. Watch them squirm.
        </p>
      </div>
      <ColorGrid size="phone" className="shade-bleed" target={view.target} spotlight markers={pickMarkers(view.picks, room)} />
    </>
  );
}

/** Tap or drag to choose, nudge with the arrows, then lock it in. */
function PickForm({ view, room, client, myColor }: Props & { myColor: string }) {
  const [cell, setCell] = useState<number | null>(null);
  const first = view.phase === "guess2" ? view.myPicks[0] : null;
  const taken = cell !== null && cell === first;
  const latest = view.cues.length - 1;
  const markers: ShadeMarker[] = first !== null ? [{ key: "first", cell: first, color: myColor, label: "1" }] : [];
  const nudge = (dc: number, dr: number) => setCell((c) => nudgeCell(c, dc, dr));
  return (
    <>
      <div className="phone-card shade-phone-cues">
        <div className="shade-phone-head">
          <span className="label">
            {nameOf(room, view.cueGiverId)}'s {view.cues.length > 1 ? "cues" : "cue"}
          </span>
          <Timer client={client} room={room} size={38} />
        </div>
        {view.cues.map((cue, i) => (
          <div key={i} className={`shade-phone-cue ${i < latest ? "is-early" : ""}`}>
            {cue}
          </div>
        ))}
      </div>
      <div className="shade-pick-bar">
        <ShadeSwatch cell={cell} size="md" caption={taken ? "Your first pick!" : cell === null ? "Tap or drag the grid" : "Your pick"} />
        <div className="shade-nudge" role="group" aria-label="Nudge your pick">
          <button type="button" className="btn btn-light shade-nudge-up" aria-label="Up" onClick={() => nudge(0, -1)}>
            ↑
          </button>
          <button type="button" className="btn btn-light shade-nudge-left" aria-label="Left" onClick={() => nudge(-1, 0)}>
            ←
          </button>
          <button type="button" className="btn btn-light shade-nudge-down" aria-label="Down" onClick={() => nudge(0, 1)}>
            ↓
          </button>
          <button type="button" className="btn btn-light shade-nudge-right" aria-label="Right" onClick={() => nudge(1, 0)}>
            →
          </button>
        </div>
      </div>
      <ColorGrid size="phone" className="shade-bleed" selected={cell} markers={markers} onSelect={setCell} />
      <div className="phone-sticky">
        <button
          type="button"
          className="btn btn-accent btn-lg btn-block"
          disabled={cell === null || taken}
          onClick={() => {
            if (cell !== null && !taken) client.input({ type: "pick", cell });
          }}
        >
          {taken ? "Pick somewhere new" : "Lock it in"}
        </button>
      </div>
    </>
  );
}

/** The reveal on a phone: how my picks did (or my cues, for the cue-giver), and the board. */
function Result({ view, room, playerId, myColor }: Props & { myColor: string }) {
  if (view.target === null) return null;
  const target = view.target;
  if (view.isCueGiver) {
    const close = view.picks.filter((p) => shadeDistance(p.cell, target) <= SHADE_CUE_GIVER_RANGE).length;
    return (
      <>
        <div className="phone-card shade-result pop-in">
          <h2 className="phone-card-title">
            +{view.myPoints ?? 0} for your {view.cues.length > 1 ? "cues" : "cue"}
          </h2>
          <p className="shade-phone-hint">{close === 0 ? "Nobody landed right next to it. Tough crowd!" : `${close} pick${close === 1 ? "" : "s"} landed right next to your shade.`}</p>
          <ShadeSwatch cell={target} size="lg" caption="Your shade" />
        </div>
        <ColorGrid size="phone" className="shade-bleed" target={target} spotlight markers={pickMarkers(view.picks, room)} />
      </>
    );
  }
  const mine = view.picks.filter((p) => p.playerId === playerId).sort((a, b) => a.step - b.step);
  const points = view.myPoints ?? 0;
  const best = Math.max(0, ...mine.map((p) => p.points));
  const title = mine.length === 0 ? "No picks this round" : points > 0 ? `+${points} — ${shadeBandLabel(best)}` : "Missed it!";
  return (
    <>
      <div className="phone-card shade-result pop-in">
        <h2 className="phone-card-title">{title}</h2>
        <div className="shade-result-swatches">
          <ShadeSwatch cell={target} size="md" caption="The shade" />
          {mine.map((p) => (
            <ShadeSwatch key={p.step} cell={p.cell} size="md" caption={`Pick ${p.step}: ${p.points > 0 ? `+${p.points}` : "0"}`} />
          ))}
        </div>
      </div>
      <ColorGrid
        size="phone"
        className="shade-bleed"
        target={target}
        spotlight
        markers={mine.map((p) => ({ key: String(p.step), cell: p.cell, color: myColor, label: String(p.step) }))}
      />
    </>
  );
}

export default function ShadeSpotterPhone(props: Props) {
  const { view, room, playerId } = props;
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;
  const myColor = me ? CHARACTERS[me.character].color : "var(--surface-3)";
  const giverName = nameOf(room, view.cueGiverId);

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Shade Spotter">
          <p>Describe a colour in a word — or find it from one.</p>
        </PhoneMessage>
      );

    case "cue1":
    case "cue2":
      if (view.isCueGiver) return <CueForm key={view.phase} {...props} />;
      return (
        <PhoneMessage character={me?.character} mood="think" title={view.phase === "cue1" ? `${giverName} is thinking of a cue…` : `${giverName} is adding more words…`}>
          {view.phase === "cue1" ? (
            <p>Study the grid on the TV — the cue lands any second.</p>
          ) : view.myPicks[0] !== null ? (
            <>
              <ShadeSwatch cell={view.myPicks[0]} size="md" caption="Your first pick" className="shade-centered" />
              <p>See where everyone landed on the TV.</p>
            </>
          ) : (
            <p>You missed the first pick — get the next one!</p>
          )}
        </PhoneMessage>
      );

    case "guess1":
    case "guess2": {
      if (view.isCueGiver) return <CueGiverWatch {...props} />;
      if (view.canPick) return <PickForm key={view.phase} {...props} myColor={myColor} />;
      const pick = view.myPicks[view.phase === "guess1" ? 0 : 1];
      return (
        <PhoneMessage character={me?.character} mood="happy" title="Locked in!">
          {pick !== null && <ShadeSwatch cell={pick} size="md" className="shade-centered" />}
          <p>Waiting for the others…</p>
        </PhoneMessage>
      );
    }

    case "reveal":
      if (view.skipped) {
        return (
          <PhoneMessage character={me?.character} mood="sad" title="Round skipped">
            <p>{view.isCueGiver ? "The clock beat you to it!" : `${giverName} never gave a cue.`}</p>
          </PhoneMessage>
        );
      }
      return <Result {...props} myColor={myColor} />;

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} />;
  }
}
