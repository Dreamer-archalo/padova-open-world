# Unified Mandria and city build — 21 September 2026

The user authorized bringing the current Villa della Mandria and recent gameplay updates into the permanent public game, including the road-continuity work from PR52.

## Included sources

- Production main: `68cc92e1f69227a89fba1e9e3244b053e7365d84`, already containing airport/air hunt PR50, rooftop Monoblocco PR48, taxi, both Tangenziale races and online modules.
- Mandria PR51: `fbb138ab96b62beae4b6f27b2c7b1ed6b77e6538` (v10). Includes the relocated villa/respawn, restored Parco Treves, categorized hangar with aircraft thumbnails and colors, military fleet, physical estate scenery, scope with vertical aiming, workers/tasks, supplier deliveries, helicopter and VTOL, entry/roof stairs, perimeter patrols, arena and roaming horses, farm/animal routines, curved public-road bypass.
- Road continuity PR52: continuous ground/road shoulders, pedestrian layers and bridge supports, six validated earth accesses, momentum-based crest jumps.
- Older experimental geometry and superseded airport/taxi branches are not blindly merged over this base.

## Verification and limits

Initial v6 integration `dbba9ab` passed all ten jobs (Node integration plus nine actual Chromium/software-WebGL tests): run 35581219998. The subsequently synchronized v10 integration `af3b965` is checked by run 35647505624 with two additional browser suites for solid scenery and final estate features. All twelve jobs passed. PR53 was merged at `63150467bd4bf474c02325bcc62dc2fdd244471b`. The production gate then caught a first-frame arena horse visibility race: its legacy Hyper slot could leave the second horse hidden until the following update. Main fix `fe24a1f267c4dc42a532465d3db2e96d18716860` initializes both the arena slot and visibility immediately. All twelve integrated jobs passed again on this fixed main in run 35648159281.

The publication workflow now requires the unified Node/WebGL checks before deployment. No existing elevation assertions are removed or loosened.

The full elevation audit on the v6 unified build still failed with 6,505 bad shoulder samples out of 527,516, zero road-grade violations over 424,314 segments and zero bridge/water violations over 1,534 samples. The shoulder count matches the previous PR52 result; it is a sample count, not a count of roads. These unresolved citywide defects are not certified fixed by integrating the villa. Earlier documented overlap and cargo-ramp limitations also remain outside the completed focused checks. Multiplayer preservation tests are simulated, not proof from two independent devices. Software-WebGL tests do not establish FPS on the user's hardware.

PR53: https://github.com/Dreamer-archalo/padova-open-world/pull/53
Permanent public URL after successful publication: https://dreamer-archalo.github.io/padova-open-world/

## Publication confirmed

Production workflow 35648159281 succeeded on fixed main fe24a1f. HTTP 200 and byte-for-byte agreement with the published build were verified for index.html, villa-mandria-v10-estate-layout.js, terrain.js and phase2-runtime.js at the permanent public URL.
