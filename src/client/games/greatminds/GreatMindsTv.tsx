import { GM_DUNCE_PENALTY, type GmGroup, type GmTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, Scoreboard, nameOf, playerMap } from "../shared";
import { DunceCap } from "./DunceCap";
import "./greatminds.css";

function GroupCard({ group, room, view, index }: { group: GmGroup; room: TvGameProps["room"]; view: View; index: number }) {
  const map = playerMap(room);
  const alone = group.playerIds.length === 1;
  return (
    <div className={`gm-group rise-in ${group.herd ? "is-herd" : ""} ${alone ? "is-alone" : ""}`} style={{ animationDelay: `${index * 120}ms` }}>
      {group.herd && <span className="gm-ribbon">{view.herdPoints === 100 ? "THE HERD" : "TIED HERD"} +{view.herdPoints}</span>}
      <div className="gm-answer">{group.text}</div>
      <div className="gm-members">
        {group.playerIds.map((id) => {
          const p = map.get(id);
          const capped = view.dunceId === id;
          return (
            <div key={id} className="gm-member">
              {capped && <DunceCap className={`gm-cap ${view.dunceMoved ? "is-new" : ""}`} size="2em" />}
              {p && <Character id={p.character} size="3.4em" motion={group.herd ? "jump" : "none"} mood={group.herd ? "win" : alone ? "sad" : "happy"} />}
              <span className="token-name">{p?.name}</span>
            </div>
          );
        })}
      </div>
      {alone && <span className="gm-alone-tag">Lone wolf</span>}
    </div>
  );
}

export default function GreatMindsTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const ids = room.players.filter((p) => p.inGame).map((p) => p.id);

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Great Minds</h1>
          <Telly size={170} pose="cheer" mood="cheeky" />
          <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
            Answer each question the way you think <b>most people</b> will. The biggest group of matching answers scores. Alone with a weird answer? You get the <b>Dunce Cap</b> — still wearing it at the end costs {GM_DUNCE_PENALTY} points.
          </div>
        </div>
      );

    case "answer":
      return (
        <div className="tv-center gm-ask">
          <span className="tv-pill">
            Question {view.round} of {view.totalRounds}
          </span>
          <div className="card gm-question slam-in">{view.question}</div>
          <Timer client={client} room={room} size="6em" />
          <p className="tv-sub">Answer on your phone. Think like the herd!</p>
          <ProgressRow room={room} ids={ids} doneIds={view.answeredIds} size={3.4} />
        </div>
      );

    case "reveal": {
      const headline = view.groups.length === 0 ? "Nobody answered!" : view.herdPoints === 0 ? "No herd this time!" : view.herdPoints === 100 ? "Great minds think alike!" : "A tie for the herd!";
      return (
        <div className="gm-reveal">
          <div className="gm-reveal-head">
            <div className="card gm-question is-small">{view.question}</div>
            <h1 className="tv-title" style={{ fontSize: "2.8em" }}>
              {headline}
            </h1>
          </div>
          <div className="gm-groups">
            {view.groups.map((g, i) => (
              <GroupCard key={g.key} group={g} room={room} view={view} index={i} />
            ))}
          </div>
          {view.dunceMoved && view.dunceId && (
            <div className="gm-dunce-banner slam-in">
              <DunceCap size="1.6em" /> {nameOf(room, view.dunceId)} takes the Dunce Cap!
            </div>
          )}
          {view.noAnswerIds.length > 0 && <p className="tv-sub gm-noanswer">No answer: {view.noAnswerIds.map((id) => nameOf(room, id)).join(", ")}</p>}
        </div>
      );
    }

    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title={view.round >= view.totalRounds ? "Final scores" : `After question ${view.round}`} />
          {view.dunceId && (
            <p className="tv-sub gm-dunce-note">
              <DunceCap size="1.3em" /> {nameOf(room, view.dunceId)} is wearing the Dunce Cap
              {view.round >= view.totalRounds ? ` (−${GM_DUNCE_PENALTY})` : ""}
            </p>
          )}
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} />;
  }
}
