import type { WbTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import type { TvGameProps } from "../registry";
import { Podium, nameOf, playerMap } from "../shared";
import "./wordbomb.css";

function Hearts({ n }: { n: number }) {
  return <span className="wb-hearts">{n > 0 ? "❤".repeat(n) : "💀"}</span>;
}

export default function WordBombTv({ room, view }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const ids = room.players.filter((p) => p.inGame).map((p) => p.id);

  if (view.phase === "intro") {
    return (
      <div className="tv-center">
        <h1 className="tv-title slam-in">Word Bomb</h1>
        <Telly size={160} pose="cheer" mood="shock" />
        <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
          The bomb comes to you with a few letters. Type a word that contains them to pass it on — <b>fast</b>. Nobody knows when it'll blow. Think someone made up a word? Hit <b>No way!</b> on your phone — if half the room agrees, they lose a life.
        </div>
      </div>
    );
  }

  if (view.phase === "podium") return <Podium room={room} rows={view.scores} />;

  const holder = view.holderId ? map.get(view.holderId) : undefined;
  return (
    <div className="wb-stage">
      <div className="wb-center">
        {view.phase === "boom" ? (
          <>
            <div className="wb-boom slam-in">BOOM!</div>
            <p className="tv-sub">{nameOf(room, view.boomId)} loses a life!</p>
          </>
        ) : (
          <>
            <div className="wb-bomb" key={view.syllable ?? ""}>
              <span className="wb-fuse" aria-hidden="true" />
              <span className="wb-syllable">{view.syllable}</span>
            </div>
            <p className="tv-sub">
              <b>{holder?.name}</b> has the bomb!
            </p>
          </>
        )}
      </div>
      <div className="wb-ring">
        {ids.map((id) => {
          const p = map.get(id);
          const lives = view.lives[id] ?? 0;
          const holding = id === view.holderId;
          return (
            <div key={id} className={`wb-seat ${holding ? "is-holding" : ""} ${lives === 0 ? "is-out" : ""}`}>
              {p && <Character id={p.character} size="3.6em" motion={holding ? "shake" : "none"} mood={lives === 0 ? "sad" : holding ? "shock" : view.boomId === id ? "sad" : "idle"} dim={lives === 0} />}
              <span className="token-name">{p?.name}</span>
              <Hearts n={lives} />
            </div>
          );
        })}
      </div>
      <div className="wb-words">
        {view.words.slice(0, 6).map((w) => (
          <span key={w.at} className={`chip wb-word ${w.verdict === "rejected" ? "is-rejected" : ""}`}>
            {w.word}
            {w.challengers.length > 0 && w.verdict === null && <b className="wb-challenges"> · {w.challengers.length} 🤨</b>}
          </span>
        ))}
      </div>
    </div>
  );
}
