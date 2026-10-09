# Solo CoX Trainer · Olm Lab

**Play:** https://osrskoeppy.github.io/SoloCoxTrainer/

Open the same HTTPS link on your computer or phone. No account, installation,
Discord login, or running PC is required for the hosted version. In Realists
Discord, `/olm` provides an **Open Olm trainer** button once Hub is deployed.
The link opens a regular browser; embedding inside a Discord Activity is a
separate future integration.

**Offline download:** [Olm-3D-Offline.html](https://osrskoeppy.github.io/SoloCoxTrainer/Olm-3D-Offline.html).
Save the linked file and open it in a modern desktop browser. Phones can use
the hosted link or a local server on the same Wi-Fi; opening local HTML varies
by mobile operating system.

## Install as an app

Open the hosted link in your external browser (rather than Discord's embedded
browser), then open the wrench → **Interface & app**. Choose **Install Olm Lab**
when the browser offers it. On iPhone/iPad, use Safari → Share → Add to Home
Screen. On Android, use Chrome → Install app / Add to Home screen. Chrome and
Edge on desktop also offer installation from the address bar.

Wait for **Ready to play offline** in Settings before disconnecting. The app
caches the entire room, player animations, models, icons and code. Offline play
depends on the browser retaining its storage; clearing site data removes the
download. Reopen online to check for updates; **Update & reload** applies a
downloaded update when you are ready, without interrupting a fight automatically.
Installation needs HTTPS or localhost; plain HTTP LAN hosting remains playable
but does not provide the install/offline-cache features. The standalone HTML is
still available without a service worker.

## Desktop and mobile interface

Desktop uses a RuneLite-style resizable viewport, floating minimap, four-by-seven
inventory, equipment paper doll, and a five-column prayer book with cache sprites.
Mobile uses right-side touch tabs, a folding panel, left-side protection-prayer
shortcuts and safe-area spacing. Landscape offers the most arena space; portrait
is supported. Tap the selected tab again to fold the panel away.

The **OLM LAB** menu at the top expands to show focus, phase, speed, reset,
demonstrations, coaching and full screen. The wrench opens all other settings,
including special practice and tiles. **Layout** defaults to automatic device
detection; its desktop/mobile override is saved locally. Resizing a desktop
window alone does not switch it into the phone interface.

Only protection prayers and Piety/Rigour/Augury are simulated. Other prayer
icons are dimmed and disabled. This is a game-inspired interface, not a full
RuneLite client or the official OSRS Mobile application.

## Build and publish

Use Node.js 22 or newer: `npm ci`, `npm run build`, then `npm test`.
`dist/` is the complete static site; every asset URL is relative so it works
under the `/SoloCoxTrainer/` GitHub Pages path. No bot secrets belong in this repo.
The build also writes the standalone offline HTML and updates `public/app.js`.

In repository Settings → Pages, select **GitHub Actions**. Pushes to `main`
build and test before deploying; pull requests only build and test. Pages
hosting of a private repository requires an eligible GitHub plan. GitHub Pages
serves the site publicly even when the source repository stays private.

The reference experience is a directly playable browser trainer, like the
[Verzik P2 trainer](https://lmperium2096.github.io/verzik_trainer/) and
[Verzik P3 trainer](https://verzik.colosim.com/). Those sites are separate
projects; their code and assets are not included here.

This replaces the schematic prototype with a playable 3D scene. It uses actual Olm room geometry, head and claw models, wearable equipment, inventory model icons, UI sprites, and animation frames decoded from the local OSRS cache. The layout has a resizable arena and inventory on the right, with phone layouts for landscape and portrait.

## Run

- **Offline:** open `Olm-3D-Offline.html` in a current Chrome, Edge, Firefox or Safari browser. No install, account or asset download is required. All assets and code are embedded in that file. A browser with WebGL and `DecompressionStream` support is required.
- **Desktop server:** double-click `Start-Desktop.cmd`, then visit `http://localhost:3103`. Keep the terminal window open.
- **Phone:** double-click `Start-Phone.cmd`. Open the printed LAN address on a phone connected to the same Wi-Fi. Keep the terminal window open. If Windows prompts for network access, allow your private home network. The trainer server exposes only its own app files. Stop the other desktop trainer server first if port 3103 is in use.
- **Other computers:** install Node.js, then run `node server.mjs` or `node server.mjs --lan`. The launchers also recognise this computer's bundled Node runtime.

## Movement and tile revision

The cyan outline is the server/true tile. The white outline is the destination; amber outlines reproduce the ten published Olm practice markers in region 12889. The floor grid is aligned to the same coordinates used for clicks and movement. All indicators can be toggled under Practice settings, including an optional route line. **+1 tick** pauses and advances the simulation once, leaving the true tile ahead of the frozen character pose for inspection.

The west interaction edge is now x=28, matching the cache object footprints and marker coordinates. The old x=27 floor and west claw reach were one tile wrong. The playable floor includes the clear end rows and excludes solid corner objects. Melee requires edge adjacency, not diagonal corner contact. Minimap tile centres and clicks use a shared, reversible transform.

Desktop actions register on mouse-down, and movement takes effect on the next 600 ms tick. Running consumes two path steps; its final single step retains running speed. Ground clicks use a breadth-first route; attacking pursues the nearest hand edge and can move and attack in the same tick. The renderer follows both run steps and preserves animation phase through gear switches. Render frames no longer discard elapsed simulation time. Switching away from the demo restores normal speed; hiding the browser tab pauses the encounter.

Floor meshes are batched and repeated room objects are instanced. Ground picking intersects the floor plane instead of raycasting hundreds of tile meshes.

## Controls

The default **Game view** uses a quieter arena, claw/head health bars, and a
special-attack cue. **Show coaching** restores tick counters, cycle information,
and the tile legend. The actual true tile, destination and practice markers
remain independently configurable. The camera starts closer and edges use
antialiasing; inventory and prayer controls remain on the right on desktop.

In **Practice settings → Practise a special**, select one of 14 mechanics and
start an isolated drill. It uses unlimited HP and suspends normal boss attacks.
**Retry special** repeats it; Reset or a change of focus restores your previous
encounter options. Prayer spheres still require the correct protection prayer.
For flame walls, select the water spell, click a burning floor tile, then walk
through that single gap. Other flame segments remain active.

Click a claw to keep attacking it. Click the floor to move and cancel attacking. Click inventory items individually to equip them or drink supplies. Switching gear keeps the current attack cooldown. Running covers up to two tiles per game tick, walking one. Ground pathing respects the floor and blocked diagonal corners.

F4 opens inventory, F5 equipment, F6 prayers, F7 spells. Right-click for an action menu. Middle-drag or arrow keys rotate the camera; scroll zooms. On phones, tap to act, drag with two fingers to rotate, and pinch to zoom. The phase selector restarts any of the three hand phases or the ranged head. Practice settings include unlimited hitpoints and the timing overlay.

## Slow motion and head turns

Click **Show head turns** to run a half-speed demonstration. The player walks through the mage, centre and melee sectors while Olm turns and fires. Choose **¼ · Slow motion** for an even slower view. Speed also controls the decoded animation frames, projectile travel and movement interpolation. Pause freezes the current frame and resumes from the same point. Playback speed is also available in Practice settings on small screens.

Normal and final-phase turning clips play once, then settle into the matching idle pose. The right/left model mapping accounts for the active room wall; attacks use the same facing direction, and projectiles originate from the animated mouth. Ground movement follows each tile in the tick, including corners, rather than cutting straight between the endpoints.

Show head turns illustrates tracking alone. Select a solo focus and use Watch method for a complete method demonstration.

## References checked for this revision

- [Synq, head turning (1:51:38)](https://www.youtube.com/watch?v=klhBxOH8reQ&t=6698s): facing-dependent, overlapping sight regions and four-tick head actions. The chapter was inspected visually; captions were read for the mechanics and pathing chapters.
- [Synq, attack cycle (2:09:48)](https://www.youtube.com/watch?v=klhBxOH8reQ&t=7788s): basic → empty → basic → special, skipped basics carrying into the following event, and specials continuing through turns.
- [Synq, pathing (2:14:50)](https://www.youtube.com/watch?v=klhBxOH8reQ&t=8090s): one/two tiles per tick, same-tick attack dragging, and running over intermediate acid tiles.
- [RuneMarkers / We Do Raids marker set](https://runemarkers.net/olm): the ten local tile coordinates, including x=28 and x=37 at the active walls.
- Local cache NPC definitions 7550–7555 confirm five-tile NPC sizes; object definitions and placements 29882/29885/29888 supply the wall footprints.

Tests cover the seven/eight-tile four-tick running examples, two-tile attack dragging, collision, minimap coordinate round trips, redirection, intermediate acid tiles, clock catch-up, and skipped attack/special slots. They are regression checks against the stated rules, not a complete recorded-fight replay.

## Special effects and rendering

Specials retain their render objects across ticks instead of rebuilding their
meshes and materials every 600 ms. Lightning interpolates along its lane using
the same pause/slow-motion clock as the player. Cached flame, crystal, lightning,
burn and explosion models are accompanied by growing crystal shadows, impact
effects, pulsing portals, healing-pool rings, acid bubbles, larger prayer
spheres, a healing-hand indicator, and player burn/trail effects. Flame models
are enlarged for readability. Portal/pool rings and several cues are procedural
approximations, not newly extracted OSRS graphics.

Paused poses are reused, and player vertex interpolation avoids allocating an
array for every vertex on every frame. Tests cover persistent effect lifetime,
interpolation, warning/impact timing, all special drills, and targeted water
escape. Desktop and phone-sized browser checks exercise the actual controls.

## Player animation and solo-method revision

The player now uses one assembled cache rig. The camera follows the animated player with smoothing, as in the client; turn this off in settings for a room overview. On narrow screens practice buttons sit above chat and tile outlines thicken to remain visible. Weapons, armour and the body share joint pivots, instead of animating each equipment model independently. The lance uses its own attack (8288); the previous build mistakenly used a rapier attack (8145). Weapon idle/walk/run clips and the cache's movement masks are included. Actions start on their attack tick, can blend with locomotion, play once for their actual duration, and keep their timeline when equipment changes. Scythe swings show three hit splats. Supplies and water spells also animate.

**Clean setup** positions the selected method at a known entry. **Watch method** performs three cycles using ordinary attack/movement inputs, at half speed, with guaranteed hits, unlimited HP and basic attacks. Click the arena or **Take control** to continue manually; the saved combat settings are restored. **Force next splash** applies to the next magic attack. Practice settings also expose guaranteed accuracy and basic-only combat independently. The cycle feedback checks attack spacing, the offset from Olm's events, turn slots and special skips; counting a lucky hit ratio alone is insufficient.

The implemented routes are 3:0 mage (12 ticks), 4:1 lance (16 ticks), 3:1 melee (12 ticks), 1:0 melee (8 ticks), and 3:1 scythe (16 ticks, five/five/six between swings). Routes mirror on the east wall. The 3:0 mage sequence attacks from canonical y=48,43,46 after starting on y=50. The 4:1 sequence attacks on ticks 2,6,10,14 relative to the first head event: basic two and the special turn; basic one is tanked; empty supplies the fourth hit.

Olm scans before the player's movement on that tick. Positive hand damage remains a head-turn cue for four ticks; zeros do not refresh it. Projectiles resolve damage after travel, and a splash can select centre instead of the mage side. Continuing the same rhythm then recovers the next cycle. A one-tick-late run leaves the player on y=44 at the next scan, which fails the safe turn.

Full encounters now include 600-HP hands, early-phase clenching while the mage hand lives, delayed projectiles, prayer spheres, moving lightning with a short stun/prayer lock, an eight-tick portal with distance damage, crystal bombs, falling crystals, acid pools/trails, six burn pulses, flame walls and water escape, healing hands, phase-three revival, and final-phase healing pools checked on their deadline. Phase powers are selected without repeating the first power in phase two; phases three/four combine them. Transitions between hand phases have falling crystals and decoded retreat/spawn/death animations. Killing both final hands starts the ranged head directly, without another inter-phase wait. Nine additional Olm effect models were extracted for projectiles, crystals, fire and lightning.

## Accuracy and evidence

This is a much more complete practice simulation, **not a byte-for-byte recreation of the live server**. The cache verifies asset geometry, animation sequences and frame durations; it does not contain the server's combat code. Forty-one regression tests cover the movement, rig poses, attack cycles, method routes, splash/late-click recovery, and encounter mechanics. The rig exporter independently compared all vertices in 24 assembled poses with the cache decoder; checked-in reference samples preserve that check without needing the cache at startup.

The method tests reproduce rules and routes transcribed from the guide, not captured live-game network traces. Their passing establishes internal consistency with those examples. The centre/sided vision boundaries and NPC processing order have not been exhaustively verified at every tile and edge case. The no-damage scan fallback uses a 50/50 choice when a recent attack splashed; its exact live-game probability is unverified. Player accuracy/max hits, gear bonuses, protection reduction, orb/power selection frequencies, several hazard durations/damage values and transition duration remain explicit training approximations. Water targeting now opens an individual wall segment; rune consumption, spell-level checks and cast-range validation remain simplified. Rendering still differs in lighting, face alpha transforms, particles and the inventory rasteriser. These limits matter when using the trainer to predict live-game damage or rare recovery cases.

Additional video references used in this revision:
- [Mage route and same-tick drag, 2:19:29](https://www.youtube.com/watch?v=klhBxOH8reQ&t=8369s).
- [Splash recovery, 2:23:55](https://www.youtube.com/watch?v=klhBxOH8reQ&t=8635s).
- [3:1 entry and attack offset, 2:40:17](https://www.youtube.com/watch?v=klhBxOH8reQ&t=9617s).
- [4:1 event sequence, 2:48:05](https://www.youtube.com/watch?v=klhBxOH8reQ&t=10085s).
- [Phase attacks, spheres and specials, 1:55:07–2:08:44](https://www.youtube.com/watch?v=klhBxOH8reQ&t=6907s).

The frontend remains separate from the staged Realists Discord integration. No bot or live server was changed.

## Development

Run `npm ci`, `npm test`, and `npm run build`. `build.mjs` bundles Three.js locally and produces both `public/app.js` and the self-contained HTML. `server.mjs` has no external runtime dependencies. Tests verify movement, cooldowns, switching, method routes, recovery, rig poses, supplies, transitions, revival, hazards and asset integrity. They do not establish exact live-server equivalence.

The extraction tools read only game cache archives. They do not use account credentials or preferences. They require the sibling `olm-asset-tools` checkout with its compatibility fixes and a populated local cache. Extracted assets are already included, so extraction is not part of ordinary startup.

## Asset and library credits

RuneScape models, animations, room geometry and sprites © Jagex. This is a fan-made local training prototype, unaffiliated with Jagex or RuneLite. Assets were decoded using [osrscachereader](https://github.com/Dezinater/osrscachereader), BSD-2-Clause. The browser renderer uses [Three.js](https://github.com/mrdoob/three.js), MIT. Runtime app code is independently written; the OSRS SDK checkout was examined as a reference and is not included in this app's bundle. See `THIRD-PARTY-NOTICES.txt` for dependency notices.

