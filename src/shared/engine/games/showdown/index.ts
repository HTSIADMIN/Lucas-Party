// Saloon Showdown — SCAFFOLD: replaced by the real engine.
import type { GameDefinition } from "../../types";

export const showdown: GameDefinition<{ phase: "podium" }> = {
  id: "showdown",
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
