import type { CpTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, Scoreboard, playerMap } from "../shared";
import "./crowdpleaser.css";

export default function CrowdPleaserTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const ids = room.players.filter((p) => p.inGame).map((p) => p.id);
  const q = view.question;

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Crowd Pleaser</h1>
          <Telly size={170} pose="cheer" mood="cheeky" />
          <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
            Pick a side on each poll — then predict <b>how many of you</b> picked the first option. Nail the split exactly for 100. Only one on your side? Lone-wolf bonus.
          </div>
        </div>
      );

    case "answer":
      return (
        <div className="tv-center cp-ask">
          <span className="tv-pill">
            Poll {view.round} of {view.totalRounds}
          </span>
          <div className="card cp-question slam-in">{q?.text}</div>
          <div className="cp-sides">
            <div className="cp-side is-a">{q?.a}</div>
            <span className="cp-or">or</span>
            <div className="cp-side is-b">{q?.b}</div>
          </div>
          <Timer client={client} room={room} size="5em" />
          <p className="tv-sub">Pick a side and guess how many of the {view.voters} of you pick “{q?.a}”.</p>
          <ProgressRow room={room} ids={ids} doneIds={view.doneIds} size={3.2} />
        </div>
      );

    case "reveal": {
      const sideA = view.answers.filter((a) => a.choice === "a");
      const sideB = view.answers.filter((a) => a.choice === "b");
      return (
        <div className="tv-center cp-reveal">
          <div className="card cp-question is-small">{q?.text}</div>
          <div className="cp-columns">
            {[
              { label: q?.a, list: sideA, cls: "is-a" },
              { label: q?.b, list: sideB, cls: "is-b" },
            ].map((col) => (
              <div key={col.cls} className={`cp-column ${col.cls}`}>
                <div className="cp-count slam-in">{col.list.length}</div>
                <div className="cp-column-label">{col.label}</div>
                <div className="cp-faces">
                  {col.list.map((a) => {
                    const p = map.get(a.playerId);
                    return p ? <Character key={a.playerId} id={p.character} size="3em" motion="jump" mood="happy" /> : null;
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="cp-guesses">
            {[...view.answers]
              .sort((a, b) => b.points - a.points)
              .map((a) => (
                <span key={a.playerId} className={`chip cp-guess ${a.points >= 100 ? "is-exact" : ""}`}>
                  {map.get(a.playerId)?.name}: guessed {a.guess} {a.points > 0 ? `· +${a.points}` : ""}
                </span>
              ))}
          </div>
        </div>
      );
    }

    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title={`After poll ${view.round}`} />
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} />;
  }
}
