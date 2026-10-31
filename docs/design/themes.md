# Ten theme ideas

A theme is the whole room's costume: TV backdrop, phone wallpaper, colour tokens, a costume accessory for the Party Crew, a music/SFX flavour, and — for the movement games — an arena. The host picks one per party; the TV and every phone switch together.

ChatGPT makes the images (prompts at the bottom of each theme); code supplies the tokens and wiring. The five current hand-drawn SVG themes (Showtime, Neon Arcade, Picnic, Spooky, Cosmos) get replaced as these come in.

**Wiring (Claude does this once the images exist):** id + name in `src/shared/themes.ts` → tokens in `src/client/styles/themes.css` → images in `public/art/themes/<id>/` (`backdrop.webp`, `phone.webp`, `badge.png`, `costumes.png`) → extend `src/client/art/manifest.ts` with phone wallpapers and costume overlays.

**Common endings** — paste after each theme's prompt:

- *Backdrop (1536×1024):* Wide background for a TV game screen. No characters, no people, no text. Keep the central 60 % calm and low-detail so cards and text can sit on top; put detail around the edges and bottom. Slightly darker overall so white text stays readable.
- *Phone wallpaper (1024×1536, portrait):* Seamless, low-contrast pattern made from small motifs of this theme, two or three close tones of the theme's background colour so buttons and text stay readable. No text.
- *Badge (1024×1024):* A round sticker-style icon that sums up the theme in one object, thick indigo outline, transparent background. No text.
- *Costumes (1536×1024):* The eight characters (attached reference) standing in a row wearing the costume below, same scale, plain cream background. No text.

---

## 1. Saloon Showdown
A nod to where Lucas Games started: high noon on a cartoon Wild West main street.
- **Palette:** sunset orange `#FF8A3D` · dusty rose `#E86A7A` · sand `#F6D9A8` · saddle `#6B3E26` · sky teal `#3FB7B0`
- **Costume:** cowboy hats and bandanas; Boxy gets a sheriff star on its screen
- **Sound:** twangy guitar stings, harmonica on wins, a spur jingle on joins
- **Arena:** sumo on the roof of a moving train; platforming across saloon balconies
- **Backdrop prompt:** A cartoon Wild West main street at sunset: wooden saloon with swinging doors, wanted posters on the walls, water tower, cacti, a tumbleweed mid-roll, distant red mesas under a huge orange sky with long streaky clouds.
- **Wallpaper motifs:** horseshoes, sheriff stars, cacti, cowboy boots, dusty sand tones.

## 2. Midnight Diner
A chrome 1950s diner at 2 a.m., rain on the windows, the jukebox still going.
- **Palette:** cherry `#FF4D5E` · mint `#6FE3C5` · chrome `#C9D3E0` · cream `#FFF6E3` · night blue `#1C2340`
- **Costume:** paper soda-jerk hats; roller skates
- **Sound:** doo-wop jukebox loops, a diner bell for "time's up", milkshake slurp on reveals
- **Arena:** a slippery checkerboard floor ringed by spinning counter stools
- **Backdrop prompt:** Inside a glowing 1950s chrome diner late at night: red vinyl booths, a long counter with spinning stools, a jukebox with bubble lights, checkerboard floor, milkshakes and a pie case, a neon "open" sign shape (no letters) glowing pink, rain streaking down big windows with a dark city outside.
- **Wallpaper motifs:** milkshakes, cherries, records, checkerboard.

## 3. Deep Sea Disco
A coral-reef nightclub where jellyfish are the lights and a pufferfish is the disco ball.
- **Palette:** abyss `#0B1E4A` · jelly pink `#FF6FCB` · glow cyan `#3FF2E8` · kelp `#3CCB7F` · pearl `#F4F1FF`
- **Costume:** snorkel masks and inflatable armbands
- **Sound:** bubbly funk bass, sonar pings for timers, bubble pops on votes
- **Arena:** floaty low-gravity sumo on a giant clam shell that snaps shut at the end
- **Backdrop prompt:** An underwater coral reef turned into a nightclub: glowing bioluminescent jellyfish hanging like party lights, a round spiky pufferfish disco ball reflecting light spots, a sunken pirate ship as a DJ booth, swaying kelp, streams of bubbles, deep blue water fading to black at the top.
- **Wallpaper motifs:** bubbles, tiny jellyfish, shells, starfish.

## 4. Orbit Lounge
A retro-futuristic space-station bar with Earth hanging in the window.
- **Palette:** space navy `#12123A` · astro orange `#FF9A3C` · panel teal `#2ED3D3` · moon grey `#D9DCE8` · laser pink `#FF4FA3`
- **Costume:** fishbowl space helmets
- **Sound:** lounge synth, airlock whooshes on joins, a countdown beeper
- **Arena:** zero-gravity sumo — everyone drifts, and the ring's edges are open airlocks
- **Backdrop prompt:** A cosy retro-futuristic space station lounge: a giant round window showing Earth and the Moon, curved white walls with blinking control panels, floating snacks and drinks with little orbit trails, potted space plants, warm orange lamp light against deep navy space.
- **Wallpaper motifs:** rockets, planets, satellites, tiny stars.

