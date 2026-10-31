// Liar's Dice — SCAFFOLD: replaced by the real engine.
import type { GameDefinition } from "../../types";

export const liarsdice: GameDefinition<{ phase: "podium" }> = {
  id: "liarsdice",
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
