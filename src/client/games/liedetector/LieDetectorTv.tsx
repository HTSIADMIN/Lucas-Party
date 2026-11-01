import type { LieTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, Scoreboard, nameOf, playerMap } from "../shared";
import "./liedetector.css";

/** A squiggly polygraph trace; `calm` slows it down. */
function Polygraph({ calm = false }: { calm?: boolean }) {
  return (
    <div className={`lie-polygraph ${calm ? "is-calm" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 400 80" preserveAspectRatio="none">
        <path className="lie-trace" d="M0 40 L20 40 L28 18 L36 62 L44 30 L52 46 L70 40 L90 40 L96 10 L104 70 L112 26 L120 52 L128 40 L150 40 L158 30 L166 50 L180 40 L200 40 L206 8 L214 72 L222 20 L230 58 L238 40 L260 40 L268 28 L276 52 L290 40 L310 40 L316 14 L324 66 L332 30 L340 48 L350 40 L400 40" />
      </svg>
    </div>
  );
}

export default function LieDetectorTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const speaker = view.speakerId ? map.get(view.speakerId) : undefined;

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Lie Detector</h1>
          <Telly size={170} pose="cheer" mood="think" />
          <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
            One player gets a question about themselves and secretly decides: <b>truth or lie</b>. Then they answer <b>out loud</b> — tell a story, sell it! Everyone else votes. Spot the liar to score; fool the room to score bigger.
          </div>
        </div>
      );

    case "choose":
      return (
        <div className="tv-center">
          <span className="tv-pill">
            Round {view.round} of {view.totalRounds}
          </span>
          {speaker && <Character id={speaker.character} size="8em" mood="think" motion="bob" />}
          <h1 className="tv-title" style={{ fontSize: "3em" }}>
            {speaker?.name} is taking the stand…
          </h1>
          <p className="tv-sub">Deciding whether to tell the truth. Or not.</p>
          <Polygraph calm />
        </div>
      );

    case "talk":
    case "vote":
      return (
        <div className="lie-stage">
          <div className="lie-witness">
            {speaker && <Character id={speaker.character} size="8em" mood={view.phase === "talk" ? "cheeky" : "think"} motion="bob" />}
            <span className="token-name">{speaker?.name}</span>
          </div>
          <div className="lie-side">
            <div className="card lie-question slam-in">{view.question}</div>
            <Polygraph />
            <Timer client={client} room={room} size="5em" />
            {view.phase === "talk" ? (
              <p className="tv-sub">{speaker?.name}, answer out loud — and make it convincing!</p>
            ) : (
              <>
                <p className="tv-sub">Truth or lie? Vote on your phone!</p>
                <ProgressRow room={room} ids={view.activeIds} doneIds={view.doneIds} size={2.8} />
              </>
            )}
          </div>
        </div>
      );

    case "reveal": {
      const truthers = Object.entries(view.votes ?? {}).filter(([, v]) => v === "truth").map(([id]) => id);
      const liars = Object.entries(view.votes ?? {}).filter(([, v]) => v === "lie").map(([id]) => id);
      return (
        <div className="tv-center lie-reveal">
          <div className="lie-question is-small card">{view.question}</div>
          <div className={`lie-stamp slam-in ${view.verdict === "lie" ? "is-lie" : "is-truth"}`}>{view.verdict === "lie" ? "LIE!" : "TRUTH!"}</div>
          <p className="tv-sub">
            {nameOf(room, view.speakerId)} was {view.verdict === "lie" ? "lying" : "telling the truth"}.
          </p>
          <div className="lie-columns">
            {[
              { label: "Said truth", ids: truthers, right: view.verdict === "truth" },
              { label: "Said lie", ids: liars, right: view.verdict === "lie" },
            ].map((col) => (
              <div key={col.label} className={`lie-column ${col.right ? "is-right" : ""}`}>
                <b>{col.label}</b>
                <div className="lie-faces">
                  {col.ids.map((id) => {
                    const p = map.get(id);
                    return p ? <Character key={id} id={p.character} size="2.8em" motion={col.right ? "jump" : "none"} mood={col.right ? "win" : "sad"} /> : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

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
