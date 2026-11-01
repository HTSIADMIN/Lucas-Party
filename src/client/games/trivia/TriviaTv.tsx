import type { QzTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, Scoreboard, playerMap } from "../shared";
import "./trivia.css";

const LETTERS = ["A", "B", "C", "D"] as const;

export default function TriviaTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const ids = room.players.filter((p) => p.inGame).map((p) => p.id);
  const q = view.question;

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Telly Trivia</h1>
          <Telly size={170} pose="cheer" mood="happy" />
          <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
            Answer on your phone — <b>faster right answers score more</b>. The final question is worth <b>double</b>. No phones-a-friend, no googling!
          </div>
        </div>
      );

    case "question":
    case "reveal":
      return (
        <div className="tv-center qz-stage">
          <div className="row center" style={{ gap: "0.8em" }}>
            <span className="tv-pill">{view.final ? "Final question · double points" : `Question ${view.round} of ${view.totalRounds}`}</span>
            {q && <span className="chip">{q.category}</span>}
          </div>
          <div className="card qz-question slam-in">{q?.text}</div>
          <div className="qz-options">
            {q?.options.map((text, i) => {
              const pickers = view.answers.filter((a) => a.choice === i);
              const state = view.answer === null ? "" : view.answer === i ? "is-right" : "is-wrong";
              return (
                <div key={i} className={`qz-option is-${LETTERS[i]!.toLowerCase()} ${state}`}>
                  <span className="qz-letter">{LETTERS[i]}</span>
                  <span className="qz-option-text">{text}</span>
                  {view.answer !== null && (
                    <span className="qz-pickers">
                      {pickers.map((a) => {
                        const p = map.get(a.playerId);
                        return p ? <Character key={a.playerId} id={p.character} size="1.8em" motion="none" mood={a.correct ? "win" : "sad"} /> : null;
                      })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {view.phase === "question" ? (
            <>
              <Timer client={client} room={room} size="4.5em" />
              <ProgressRow room={room} ids={ids} doneIds={view.doneIds} size={2.8} />
            </>
          ) : (
            <div className="qz-gains">
              {[...view.answers]
                .filter((a) => a.correct)
                .sort((a, b) => b.points - a.points)
                .map((a) => (
                  <span key={a.playerId} className="chip qz-gain">
                    {map.get(a.playerId)?.name} +{a.points}
                  </span>
                ))}
              {!view.answers.some((a) => a.correct) && <span className="tv-sub">Nobody got it!</span>}
            </div>
          )}
        </div>
      );

    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title={view.final ? "Final scores" : `After question ${view.round}`} />
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} />;
  }
}
