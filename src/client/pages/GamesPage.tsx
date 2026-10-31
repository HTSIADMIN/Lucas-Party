import { useMemo, useState } from "react";
import { GAME_CATALOG, TAG_LABEL, type GameMeta, type GameTag } from "@party/shared";
import { GameModal } from "../site/GameModal";
import { GameCard } from "../ui/GameCard";

type Filter = "all" | "live" | "soon" | GameTag;

export function GamesPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<GameMeta | null>(null);
  const tags = useMemo(() => [...new Set(GAME_CATALOG.flatMap((g) => g.tags))], []);
  const games = GAME_CATALOG.filter((g) =>
    filter === "all" ? true : filter === "live" || filter === "soon" ? g.status === filter : g.tags.includes(filter),
  );
  const chip = (value: Filter, label: string) => (
    <button key={value} type="button" className="tab" aria-selected={filter === value} onClick={() => setFilter(value)}>
      {label}
    </button>
  );
  return (
    <div className="container">
      <div className="page-head">
        <div className="stack-sm">
          <h1 className="page-title">All the games</h1>
          <p className="section-sub">Every game in the box — the ones you can play tonight and the ones we're building next.</p>
        </div>
      </div>
      <div className="filters">
        {chip("all", "All")}
        {chip("live", "Play now")}
        {chip("soon", "Coming soon")}
        {tags.map((t) => chip(t, TAG_LABEL[t]))}
      </div>
      <div className="game-grid">
        {games.map((g) => (
          <GameCard key={g.id} game={g} onOpen={setOpen} />
        ))}
      </div>
      <GameModal game={open} onClose={() => setOpen(null)} />
    </div>
  );
}
