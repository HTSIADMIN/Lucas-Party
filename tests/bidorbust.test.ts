import { describe, expect, it } from "vitest";
import type { BbPlayer, BbTv } from "@party/shared";
import { bidorbust } from "../src/shared/engine/games/bidorbust";
import { harness } from "./harness";

type H = ReturnType<typeof harness<ReturnType<typeof bidorbust.create>>>;

function openAll(h: H) {
  for (let i = 0; i < 4; i++) h.fire(); // bid → box A … box D
}

describe("Bid or Bust", () => {
  it("gives every player a private hint and rejects bids over their chips", () => {
    const h = harness(bidorbust, 3);
    h.fire(); // intro → bid
    for (const p of h.roster) expect((h.view(p.id) as BbPlayer).hint).toBeTruthy();
    expect(JSON.stringify(h.tv())).not.toContain((h.view("p0") as BbPlayer).hint!);
    h.input("p0", { type: "bids", bids: [400, 200, 0, 0] });
    expect(h.state.bids.p0).toBeUndefined();
    h.input("p0", { type: "bids", bids: [300, 200, 0, 0] });
    expect(h.state.bids.p0).toEqual([300, 200, 0, 0]);
  });

  it("sells each box to the single highest bidder; ties mean no sale", () => {
    const h = harness(bidorbust, 3);
    h.fire();
    h.state.values = [300, -150, 100, 0];
    h.input("p0", { type: "bids", bids: [200, 0, 50, 0] });
    h.input("p1", { type: "bids", bids: [100, 120, 50, 0] });
    h.input("p2", { type: "bids", bids: [0, 0, 0, 0] });
    openAll(h);
    const [a, b, c, d] = h.state.results;
    expect([a!.winnerId, a!.winningBid]).toEqual(["p0", 200]);
    expect([b!.winnerId, b!.winningBid]).toEqual(["p1", 120]);
    expect(c!.winnerId).toBeNull(); // 50–50 tie
    expect(d!.winnerId).toBeNull(); // no bids
    expect(h.state.chips.p0).toBe(500 + 100);
    expect(h.state.chips.p1).toBe(500 - 270);
    expect(h.state.chips.p2).toBe(500);
    expect((h.tv() as BbTv).results).toHaveLength(4);
  });

  it("never lets a chicken push chips below zero, and tops up broke players", () => {
    const h = harness(bidorbust, 2, { options: { rounds: 2 } });
    h.fire();
    h.state.values = [-150, 0, 0, 0];
    h.input("p0", { type: "bids", bids: [500, 0, 0, 0] });
    openAll(h);
    expect(h.state.chips.p0).toBe(0);
    h.fire(); // standings
    h.fire(); // standings → round 2
    expect(h.state.chips.p0).toBe(100);
  });

  it("ends on the podium after the last round", () => {
    const h = harness(bidorbust, 2, { options: { rounds: 1 } });
    h.fire();
    openAll(h);
    h.fire(); // last box → standings
    h.fire(); // standings → podium
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });
});
