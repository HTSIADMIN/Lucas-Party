export const THEME_IDS = ["showtime", "arcade", "picnic", "spooky", "cosmos"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export interface ThemeInfo {
  id: ThemeId;
  name: string;
  blurb: string;
  /** Swatch colours for pickers: [background, accent]. */
  swatch: [string, string];
}

export const THEMES: Record<ThemeId, ThemeInfo> = {
  showtime: { id: "showtime", name: "Showtime", blurb: "Late-night game-show studio with spotlights.", swatch: ["#2A1660", "#FF4FA3"] },
  arcade: { id: "arcade", name: "Neon Arcade", blurb: "Synthwave grid, neon glow, midnight vibes.", swatch: ["#0B0420", "#21E6FF"] },
  picnic: { id: "picnic", name: "Picnic", blurb: "Sunny sky, rolling hills, daytime energy.", swatch: ["#7FD3FF", "#45D483"] },
  spooky: { id: "spooky", name: "Spooky", blurb: "Full moon, bats, and jack-o'-lanterns.", swatch: ["#1B0F2E", "#FF8A3D"] },
  cosmos: { id: "cosmos", name: "Cosmos", blurb: "Planets, stars, and a whole lot of space.", swatch: ["#071233", "#9B6BFF"] },
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}
