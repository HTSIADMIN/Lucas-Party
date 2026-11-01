import type { CSSProperties } from "react";
import { CHARACTERS, SHADE_COLS, shadeCell, shadeColor, shadeLabel, type RoomView, type ShadeTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { PlayerToken, Podium, Scoreboard, nameOf, playerMap } from "../shared";
import { ColorGrid, ShadeSwatch, initialsFor, pickMarkers } from "./ColorGrid";
import "./shadespotter.css";

/** A strip of the board's vivid band, for the rules card. */
const RIBBON = Array.from({ length: SHADE_COLS }, (_, col) => shadeCell(col, 4));

function headline(view: View, room: RoomView): string {
  if (view.picks.length === 0) return "No picks this round!";
  const best = Math.max(...view.picks.map((p) => p.points));
  const leaders = [...new Set(view.picks.filter((p) => p.points === best).map((p) => p.playerId))];
  const who = leaders.length === 1 ? nameOf(room, leaders[0]) : null;
  if (best === 100) return who ? `Bullseye, ${who}!` : "Bullseyes all round!";
  if (best === 60) return who ? `So close, ${who}!` : "So close, everyone!";
  if (best === 30) return who ? `Warm, ${who}!` : "Warm-ish, everyone!";
  return "Way off, everyone!";
}

/** The cues so far: the newest one big, earlier ones small, dots while the cue-giver types. `compact` is a one-line recap. */
function CueCard({ view, giverName, compact = false }: { view: View; giverName: string; compact?: boolean }) {
  const typing = view.phase === "cue1" || view.phase === "cue2";
  const latest = view.cues.length - 1;
  if (compact) {
    return (
      <div className="card shade-cues is-compact">
        <div className="shade-cue-line">
          {view.cues.map((cue, i) => (
            <span key={i}>
              {i > 0 && <span className="shade-cue-arrow"> → </span>}“{cue}”
            </span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="card shade-cues">
      <span className="shade-cues-label">
        {giverName}'s {view.cues.length > 1 ? "cues" : "cue"}
      </span>
      {view.cues.map((cue, i) => (
        <div key={i} className={`shade-cue ${typing || i < latest ? "is-early" : "slam-in"}`}>
          {cue}
        </div>
      ))}
      {typing && (
        <div className="shade-typing" aria-label="Typing">
          <span />
          <span />
          <span />
        </div>
      )}
    </div>
  );
}

/** Who has locked in — faces only; the player strip below already shows names. */
function LockRow({ room, ids, doneIds }: { room: RoomView; ids: string[]; doneIds: string[] }) {
  const map = playerMap(room);
  return (
    <div className="progress-row shade-locks">
      {ids.map((id) => {
        const done = doneIds.includes(id);
        return (
          <PlayerToken
            key={id}
            player={map.get(id)}
            size={2.8}
            label={false}
            mood={done ? "happy" : "think"}
            motion={done ? "none" : "bob"}
            note={<span className={`token-check ${done ? "is-done" : ""}`}>{done ? "✓" : "…"}</span>}
          />
        );
      })}
    </div>
  );
}

/** Reveal scores per guesser, best first, with where each pick landed. */
function Legend({ view, room }: { view: View; room: RoomView }) {
  const map = playerMap(room);
  const initials = initialsFor(room.players);
  const rows = view.guesserIds
    .map((id) => {
      const picks = view.picks.filter((p) => p.playerId === id).sort((a, b) => a.step - b.step);
      return { id, picks, total: picks.reduce((sum, p) => sum + p.points, 0) };
    })
    .sort((a, b) => b.total - a.total);
  const best = rows[0]?.total ?? 0;
  return (
    <div className="shade-legend">
      {rows.map((row, i) => {
        const p = map.get(row.id);
        return (
          <div key={row.id} className={`shade-legend-row rise-in ${best > 0 && row.total === best ? "is-top" : ""}`} style={{ animationDelay: `${400 + i * 90}ms` }}>
            <span className="shade-legend-dot" style={{ "--seat": p ? CHARACTERS[p.character].color : "var(--surface-3)" } as CSSProperties}>
              {initials.get(row.id)}
            </span>
            <span className="shade-legend-name">
              <span>{p?.name ?? "Someone"}</span>
              <small>{row.picks.length ? row.picks.map((pick) => `${shadeLabel(pick.cell)} ${pick.points > 0 ? `+${pick.points}` : "miss"}`).join(" · ") : "No pick"}</small>
            </span>
            <b className="shade-legend-points tabular">{row.total > 0 ? `+${row.total}` : "0"}</b>
          </div>
        );
      })}
    </div>
  );
}

function Side({ view, room, client }: TvGameProps<View>) {
  const giver = view.cueGiverId ? playerMap(room).get(view.cueGiverId) : undefined;
  const giverName = giver?.name ?? "Someone";
  const pill = (
    <span className="tv-pill">
      Round {view.round} of {view.totalRounds}
    </span>
  );

  switch (view.phase) {
    case "cue1":
      return (
        <>
          {pill}
          {giver && <Character id={giver.character} size="7em" mood="think" motion="bob" />}
          <h1 className="tv-title shade-side-title">{giverName} is the cue-giver</h1>
          <p className="tv-sub">Peeking at a secret shade… one word coming up.</p>
          <Timer client={client} room={room} size="4.6em" />
        </>
      );

    case "guess1":
    case "guess2":
      return (
        <>
          {pill}
          <CueCard view={view} giverName={giverName} />
          <Timer client={client} room={room} size="4.6em" />
          <p className="tv-sub">{view.phase === "guess1" ? "Tap the shade on your phone!" : "Pick again — somewhere new!"}</p>
          <LockRow room={room} ids={view.guesserIds} doneIds={view.lockedIds} />
        </>
      );

    case "cue2":
      return (
        <>
          {pill}
          <CueCard view={view} giverName={giverName} />
          {giver && <Character id={giver.character} size="5em" mood="cheeky" motion="bob" />}
          <p className="tv-sub">First picks are in! {giverName} is adding up to two words to steer you…</p>
          <Timer client={client} room={room} size="4.6em" />
        </>
      );

    case "reveal":
      if (view.skipped) {
        return (
          <>
            <h1 className="tv-title shade-side-title">Round skipped</h1>
            <p className="tv-sub">{giverName} never gave a cue. Here's the shade they had:</p>
            {view.target !== null && <ShadeSwatch cell={view.target} size="tv" className="pop-in" />}
          </>
        );
      }
      return (
        <>
          <h1 className="tv-title shade-side-title shade-reveal-title slam-in">{headline(view, room)}</h1>
          <CueCard view={view} giverName={giverName} compact />
          <Legend view={view} room={room} />
          <p className="tv-sub shade-giver-line">
            {giverName} +{view.cueGiverPoints} for {view.noSecondCue ? "the cue (no second one!)" : "the cues"}
          </p>
        </>
      );

    default:
      return null;
  }
}

export default function ShadeSpotterTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Shade Spotter</h1>
          <div className="shade-intro">
            <Telly size={170} pose="cheer" mood="cheeky" />
            <div className="card shade-rules">
              <div className="shade-ribbon" aria-hidden="true">
                {RIBBON.map((cell) => (
                  <span key={cell} style={{ background: shadeColor(cell) }} />
                ))}
              </div>
              <p>
                Each round one of you is the <b>cue-giver</b>. They see a secret shade on the grid and describe it in <b>one word</b>. Everyone else taps the shade they think it is — then a <b>two-word</b> cue steers a second pick.
              </p>
              <p>
                <b>Bullseye 100 · next door 60 · two away 30.</b> The cue-giver scores for every pick that lands right next to their shade.
              </p>
            </div>
          </div>
        </div>
      );

    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title={view.round >= view.totalRounds ? "Final scores" : `After round ${view.round}`} />
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} />;

    default:
      // The board stays mounted from the first cue through the reveal, so markers animate in only once.
      return (
        <div className="shade-stage">
          <ColorGrid size="tv" target={view.target} spotlight={view.target !== null} markers={pickMarkers(view.picks, room)} />
          <div className="shade-side">
            <Side room={room} view={view} client={client} />
          </div>
        </div>
      );
  }
}
