# Airport road-network repair — isolated development branch

Base: Padova After Hours 1.2 (`c4a29e33e5bdbbe77113ad2d8ce904d4d0f71b34`). No production publication until the assertions, pre-existing airport harness and an actual driving/taxi smoke test pass.

## Findings from the real city map

- The old `Ingresso aeroporto` connection started at a Via Sorio vertex ~43.24 m from the gate, was marked `access: private`, and crossed the authored perimeter on a diagonal.
- The edited public connection retains the OSM Via Sorio vertex, bends outside the fence through airport-local `(228,250)`, enters at the existing 26 m-wide opening at `(215,250)`, and reaches the current gate `(205,250)`. The access is now public; `Servizi aeroportuali`, the runway and taxiways remain private.
- This alone does **not** repair navigation. The Via Sorio road and the new gate approach still belong to a smaller, disconnected graph component. Main-city routing and Taxi reject disconnected segments and select the nearby `Cavalcavia Brusegana` (~25.85 m from the gate) instead. Marking the bridge as directly connected would invent a possibly impossible vertical junction.
- Candidate connected streets near the isolated Via Sorio geometry include the road labeled `Cavalcavia Brusegana` at a horizontal gap of ~12.71 m and Via Pioveghetto at a gap of ~75 m. Neither is an approved junction until road height, structural collision, water and actual road geometry have been checked. The source labels/bridge metadata alone do not establish that an at-grade connection exists.

## Release-blocking acceptance criteria

1. Attach the public gate road to a **genuine ground-level, drivable** city network connection, without a jump to the overpass or a shortcut through the airport fence. Verify vertical slope and collision along every connecting segment.
2. `verify-airport-road-network.mjs` passes, confirming one fence crossing, public entrance/private airside, graph connectivity and Taxi reaching the entrance rather than the flyover. The current strict test intentionally fails on unresolved connectivity.
3. Reconcile the old `tools/controller-harness.mjs` used by `npm run test:airport`: it references the removed `callTaxi` global and currently fails before the actual airport driving tests execute. This is a stale test harness, **not** evidence of a successful airport test.
4. Execute the full airport suite and visual in-browser drive: city → entrance → parking → exit; taxi pickup/drop-off; separated service roads/taxiways; runway; no ramps, submerged roads, blocked gate or wall clipping.
5. Merge only after green checks and manual verification; retain the 1.2 release snapshot unchanged. Do not claim a live airport update while this is an unmerged development branch.
