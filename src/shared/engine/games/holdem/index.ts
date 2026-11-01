// Hold'em Night — SCAFFOLD: replaced by the real engine.
import type { GameDefinition } from "../../types";

export const holdem: GameDefinition<{ phase: "podium" }> = {
  id: "holdem",
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
