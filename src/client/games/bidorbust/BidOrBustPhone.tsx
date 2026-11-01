import { useState } from "react";
import { BB_BOXES, BB_BOX_LABELS, type BbPlayer } from "@party/shared";
import type { PhoneGameProps } from "../registry";
import { PhoneMessage, PhoneScore } from "../shared";
import "./bidorbust.css";

function BidForm({ view, onSend }: { view: BbPlayer; onSend(bids: number[]): void }) {
  const [bids, setBids] = useState<number[]>(Array.from({ length: BB_BOXES }, () => 0));
  const total = bids.reduce((a, b) => a + b, 0);
  const left = view.chips - total;
  const bump = (i: number, delta: number) => setBids((b) => b.map((v, j) => (j === i ? Math.max(0, Math.min(v + delta, v + Math.max(0, left))) : v)));
  return (
    <div className="phone-card pop-in">
      <div className="bb-hint">
        <span className="label">Your secret hint</span>
        <b>{view.hint}</b>
      </div>
      <span className="label">
        Spread your bids · {left} of {view.chips} chips left
      </span>
      <div className="bb-bid-rows">
        {bids.map((amount, i) => (
          <div key={i} className="bb-bid-row">
            <span className="bb-bid-box">{BB_BOX_LABELS[i]}</span>
            <button type="button" className="btn btn-light btn-sm" disabled={amount === 0} onClick={() => bump(i, -50)}>
              −50
            </button>
            <span className="bb-bid-amount tabular">{amount}</span>
            <button type="button" className="btn btn-light btn-sm" disabled={left <= 0} onClick={() => bump(i, 50)}>
              +50
            </button>
            <button type="button" className="btn btn-light btn-sm" disabled={left <= 0} onClick={() => bump(i, 10)}>
              +10
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-accent btn-lg btn-block" onClick={() => onSend(bids)}>
        {total ? `Seal my bids (${total})` : "Pass this round"}
      </button>
    </div>
  );
}

export default function BidOrBustPhone({ view, client, room, playerId }: PhoneGameProps<BbPlayer>) {
  const me = room.players.find((p) => p.id === playerId);
  if (!view) return null;

  switch (view.phase) {
    case "intro":
      return (
        <PhoneMessage character={me?.character} mood="cheeky" title="Bid or Bust">
          <p>Trust your hint. Or don't.</p>
        </PhoneMessage>
      );

    case "bid":
      if (view.myBids) {
        return (
          <PhoneMessage character={me?.character} mood="think" title="Bids sealed!">
            <p>{view.myBids.map((b, i) => `${BB_BOX_LABELS[i]}: ${b}`).join(" · ")}</p>
          </PhoneMessage>
        );
      }
      return <BidForm view={view} onSend={(bids) => client.input({ type: "bids", bids })} />;

    case "reveal": {
      const mine = view.results.filter((r) => r.winnerId === playerId);
      return (
        <PhoneMessage character={me?.character} mood={view.gained > 0 ? "win" : view.gained < 0 ? "sad" : "think"} title={mine.length ? `You won ${mine.map((r) => BB_BOX_LABELS[r.index]).join(", ")}` : "Watch the boxes!"}>
          <p>Your hint was: {view.hint}</p>
        </PhoneMessage>
      );
    }

    default:
      return <PhoneScore character={me?.character} score={view.score} rank={view.rank} gained={view.gained} unit="chips" />;
  }
}
