import type { DoTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import { Drawing } from "../drawing/Drawing";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, Scoreboard, playerMap } from "../shared";
import "./drawoff.css";

export default function DrawOffTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Draw Off</h1>
          <Telly size={160} pose="cheer" mood="cheeky" />
          <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
            Everyone draws the <b>same</b> weird prompt. Then the gallery goes up — vote for your favourite (not your own!). Every vote is points, and the crowd favourite gets a bonus.
          </div>
        </div>
      );

    case "draw":
      return (
        <div className="tv-center">
          <span className="tv-pill">
            Round {view.round} of {view.totalRounds}
          </span>
          <div className="card do-prompt slam-in">{view.prompt}</div>
          <Timer client={client} room={room} size="6em" />
          <ProgressRow room={room} ids={view.activeIds} doneIds={view.doneIds} size={3.2} />
        </div>
      );

    case "gallery":
    case "reveal":
      return (
        <div className="tv-center do-stage">
          <div className="card do-prompt is-small">{view.prompt}</div>
          <div className="do-gallery">
            {view.entries.map((e, i) => {
              const artist = view.showArtists ? map.get(e.playerId) : undefined;
              const top = view.showArtists && (e.votes ?? 0) > 0 && (e.votes ?? 0) === Math.max(...view.entries.map((x) => x.votes ?? 0));
              return (
                <figure key={e.number} className={`do-frame rise-in ${top ? "is-top" : ""}`} style={{ animationDelay: `${i * 120}ms` }}>
                  <span className="do-number">{e.number}</span>
                  <Drawing strokes={e.strokes} animate={view.phase === "gallery"} className="do-drawing" />
                  {view.showArtists && (
                    <figcaption className="do-caption">
                      {artist && <Character id={artist.character} size="1.6em" motion="none" mood={top ? "win" : "happy"} />} {artist?.name}
                      <b>{e.votes ? `+${e.votes * 100}` : ""}</b>
                    </figcaption>
                  )}
                </figure>
              );
            })}
          </div>
          {view.phase === "gallery" && (
            <div className="row center" style={{ gap: "1em", alignItems: "center" }}>
              <Timer client={client} room={room} size="3.6em" />
              <ProgressRow room={room} ids={view.activeIds} doneIds={view.doneIds} size={2.2} />
            </div>
          )}
        </div>
      );

    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title={`After round ${view.round}`} />
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} />;
  }
}
