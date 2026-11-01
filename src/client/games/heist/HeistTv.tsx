import type { HeistTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { useServerNow } from "../../lib/hooks";
import type { TvGameProps } from "../registry";
import { Podium, Scoreboard, nameOf, playerMap } from "../shared";
import "./heist.css";

function Guards({ client, at }: { client: TvGameProps["client"]; at: number }) {
  const now = useServerNow(client, 250);
  const secs = Math.max(0, Math.ceil((at - now) / 1000));
  return <div className={`heist-timer tabular ${secs <= 20 ? "is-urgent" : ""}`}>{`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`}</div>;
}

function Dial({ digits, code }: { digits: number; code: string | null }) {
  return (
    <div className="heist-code">
      {Array.from({ length: digits }, (_, i) => (
        <span key={i} className="heist-digit">
          {code ? code[i] : "?"}
        </span>
      ))}
    </div>
  );
}

export default function HeistTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const cracker = view.crackerId ? map.get(view.crackerId) : undefined;
  const ids = room.players.filter((p) => p.inGame).map((p) => p.id);

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Heist Night</h1>
          <Telly size={160} pose="cheer" mood="cheeky" />
          <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
            Every phone holds a <b>clue</b> about the vault code — nobody has the whole picture. Share what you know, work it out together, and the <b>safecracker</b> punches it in. Three tries before the alarm!
          </div>
        </div>
      );

    case "brief":
    case "crack":
      return (
        <div className="tv-center heist-stage">
          <span className="tv-pill">
            Vault {view.round} of {view.totalRounds} · {view.digits} digits, no repeats
          </span>
          <div className="heist-vault">
            <Dial digits={view.digits} code={null} />
            {view.guardsAt !== null && <Guards client={client} at={view.guardsAt} />}
          </div>
          <p className="tv-sub">
            {cracker?.name} is the safecracker. {view.phase === "brief" ? "Read your clues!" : "Talk it out — every clue matters."}
          </p>
          <div className="heist-attempts">
            {view.attempts.map((a, i) => (
              <span key={i} className="chip heist-attempt">
                {a.code} → {a.inPlace} in the right spot
              </span>
            ))}
          </div>
          <div className="heist-crew">
            {ids.map((id) => {
              const p = map.get(id);
              return (
                <div key={id} className={`heist-member ${id === view.crackerId ? "is-cracker" : ""}`}>
                  {p && <Character id={p.character} size="3em" motion="none" mood={id === view.crackerId ? "think" : "cheeky"} />}
                  <span className="token-name">{p?.name}</span>
                  <span className="heist-clues">🗝️ × {view.clueCounts[id] ?? 0}</span>
                </div>
              );
            })}
          </div>
        </div>
      );

    case "result":
      return (
        <div className="tv-center">
          <div className={`heist-outcome slam-in ${view.opened ? "is-open" : "is-alarm"}`}>{view.opened ? "VAULT OPEN!" : "ALARM!"}</div>
          <Dial digits={view.digits} code={view.code} />
          <p className="tv-sub">{view.opened ? `${nameOf(room, view.crackerId)} cracked it!` : `The code was ${view.code}.`}</p>
        </div>
      );

    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title={`After vault ${view.round}`} />
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} />;
  }
}
