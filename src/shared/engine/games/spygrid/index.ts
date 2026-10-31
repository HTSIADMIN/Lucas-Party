// Spy Grid — SCAFFOLD: replaced by the real engine.
import type { GameDefinition } from "../../types";

export const spygrid: GameDefinition<{ phase: "podium" }> = {
  id: "spygrid",
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
