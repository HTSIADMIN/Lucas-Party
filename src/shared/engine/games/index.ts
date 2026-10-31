import type { GameId } from "@party/shared";
import type { GameDefinition } from "../types";
import { punchline } from "./punchline";
import { rocket } from "./rocket";
import { oddoneout } from "./oddoneout";
import { greatminds } from "./greatminds";
import { mostlikely } from "./mostlikely";
import { dial } from "./dial";
import { liarsdice } from "./liarsdice";
import { spygrid } from "./spygrid";
import { oneclue } from "./oneclue";
import { blackjack } from "./blackjack";
import { shadespotter } from "./shadespotter";
import { showdown } from "./showdown";

// To add a game: implement GameDefinition, register it here, add its id to
// LIVE_GAME_IDS + GAME_CATALOG in @party/shared, and add TV/phone views in
// src/client/games.
export const GAMES: Record<GameId, GameDefinition<any>> = {
  punchline,
  rocket,
  oddoneout,
  greatminds,
  mostlikely,
  dial,
  liarsdice,
  spygrid,
  oneclue,
  blackjack,
  shadespotter,
  showdown,
};
