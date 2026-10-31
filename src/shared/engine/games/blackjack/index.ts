// Blackjack Bash — SCAFFOLD: replaced by the real engine.
import type { GameDefinition } from "../../types";

export const blackjack: GameDefinition<{ phase: "podium" }> = {
  id: "blackjack",
  create(ctx) {
    ctx.setDeadline(null);
    return { phase: "podium" };
  },
  onInput() {},
  onDeadline() {},
  tvView: (state) => state,
  playerView: (state) => state,
  scores: () => ({}),
};
