# The Party Crew, in motion — v2 character spec

The eight characters are the strongest part of the art, so v2 keeps them and makes them work in **movement games**: a 3D sumo arena (push everyone off a shrinking ring) and a platformer (knock each other off ledges). Rule one: **the silhouette never changes**. A ball stays a ball, a star stays a star. Everything new is added *around* the body.

Raster art comes from ChatGPT (prompts below); the in-game 2D characters stay SVG so their faces can change live.

## What stays, what's new

**Stays:** silhouette, colour, the big glossy eyes, the thick indigo outline, the seven moods.

**New:**

1. **Floating mitten hands.** Rounded mittens in the character's light tint with the same outline, hovering just off the body — no arms. Hands are what make pushing, grabbing, waving and ledge-hanging readable, and floating hands keep the body shape untouched. In 3D they're two bones instead of a deforming arm rig.
2. **Floating oval feet** for everyone except Wisp (who hovers). Feet tell you direction and speed at a glance.
3. **A back.** Each character gets a back detail so you can tell which way they face in a 3D arena (table below).
4. **Depth.** How thick each shape is from the side, so a 3D model or a turnaround drawing stays on-model.
5. **Squash & stretch** on the body only, up to ±20 %, keeping volume: stretch on jumps, squash on landings and hits.
6. **Three extra faces** for action: *effort* (gritted teeth, pushing), *dizzy* (spiral eyes), *scream* (big O mouth, falling).

| Character | Depth (side view) | Back detail | Movement flavour |
|---|---|---|---|
| **Blip** (red ball) | Sphere | Antenna springs backward when moving; small gloss swirl on the back | Bounces on every step, antenna wobbles |
| **Tango** (orange flame) | Teardrop, 0.8× as deep as wide | Flame tip curls toward the back like a cowlick | Flickers, leaves a short ember trail when running |
| **Sunny** (yellow star) | Pillowy star "cookie", 0.55× deep | A single darker sparkle mark between the back points | Cartwheels on dash, sparkles on landing |
| **Sprout** (green bean) | Rounded cube, 0.85× deep | Leaf sprout tilts back; a seed seam down the back | Plods, leaves flap on jumps |
| **Splash** (teal droplet) | Round 3D droplet | Tip bends back; a bubble trapped inside the back | Skids and slides when stopping, flicks droplets |
| **Boxy** (blue robot) | Rounded box, 0.75× deep | Vent grille and a wind-up key that spins while running | Clunky steps; screen face shows icons (! ? %) when hit |
| **Wisp** (purple ghost) | Dome with a wavy skirt | The hem trails into a little tail behind | Hover-glides, hem ripples, no feet |
| **Puff** (pink cloud) | Cluster of 5–7 soft spheres, 0.8× deep | An extra-fluffy tuft like a tail | Drifts, little cloud puffs on landing |

## One body, so it's fair

All eight share **one physics body**: a capsule about 0.9 m wide and 1.1 m tall with the same mass, plus a 0.35 m shove reach for the hands. The visual model sits inside it. Nobody is secretly heavier or smaller — differences are animation, sound and trails. (Party brawlers do the same: one body shape, many looks.)

**Optional "chaos" signature moves** — every move has the same cooldown (8 s) and the same strength; only the flavour differs:

| Character | Signature move |
|---|---|
| Blip | **Boing** — a spring hop that bonks anyone it lands on |
| Tango | **Flare dash** — a short dash with an ember trail |
| Sunny | **Star spin** — a cartwheel spin that pushes outward |
| Sprout | **Take root** — can't be pushed for 1 second |
| Splash | **Slick** — leaves a slippery puddle |
| Boxy | **Magnet** — tugs nearby players one step closer |
| Wisp | **Phase** — intangible for 0.6 seconds |
| Puff | **Gust** — a puff of wind that shoves |

## Animation list (same set for 2D and 3D)

