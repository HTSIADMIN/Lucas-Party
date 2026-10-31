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
};
