// Generated art (e.g. from ChatGPT image generation) that replaces the built-in
// SVG versions. Drop files into apps/web/public/art/ and list them here — see
// docs/design/image-prompts.md for the prompts, sizes and file names.
//
// Characters and Telly stay vector on purpose: they need live expressions and
// animation. Use generated character art for marketing (hero, social cards).

import type { ThemeId } from "@party/shared";

export interface ArtManifest {
  /** Full-bleed backdrops, ~1536×1024 landscape. e.g. spooky: "/art/backdrops/spooky.webp" */
  backdrops: Partial<Record<ThemeId, string>>;
  /** Game key art for cards and the TV, ~1536×1024 (shown at 16:10). Keyed by game id. */
  games: Partial<Record<string, string>>;
}

export const ART: ArtManifest = {
  backdrops: {},
  games: {},
};
