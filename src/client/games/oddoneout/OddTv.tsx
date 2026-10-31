import type { OddTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, Scoreboard, nameOf, playerMap } from "../shared";
import "./odd.css";

function TopicCard({ view, showSecret }: { view: View; showSecret: boolean }) {
  if (!view.topic) return null;
  return (
    <div className="card odd-topic">
      <div className="odd-topic-name">{view.topic.name}</div>
      <div className="odd-grid">
        {view.topic.words.map((w, i) => (
          <div key={w} className={`odd-cell ${showSecret && view.secretIndex === i ? "is-secret" : ""} ${showSecret && view.guessIndex === i ? "is-guess" : ""}`}>
            {w}
          </div>
        ))}
      </div>
    </div>
  );
}

function Clues({ view, room }: { view: View; room: TvGameProps["room"] }) {
  const map = playerMap(room);
  return (
    <div className="odd-clues">
      {view.turnOrder.map((id) => {
        const p = map.get(id);
        const given = id in view.clues;
        const clue = view.clues[id];
        const turn = view.currentTurnId === id;
        return (
          <div key={id} className={`odd-clue ${turn ? "is-turn" : ""}`}>
            <div className={`bubble ${given && clue === null ? "is-empty" : ""}`}>{given ? (clue ?? "…silence…") : turn ? "typing…" : "?"}</div>
            {p && <Character id={p.character} size="3.8em" mood={turn ? "think" : given ? "happy" : "idle"} motion={turn ? "bob" : "none"} />}
            <span className="token-name">{p?.name ?? "Someone"}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function OddTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const ids = room.players.filter((p) => p.inGame).map((p) => p.id);
  const roundLabel = `Round ${view.round} of ${view.totalRounds}`;

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Odd One Out</h1>
          <Telly size={170} pose="cheer" mood="cheeky" />
          <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
            Everyone's phone shows the <b>secret word</b> — except one: the <b>faker</b>. Give one-word clues to prove you know it, without giving it away. Then vote out the faker!
          </div>
        </div>
      );

    case "reveal":
      return (
        <div className="odd-stage">
          <TopicCard view={view} showSecret={false} />
          <div className="odd-side">
            <span className="tv-pill">
              {roundLabel}
            </span>
            <h1 className="tv-title" style={{ fontSize: "3.4em" }}>
              Check your phone!
            </h1>
            <p className="tv-sub">Everyone knows the secret word… except one of you.</p>
            <ProgressRow room={room} ids={ids} doneIds={view.doneIds} size={3.6} />
          </div>
        </div>
      );

    case "clue":
    case "discuss":
      return (
        <div className="odd-stage">
          <TopicCard view={view} showSecret={false} />
          <div className="odd-side">
            <div className="row center">
              <h1 className="tv-title" style={{ fontSize: "2.8em" }}>
                {view.phase === "clue" ? `${nameOf(room, view.currentTurnId)}'s clue` : "Who's faking it?"}
              </h1>
              <Timer client={client} room={room} size="5em" />
            </div>
            {view.phase === "discuss" && <p className="tv-sub">Argue it out! Tap “Ready to vote” on your phone.</p>}
            <Clues view={view} room={room} />
          </div>
        </div>
      );

    case "vote":
      return (
        <div className="odd-stage">
          <TopicCard view={view} showSecret={false} />
          <div className="odd-side">
            <h1 className="tv-title" style={{ fontSize: "3em" }}>
              Vote on your phone!
            </h1>
            <Timer client={client} room={room} size="5.5em" />
            <Clues view={view} room={room} />
            <ProgressRow room={room} ids={ids} doneIds={view.doneIds} size={3} />
          </div>
        </div>
      );

    case "voteReveal":
    case "guess": {
      const tally = new Map<string, string[]>();
      for (const [voter, suspect] of Object.entries(view.votes ?? {})) tally.set(suspect, [...(tally.get(suspect) ?? []), voter]);
      return (
        <div className="odd-stage">
          <TopicCard view={view} showSecret={false} />
          <div className="odd-side">
            {view.phase === "guess" ? (
              <>
                <div className="odd-banner slam-in">Caught!</div>
                <p className="tv-sub">{nameOf(room, view.oddId)} was the faker… but can they guess the secret word?</p>
                <Timer client={client} room={room} size="5em" />
              </>
            ) : (
              <h1 className="tv-title" style={{ fontSize: "3em" }}>
                {view.accusedId ? `The room accuses ${nameOf(room, view.accusedId)}!` : "It's a tie!"}
              </h1>
            )}
            <div className="odd-votes">
              {ids.map((id) => {
                const p = map.get(id);
                const voters = tally.get(id) ?? [];
                return (
                  <div key={id} className={`odd-suspect ${view.accusedId === id ? "is-accused" : ""}`}>
                    <div className="odd-suspect-votes">
                      {voters.map((v) => {
                        const vp = map.get(v);
                        return vp ? <Character key={v} id={vp.character} size="1.9em" motion="none" mood="cheeky" /> : null;
                      })}
                    </div>
                    {p && <Character id={p.character} size="4em" motion={view.accusedId === id ? "shake" : "none"} mood={view.accusedId === id ? "shock" : "idle"} />}
                    <span className="token-name">{p?.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    case "result": {
      const odd = view.oddId ? map.get(view.oddId) : undefined;
      const banner = view.outcome === "caught" ? "Busted!" : view.outcome === "stolen" ? "Stolen!" : "Got away!";
      const line =
        view.outcome === "caught"
          ? `${odd?.name} was caught and couldn't name the word.`
          : view.outcome === "stolen"
            ? `${odd?.name} got caught — but guessed the word!`
            : `${odd?.name} was the faker and slipped away!`;
      return (
        <div className="odd-stage">
          <TopicCard view={view} showSecret />
          <div className="odd-side">
            <div className="odd-banner slam-in">{banner}</div>
            {odd && <Character id={odd.character} size="9em" mood={view.outcome === "caught" ? "sad" : "win"} motion="jump" />}
            <p className="tv-sub">{line}</p>
            {view.secretIndex !== null && view.topic && (
              <p className="tv-sub">
                The word was <b style={{ color: "var(--accent)" }}>{view.topic.words[view.secretIndex]}</b>
              </p>
            )}
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
