// One Clue — SCAFFOLD: replaced by the real engine.
import type { GameDefinition } from "../../types";

export const oneclue: GameDefinition<{ phase: "podium" }> = {
  id: "oneclue",
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
