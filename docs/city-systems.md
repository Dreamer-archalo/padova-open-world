# Padova city systems — scope, evidence and remaining work

This branch extends the merged mobility/terrain work in PR #2. It retains the static Three.js application, mapped footprints, fixed 60 Hz simulation, spatial indices, chunk streaming, vehicle types, missions, police, water recovery and optional GLB replacement. No Google imagery, branded logos or new runtime dependencies are included.

**Draft status:** controller/simulation and geometry checks pass, but visual gameplay acceptance is incomplete. Both the baseline and this branch fail to create a WebGL context in the available cloud Chrome (`GL_VENDOR=Disabled`, `GL_RENDERER=Disabled`, `BindToCurrentSequence failed`). The browser reached the actual game and displayed its WebGL error. This is not a claim that the game rendered successfully, that touch was verified on a phone, or that FPS was measured.

## Implemented systems

- `road-surfaces.js` builds sampled road profiles, retaining shared source vertices while keeping crossings without a shared vertex separate. Explicit bridges, layers, tunnels and inferred open-water crossings affect elevation. Approach grades propagate across way boundaries. Roads are limited to approximately 8.5%; stairs have a separate steepness allowance. Crossings receive bounded clearance adjustments; contradictory geometry remains in the audit instead of growing without limit. Construction-only adjacency is released after solving.
- `terrain.js` selects the road surface nearest an actor's previous height, allowing travel below an upper deck. Underground waterways do not render as open channels. Small ponds use local shallow water levels instead of the regional river level. The Erbe fountain is separated from river carving. Existing DEM and water recovery remain in use.
- `road-structures.js` shares deck, parapet and pier boxes between rendering and height-aware collision. Approaches and nearby roads exclude inappropriate parapets/piers. Road join caps cover wedges between segment strips. Structures are merged per chunk.
- Prato retains its elliptical island and canal mask, with four distinct stone crossings, balustrade collisions, island trees, central basin and two statue rings. This is a stylised interpretation, not a measured reconstruction of every statue or surrounding building.
- `camera-rig.js` handles manual orbit on foot and in vehicles. Driving preserves manual view for 1.25 seconds then follows the vehicle smoothly by the shortest angular path. Held lateral walking uses a latched movement basis so automatic camera follow does not curve the walking direction continuously. Pointer cancel/pause release manual orbit.
- `tram.js` builds paths from connected mapped tram rails. Two-element, non-drivable vehicles follow rail surface heights, pause at mapped stops, reverse at terminals and push actors sideways without obstacle-based stopping. Seven bounded vehicles use two extracted paths of approximately 9.8 km and 5.35 km. Connected rail paths are not a reconstruction of official service schedules, line assignments or every direction-specific branch.
- `traffic.js` combines major graph junctions with mapped signal locations, deterministic two-axis signal cycles, approach braking, following distance, speed limits by road class and lane offsets. Graph navigation respects forward/reverse one-way tags. NPC cars check full footprints and road corridor bounds before advancing. This is lightweight arcade traffic, not a full junction reservation or lane-change solver.
- `districts.js` indexes OSM land use and applies historic/urban/residential/industrial/green/countryside/motorway/wild profiles to colour, population and vehicle probabilities. A bounded, deliberately overgrown brownfield fringe is an artistic addition. Vehicle models are reused from a template cache. Pedestrians spawn/despawn near the player, avoid motorways, use sidewalk offsets, and receive district clothing colours. No new cyclist controller is included.
- Vegetation is generated deterministically per chunk, with different tree/shrub density by district and additional canal-side planting. Exclusions cover road and rail widths, footprints, bridges, water and Prato's authored layout. Trunks and foliage are instanced; distant chunks unload. Vegetation remains decorative rather than a new collision forest.
- `city-details.js` adds 11 much denser facade sections along the mapped Via dei Tadi, with arch reliefs, columns, window frames, shutters, doors, storefront panels, cornices, gutters and roof-edge tiles. Visibility is distance-limited. These are authored interpretations fitted to existing footprints, not surveyed facade sequences. The porticoes are relief geometry; interiors and continuous walkable arcades are not implemented.
- The modular POI additions currently cover Palazzo Moroni, Porta Savonarola and the rectangular two-basin Erbe fountain. Existing Santo, Ragione, Signori clock tower, Specola and other earlier landmarks remain. **Palazzo del Bo and a new station model are not completed.** The Bo is explicitly pending in the registry; its name could not be reliably matched to a footprint in the bundled extract, and a supplemental retrieval did not complete. Do not present the registry placeholder as a finished model.
- Cinquecento Turbo is a small, unbranded city car available with **V**. **Shift** retains ordinary boost. **Tab** activates its special turbo; approximately 350 km/h triggers visible particles, a disabled/hidden vehicle for 1.8 seconds and recovery on a nearby clear road. A touch turbo button appears for this vehicle. Other cars retain their handling.
- Speed-dependent collision responses add impulse, rotation and severe-impact destruction. The damage model remains arcade-style; no deformable bodywork or rigid-body physics engine is introduced.

## Global map audit

Run `npm run audit:map`; the machine-readable result is `docs/map-audit.json`. Geographic examples are summaries of the same global scan, not special-case repair lists.

