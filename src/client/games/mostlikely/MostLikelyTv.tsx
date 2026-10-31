import type { MlTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, Scoreboard, nameOf, playerMap } from "../shared";
import "./mostlikely.css";

function joinNames(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

function Awards({ view, room }: { view: View; room: TvGameProps["room"] }) {
  const map = playerMap(room);
  const ids = room.players.filter((p) => p.inGame).map((p) => p.id);
  const titlesOf = (id: string) => view.awards.filter((a) => a.playerId === id);
  const order = [...ids].sort((a, b) => titlesOf(b).length - titlesOf(a).length);
  return (
    <div className="ml-awards">
      <h1 className="tv-title slam-in" style={{ fontSize: "3.2em" }}>
        The awards go to…
      </h1>
      <div className="ml-award-grid">
        {order.map((id, i) => {
          const p = map.get(id);
          const titles = titlesOf(id);
          return (
            <div key={id} className="card ml-award rise-in" style={{ animationDelay: `${i * 450}ms` }}>
              {p && <Character id={p.character} size="4.2em" mood={titles.length ? "cheeky" : "idle"} motion="none" />}
              <div className="ml-award-body">
                <div className="ml-award-name">{p?.name}</div>
                {titles.length ? (
                  <ul className="ml-award-titles">
                    {titles.slice(0, 3).map((t) => (
                      <li key={t.prompt}>Most likely to {t.prompt}</li>
                    ))}
                    {titles.length > 3 && <li className="muted">…and {titles.length - 3} more</li>}
                  </ul>
                ) : (
                  <p className="muted">No titles. Suspiciously normal.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MostLikelyTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const ids = room.players.filter((p) => p.inGame).map((p) => p.id);

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Most Likely To…</h1>
          <Telly size={170} pose="cheer" mood="cheeky" />
          <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
            Vote for the friend who best fits each prompt. You score when you <b>side with the room</b> — and whoever the room picks takes the title home. Titles get handed out at the end. No hard feelings!
          </div>
        </div>
      );

    case "vote":
      return (
        <div className="tv-center ml-ask">
          <span className="tv-pill">
            Prompt {view.round} of {view.totalRounds}
          </span>
          <div className="ml-lead">Who's most likely to…</div>
          <div className="card ml-prompt slam-in">{view.prompt}?</div>
          <Timer client={client} room={room} size="5.5em" />
          <ProgressRow room={room} ids={ids} doneIds={view.votedIds} size={3.6} />
        </div>
      );

    case "reveal": {
      const tally = new Map<string, string[]>();
      for (const [voter, pick] of Object.entries(view.votes ?? {})) tally.set(pick, [...(tally.get(pick) ?? []), voter]);
      const headline = view.topIds.length === 0 ? "Nobody voted!" : view.topIds.length === 1 ? `${nameOf(room, view.topIds[0])}!` : `It's a tie: ${joinNames(view.topIds.map((id) => nameOf(room, id)))}!`;
      return (
        <div className="tv-center ml-reveal">
          <div className="ml-lead">Most likely to {view.prompt}…</div>
          <h1 className="tv-title slam-in" style={{ fontSize: "3.6em" }}>
            {headline}
          </h1>
          <div className="ml-picks">
            {ids.map((id) => {
              const p = map.get(id);
              const voters = tally.get(id) ?? [];
              const top = view.topIds.includes(id);
              return (
                <div key={id} className={`ml-pick ${top ? "is-top" : ""}`}>
                  {top && <span className="ml-sash">Most likely!</span>}
                  <div className="ml-pick-votes">
                    {voters.map((v) => {
                      const vp = map.get(v);
                      return vp ? <Character key={v} id={vp.character} size="1.9em" motion="none" mood="cheeky" /> : null;
                    })}
                  </div>
                  {p && <Character id={p.character} size={top ? "6em" : "4em"} motion={top ? "jump" : "none"} mood={top ? "shock" : voters.length ? "happy" : "idle"} />}
                  <span className="token-name">{p?.name}</span>
                </div>
              );
            })}
          </div>
          {view.points > 0 && <p className="tv-sub">Everyone who picked {view.topIds.length === 1 ? nameOf(room, view.topIds[0]) : "them"} gets +{view.points}</p>}
        </div>
      );
    }

    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title={`After prompt ${view.round}`} />
        </div>
      );

    case "awards":
      return <Awards view={view} room={room} />;

    case "podium":
      return <Podium room={room} rows={view.scores} />;
  }
}
