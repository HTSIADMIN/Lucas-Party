# Image prompt pack (ChatGPT image generation)

Use these to make the art that's beyond hand-drawn SVG: illustrated backdrops, game key art, marketing art of the Party Crew and Telly. The in-game characters stay SVG (they need live expressions), so generated character art is for the front page, social cards, merch and loading screens.

## Workflow

1. **Start every chat with the style block** below, then the specific prompt.
2. **Give it a reference.** Open `/design` in the app, screenshot the character (or Telly, or a backdrop), and attach it: "Match this character's silhouette, colours and proportions exactly." That keeps generated art consistent with the in-game SVGs.
3. **Ask for the right size.** Square 1024×1024 for characters (ask for a transparent background), landscape 1536×1024 for backdrops and key art. If the tool offers other sizes, keep the aspect ratio.
4. **Iterate with small edits** ("same image, but make the outline thicker", "remove the text") rather than re-rolling from scratch.
5. **Save** as PNG, convert to WebP (smaller) if you like, and drop it into `apps/web/public/art/` using the file names below.
6. **Wire it up** in `apps/web/src/art/manifest.ts`, e.g. `backdrops: { spooky: "/art/backdrops/spooky.webp" }`. Backdrops and game art switch over instantly; everything else keeps working.

## Style block (paste first, every time)

