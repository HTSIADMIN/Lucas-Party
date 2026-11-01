import type { ScTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import { Drawing } from "../drawing/Drawing";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, Scoreboard, nameOf, playerMap } from "../shared";
import "./scribblechain.css";

const STEP_TITLE = { write: "Write a silly sentence!", draw: "Draw the sentence you got!", describe: "Describe the drawing you got!" } as const;

function Strip({ view, room, showVotes }: { view: View; room: TvGameProps["room"]; showVotes: boolean }) {
  const map = playerMap(room);
  return (
    <div className="sc-strip">
      {view.entries.map((entry, i) => {
        const author = map.get(entry.authorId);
        const votes = view.voteCounts?.[i] ?? 0;
        return (
          <div key={i} className={`sc-entry rise-in ${showVotes && votes > 0 ? "has-votes" : ""}`} style={{ animationDelay: `${i * 1600}ms` }}>
            <span className="sc-entry-num">{i + 1}</span>
            {entry.kind === "text" ? <div className="sc-entry-text">“{entry.text}”</div> : <Drawing strokes={entry.strokes} className="sc-entry-drawing" />}
            <span className="sc-entry-author">
              {author && <Character id={author.character} size="1.6em" motion="none" />} {author?.name}
            </span>
            {showVotes && votes > 0 && <span className="sc-entry-votes">+{votes * 100}</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function ScribbleChainTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Scribble Chain</h1>
          <Telly size={170} pose="cheer" mood="cheeky" />
          <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
            Write a silly sentence. Then pass it on: the next player <b>draws</b> it, the next <b>describes</b> the drawing, the next draws that… At the end every chain replays here — and you vote for the best moment.
          </div>
        </div>
      );

    case "write":
    case "draw":
    case "describe":
      return (
        <div className="tv-center">
          <span className="tv-pill">
            Step {view.step + 1} of {view.totalSteps}
          </span>
          <h1 className="tv-title" style={{ fontSize: "3.4em" }}>
            {STEP_TITLE[view.phase]}
          </h1>
          <Timer client={client} room={room} size="6em" />
          <p className="tv-sub">Look at your phone — the chains are moving around the room.</p>
          <ProgressRow room={room} ids={view.activeIds} doneIds={view.doneIds} size={3.4} />
        </div>
      );

    case "reveal":
    case "vote":
    case "standings":
      if (view.phase === "standings" && view.entries.length === 0) return null;
      return (
        <div className="sc-reveal">
          <div className="sc-reveal-head">
            <span className="tv-pill">
              Chain {view.chainIndex + 1} of {view.totalChains}
            </span>
            <h1 className="tv-title" style={{ fontSize: "2.4em" }}>
              {view.phase === "vote" ? "Vote for the best moment!" : view.phase === "standings" ? "The room has spoken" : `${nameOf(room, view.chainOwnerId)}'s chain`}
            </h1>
            {view.phase === "vote" && <Timer client={client} room={room} size="4em" />}
          </div>
          <Strip view={view} room={room} showVotes={view.phase === "standings"} />
          {view.phase === "vote" && <ProgressRow room={room} ids={view.activeIds} doneIds={view.doneIds} size={2.6} />}
          {view.phase === "standings" && <Scoreboard room={room} rows={view.scores.slice(0, 4)} title="Top scores" />}
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} />;
  }
}
