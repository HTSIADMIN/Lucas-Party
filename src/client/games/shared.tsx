// Building blocks every game view reuses: player lookups, the scoreboard,
// the podium, confetti, and "who are we waiting on" rows.

import type { CSSProperties, ReactNode } from "react";
import { CHARACTERS, type PlayerPublic, type RoomView } from "@party/shared";
import { Character } from "../art/Character";
import type { Mood } from "../art/Face";

export function playerMap(room: RoomView): Map<string, PlayerPublic> {
  return new Map(room.players.map((p) => [p.id, p]));
}

export function nameOf(room: RoomView, id: string | null | undefined): string {
  return (id && room.players.find((p) => p.id === id)?.name) || "Someone";
}

export function PlayerToken({ player, size = 4, mood = "idle", label = true, motion = "bob", note }: { player: PlayerPublic | undefined; size?: number; mood?: Mood; label?: boolean; motion?: "bob" | "jump" | "none" | "shake"; note?: ReactNode }) {
  if (!player) return null;
  return (
    <div className={`token ${player.connected ? "" : "is-away"}`} style={{ ["--seat" as string]: CHARACTERS[player.character].color } as CSSProperties}>
      <Character id={player.character} size={`${size}em`} mood={mood} motion={motion} dim={!player.connected} />
      {label && <span className="token-name">{player.name}</span>}
      {note}
    </div>
  );
}

/** Row of players showing who's done (✓) and who's still thinking. */
export function ProgressRow({ room, ids, doneIds, size = 4 }: { room: RoomView; ids: string[]; doneIds: string[]; size?: number }) {
  const map = playerMap(room);
  return (
    <div className="progress-row">
      {ids.map((id) => {
        const done = doneIds.includes(id);
        return (
          <PlayerToken
            key={id}
            player={map.get(id)}
            size={size}
            mood={done ? "happy" : "think"}
            motion={done ? "none" : "bob"}
            note={<span className={`token-check ${done ? "is-done" : ""}`}>{done ? "✓" : "…"}</span>}
          />
        );
      })}
    </div>
  );
}

export interface ScoreRow { playerId: string; score: number; gained?: number }

export function Scoreboard({ room, rows, title = "Scores", unit = "pts" }: { room: RoomView; rows: ScoreRow[]; title?: string; unit?: string }) {
  const map = playerMap(room);
  const max = Math.max(1, ...rows.map((r) => r.score));
  return (
    <div className="scoreboard card">
      <h2 className="scoreboard-title">{title}</h2>
      <ol className="scoreboard-list">
        {rows.map((r, i) => {
          const p = map.get(r.playerId);
          const color = p ? CHARACTERS[p.character].color : "#ccc";
          return (
            <li key={r.playerId} className="scoreboard-row rise-in" style={{ animationDelay: `${i * 80}ms` }}>
              <span className="scoreboard-rank">{i + 1}</span>
              {p && <Character id={p.character} size="2.6em" mood={i === 0 ? "win" : (r.gained ?? 0) > 0 ? "happy" : "idle"} motion="none" />}
              <span className="scoreboard-name">{p?.name ?? "Someone"}</span>
              <span className="scoreboard-bar">
                <span style={{ width: `${Math.max(3, (r.score / max) * 100)}%`, background: color }} />
              </span>
              <span className="scoreboard-score tabular">
                {r.score.toLocaleString()} <small>{unit}</small>
              </span>
              {(r.gained ?? 0) !== 0 && <span className={`scoreboard-gain ${(r.gained ?? 0) < 0 ? "is-loss" : ""}`}>{(r.gained ?? 0) > 0 ? "+" : ""}{(r.gained ?? 0).toLocaleString()}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const CONFETTI_COLORS = ["#FF4FA3", "#FFC93C", "#2FDB9A", "#3FB7FF", "#9B6BFF", "#FF8A3D"];

export function Confetti({ pieces = 70 }: { pieces?: number }) {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: pieces }, (_, i) => {
        const left = (i * 37) % 100;
        const delay = ((i * 53) % 100) / 60;
        const dur = 2.6 + ((i * 29) % 100) / 60;
        const rot = (i * 47) % 360;
        return <span key={i} style={{ left: `${left}%`, animationDelay: `${delay}s`, animationDuration: `${dur}s`, background: CONFETTI_COLORS[i % CONFETTI_COLORS.length], transform: `rotate(${rot}deg)` }} />;
      })}
    </div>
  );
}

export function Podium({ room, rows, unit = "pts" }: { room: RoomView; rows: ScoreRow[]; unit?: string }) {
  const map = playerMap(room);
  const top = rows.slice(0, 3);
  const order = [top[1], top[0], top[2]].filter(Boolean) as ScoreRow[];
  // Ties share a place (1, 1, 3), matching the rank phones show.
  const placeOf = (r: ScoreRow) => 1 + rows.filter((o) => o.score > r.score).length;
  const winners = rows.filter((r) => placeOf(r) === 1).map((r) => map.get(r.playerId)?.name ?? "Somebody");
  const title =
    winners.length === 0 ? "Somebody wins!" : winners.length === 1 ? `${winners[0]} wins!` : winners.length === 2 ? `${winners[0]} & ${winners[1]} tie!` : `It's a ${winners.length}-way tie!`;
  return (
    <div className="podium-wrap">
      <Confetti />
      <h1 className="tv-title slam-in">{title}</h1>
      <div className="podium">
        {order.map((r) => {
          const place = placeOf(r);
          const p = map.get(r.playerId);
          return (
            <div key={r.playerId} className={`podium-col place-${place}`}>
              {p && <Character id={p.character} size={place === 1 ? "9em" : "6.5em"} mood={place === 1 ? "win" : "happy"} motion={place === 1 ? "bob" : "none"} />}
              <span className="podium-name">{p?.name}</span>
              <div className="podium-block">
                <span className="podium-place">{place}</span>
                <span className="podium-score tabular">
                  {r.score.toLocaleString()} {unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {rows.length > 3 && (
        <div className="podium-rest">
          {rows.slice(3).map((r) => (
            <span key={r.playerId} className="chip">
              {placeOf(r)}. {map.get(r.playerId)?.name} · {r.score.toLocaleString()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** A big centred phone message with a character. */
export function PhoneMessage({ character, mood = "idle", title, children }: { character?: PlayerPublic["character"]; mood?: Mood; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="phone-message pop-in">
      {character && <Character id={character} size={120} mood={mood} />}
      <h2 className="phone-message-title">{title}</h2>
      {children && <div className="phone-message-body">{children}</div>}
    </div>
  );
}

export function PhoneScore({ score, rank, gained, unit = "pts", character }: { score: number; rank: number; gained: number; unit?: string; character?: PlayerPublic["character"] }) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  return (
    <PhoneMessage character={character} mood={rank === 1 ? "win" : gained > 0 ? "happy" : "idle"} title={`${medal} ${score.toLocaleString()} ${unit}`}>
      {gained !== 0 && <p className={`phone-gain ${gained < 0 ? "is-loss" : ""}`}>{gained > 0 ? `+${gained.toLocaleString()}` : gained.toLocaleString()} this round</p>}
      <p>Eyes on the TV!</p>
    </PhoneMessage>
  );
}