> Style: "Prime Time" — bold flat cartoon illustration for a party video game. Thick, even, dark indigo outlines (#1B1033) around every shape. Flat fills with one hard-edged shadow tone per colour and a small white gloss highlight; no soft airbrush gradients, no photorealism, no 3D render, no painterly texture. Chunky, rounded, friendly shapes. Saturated palette: pop pink #FF4FA3, sun yellow #FFC93C, mint #2FDB9A, sky blue #3FB7FF, grape #9B6BFF, cherry #FF4D5E, cream #FFF6E3, deep night purple #1F1250. Playful late-night game-show energy. Absolutely no text, letters, numbers or logos in the image.

## Characters — hero poses (1024×1024, transparent background)

Common ending for every character prompt:
> Full body, centred, facing the viewer, small soft ground shadow, transparent background, lots of padding around the character, consistent thick outline, big glossy oval black eyes with white glints, rosy cheeks, tiny stubby feet unless stated.

| File | Prompt |
|---|---|
| `characters/blip.png` | **Blip**: a perfectly round cherry-red (#FF5A5F) ball creature with a springy curly antenna topped by a small pink glowing bulb. Eager, bouncy, leaning forward like it's about to buzz in first. |
| `characters/tango.png` | **Tango**: a living orange flame (#FF9A3C) with a round bottom and a curly flame tip on top, a lighter yellow-orange inner flame on its belly. Confident smirk, one eyebrow raised — hot takes only. |
| `characters/sunny.png` | **Sunny**: a chubby five-point star (#FFD23F) with very rounded, puffy points, standing on its two lower points. Beaming, relentlessly optimistic grin. |
| `characters/sprout.png` | **Sprout**: a soft, squarish green bean (#45D483) with a tiny two-leaf sprout growing from the top of its head. Calm, relaxed, half-lidded happy eyes. |
| `characters/splash.png` | **Splash**: a teal water droplet (#2ED3D3), pointed tip on top, a big white shine highlight on one side and a tiny bubble floating beside it. Cool and unbothered. |
| `characters/boxy.png` | **Boxy**: a blue boxy robot (#4F7BFF) with rounded corners, a dark navy screen for a face showing glowing cyan eyes, a short antenna with a yellow ball, little bolt "ears" on each side, three small buttons on its belly, square feet. Curious, computing. |
| `characters/wisp.png` | **Wisp**: a purple floating ghost (#A46BFF) with a wavy hem and two small stubby arms, hovering above its shadow (no feet). Sly, mischievous smile — spooky good at bluffing. |
| `characters/puff.png` | **Puff**: a fluffy pink cloud creature (#FF6FCB) with a bumpy outline and tiny feet. Dreamy, sleepy-happy eyes, gently floating. |

**Expression sheet** (one per character, 1536×1024):
> Character expression sheet of [NAME] (attached reference), 7 copies in a single row, same pose and scale, each with a different face: neutral smile, big open laugh, sad with worried brows, shocked with wide eyes and an O mouth, thinking with eyes looking up, cheeky wink with a smirk, triumphant with star-shaped sparkle eyes. Plain cream background.

**Group shot** (front-page hero, `marketing/crew-couch.png`, 1536×1024):
> All eight characters (attached references: a red ball, an orange flame, a yellow star, a green bean with a sprout, a teal droplet, a blue robot, a purple ghost, a pink cloud) squeezed onto a big comfy purple couch, cheering at a TV off-camera, holding phones, popcorn flying, confetti in the air. Cosy living room at night with warm lamp light. Leave the left third of the image calm for a headline.

## Telly, the host (1024×1024, transparent background)

> **Telly**: a cheerful retro CRT television character, golden-yellow cabinet (#FFC93C) with rounded corners, a cyan glowing screen showing a simple cartoon face (oval eyes, wide smile), two antennas in a V with one pink and one cyan bulb on the tips, two knobs and a speaker grille on the right side, white cartoon gloves, short legs with dark purple shoes, a pink bow tie. Game-show host energy.

Poses (same prompt + one of): *waving hello with one glove*, *both arms up cheering with confetti*, *holding a microphone and pointing at the viewer*, *scratching its antenna thinking, screen showing a question mark face*, *dramatically shocked, screen showing static*. Save as `telly/wave.png`, `telly/cheer.png`, `telly/mic.png`, `telly/think.png`, `telly/shock.png`.

## Backdrops (1536×1024 landscape) → `backdrops/<theme>.webp`

Common ending:
> Wide background illustration for a TV game screen. No characters, no people, no text. Keep the central 60% calm and low-detail so cards and text can sit on top; put the interesting detail around the edges and bottom. Slightly darker overall so white text stays readable.

| File | Prompt |
|---|---|
| `backdrops/showtime.webp` | A late-night game-show studio: deep purple stage, sweeping white spotlight beams from the ceiling, a row of glowing marquee bulbs along the top edge, sparkles, a curved glossy stage floor with a pink neon rim at the bottom. |
| `backdrops/arcade.webp` | A synthwave night: huge striped sunset sun on the horizon, neon magenta perspective grid floor, dark mountains with cyan neon edges, starry purple sky. |
| `backdrops/picnic.webp` | A bright sunny day: soft blue sky, a big yellow sun (no face) in the top right, puffy white clouds with thick outlines, rolling green hills dotted with tiny flowers at the bottom. Lighter overall than the others (this is the daytime theme). |
| `backdrops/spooky.webp` | A Halloween night: huge glowing full moon top right, bats silhouetted, a crooked haunted house on a hill with one lit window, jack-o'-lanterns glowing along the bottom, low drifting fog, deep purple sky with stars. |
| `backdrops/cosmos.webp` | Deep space: purple and cyan nebula clouds, many tiny stars, a big pink ringed planet in the bottom left, a small green moon top right, a shooting star streak. |

## Game key art (1536×1024) → `games/<game-id>.webp`

Common ending:
> Game key art for a party game card, shown small (about 300 px wide) so shapes must read instantly. Strong silhouettes, one clear focal point, a bold coloured background in the game's accent colour with a subtle pattern. No text.

| File | Prompt |
|---|---|
| `games/punchline.webp` | Pink (#FF4FA3) background with comic burst rays. A vintage microphone on a stand centre stage between the red ball character (smirking) and the yellow star character (laughing), each with an empty speech bubble. Comedy-club energy. |
| `games/rocket.webp` | Orange-to-purple sky (#FF9A3C) with stars. A cartoon cream-and-red rocket blasting diagonally up-right along a dotted curve, flame trailing; the pink cloud character drifting down under a parachute in the upper left. |
| `games/oddoneout.webp` | Purple (#A46BFF) striped background. A line of four identical purple ghosts looking suspicious — the third one wearing a fake-nose-and-glasses disguise; a big magnifying glass hovering over it. |
| `games/greatminds.webp` | Green background, two round heads sharing one golden thought bubble. |
| `games/liarsdice.webp` | Yellow background, two tumbling dice and a cup, one die peeking out sneakily. |
| `games/holdem.webp` | Green felt background, two playing cards fanned (ace and king) with a stack of chips. |
| `games/dial.webp` | Teal background, a big semicircle dial with red/yellow/green zones and a needle. |

## Social card (Open Graph) → `marketing/og.png`

> 1536×1024 (we'll crop to 1200×630): the Party Crew cheering around Telly on a game-show stage with spotlights; Telly centre, characters arranged in a smile-shaped arc; leave the top quarter free for a logo. No text.

## Tips

- If outlines come out thin or sketchy, add: "uniform 8-pixel dark indigo outline, vector-like, clean".
- If it adds text or logos anyway: "remove all text and letters, keep everything else identical".
- If colours drift, paste the hex codes again and attach the in-game SVG screenshot.
- Keep a single long-running chat per asset family (characters, backdrops, key art) so the model keeps the style in context.
