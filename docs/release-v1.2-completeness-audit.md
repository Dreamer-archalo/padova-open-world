# Padova After Hours 1.2 — inventory and evidence audit (16 September 2026)

## What counts as shipped
A user request, a PR description, a commit in `main`, a successful deployment, and a real WebGL/device test are five different milestones. This inventory records them separately. The only production source of truth is `Dreamer-archalo/padova-open-world`, branch `main`; release source at this audit: `c4a29e33e5bdbbe77113ad2d8ce904d4d0f71b34`, `dist/version.json` = `1.2.0`. Do not rename the version to 2.1, create another site, or merge divergent work branches blindly.

## Code in canonical main (NOT an assertion of visual quality)

| Period | Sources | Merged or committed capabilities |
| --- | --- | --- |
| 6–11 Sep, old upstream | `scandolo/padova-open-world` PR #1, #2, #3, #8, #7; Dreamer PR #3 | Urban identity, motorcycles/trucks, elevation and water recovery, bridges/roads, tram/traffic, newer vehicles, historical Padova 1500 later removed from current modern game. Dreamer PR #3 reconciled the modern-game changes. |
| 9–11 Sep | Dreamer PR #1–#3 | Initial airport runway/accesses/hangars/parking, airplane/helicopter/tank interactions, parachute and €1,000 armored-van mission; five characters and Villa Treves spawn, hyper-performance/fullscreen. Original airport PR expressly left a real WebGL drive-through unverified. |
| 12–14 Sep | Dreamer PR #5–#6 | Surface clipping and road improvements, Portello/Velox, taxi, updated traffic and police, four motorcycle time-attacks, urban life and services, roofs, two-part trams, 18 urban events, city-visit mode, partial local elevation polish. The PR #6 list of *structurally outstanding* features below must not be presented as completed. |
| 14–15 Sep | Dreamer PR #8–#12, #14–#30 | Loader recovery, GPS/taxi updates, tangenziale race 1 and race 2, collision/level and historic-plaza adjustments, Villa spawn fixes, AI/traffic changes and multiple race fixes. PR #28 was merged, but the runtime monkey-patch modules `road-reality-pass` and `road-reality-audit` were later explicitly disabled because they introduced height discontinuities; see `dist/phase2-runtime.js`. |
| 15–16 Sep | Direct `main` commits before PR #32 | Five-player online mode/MQTT, coordinated race lobby, human racers and bots, race-2 lobby/grid fixes; hospital rooftop helipad and motorcycle easter egg; taxi and race refinements. Automated regression coverage is not equivalent to actual two-device network QA. |
| 16 Sep | Dreamer PR #32 | Version 1.2 manifest and canonical source/deploy configuration; GitHub Pages workflow succeeded for the release commit. The PR expressly does not claim to have updated the existing Netlify production site. |

## Missing, unfinished or not independently confirmed

