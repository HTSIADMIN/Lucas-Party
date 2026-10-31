// The Party Crew — one character per seat. Each has a unique silhouette as well
// as a colour, so players can tell each other apart on the TV even if they are
// colour-blind.

export const CHARACTER_IDS = ["blip", "tango", "sunny", "sprout", "splash", "boxy", "wisp", "puff"] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export interface CharacterInfo {
  id: CharacterId;
  name: string;
  /** Silhouette, used in docs and image-gen prompts. */
  shape: string;
  color: string;
  shade: string;
  light: string;
  tagline: string;
}

export const CHARACTERS: Record<CharacterId, CharacterInfo> = {
  blip: {
    id: "blip", name: "Blip", shape: "round ball with a springy antenna",
    color: "#FF5A5F", shade: "#D63A47", light: "#FF9EA1",
    tagline: "Always first to buzz in.",
  },
  tango: {
    id: "tango", name: "Tango", shape: "flame with a curly tip",
    color: "#FF9A3C", shade: "#E0701A", light: "#FFC68E",
    tagline: "Hot takes, served spicy.",
  },
  sunny: {
    id: "sunny", name: "Sunny", shape: "chubby five-point star",
    color: "#FFD23F", shade: "#E3A714", light: "#FFEA98",
    tagline: "Relentlessly optimistic.",
  },
  sprout: {
    id: "sprout", name: "Sprout", shape: "soft square bean with a leaf sprout",
    color: "#45D483", shade: "#22A85E", light: "#A2EEBF",
    tagline: "Grows on you.",
  },
  splash: {
    id: "splash", name: "Splash", shape: "water droplet",
    color: "#2ED3D3", shade: "#139FAD", light: "#97F1EF",
    tagline: "Cool under pressure.",
  },
  boxy: {
    id: "boxy", name: "Boxy", shape: "boxy robot with a screen face",
    color: "#4F7BFF", shade: "#2F55D6", light: "#A8BEFF",
    tagline: "Calculating… calculating…",
  },
  wisp: {
    id: "wisp", name: "Wisp", shape: "floating ghost with a wavy hem",
    color: "#A46BFF", shade: "#7C45E0", light: "#D2B4FF",
    tagline: "Spooky good at bluffing.",
  },
  puff: {
    id: "puff", name: "Puff", shape: "fluffy cloud",
    color: "#FF6FCB", shade: "#E0459F", light: "#FFB6E6",
    tagline: "Head in the clouds, heart in the game.",
  },
};

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === "string" && (CHARACTER_IDS as readonly string[]).includes(value);
}