The scan covers **34,639 road/rail ways and 572,955 samples**, including 1,203 layered/tunnel ways and 122 inferred bridge ways. The accepted run reports zero unsupported sampled road/water crossings, zero low sampled water decks, zero excessive road grades and zero height discontinuities at shared source vertices. Maximum motor-road sampled grade is approximately **8.511%**, including floating-point/projection tolerance.

**Remaining findings:** 19 insufficient-clearance candidates and 10 endpoints in water require source/topology review. The endpoints include footpaths, stairs, tracks and extract edges; the residential-road endpoint is outside the playable boundary. The audit deliberately retains these findings. Clearance adjustments use design estimates, not surveyed deck elevations. Very short or contradictory layered connections, underground water tunnels, and multi-storey free flight are not solved by the height-field controller.

This audit checks sampled geometry, continuity, clearance and source-network endpoints. It does not prove every visual triangle is watertight, every junction is drivable in every vehicle, or that all source-map tagging is correct.

## Verification

`npm test` runs the actual game controller through a DOM/Three.js VM harness, then terrain, navigation and world-geometry checks. It covers existing walking/jump/mission/police/GLB behaviour, frame-rate independence, vehicle entry/exit, water fall/recovery for existing vehicle types, camera obstruction, touch-orbit controller math, delayed recentering, lateral walking basis, layered deck collision, one-way graph edges, red/green braking and following, mapped tram motion/impacts/terminal reversal, Shift/Tab, critical explosion and local respawn, detail geometry and vegetation exclusions. `verify-city.mjs` also invokes the whole-map audit.

The turbo scenario uses an automatically selected clear straight segment of the real map and the real `movePlayer` controller. The last pre-explosion speed was approximately **346.6 km/h**; the next critical tick triggered destruction, followed by recovery at the same clear road point. World checks build actual Three.js geometry and reject non-finite vertices. They also verify mapped POI routes and race length.

**Still required before marking the PR ready:** a WebGL-capable desktop and phone playthrough. Check touch drag while holding movement, turning/reversing/high-speed camera behaviour, Prato's four passages, Sacra Famiglia/Bassanello/south and other audited crossings, overhead/underpass selection, actual signal queues, tram impacts, vegetation clipping, Via dei Tadi facade placement, Erbe and turbo crash/respawn. Record device FPS, startup time and memory. None of these visual/device checks is marked passed by the Node suite.

## Data and references

`dist/data/city.json` is an ODbL supplement to the unchanged base footprint extract: 31,887 exact road-geometry matches, 9,104 compact metadata overrides, 725 waterway metadata rows, 100 tram ways, 123 stops, 288 signal points and 2,605 land-use polygons. The Overpass source reports **2026-05-06T03:25:00Z**; it must not be described as a September survey. Unmatched roads keep their original metadata. `prepare_city.py` records the base data SHA-256 and road count and reproduces the supplement from the raw response.

Reproduction query (POST as `data` to `https://overpass.kumi.systems/api/interpreter`, then run `python prepare_city.py response.json`):

```overpass
[out:json][timeout:180];
(
 way[highway](45.35,11.80,45.465,11.97);
 way[railway=tram](45.35,11.80,45.465,11.97);
 node[railway=tram_stop](45.35,11.80,45.465,11.97);
 node[highway=traffic_signals](45.35,11.80,45.465,11.97);
 way[landuse](45.35,11.80,45.465,11.97);
 way[natural=wood](45.35,11.80,45.465,11.97);
 way[waterway](45.35,11.80,45.465,11.97);
);out geom;
```

- [OpenStreetMap contributors, attribution and ODbL](https://www.openstreetmap.org/copyright).
- [OSM layer semantics](https://wiki.openstreetmap.org/wiki/Key:layer), [bridge](https://wiki.openstreetmap.org/wiki/Key:bridge), [tunnel](https://wiki.openstreetmap.org/wiki/Key:tunnel). Layers indicate relative ordering, not a fixed number of metres.
- [Official SIR1 description](https://www.trampadova.it/linea-sir-1/). Operational service facts are distinct from inferred paths through the rail extract.
- [Prato della Valle](https://www.comune.padova.it/luogo/prato-della-valle) and [four-bridge restoration](https://artbonus.gov.it/490-restauro-dei-quattro-ponti-di-prato-della-valle.html).
- [Erbe fountain restoration](https://artbonus.gov.it/restauro-della-fontanella-in-piazza-delle-erbe-padova.html): rectangular trachyte block, two taps and two basins, dating from the 1930s.
- [Palazzo Bo, University of Padova](https://www.unipd.it/palazzo-bo-teatro-anatomico), [Palazzo Moroni](https://www.comune.padova.it/luogo/palazzo-moroni).
- [Via dei Tadi 10–12, Ca' Foscari research record](https://iris.unive.it/handle/10278/3686624) and [Enoteca dei Tadi, address at no. 15](https://www.enotecadeitadi.it/). These establish local context, not exact dimensions or the appearance of every facade. No photographic textures were extracted from these sites or Street View.

The existing terrain attribution and approximation notes remain in `docs/mobility-terrain.md`. No hosting configuration, published site or existing PR is replaced by this branch.
