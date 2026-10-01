# Padova intelligent NPC R17 — manual playtest candidate

This branch retains the R16 regional taxi and the recovered 018cf45 changes
(wallet callback, one fare charge, exterior aircraft delivery/recovery, four
industrial dealerships and four distinct work vehicles). The later published
consolidation at 6102b3b is its remote parent. No merge into main is requested.

The existing `urban-life.js`, `traffic.js`, `phase3-city-systems.js` and controller
own the new simulation. No regional actors are removed or replaced. Three
existing people meshes are reserved as a reusable driver pool, inside the normal
quality population budget. Up to three ordinary traffic cars park, release a
visible driver at the kerb, let that person visit a nearby destination, return,
board and rejoin the same one-way road. Mission, fixed, dealership, aircraft,
bicycle and regional vehicles are excluded.

Pedestrians use finite states and bounded local sidewalk graphs (64 segments,
256 nodes/search expansions, 12 cached graphs). Crossings use signal-junction
stripe geometry, check the pedestrian axis and approaching traffic; cars query
nearby actors so they yield to people. Building collision, dry ground and vehicle
avoidance still apply. Social states cover greetings, conversations, bench
reservations, visible cafe entry/seating/exit, horn reactions and danger recovery.
Six existing bar locations become open cafe interiors with visible door/seat
positions; four collision-free benches are added beside them. There is no
street-to-indoor disappearing shortcut.

The spatial actor index refreshes every 250 ms. Full simulation runs within
125 m, medium simulation within 300 m updates at 2 Hz, actors beyond that suspend
and beyond 560 m recycle out of view. Existing pedestrian/traffic quality budgets
and distributed thinking intervals remain. No global pathfinding is added.

The first phase does not extend AI to the regional towns, add persistent daily
routines, implement rescue crews, or replace the existing tram passenger system.
Local routing may choose another reachable destination if a narrow or obstructed
sidewalk cannot connect the original one. Manual browser/device testing is still
required to assess crowd density and GPU frame rate.

## Verification

- `npm run test:padova-npc`: deterministic FSM, physical movement, driver full
  cycle, crossing waits, seat exclusivity/release, visible bar door entry/exit,
  danger recovery, bounded cache/pool and Padova-only gating; existing taxi-wallet,
  dealership and aircraft physics verifiers also execute.
- Requested regression suites: test, city-life, urban-life, street-life,
  performance, taxi, venice-performance, initial-world.
- Actual Chromium workflow: boot the complete game, confirm R17, visit an actual
  bar, move an existing actor through its entrance to a seat and back through
  the same door; save screenshot and JSON evidence.
- Public deployment verifier compares `build-r17.json` with the deployed commit
  and checks the entrypoint and served NPC module. Production root files are
  checked byte-for-byte while installing the isolated preview.

The old controller harness was updated to load the actual named module imports.
Legacy tests now check the current swimming/vehicle-water recovery, actual vehicle
footprints at road elevation, current quality fleet count, current Mandria name,
and ambient actor draw counts separately from fixed scene detail. The weather
exclusion regex uses word boundaries so `terrain` does not accidentally match
`rain`.

## Manual checks

1. Test the NPCs near Piazza dei Signori, Piazza delle Erbe and Portello. Wait
   around a minute to see a driver finish an errand and depart. Watch cafe doors,
   seat release, conversations, the player greeting and crossing waits.
2. Sound the horn with H, approach pedestrians slowly, then test an accident or
   explosion. They should avoid danger and resume routines without losing input.
3. Confirm a taxi with a large balance. The quoted amount should be debited once;
   try Dolo and Venice–Piazzale Roma as regional regression checks.
4. At the Villa hangar choose a helicopter and then a plane. Check roof clearance,
   departure and exterior foot recovery after a crash near the Villa.
5. Visit Via Uruguay, Nona Strada, Via Germania and Corso Stati Uniti dealerships.
   Check the electric van, flatbed truck, 4x4 pickup and refrigerated van.
6. Move from Padova to Venice, return, change graphics quality and repeat a bar
   visit. Compare startup, streaming and frame rate with the existing R16 preview.
