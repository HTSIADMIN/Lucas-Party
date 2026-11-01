import { describe, expect, it } from "vitest";
import type { RoPlayer, RoTv } from "@party/shared";
import { roulette } from "../src/shared/engine/games/roulette";
import { harness } from "./harness";

type H = ReturnType<typeof harness<ReturnType<typeof roulette.create>>>;

function spinTo(h: H, n: number) {
  h.fire(); // bet → spin
  h.state.result = n;
  h.fire(); // spin → result
}

describe("Roulette Royale", () => {
  it("takes chips as bets are placed, stacks repeats, and refunds on clear", () => {
    const h = harness(roulette, 2);
    h.fire(); // intro → bet
    h.input("p0", { type: "bet", bet: { type: "red", amount: 100 } });
    h.input("p0", { type: "bet", bet: { type: "red", amount: 50 } });
    h.input("p0", { type: "bet", bet: { type: "straight", value: 17, amount: 20 } });
    h.input("p0", { type: "bet", bet: { type: "straight", value: 40, amount: 20 } }); // no such pocket
    h.input("p0", { type: "bet", bet: { type: "red", amount: 5000 } }); // more than you have
    expect(h.state.bets.filter((b) => b.playerId === "p0").map((b) => [b.type, b.amount])).toEqual([
      ["red", 150],
      ["straight", 20],
    ]);
    expect(h.state.chips.p0).toBe(830);
    h.input("p0", { type: "clear" });
    expect(h.state.chips.p0).toBe(1000);
    expect((h.view("p0") as RoPlayer).myBets).toEqual([]);
  });

  it("pays standard returns and 50:1 on the hot number", () => {
    const h = harness(roulette, 3);
    h.fire();
    h.state.hot = 17;
    h.input("p0", { type: "bet", bet: { type: "straight", value: 17, amount: 10 } }); // hot → 51×
    h.input("p1", { type: "bet", bet: { type: "odd", amount: 100 } }); // 17 is odd → 2×
    h.input("p2", { type: "bet", bet: { type: "dozen", value: 1, amount: 100 } }); // 17 is in the 2nd dozen → lose
    spinTo(h, 17);
    expect(h.state.chips.p0).toBe(990 + 510);
    expect(h.state.chips.p1).toBe(900 + 200);
    expect(h.state.chips.p2).toBe(900);
    expect(h.state.gained).toEqual({ p0: 500, p1: 100, p2: -100 });
  });

  it("hides the number from phones until the wheel stops", () => {
    const h = harness(roulette, 2);
    h.fire();
    h.fire(); // bet → spin
    expect((h.view("p0") as RoPlayer).result).toBeNull();
    expect((h.tv() as RoTv).result).toBe(h.state.result);
    h.fire();
    expect((h.view("p0") as RoPlayer).result).toBe(h.state.result);
  });

  it("finishes early when everyone is done, tops up broke players, and ends on the podium", () => {
    const h = harness(roulette, 2, { options: { rounds: 2 } });
    h.fire();
    h.input("p0", { type: "done" });
    h.input("p1", { type: "done" });
    expect(h.deadline! - h.ctx.now()).toBeLessThanOrEqual(900);
    spinTo(h, 0);
    h.fire(); // result → standings
    h.state.chips.p1 = 0;
    h.fire(); // standings → bet (spin 2)
    expect(h.state.chips.p1).toBe(100);
    spinTo(h, 5);
    h.fire();
    h.fire();
    expect(h.state.phase).toBe("podium");
    expect(h.finished).toBe(true);
  });
});