## 5. Tiki Volcano
A tropical island at dusk; the volcano is smoking and nobody seems worried.
- **Palette:** lava `#FF5A36` · mango `#FFC93C` · jungle `#1E8C5A` · lagoon `#2BC4D9` · dusk `#3A1F5C`
- **Costume:** flower leis and grass skirts
- **Sound:** ukulele and steel drums, a volcano rumble before reveals
- **Arena:** sumo on a tiki raft in a lava moat — the raft tips toward whoever's heaviest-pushed
- **Backdrop prompt:** A tropical island at dusk: a big friendly-looking volcano puffing smoke rings, tiki torches and paper lanterns along a bamboo deck, palm trees silhouetted against a purple-orange sky, a glowing turquoise lagoon at the bottom.
- **Wallpaper motifs:** hibiscus flowers, pineapples, tiki masks, palm leaves.

## 6. Kaiju City
A toy-like city at night with a giant, friendly monster peeking over the skyline.
- **Palette:** city night `#16163A` · neon lime `#B8FF3C` · warning yellow `#FFD23F` · kaiju purple `#8B5CF6` · window amber `#FFB547`
- **Costume:** tiny construction hard hats (or monster-hood onesies)
- **Sound:** B-movie brass, big stomps that shake the screen on reveals
- **Arena:** rooftop platformer — buildings crumble, the kaiju's tail sweeps a lane
- **Backdrop prompt:** A playful toy-like city skyline at night: chunky skyscrapers with warm lit windows, searchlights sweeping the sky, tiny helicopters, and a giant friendly purple monster with big curious eyes peeking over the buildings from behind, one claw resting on a rooftop.
- **Wallpaper motifs:** tiny buildings, monster footprints, helicopters, traffic cones.

## 7. Toy Box
A giant kids' playroom; the Party Crew are the toys.
- **Palette:** crayon red `#FF4D5E` · block blue `#3F8CFF` · block yellow `#FFD23F` · cardboard `#D9A066` · paper `#FFF9EF`
- **Costume:** paper crowns and cardboard-box armour
- **Sound:** toy piano and xylophone, wind-up clicks, a squeaky toy on wrong answers
- **Arena:** block-tower platformer with marbles rolling down ramps
- **Backdrop prompt:** A giant kids' playroom seen from toy height: towers of wooden building blocks, crayon doodles on the wall, a cardboard castle with a paper flag, a wooden train track looping across a rug, a teddy bear slumped in the corner, warm afternoon light.
- **Wallpaper motifs:** blocks, crayons, paper planes, stars drawn in crayon.

## 8. Haunted Manor
Candlelit and spooky-cute — perfect for Halloween parties.
- **Palette:** midnight `#1A1030` · pumpkin `#FF8A1F` · ecto green `#7CFF6B` · candle gold `#FFD27A` · plum `#5B2A86`
- **Costume:** witch hats and vampire capes; Wisp wears a bedsheet "ghost costume" over itself
- **Sound:** harpsichord and theremin, creaky doors on joins, a thunderclap on reveals
- **Arena:** floorboards that collapse one by one into the cellar
- **Backdrop prompt:** A cartoon haunted mansion library at night: tall bookshelves, floating candles, portraits whose eyes look sideways, a grandfather clock, cobwebs, green ghostly mist rolling across the floor, a big moonlit window with bats outside.
- **Wallpaper motifs:** pumpkins, candles, bats, tiny ghosts.

## 9. Frosty Lodge
A cosy ski cabin with a crackling fire and snow outside.
- **Palette:** pine `#1F5C4A` · berry `#E8445A` · snow `#F4FAFF` · cocoa `#6B4232` · ice blue `#8FD3FF`
- **Costume:** knit beanies and scarves
- **Sound:** sleigh bells, cosy jazz, a crackling fire bed
- **Arena:** a frozen pond — slippery ice sumo where every shove slides you too
- **Backdrop prompt:** Inside a cosy wooden ski lodge: a crackling stone fireplace, string lights, mugs of hot cocoa with marshmallows, plaid blankets, and a huge window showing snowy mountain peaks and falling snow under a dusky sky.
- **Wallpaper motifs:** snowflakes, mittens, cocoa mugs, pine trees.

## 10. Neon Rooftop
A rainy rooftop above a neon city; lo-fi and late.
- **Palette:** night `#0E0B24` · neon pink `#FF2E88` · neon cyan `#2EF2FF` · vending yellow `#FFE45C` · rain violet `#6A5ACD`
- **Costume:** rain hoods and LED visors
- **Sound:** lo-fi beats, rain bed, a vending-machine clunk on submissions
- **Arena:** platforming across rooftop gaps in the rain, with neon signs as moving platforms
- **Backdrop prompt:** A rooftop at night above a glowing neon city in the rain: glowing vending machines, a water tank, AC units with a sleepy cat on one, puddles reflecting pink and cyan neon sign shapes (no letters), distant skyscrapers in a purple haze, rain streaks.
- **Wallpaper motifs:** raindrops, umbrellas, tiny neon shapes, puddles.
