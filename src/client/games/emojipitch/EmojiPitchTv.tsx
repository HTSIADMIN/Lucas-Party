import type { EpTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, Scoreboard, nameOf, playerMap } from "../shared";
import "./emojipitch.css";

const LETTERS = ["A", "B", "C", "D"] as const;

export default function EmojiPitchTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const pitcher = view.pitcherId ? map.get(view.pitcherId) : undefined;

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Emoji Pitch</h1>
          <Telly size={170} pose="cheer" mood="cheeky" />
          <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
            Everyone gets a secret prompt and pitches it in <b>one to three emoji</b>. Then guess what everyone else's emoji mean. Clear pitches and sharp guesses both score.
          </div>
        </div>
      );

    case "pitch":
      return (
        <div className="tv-center">
          <h1 className="tv-title" style={{ fontSize: "3.4em" }}>
            Pitch your prompt in emoji!
          </h1>
          <div className="ep-sample">🤔 ➡️ 🎬</div>
          <Timer client={client} room={room} size="6em" />
          <ProgressRow room={room} ids={view.activeIds} doneIds={view.doneIds} size={3.4} />
        </div>
      );

    case "guess":
    case "reveal":
      return (
        <div className="tv-center ep-stage">
          <span className="tv-pill">
            Pitch {view.round} of {view.totalRounds}
          </span>
          <div className="ep-emoji slam-in" key={view.round}>
            {view.emoji}
          </div>
          <span className="ep-by">
            {pitcher && <Character id={pitcher.character} size="2.2em" motion="none" mood={view.phase === "reveal" ? "win" : "cheeky"} />} pitched by {pitcher?.name}
          </span>
          <div className="ep-options">
            {view.options.map((text, i) => {
              const pickers = Object.entries(view.picks ?? {}).filter(([, idx]) => idx === i).map(([id]) => id);
              const state = view.answer === null ? "" : view.answer === i ? "is-right" : "is-wrong";
              return (
                <div key={i} className={`ep-option ${state}`}>
                  <span className="ep-letter">{LETTERS[i]}</span>
                  <span className="grow">{text}</span>
                  {view.answer !== null && (
                    <span className="ep-pickers">
                      {pickers.map((id) => {
                        const p = map.get(id);
                        return p ? <Character key={id} id={p.character} size="1.7em" motion="none" mood={view.answer === i ? "happy" : "sad"} /> : null;
                      })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {view.phase === "guess" ? (
            <>
              <Timer client={client} room={room} size="4.2em" />
              <ProgressRow room={room} ids={view.activeIds} doneIds={view.doneIds} size={2.6} />
            </>
          ) : (
            <p className="tv-sub">It was “{view.answer !== null ? view.options[view.answer] : ""}” — {nameOf(room, view.pitcherId)} scores for every right guess.</p>
          )}
        </div>
      );

    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title={`After pitch ${view.round}`} />
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} />;
  }
}
