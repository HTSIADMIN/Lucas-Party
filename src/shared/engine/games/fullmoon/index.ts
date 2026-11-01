// Full Moon — SCAFFOLD: replaced by the real engine.
import type { GameDefinition } from "../../types";

export const fullmoon: GameDefinition<{ phase: "podium" }> = {
  id: "fullmoon",
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
