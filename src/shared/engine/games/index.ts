import type { GameId } from "@party/shared";
import type { GameDefinition } from "../types";
import { punchline } from "./punchline";
import { rocket } from "./rocket";
import { oddoneout } from "./oddoneout";

// To add a game: implement GameDefinition, register it here, add its id to
// LIVE_GAME_IDS + GAME_CATALOG in @party/shared, and add TV/phone views in
// apps/web/src/games.
export const GAMES: Record<GameId, GameDefinition<any>> = {
  punchline,
  rocket,
  oddoneout,
};
