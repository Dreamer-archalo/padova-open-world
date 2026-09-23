# Continuous urban paving — 22 September 2026

Based on main 842c368 (release 1.2.1, Villa della Mandria v11). The Villa updates and their acceptance checks are preserved.

## Problem and change

Historic terrain patches moved ordinary road nodes after the shared graph had been solved, leaving tram tracks and bridge endpoints at different heights. Independent road profiles and the regional water plane then created steep approaches and deep artificial banks.

Modern ordinary streets, tram beds, pedestrian routes, sidewalks and dry terrain now sample one continuous height field. Asphalt and sidewalk support share the same 7.5 cm decorative surface offset; rails stand only 6 mm above that surface. River bridges join the banks without an automatic extra storey. Real flyovers and tunnels retain separate profiles, constrained to join their approach nodes without steps. Bridge side faces follow the actual edge heights, and bridge sidewalks have visible paving over water.

The common surface limits directional grades to about 3.6%; independent structures retain the 5.5% graph limit. Shallow channels follow the local city level. The authored Prato island remains supported by its own continuous platform. Earth accesses to the tangenziale remain in place.

## Verification

- Actual runtime elevation modifiers are imported in their runtime order by the map-wide audit.
- With Villa v11 integrated: 424,345 road segments, no grade violations; shared overlapping profiles have zero height difference; no disconnected structure entrances.
- Full elevation audit: no shoulder or bridge/water violations. Exact counts and thresholds are recorded in `elevation-harmony-audit.json` and the verifier.
- Local software-WebGL check: Santo, Corvo, Milani, Tadi and Garibaldi/tram; controller crossing of Corvo, Milani and Tadi in both directions without collision or unintended launch, plus downward raycasts checking the visible road against contact height.
- Six earth accesses crossed in both directions with the actual vehicle controller.
- CI runs the new browser check together with all existing Villa, airport and game-system acceptance checks, including Villa v11. Geometry acceptance is mandatory before production deployment.

## Taxi performance regression — fixed in this branch, not yet published

The original headless test charged the first destination request with the one-time shared street-surface construction, taking 3,289 ms. The actual game renders its street meshes before enabling taxi interaction; the test now initializes that same surface separately and reports its real duration, instead of disguising it as a taxi lookup. `findTaxiRoad` additionally chooses the nearest connected drivable segment using its 2D geometry before evaluating the expensive physical surface height once for the winning segment, preserving the returned road identity, elevation and heading.

[Taxi main-thread safety run 35794833494](https://github.com/Dreamer-archalo/padova-open-world/actions/runs/35794833494) passed on PR #56 commit `a65ad77e3860e9a46f07f0825c5b5cdf4cfa1e3b`. Measured surface initialization **3,240 ms** (a separate startup/performance concern), subsequent ten taxi destinations **0–1 ms**, each using exactly **one** elevation sample, and three connected pickup plans **3, 16, 1 ms**. Regression tests also passed for fare confirmation, asynchronous transfer, 1,000 off-road no-global-scan attempts, taxi, races and online simulations. These measurements are from GitHub's Ubuntu runner and do not establish device-specific FPS or prove a manual real-browser taxi ride.

Do not merge the entire PR #56 until its *other* CI checks (especially airport integration and full city browser tests) are examined and resolved; fixing taxi alone does not certify airport or citywide gameplay.

These checks cover sampled geometry and the named driving routes. They do not establish device-specific frame rates or claim an exhaustive manual playthrough of every street.

## Final integration follow-up — 23 September

The shared field is now prepared by Terrain during world loading. Streaming workers receive the exact solved field and structure profiles instead of rebuilding them without the historic elevation patches; main/worker contact, ground and water heights are checked across the serialization boundary. The initial loader owns its nine chunks until completion, preventing a concurrent streaming core update from replacing finished detail geometry.

The airport's authored level surface constrains the common field before approach smoothing. The runway and hangar clearance checks pass. Additional controller checks exposed stationary tank steering changing direction on floating-point speed noise; that is now stable. Fleeing van routes also discard a redundant initial backtrack through their spawn point.

Airport mobility now uses the complete real map, including Mandria relocation, instead of an incomplete pre-relocation fixture. The enemy-projectile test uses the existing 36-point damage and 2.4-second cooldown to allow the required three hits; it still requires an actual destruction, respawn and reset.
