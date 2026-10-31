import type { PunchlineTv as View, RevealSide } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { PlayerToken, Podium, ProgressRow, Scoreboard, playerMap } from "../shared";
import "./punchline.css";

const ROUND_NAMES = ["", "Round 1", "Round 2 · double points", "The Last Laugh"];

function Intro({ view }: { view: View }) {
  const final = view.phase === "finalIntro";
  return (
    <div className="pl-intro">
      <span className="tv-pill">{final ? "Final round" : `Round ${view.round}`}</span>
      <h1 className="tv-title slam-in">{final ? "The Last Laugh" : view.round === 2 ? "Double points!" : "Punchline Panic"}</h1>
      <Telly size={190} pose="cheer" mood="win" />
      <p className="pl-intro-sub">{final ? "One prompt. Everyone answers. Vote for your favourite." : "Check your phone — you've got two prompts to answer."}</p>
    </div>
  );
}

function Side({ side, room, revealed, index }: { side: { key: "A" | "B"; text: string | null } & Partial<RevealSide>; room: TvGameProps["room"]; revealed: boolean; index: number }) {
  const map = playerMap(room);
  const author = side.authorId ? map.get(side.authorId) : undefined;
  return (
    <div className={`pl-answer ${index === 1 ? "is-b" : ""} ${revealed && side.winner ? "is-winner" : ""}`}>
      <span className="pl-answer-key">{side.key}</span>
      <span className={`pl-answer-text ${side.text ? "" : "is-empty"}`}>{side.text ?? "(no answer)"}</span>
      {revealed && (
        <>
          <div className="pl-voters">
            {(side.voterIds ?? []).map((id) => {
              const p = map.get(id);
              return p ? <Character key={id} id={p.character} size="2.4em" motion="none" mood="happy" /> : null;
            })}
          </div>
          {author && (
            <div className="pl-author">
              <Character id={author.character} size="3em" motion="jump" mood={side.winner ? "win" : side.points ? "happy" : "sad"} />
              {author.name}
              {side.panic && <span className="badge badge-soon pl-panic">panic button</span>}
              <span className="pl-points">+{(side.points ?? 0).toLocaleString()}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const OUTCOME_TEXT: Record<string, string> = { zinger: "ZINGER!", jinx: "JINX!", forfeit: "Forfeit!", empty: "Crickets…" };

export default function PunchlineTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const ids = room.players.filter((p) => p.inGame).map((p) => p.id);

  switch (view.phase) {
    case "intro":
    case "finalIntro":
      return <Intro view={view} />;

    case "write":
    case "finalWrite":
      return (
        <div className="pl-stage">
          <div className="pl-head">
            <span className="tv-pill">{ROUND_NAMES[view.round]}</span>
            <Timer client={client} room={room} size="5.5em" />
          </div>
          <div className="tv-center">
            {view.phase === "finalWrite" && view.prompt ? <div className="pl-prompt">{view.prompt}</div> : <h1 className="tv-title">Answer on your phone!</h1>}
            <p className="tv-sub">{view.phase === "finalWrite" ? "Everyone answers this one." : "Funny beats clever. Weird beats safe."}</p>
            <ProgressRow room={room} ids={ids} doneIds={view.doneIds} size={5} />
          </div>
        </div>
      );

    case "vote":
    case "reveal": {
      const revealed = view.phase === "reveal" && view.reveal;
      const sides = revealed ? view.reveal!.sides : (view.options ?? []).map((o) => ({ ...o }));
      return (
        <div className="pl-stage">
          <div className="pl-head">
            <span className="tv-pill">
              {ROUND_NAMES[view.round]} · {view.matchupNumber}/{view.matchupCount}
            </span>
            {view.phase === "vote" && <Timer client={client} room={room} size="5em" />}
          </div>
          <div className="stack-lg" style={{ alignContent: "center", display: "grid" }}>
            <div className={`pl-prompt ${view.prompt && view.prompt.length > 50 ? "is-small" : ""}`}>{view.prompt}</div>
            <div className="pl-duel">
              {sides[0] && <Side side={sides[0]} room={room} revealed={Boolean(revealed)} index={0} />}
              <span className="pl-vs">VS</span>
              {sides[1] && <Side side={sides[1]} room={room} revealed={Boolean(revealed)} index={1} />}
            </div>
            {revealed && view.reveal!.outcome !== "normal" ? (
              <div className="pl-outcome slam-in">{OUTCOME_TEXT[view.reveal!.outcome]}</div>
            ) : view.phase === "vote" ? (
              <div className="row center">
                <span className="tv-sub">Vote on your phone!</span>
                <div className="row-sm">
                  {view.doneIds.map((id) => {
                    const p = map.get(id);
                    return p ? <Character key={id} id={p.character} size="2.6em" motion="jump" mood="happy" /> : null;
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    case "scores":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title={view.round < 2 ? "After round 1" : "Going into the final"} />
        </div>
      );

    case "finalVote":
    case "finalReveal": {
      const revealed = view.phase === "finalReveal";
      return (
        <div className="pl-stage">
          <div className="pl-head">
            <span className="tv-pill">The Last Laugh</span>
            {!revealed && <Timer client={client} room={room} size="5em" />}
          </div>
          <div className="stack-lg" style={{ display: "grid", alignContent: "center" }}>
            <div className="pl-prompt is-small">{view.prompt}</div>
            <div className="pl-final-grid">
              {(view.final ?? []).map((entry, i) => {
                const author = entry.authorId ? map.get(entry.authorId) : undefined;
                return (
                  <div key={entry.key} className="pl-final-entry" style={{ animationDelay: `${i * 90}ms` }}>
                    <span className="pl-answer-key">{entry.key}</span>
                    <span className="pl-final-text">{entry.text}</span>
                    {revealed && (
                      <>
                        <div className="pl-voters">
                          {(entry.voterIds ?? []).map((id) => {
                            const p = map.get(id);
                            return p ? <Character key={id} id={p.character} size="2em" motion="none" mood="happy" /> : null;
                          })}
                        </div>
                        {author && (
                          <div className="pl-author" style={{ fontSize: "1em" }}>
                            <PlayerToken player={author} size={2.4} label={false} motion="jump" mood={(entry.points ?? 0) > 0 ? "happy" : "idle"} />
                            {author.name}
                            <span className="pl-points">+{(entry.points ?? 0).toLocaleString()}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {!revealed && <p className="tv-sub">Vote for your favourite on your phone (not your own!)</p>}
          </div>
        </div>
      );
    }

    case "podium":
      return <Podium room={room} rows={view.scores} />;
  }
}