- **Move:** idle bob, walk, run, skid stop, jump (crouch → stretch up → apex → fall → squash land), ledge teeter (hands windmill), ledge grab + pull-up
- **Fight:** two-hand shove, grab + hold, thrown tumble, hit stagger, dizzy (stars orbit), knocked off (falls screaming, hands up), respawn pop-in with confetti
- **Emote:** wave, cheer, laugh, taunt, sad slump, a victory dance unique to each character

**Faces:** the seven moods + effort + dizzy + scream = 10. In 3D they're texture swaps on a face decal (crisp, cheap), not blend shapes.

## Readability with 8 players on screen

- A coloured ring under each character and a name chip above the head in their colour.
- Toon shading: flat colour, one hard shadow band, a thin rim light, and a thick outline (inverted hull or edge shader). No realistic materials.
- Characters at least ~6 % of the TV's height in the widest shot; edge arrows for anyone off-screen.

## Pipeline

- **2D platformer (browser):** keep the SVG characters and add the floating hands and feet as separate SVG parts animated in code. No sprite sheets needed; the ChatGPT pose sheets are the animation reference.
- **3D sumo (browser):** ChatGPT turnaround + pose sheets → model in Blender (or start from an image-to-3D tool and clean up) → 6-bone rig: root, body, face decal, hand L/R, foot L/R → export `.glb` (≤ 5k triangles, one 512 px texture + a face atlas) → Three.js with Rapier physics, simulated by the TV.

## ChatGPT prompts

Start with the style block from [image-prompts.md](image-prompts.md), attach a screenshot of the character from `/design`, then use one of these. Replace `[NAME]`, `[SHAPE]`, `[COLOR]` and `[BACK DETAIL]` from the table above.

**Turnaround sheet** (1536×1024) → `characters/<id>/turnaround.png`
> Character turnaround model sheet of [NAME], a [SHAPE] in [COLOR] (match the attached reference exactly). Four views in a row on one baseline, same scale: front, three-quarter front, side, back. Neutral A-pose: two floating rounded mitten hands hovering a little away from the body (no arms), two small floating oval feet below. Back view shows [BACK DETAIL]. Flat orthographic views, no perspective, plain light grey background, thick even indigo outline, flat colours with one hard shadow tone. No text or labels.

**Action pose sheet** (1536×1024) → `characters/<id>/poses.png`
> Action pose sheet of [NAME] (attached reference), 8 poses in a 4×2 grid, same scale: running, jumping (body stretched tall), landing (body squashed wide), two-handed shove with mitten hands pushing forward, hit stagger with dizzy stars, falling off a ledge screaming with hands up, hanging from a ledge by both hands, victory dance. The body silhouette never changes shape except for squash and stretch. Floating mitten hands and floating feet, no arms or legs. Plain light grey background, no text.

**Face decal sheet** (1024×1024) → `characters/<id>/faces.png`
> Face decal sheet for [NAME] (attached reference): 10 expressions in a 5×2 grid, eyes, brows and mouth only, drawn flat on solid [COLOR] squares: neutral smile, big laugh, sad with worried brows, shocked O mouth, thinking with eyes up, cheeky wink, triumphant sparkle eyes, gritted-teeth effort, dizzy spiral eyes, screaming wide O mouth. Same eye style as the reference: big glossy black ovals with white glints.

**Hand set** (1024×1024, transparent) → `characters/<id>/hands.png`
> Six floating cartoon mitten hands for [NAME], light [COLOR] with thick indigo outline, no arms: open palm, fist, pointing, thumbs up, palm pushing forward, grabbing. Arranged in a 3×2 grid with lots of padding, transparent background.

**Arena hero shot** (1536×1024) → `marketing/sumo-ring.png`
> All eight characters (attached references) brawling in a round sumo ring on a floating island in the sky: the red ball mid-bounce, the orange flame dashing with embers, the yellow star cartwheeling, the green bean planted firm, the teal droplet sliding, the blue robot clunking forward with its screen face showing "!", the purple ghost phasing see-through, the pink cloud puffing a gust. Floating mitten hands shoving, one character flying off the edge screaming. Bright, chaotic, joyful. Leave the top third calmer for a title. No text.
