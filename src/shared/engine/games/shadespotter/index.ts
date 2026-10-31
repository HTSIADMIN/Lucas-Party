// Shade Spotter — SCAFFOLD: replaced by the real engine.
import type { GameDefinition } from "../../types";

export const shadespotter: GameDefinition<{ phase: "podium" }> = {
  id: "shadespotter",
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
