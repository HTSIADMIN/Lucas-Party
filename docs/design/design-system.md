# "Prime Time" — the Lucas Games design system

A late-night game show you play from the couch. The living version of this page is **`/design`** in the app — every swatch, button, character and backdrop there is the real component.

## Principles

1. **Readable from the couch.** TV text is big, high-contrast, and sits on cream "sticker" cards over busy backdrops. If it matters, it's on a card.
2. **Chunky and tactile.** Thick ink outlines (3–4 px), hard drop shadows with no blur, buttons that physically press down. Everything looks like a sticker you could peel off.
3. **The world changes, the cards don't.** Themes swap the backdrop and accent colours; cream cards and ink text stay constant, so contrast never breaks.
4. **One phone, one thumb.** Big targets (48 px+), one primary action per screen, sticky at the bottom.
5. **Shape before colour.** Every character has a unique silhouette, so players can tell each other apart even with colour-blindness.

## Tokens

All tokens live in `apps/web/src/styles/tokens.css`; themes in `themes.css`.

| Group | Tokens | Notes |
|---|---|---|
| Ink | `--ink-950 … --ink-300` | Outlines and text on cards. `--ink-900` `#1B1033` is *the* outline colour. |
| Night | `--night-950 … --night-600` | Default backdrop ramp. |
| Cream | `--cream-50 … --cream-300` | Card surfaces. |
| Accents | `--pink-*`, `--sun-*`, `--mint-*`, `--sky-*`, `--cherry-*`, `--grape-*`, `--tangerine-500` | 300/500/700 stops. |
| Semantic | `--bg`, `--bg-deep`, `--on-bg`, `--surface*`, `--text`, `--text-muted`, `--outline`, `--primary`, `--accent`, `--success`, `--danger`, `--info`, `--focus`, `--side-a`, `--side-b` | Components use only these. `--side-a/b` colour the A/B answers in face-offs. |
| Type | `--font-display` (Lilita One), `--font-body` (Fredoka), `--fs-display … --fs-xs` | Display for titles, codes, buttons; body for everything else. Fonts are self-hosted via @fontsource. |
| Space | `--sp-1 … --sp-20` | 4 px grid. |
| Shape | `--r-sm/md/lg/xl/pill`, `--ow`, `--ow-thick` | Rounded everything; outline width 3/4 px. |
| Depth | `--sh-1/2/3`, `--sh-float`, `--bevel`, `--glow-primary/accent` | Hard offset shadows; bevel = inner top highlight + bottom shade. |
| Motion | `--ease-pop`, `--ease-out`, `--dur-1/2/3` | Pop easing overshoots for that bouncy feel. |

**Seat colours** come from `CHARACTERS` in `packages/shared/src/characters.ts`: Blip `#FF5A5F`, Tango `#FF9A3C`, Sunny `#FFD23F`, Sprout `#45D483`, Splash `#2ED3D3`, Boxy `#4F7BFF`, Wisp `#A46BFF`, Puff `#FF6FCB`.

## Components (CSS classes in `components.css`)

| Component | Classes | Use |
|---|---|---|
| Button | `.btn` + `.btn-accent / -light / -success / -danger / -ghost`, sizes `.btn-sm / -lg / -xl`, `.btn-block`, `.btn-icon` | Disabled stays opaque (grey) because buttons often float in sticky bars. |
| Sticker card | `.card`, `.card-sm`, `.card-tilt-l/r` | The default container for anything readable. |
| Glass panel | `.panel` | Content sitting directly on a backdrop. |
| Inputs | `.field`, `.label`, `.input`, `.form-error`, `.form-ok` | Thick outline, yellow focus ring. |
| Room code | `<RoomCodeInput>` (`.code-input`, `.code-tile`) | One real input behind four tiles — paste/autocapitalise just work. |
| Toggle / segmented / tabs | `.toggle`, `.seg`, `.tabs` + `.tab` | |
| Badges & chips | `.badge` + `-live/-soon/-host/-admin/-danger/-info`, `.chip`, `.dot` | |
| Speech bubble | `.bubble` | Telly's lines, clue reveals. |
| Modal / sheet | `<Modal>`, `<Sheet>` | Sheet = phone bottom drawer (host controls, character picker). |
| Toasts | `<ToastProvider>` / `useToast()` | |
| Timer ring | `<Timer>` | Counts toward the room deadline; pulses red under 5 s. |
| Game card | `<GameCard>`, `<GameMetaLine>` | Key art + name + tagline + players/time + tags. |
| Game view kit | `games/shared.tsx`: `PlayerToken`, `ProgressRow`, `Scoreboard`, `Podium`, `Confetti`, `PhoneMessage`, `PhoneScore` | Reuse these in every new game. |

