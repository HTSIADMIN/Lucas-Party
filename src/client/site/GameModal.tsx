import { Link } from "../lib/router";
import { TAG_LABEL, canHost, type GameMeta } from "@party/shared";
import { GameArt } from "../art/GameArt";
import { useAuth } from "../lib/auth";
import { GameMetaLine } from "../ui/GameCard";
import { Modal } from "../ui/Overlay";

export function GameModal({ game, onClose }: { game: GameMeta | null; onClose(): void }) {
  const { user } = useAuth();
  if (!game) return null;
  const live = game.status === "live";
  return (
    <Modal open label={game.name} onClose={onClose}>
      <div className="stack-lg">
        <div style={{ aspectRatio: "16 / 9", borderRadius: "var(--r-md)", overflow: "hidden", border: "var(--ow) solid var(--outline)" }}>
          <GameArt id={game.id} />
        </div>
        <div className="stack-sm">
          <div className="row between wrap">
            <h2>{game.name}</h2>
            <span className={`badge ${live ? "badge-live" : "badge-soon"}`}>{live ? "Play now" : "Coming soon"}</span>
          </div>
          <GameMetaLine game={game} />
          <p style={{ fontSize: "var(--fs-lg)" }}>{game.description}</p>
          <div className="game-card-tags">
            {game.tags.map((t) => (
              <span key={t} className="tag">
                {TAG_LABEL[t]}
              </span>
            ))}
          </div>
        </div>
        <ol className="stack-sm" style={{ margin: 0, paddingLeft: 22, fontWeight: 600 }}>
          {game.howTo.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {live ? (
          user && canHost(user.role) ? (
            <Link to="/host" className="btn btn-accent btn-lg btn-block">
              Host a party
            </Link>
          ) : (
            <p className="muted" style={{ fontWeight: 600 }}>
              Ask your host to pick <b>{game.name}</b> from their phone once everyone has joined.
            </p>
          )
        ) : (
          <p className="muted" style={{ fontWeight: 600 }}>
            On the roadmap. Inspired by {game.inspiredBy ?? "classic party games"}, rebuilt in our own style.
          </p>
        )}
      </div>
    </Modal>
  );
}
