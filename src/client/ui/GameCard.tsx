import { TAG_LABEL, type GameMeta } from "@party/shared";
import { GameArt } from "../art/GameArt";

export function PlayersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="9" cy="8" r="4" fill="currentColor" />
      <circle cx="17" cy="9" r="3" fill="currentColor" opacity="0.6" />
      <path d="M2 20c0-4 3-6 7-6s7 2 7 6Z M15 20c0-2.5-.8-4.2-2.2-5.4 3.8-.6 7.2 1 7.2 5.4Z" fill="currentColor" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function GameMetaLine({ game }: { game: GameMeta }) {
  return (
    <div className="game-meta">
      <span className="row-sm">
        <PlayersIcon /> {game.players[0]}–{game.players[1]}
      </span>
      <span className="row-sm">
        <ClockIcon /> {game.minutes[0]}–{game.minutes[1]} min
      </span>
    </div>
  );
}

export function GameCard({ game, onOpen, featured = false }: { game: GameMeta; onOpen?(game: GameMeta): void; featured?: boolean }) {
  const live = game.status === "live";
  return (
    <button type="button" className={`game-card ${featured ? "is-featured" : ""} ${live ? "is-live" : "is-soon"}`} onClick={() => onOpen?.(game)} style={{ ["--game-accent" as string]: game.accent }}>
      <div className="game-card-art">
        <GameArt id={game.id} />
        <span className={`badge ${live ? "badge-live" : "badge-soon"} game-card-status`}>{live ? "Play now" : "Coming soon"}</span>
      </div>
      <div className="game-card-body">
        <h3 className="game-card-title">{game.name}</h3>
        <p className="game-card-tagline">{game.tagline}</p>
        <GameMetaLine game={game} />
        <div className="game-card-tags">
          {game.tags.slice(0, 3).map((t) => (
            <span key={t} className="tag">
              {TAG_LABEL[t]}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