## The Party Crew

Eight characters, one per seat. Hand-built SVG on a 120×120 grid (`apps/web/src/art/Character.tsx`): ink outline 4.5, one white gloss stroke, one shade stroke, small feet.

| Character | Silhouette | Personality |
|---|---|---|
| **Blip** (red) | Round ball with a springy antenna | Always first to buzz in |
| **Tango** (orange) | Flame with a curly tip | Hot takes, served spicy |
| **Sunny** (yellow) | Chubby five-point star | Relentlessly optimistic |
| **Sprout** (green) | Soft square bean with a leaf sprout | Grows on you |
| **Splash** (teal) | Water droplet | Cool under pressure |
| **Boxy** (blue) | Robot with a screen face | Calculating… calculating… |
| **Wisp** (purple) | Floating ghost with a wavy hem | Spooky good at bluffing |
| **Puff** (pink) | Fluffy cloud | Head in the clouds |

**Moods** (`Face.tsx`): `idle`, `happy`, `sad`, `shock`, `think`, `cheeky`, `win`. Use them to react to game events — winner = `win`, waiting = `think`, toasted = `sad`, accused = `shock`.

**Motion:** `bob` (idle loop, staggered per character), `jump` (one-shot — change the React `key` to replay), `shake`, `none`. Eyes blink on their own. Wisp floats instead of bobbing.

## Telly — the host

A retro CRT TV with a face on the screen, antennas with blinking bulbs, white gloves and a pink bow tie (`art/Telly.tsx`). Poses: `wave`, `cheer`, `idle`; any mood. Telly appears on the TV lobby, intros, pause screens, empty states and the front page.

**Voice:** a cheeky, warm game-show host. Short sentences, exclamation marks earned, never mean. "Grab your phones!", "Paused. Grab a snack!", "No signal! This channel doesn't exist."

## Themes & backdrops

The host picks a theme per room; the TV and every phone switch together. Site visitors pick one in the footer.

| Theme | Backdrop | Primary / accent |
|---|---|---|
| **Showtime** (default) | Studio: swaying spotlights, marquee bulbs, sparkles, stage floor | pink / sun |
| **Neon Arcade** | Synthwave sun, scrolling neon grid, mountains | magenta / cyan |
| **Picnic** | Sky, spinning sun, drifting clouds, hills with flowers (light theme) | cherry / sun |
| **Spooky** | Full moon, bats, haunted house, jack-o'-lanterns, fog | tangerine / slime |
| **Cosmos** | Nebulae, twinkling stars, ringed planet, shooting star | grape / cyan |

Backdrops are pure SVG + CSS transforms (no blur filters) so they stay smooth on smart-TV browsers. Any of them can be replaced by a generated image via `apps/web/src/art/manifest.ts` — see [image-prompts.md](image-prompts.md).

## TV rules (10-foot UI)

- Everything inside `.tv` is sized in **em**, and `.tv`'s font-size tracks the viewport (`min(1.25vw, 2.25vh)`), so a layout scales from a 720p laptop to a 4K TV without breakpoints.
- Persistent chrome: logo, sound button (browsers need one click before audio), the join URL + code once a game is running, a player strip with scores, a pause overlay.
- **The TV plays all the sound.** Phones stay silent and buzz instead (`navigator.vibrate`).
- Never show private information on the TV view — it's public by definition.

## Phone rules

- Top bar: room code, connection dot, your character + name, and (for the host) the 👑 Host button.
- One primary action per screen, in a sticky bottom bar when the screen scrolls.
- The screen stays awake during games (Wake Lock API).
- Inputs: big tap targets, `enterKeyHint`, no zoom-on-focus (inputs are ≥16 px).
- After acting, tell the player what happens next ("Locked in! Watch the TV.").

## Accessibility

- Characters differ by shape, not just colour; A/B answers are lettered, not just coloured.
- Cream cards + ink text keep high contrast in every theme.
- `prefers-reduced-motion` turns animations off globally.
- All controls are real buttons/inputs with labels; dialogs trap Escape; toasts are `aria-live`.

## File map

```
apps/web/src/
  styles/   tokens · themes · base · components · art · site · tv · phone
  art/      Face · Character · Telly · Backdrop · GameArt · manifest
  ui/       Logo · RoomCodeInput · QrCode · Timer · CharacterPicker · Overlay · Toasts · controls · GameCard
  games/    registry · shared · <game>/<Game>Tv.tsx + <Game>Phone.tsx + css
```
