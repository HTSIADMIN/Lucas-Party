import { CHARACTERS, DIAL_BANDS, type DialTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, Scoreboard, nameOf, playerMap } from "../shared";
import { Dial } from "./Dial";
import "./dial.css";

function bandLabel(points: number): string {
  return DIAL_BANDS.find((b) => b.points === points)?.label ?? "Miss";
}

export default function DialTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const psychic = view.psychicId ? map.get(view.psychicId) : undefined;
  const roundLabel = `Round ${view.round} of ${view.totalRounds}`;

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Dial It In</h1>
          <Telly size={170} pose="cheer" mood="cheeky" />
          <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
            Each round one of you is the <b>psychic</b>. They see a secret spot on a scale like <b>Cold ↔ Hot</b> and give a one-line clue. Everyone else turns the dial on their phone to find it. Bullseye pays 100 — and the psychic earns the room's average.
          </div>
        </div>
      );

    case "clue":
      return (
        <div className="dial-stage">
          <div className="dial-side">
            <span className="tv-pill">{roundLabel}</span>
            {psychic && <Character id={psychic.character} size="8em" mood="think" motion="bob" />}
            <h1 className="tv-title" style={{ fontSize: "2.8em" }}>
              {psychic?.name} is the psychic
            </h1>
            <p className="tv-sub">Thinking of a clue…</p>
            <Timer client={client} room={room} size="5em" />
          </div>
          <Dial card={view.card} className="dial-tv is-covered" />
        </div>
      );

    case "guess":
      return (
        <div className="dial-stage">
          <div className="dial-side">
            <span className="tv-pill">{roundLabel}</span>
            <div className="bubble dial-clue slam-in">{view.clue}</div>
            {psychic && <Character id={psychic.character} size="5em" mood="cheeky" motion="none" />}
            <span className="token-name">{psychic?.name}'s clue</span>
            <Timer client={client} room={room} size="5em" />
            <ProgressRow room={room} ids={view.guesserIds} doneIds={view.lockedIds} size={3} />
          </div>
          <Dial card={view.card} className="dial-tv" />
        </div>
      );

    case "reveal": {
      if (view.skipped) {
        return (
          <div className="dial-stage">
            <div className="dial-side">
              <h1 className="tv-title" style={{ fontSize: "2.8em" }}>
                Round skipped
              </h1>
              <p className="tv-sub">{psychic?.name} never gave a clue. Here's where it was:</p>
            </div>
            <Dial card={view.card} target={view.target} className="dial-tv" />
          </div>
        );
      }
      const best = [...view.guesses].sort((a, b) => b.points - a.points)[0];
      const headline = !best ? "Nobody guessed!" : best.points === 100 ? `Bullseye, ${nameOf(room, best.playerId)}!` : best.points > 0 ? `${bandLabel(best.points)} ${nameOf(room, best.playerId)}!` : "Way off, everyone!";
      return (
        <div className="dial-stage">
          <div className="dial-side">
            <h1 className="tv-title slam-in" style={{ fontSize: "2.8em" }}>
              {headline}
            </h1>
            <div className="bubble dial-clue is-small">{view.clue}</div>
            <div className="dial-legend">
              {[...view.guesses]
                .sort((a, b) => b.points - a.points)
                .map((g) => {
                  const p = map.get(g.playerId);
                  return (
                    <div key={g.playerId} className={`dial-legend-row ${g.points === 100 ? "is-bullseye" : ""}`}>
                      <span className="dial-dot" style={{ background: p ? CHARACTERS[p.character].color : "#ccc" }} />
                      <span className="grow">{p?.name}</span>
                      <b className="tabular">{g.points > 0 ? `+${g.points}` : "0"}</b>
                    </div>
                  );
                })}
            </div>
            {psychic && (
              <p className="tv-sub">
                {psychic.name} gets +{view.psychicPoints} for the clue
              </p>
            )}
          </div>
          <Dial
            card={view.card}
            target={view.target}
            markers={view.guesses.map((g) => {
              const p = map.get(g.playerId);
              return { key: g.playerId, value: g.value, color: p ? CHARACTERS[p.character].color : "#ccc" };
            })}
            className="dial-tv"
          />
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
