import type { DfTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import { Drawing } from "../drawing/Drawing";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, Scoreboard, nameOf, playerMap } from "../shared";
import "./doodlefraud.css";

export default function DoodleFraudTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const artist = view.artistId ? map.get(view.artistId) : undefined;

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Doodle Fraud</h1>
          <Telly size={170} pose="cheer" mood="cheeky" />
          <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
            Everyone draws a weird <b>secret prompt</b> on their phone. Then, one drawing at a time, write a <b>fake title</b> good enough to fool your friends — and try to spot the real one. Can't draw? Perfect.
          </div>
        </div>
      );

    case "draw":
      return (
        <div className="tv-center">
          <h1 className="tv-title" style={{ fontSize: "3.6em" }}>
            Draw your secret prompt!
          </h1>
          <Timer client={client} room={room} size="6em" />
          <p className="tv-sub">Masterpieces only. Or not. Nobody's judging. (Everyone's judging.)</p>
          <ProgressRow room={room} ids={view.activeIds} doneIds={view.doneIds} size={3.6} />
        </div>
      );

    case "title":
    case "pick":
      return (
        <div className="df-stage">
          <div className="df-frame">
            <Drawing key={view.round} strokes={view.drawing ?? []} animate className="df-drawing" label={`${artist?.name ?? "Someone"}'s drawing`} />
            <span className="df-artist">
              {artist && <Character id={artist.character} size="2.4em" motion="none" mood="cheeky" />} by {artist?.name}
            </span>
          </div>
          <div className="df-side">
            <span className="tv-pill">
              Drawing {view.round} of {view.totalRounds}
            </span>
            <h1 className="tv-title" style={{ fontSize: "2.8em" }}>
              {view.phase === "title" ? "What is it? Write a fake title!" : "Which one is real?"}
            </h1>
            <Timer client={client} room={room} size="5em" />
            {view.phase === "pick" && (
              <div className="df-options">
                {view.options.map((o, i) => (
                  <div key={o.key} className="df-option rise-in" style={{ animationDelay: `${i * 90}ms` }}>
                    {o.text}
                  </div>
                ))}
              </div>
            )}
            <ProgressRow room={room} ids={view.activeIds} doneIds={view.doneIds} size={2.8} />
          </div>
        </div>
      );

    case "reveal":
      return (
        <div className="df-stage">
          <div className="df-frame">
            <Drawing strokes={view.drawing ?? []} className="df-drawing" />
            <span className="df-artist">
              {artist && <Character id={artist.character} size="2.4em" motion="none" mood="win" />} by {artist?.name}
            </span>
          </div>
          <div className="df-side">
            <h1 className="tv-title slam-in" style={{ fontSize: "2.4em" }}>
              It was “{view.realPrompt}”
            </h1>
            <div className="df-options">
              {[...view.reveal]
                .sort((a, b) => Number(a.real) - Number(b.real) || b.pickerIds.length - a.pickerIds.length)
                .map((o, i) => (
                  <div key={o.key} className={`df-option is-revealed rise-in ${o.real ? "is-real" : ""}`} style={{ animationDelay: `${i * 350}ms` }}>
                    <div className="df-option-text">{o.text}</div>
                    <div className="df-option-meta">
                      {o.real ? <b>THE TRUTH</b> : o.authorIds.length ? <span>Lie by {o.authorIds.map((id) => nameOf(room, id)).join(" & ")}</span> : <span>House lie</span>}
                      <span className="df-pickers">
                        {o.pickerIds.map((id) => {
                          const p = map.get(id);
                          return p ? <Character key={id} id={p.character} size="1.7em" motion="none" mood={o.real ? "happy" : "shock"} /> : null;
                        })}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      );

    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title={`After drawing ${view.round}`} />
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} />;
  }
}
