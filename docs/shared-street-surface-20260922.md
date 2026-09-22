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

These checks cover sampled geometry and the named driving routes. They do not establish device-specific frame rates or claim an exhaustive manual playthrough of every street.
