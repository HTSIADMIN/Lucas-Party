import type { CcTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, Scoreboard, nameOf, playerMap } from "../shared";
import "./court.css";

export default function CourtTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const defendant = view.defendantId ? map.get(view.defendantId) : undefined;
  const prosecutor = view.prosecutorId ? map.get(view.prosecutorId) : undefined;
  const defender = view.defenderId ? map.get(view.defenderId) : undefined;

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Character Court</h1>
          <Telly size={170} pose="cheer" mood="cheeky" />
          <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
            Order in the court! Each case, one of you is accused of a ridiculous crime. Two others are drafted as <b>prosecutor</b> and <b>defense</b> and write their best argument. The jury decides — lawyers score for every vote they win.
          </div>
        </div>
      );

    case "charge":
      return (
        <div className="tv-center cc-charge">
          <span className="tv-pill">
            Case #{view.round} of {view.totalRounds}
          </span>
          {defendant && <Character id={defendant.character} size="7em" mood="shock" motion="shake" />}
          <div className="card cc-crime slam-in">
            <b>{defendant?.name}</b> is accused of {view.crime}!
          </div>
          <div className="cc-lawyers">
            <span className="cc-lawyer is-prosecution">⚖️ Prosecution: {prosecutor?.name}</span>
            <span className="cc-lawyer is-defense">🛡️ Defense: {defender?.name}</span>
          </div>
          <Timer client={client} room={room} size="5em" />
          <ProgressRow room={room} ids={view.activeIds} doneIds={view.doneIds} size={3} />
        </div>
      );

    case "trial":
    case "verdict":
      return (
        <div className="cc-trial">
          <div className="cc-head">
            <div className="card cc-crime is-small">
              <b>{defendant?.name}</b> is accused of {view.crime}
            </div>
          </div>
          <div className="cc-cases">
            <div className={`cc-case is-prosecution ${view.verdict === "guilty" ? "is-winner" : ""}`}>
              <span className="cc-case-label">Prosecution · {prosecutor?.name}</span>
              <p className="cc-case-text">“{view.prosecution}”</p>
              {view.votes && <Voters ids={Object.entries(view.votes).filter(([, v]) => v === "guilty").map(([id]) => id)} room={room} />}
            </div>
            <div className="cc-dock">
              {defendant && <Character id={defendant.character} size="6em" mood={view.verdict === "guilty" ? "sad" : view.verdict === "innocent" ? "win" : "think"} motion={view.verdict ? "jump" : "bob"} />}
              <span className="token-name">{defendant?.name}</span>
            </div>
            <div className={`cc-case is-defense ${view.verdict === "innocent" ? "is-winner" : ""}`}>
              <span className="cc-case-label">Defense · {defender?.name}</span>
              <p className="cc-case-text">“{view.defense}”</p>
              {view.votes && <Voters ids={Object.entries(view.votes).filter(([, v]) => v === "innocent").map(([id]) => id)} room={room} />}
            </div>
          </div>
          {view.phase === "trial" ? (
            <div className="tv-center">
              <p className="tv-sub">Jury: guilty or not guilty? Vote on your phone!</p>
              <Timer client={client} room={room} size="4em" />
              <ProgressRow room={room} ids={view.activeIds} doneIds={view.doneIds} size={2.6} />
            </div>
          ) : (
            <div className="tv-center">
              <div className={`cc-verdict slam-in ${view.verdict === "guilty" ? "is-guilty" : "is-innocent"}`}>{view.verdict === "guilty" ? "GUILTY!" : "NOT GUILTY!"}</div>
              {view.sentence && (
                <p className="tv-sub">
                  The court sentences {nameOf(room, view.defendantId)} to {view.sentence}.
                </p>
              )}
            </div>
          )}
        </div>
      );

    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title={`After case #${view.round}`} />
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} />;
  }
}

function Voters({ ids, room }: { ids: string[]; room: TvGameProps["room"] }) {
  const map = playerMap(room);
  return (
    <div className="cc-voters">
      {ids.map((id) => {
        const p = map.get(id);
        return p ? <Character key={id} id={p.character} size="1.9em" motion="none" mood="cheeky" /> : null;
      })}
      <b className="cc-vote-count">{ids.length}</b>
    </div>
  );
}
