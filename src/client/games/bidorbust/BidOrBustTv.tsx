import { BB_BOXES, BB_BOX_LABELS, BB_CHICKEN, type BbTv as View } from "@party/shared";
import { Character } from "../../art/Character";
import { Telly } from "../../art/Telly";
import { Timer } from "../../ui/Timer";
import type { TvGameProps } from "../registry";
import { Podium, ProgressRow, Scoreboard, nameOf, playerMap } from "../shared";
import "./bidorbust.css";

export default function BidOrBustTv({ room, view, client }: TvGameProps<View>) {
  if (!view) return null;
  const map = playerMap(room);
  const ids = room.players.filter((p) => p.inGame).map((p) => p.id);

  switch (view.phase) {
    case "intro":
      return (
        <div className="tv-center">
          <h1 className="tv-title slam-in">Bid or Bust</h1>
          <Telly size={160} pose="cheer" mood="cheeky" />
          <div className="card" style={{ fontSize: "1.3em", maxWidth: "36em", textAlign: "left" }}>
            Four mystery boxes. Some hold chips, one hides a <b>rubber chicken</b> 🐔 that costs you. Your phone gets a <b>secret hint</b> about one box. Spread sealed bids — the highest single bid buys each box. Ties? Nobody gets it.
          </div>
        </div>
      );

    case "bid":
    case "reveal":
      return (
        <div className="tv-center bb-stage">
          <span className="tv-pill">
            Round {view.round} of {view.totalRounds}
          </span>
          <div className="bb-boxes">
            {Array.from({ length: BB_BOXES }, (_, i) => {
              const r = view.results.find((x) => x.index === i);
              const winner = r?.winnerId ? map.get(r.winnerId) : undefined;
              return (
                <div key={i} className={`bb-box ${r ? "is-open" : ""} ${r?.value === BB_CHICKEN ? "is-chicken" : ""}`}>
                  <span className="bb-box-label">{BB_BOX_LABELS[i]}</span>
                  {r ? (
                    <div className="bb-box-inside slam-in">
                      <span className="bb-value">{r.value === BB_CHICKEN ? "🐔" : r.value}</span>
                      <span className="bb-value-sub">{r.value === BB_CHICKEN ? `${BB_CHICKEN}` : "chips"}</span>
                      {winner ? (
                        <span className="bb-winner">
                          <Character id={winner.character} size="1.8em" motion="none" mood={r.value - r.winningBid >= 0 ? "win" : "sad"} /> {winner.name} paid {r.winningBid}
                        </span>
                      ) : (
                        <span className="bb-winner">{r.bids.length ? "Tie — no sale!" : "No bids"}</span>
                      )}
                    </div>
                  ) : (
                    <span className="bb-question">?</span>
                  )}
                </div>
              );
            })}
          </div>
          {view.phase === "bid" ? (
            <>
              <Timer client={client} room={room} size="4.5em" />
              <ProgressRow room={room} ids={ids} doneIds={view.doneIds} size={2.8} />
            </>
          ) : (
            <p className="tv-sub">
              {(() => {
                const last = view.results[view.results.length - 1];
                if (!last) return "";
                return last.winnerId ? `${nameOf(room, last.winnerId)} ${last.value - last.winningBid >= 0 ? "profits" : "loses"} ${Math.abs(last.value - last.winningBid)}!` : "";
              })()}
            </p>
          )}
        </div>
      );

    case "standings":
      return (
        <div className="tv-center">
          <Scoreboard room={room} rows={view.scores} title={`After round ${view.round}`} unit="chips" />
        </div>
      );

    case "podium":
      return <Podium room={room} rows={view.scores} unit="chips" />;
  }
}
