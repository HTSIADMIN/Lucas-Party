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
import { doodlefraud } from "./doodlefraud";
import { scribblechain } from "./scribblechain";
import { fibfactory } from "./fibfactory";
import { holdem } from "./holdem";
import { fullmoon } from "./fullmoon";
import { crowdpleaser } from "./crowdpleaser";
import { liedetector } from "./liedetector";
import { mashbash } from "./mashbash";
import { trivia } from "./trivia";
import { emojipitch } from "./emojipitch";
import { court } from "./court";
import { dicederby } from "./dicederby";

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
  doodlefraud,
  scribblechain,
  fibfactory,
  holdem,
  fullmoon,
  crowdpleaser,
  liedetector,
  mashbash,
  trivia,
  emojipitch,
  court,
  dicederby,
};
