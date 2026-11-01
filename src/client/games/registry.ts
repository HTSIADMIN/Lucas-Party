import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { GameId, RoomView } from "@party/shared";
import type { ClockLike } from "../lib/hooks";
import type { RoomClient } from "../lib/roomClient";

export interface TvGameProps<V = unknown> {
  room: RoomView;
  view: V;
  /** The room clock (the hosting TV, or a viewer mirroring it). */
  client: ClockLike;
}

export interface PhoneGameProps<V = unknown> {
  room: RoomView;
  view: V;
  client: RoomClient;
  playerId: string;
  isHost: boolean;
}

type Lazy<P> = LazyExoticComponent<ComponentType<P>>;

// Each game's views load on demand so the front page and phone stay light.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GAME_VIEWS: Record<GameId, { Tv: Lazy<TvGameProps<any>>; Phone: Lazy<PhoneGameProps<any>> }> = {
  punchline: {
    Tv: lazy(() => import("./punchline/PunchlineTv")),
    Phone: lazy(() => import("./punchline/PunchlinePhone")),
  },
  rocket: {
    Tv: lazy(() => import("./rocket/RocketTv")),
    Phone: lazy(() => import("./rocket/RocketPhone")),
  },
  oddoneout: {
    Tv: lazy(() => import("./oddoneout/OddTv")),
    Phone: lazy(() => import("./oddoneout/OddPhone")),
  },
  greatminds: {
    Tv: lazy(() => import("./greatminds/GreatMindsTv")),
    Phone: lazy(() => import("./greatminds/GreatMindsPhone")),
  },
  mostlikely: {
    Tv: lazy(() => import("./mostlikely/MostLikelyTv")),
    Phone: lazy(() => import("./mostlikely/MostLikelyPhone")),
  },
  dial: {
    Tv: lazy(() => import("./dial/DialTv")),
    Phone: lazy(() => import("./dial/DialPhone")),
  },
  liarsdice: {
    Tv: lazy(() => import("./liarsdice/LiarsDiceTv")),
    Phone: lazy(() => import("./liarsdice/LiarsDicePhone")),
  },
  spygrid: {
    Tv: lazy(() => import("./spygrid/SpyGridTv")),
    Phone: lazy(() => import("./spygrid/SpyGridPhone")),
  },
  oneclue: {
    Tv: lazy(() => import("./oneclue/OneClueTv")),
    Phone: lazy(() => import("./oneclue/OneCluePhone")),
  },
  blackjack: {
    Tv: lazy(() => import("./blackjack/BlackjackTv")),
    Phone: lazy(() => import("./blackjack/BlackjackPhone")),
  },
  shadespotter: {
    Tv: lazy(() => import("./shadespotter/ShadeSpotterTv")),
    Phone: lazy(() => import("./shadespotter/ShadeSpotterPhone")),
  },
  showdown: {
    Tv: lazy(() => import("./showdown/ShowdownTv")),
    Phone: lazy(() => import("./showdown/ShowdownPhone")),
  },
  doodlefraud: {
    Tv: lazy(() => import("./doodlefraud/DoodleFraudTv")),
    Phone: lazy(() => import("./doodlefraud/DoodleFraudPhone")),
  },
  scribblechain: {
    Tv: lazy(() => import("./scribblechain/ScribbleChainTv")),
    Phone: lazy(() => import("./scribblechain/ScribbleChainPhone")),
  },
  fibfactory: {
    Tv: lazy(() => import("./fibfactory/FibFactoryTv")),
    Phone: lazy(() => import("./fibfactory/FibFactoryPhone")),
  },
  holdem: {
    Tv: lazy(() => import("./holdem/HoldemTv")),
    Phone: lazy(() => import("./holdem/HoldemPhone")),
  },
  fullmoon: {
    Tv: lazy(() => import("./fullmoon/FullMoonTv")),
    Phone: lazy(() => import("./fullmoon/FullMoonPhone")),
  },
  crowdpleaser: {
    Tv: lazy(() => import("./crowdpleaser/CrowdPleaserTv")),
    Phone: lazy(() => import("./crowdpleaser/CrowdPleaserPhone")),
  },
  liedetector: {
    Tv: lazy(() => import("./liedetector/LieDetectorTv")),
    Phone: lazy(() => import("./liedetector/LieDetectorPhone")),
  },
  mashbash: {
    Tv: lazy(() => import("./mashbash/MashBashTv")),
    Phone: lazy(() => import("./mashbash/MashBashPhone")),
  },
  trivia: {
    Tv: lazy(() => import("./trivia/TriviaTv")),
    Phone: lazy(() => import("./trivia/TriviaPhone")),
  },
  emojipitch: {
    Tv: lazy(() => import("./emojipitch/EmojiPitchTv")),
    Phone: lazy(() => import("./emojipitch/EmojiPitchPhone")),
  },
  court: {
    Tv: lazy(() => import("./court/CourtTv")),
    Phone: lazy(() => import("./court/CourtPhone")),
  },
  dicederby: {
    Tv: lazy(() => import("./dicederby/DiceDerbyTv")),
    Phone: lazy(() => import("./dicederby/DiceDerbyPhone")),
  },
  bombsquad: {
    Tv: lazy(() => import("./bombsquad/BombSquadTv")),
    Phone: lazy(() => import("./bombsquad/BombSquadPhone")),
  },
  wordbomb: {
    Tv: lazy(() => import("./wordbomb/WordBombTv")),
    Phone: lazy(() => import("./wordbomb/WordBombPhone")),
  },
  roulette: {
    Tv: lazy(() => import("./roulette/RouletteTv")),
    Phone: lazy(() => import("./roulette/RoulettePhone")),
  },
  heist: {
    Tv: lazy(() => import("./heist/HeistTv")),
    Phone: lazy(() => import("./heist/HeistPhone")),
  },
};
