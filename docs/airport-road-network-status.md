# Airport road-network repair — independent diagnostics, no release merge

Base: Padova After Hours 1.2. PR #33 is a draft and must not reach public `main` until the graph, airport controllers and visual drive pass. Official airport visitor entrance: Via Sorio 89 (https://airportpadova.com/). Do not infer that names or close 2D road points form a valid junction.

## Public entrance: what is fixed and what is not
- Previous `Ingresso aeroporto` began at a Via Sorio vertex around 43.24 m from the gate, was marked `access: private` and cut diagonally across the fence.
- The provisional entrance is `access: yes`, bends outside the fence, crosses **only** the existing opening at airport-local `(215,250)`, then reaches gate `(205,250)`. Internal `Servizi aeroportuali`, runway and taxiways retain private access.
- **BLOCKED:** Via Sorio and the new public entrance are still in a disconnected component of `makeRoadGraph(...,{separateLevels:true})`. The actual connected-only Taxi nearest road is `Cavalcavia Brusegana`, 25.85 m from the gate. `cityGraphConnected=false`, `taxiUsesAirportEntrance=false`, and the graph route returned only two points (not a genuine trip).

## Height-aware candidate investigation, 16 September
A new independent diagnostic `node tools/diagnose-airport-junction.mjs` reports the exact nearest *connected* graph segments to the entry start, not just vertex distances. For the current dataset:
- Airport entry start: `(-2236.5,719.8)`, road sample height **10.949 m**.
- Nearest connected point: `(-2230.69,736.18)` on a segment named `Cavalcavia Brusegana`, horizontal gap **17.38 m**, sampled road height **10.47 m**, vertical difference **−0.48 m**. The extracted segment has `bridge=false`, `tunnel=false`, `layer=0`, **but its name references a flyover**. This metadata and close height do **not** prove a real drivable surface junction, a legal turn or absence of an interfering structure.
- Other connected candidates within 180 m bear the same road name; there is no proven Via Sorio surface-road junction in that search. No automatic snapping or invented overpass connector is authorized from these measurements alone.
- Next engineering requirement: inspect actual OSM street topology/segmentation around the airport entrance and the Via Sorio ↔ Cavalcavia ramps against a visual map. Only if a real ground-level connection exists, split the actual connected road segment at its verified junction, attach the access there, and resample grade, water and collision. Do not attach to an arbitrary nearest vertex or an elevated deck.

## Independent 3D check — PASSED in CI, scope clearly limited
`verify-world-3d-contact.mjs` ran successfully on the PR head. It inspected 34,604 road profiles and 424,193 segments, 733,310 samples with the same nearest road as physical support, 23,772 special-level samples, 1,605 airport/Villa grid samples (1,349 airport), and 2,796 generated ground triangles in three selected chunks. Results: **0 nonfinite heights, 0 road-support threshold failures, 0 visible ground–physics vertex threshold failures**; maximum mesh gaps observed were 0.050 m at entry, 0.050 m runway, 0.126 m villa. The checks do *not* prove every visible building, every sidewalk, worker streaming seam, bridge clearance or an actual WebGL rendered frame is correct. The known Bassanello elevation failure remains a separate release issue.

## Airport controller suite — first stale harness fixed; second mismatch exposed
- Updated `tools/controller-harness.mjs` so removed global `callTaxi` and other optional legacy taxi names do not abort independent airport tests at module initialization; they resolve to null if absent, not fake functionality.
- With that repair, `npm run test:airport` now reaches and **passes** runway/access/hangar collision checks, vehicle entry/exit, tank handling/cannon/collision, aircraft, parachute, rooftop and helicopter controller checks.
- The next assertion fails: `two military units at five stars`, observing `0 !== 2`. The current `ModernGameplay.paceWanted()` explicitly staggers wanted escalation and delays initial heavy-unit arrival (up to 9 s after reaching effective five stars), with the second tank only after the five-star timer exceeds 18 s. The old test starts from direct cannon progression, then expects two immediately after one `gp.update()`, which is incompatible with current staged logic. This is **not evidence that tanks are necessarily absent in gameplay**; update the test to drive the timed five-star state through the real update loop and independently prove both tanks eventually spawn/pursue. Do not delete the coverage or assert a false immediate spawn.
- The full suite remains **RED** until the timed test and remaining downstream checks complete.

## Merge criteria
1. City → gate and return connected through a verified drivable at-grade junction; Taxi drop-off on airport entrance rather than flyover. Exactly one fence opening, no vehicle route over runway/taxiways, public entrance/private airside preserved.
2. `verify-airport-road-network.mjs`, `verify-world-3d-contact.mjs`, `npm run test:airport`, Taxi/online/race release regressions all green without silencing real errors.
3. Manually drive and visually inspect city → gate → parking → exit, taxi and plane operations in a browser with real WebGL; verify collision, slope, frame consistency, renderer and worker streaming, plus no road ending in water.
4. Merge only after those checks. Keep release 1.2 and its existing Netlify project intact; a draft PR is not a live update.