### Airport — blocking for improved road access
- PR [#33](https://github.com/Dreamer-archalo/padova-open-world/pull/33) is **draft, not merged**. Public access road was bent through the intended 26 m fence opening; private aircraft service roads remain separate. The entry still connects to a disconnected component containing Via Sorio. City navigation/Taxi instead choose Cavalcavia Brusegana around 25.85 m from the gate. Never create an unverified vertical junction with the flyover or route cars through runway/taxiways.
- Gate → genuine city-network junction → airport parking → exit in both directions is not yet demonstrated. Verify height, gradient, water, collisions, fence crossing, GPS and Taxi pickup/drop-off. A runway/hangar presence test alone cannot prove road connectivity.
- PR #33 has independent `verify-airport-road-network.mjs`, `verify-world-3d-contact.mjs`, and `npm run test:airport` steps so that one failure cannot silently skip the remaining diagnostics. Check their exact GitHub Actions results before claiming success.

### Map geometry — structural work not safely merged
- `work/world-geometry-overhaul-latest` diverged from release `main` by **25 ahead/73 behind** when checked. `fix/geometry-contact-audit-20260916` diverged by **9 ahead/26 behind**. Neither is a safe wholesale merge. Reapply independent fixes against current main and test each.
- Maintain a single vertical authority for terrain/roads/sidewalks/buildings/vehicle support, including streaming worker-generated geometry. Compare actual render triangles with physics and collision/raycast, inspect seams across chunks and real multi-level bridges, water and tram tracks. No lifted sidewalks, submerged motorcycles, floating shadows, grass covering asphalt or layered buildings.
- Geographic regression points: centro storico/piazze, Bassanello, tangenziale exits toward Albignasego, Voltabarozzo tram/bridge, Villa Treves and airport. The full elevation audit has a **known Bassanello discrepancy** and is configured as nonblocking in release smoke tests; do not report all geometry checks as green.
- A diagnostic script checking generated triangles is **not a rendered 3D browser test**. Manual WebGL and FPS checks remain outstanding.

### Older requested features, explicitly open in PR #6 or release notes
- New SW/Mandria villa with garage, relocation of HOME/respawn and restoration of Parco Treves as public park: **not part of the 1.2 release** (a divergent geometry branch includes an experimental relocation script, not proof of completion).
- Security allies/mercenaries and dedicated behaviour: **not shipped**. Existing wanted-level military tanks and police are separate systems, not mercenaries.
- Drivable boats/navigation; selected building interiors; UFO; additional animated airport workers, air traffic and increased military/city traffic at the airport: **not released as complete features**.
- Rare military patrols outside airport; larger Riviera/Venetian-walls/vegetation pass; additional short/random missions (including the arcade drug-transport request): **outstanding**.
- Motorcycle-race approach/start from any vehicle is in PR [#13](https://github.com/Dreamer-archalo/padova-open-world/pull/13), still open draft. Historic monument/church fixes have overlapping replacement in merged PR #24; extract only still-missing bike start changes, then test, rather than merging old PR #13 over new main.
- Original requests for realistic locality-specific architecture and complete map-level overlapping-geometry cleanup require real visual validation even when a narrower patch was committed.

### Online
The code for shared lobbies, bot substitution, synchronized start and two races is in `main`; the requested two-device test has not been established solely by green static/controller tests. Verify two actual clients in the same map, distinct character occupancy, waiting/skip logic, join messages, start button/modal cleanup, seven-car grid, finish/results and reconnect/disconnect behaviour.

## Actual hosting state at audit time
- GitHub Pages deployment workflow for `main` SHA `c4a29e33e5bdbbe77113ad2d8ce904d4d0f71b34`: **success**. Intended mirror `https://dreamer-archalo.github.io/padova-open-world/`.
- Existing Netlify project `padova-open-world`, site ID `5dffd0e1-0188-4bb1-a165-4d1fc3242c0c`: last inspected production deploy `commit_ref=147d5d9975d78f5ce9b2285d1999c0a81ebf468c` (merge PR #15), **not the 1.2 release commit**. Its `ready` status means an old build works, not that recent changes are published.
- Retain existing project/domain. Account owner needs to link the canonical GitHub repository to this existing Netlify project, `main`, publish `dist`. Only when live Netlify `commit_ref` matches the chosen `main` SHA and both `/version.json` report 1.2.0 can both sites be described as synchronized. Follow `docs/release-v1.2.md`.

## Acceptance gate for 1.2
1. Document precise PR/commit coverage for every feature; distinguish code present from browser-verified. Do not imply that unmerged Work/experimental branches were released.
2. Resolve and test airport public-road graph and Taxi routing without imaginary connections. Keep #33 draft while its specific tests are red.
3. Port geometry fixes in isolated, up-to-date branches, preserving special layer semantics; test actual world triangles, support physics, collisions and seams. Resolve Bassanello, then re-enable a strict full elevation gate.
4. Perform actual browser/WebGL and two-device multiplayer smoke checks (start, camera, vehicles, airport, Taxi, both races, multiplayer, mobile controls, FPS).
5. Synchronize **the existing** Netlify project and GitHub Pages to the exact same release SHA. Verify URLs and release manifest rather than only successful deployment statuses.
