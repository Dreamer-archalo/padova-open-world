# Road, sidewalk and pedestrian continuity audit — 18 September 2026

## Current release status

PR #49 remains in draft on `fix/continuous-road-support-sep18`; `main` and the public website have NOT been updated. The terrain audit is failing correctly, so this is not a complete GTA-like road smoothing result. GitHub Actions runs whole-map calculations and synthetic collision regressions, not an actual WebGL driving/walking session. Preserve the blocker and original acceptance thresholds.

## Implemented changes

- Bridge slabs follow their own road height; supporting piers touch the rendered ground; steep footbridges use shorter collider spans without obstructing lower traffic.
- Pedestrian and sidewalk surfaces preserve distinct vertical road layers and clip only same-level intersections. Actor-contact height accounts for the actor's elevation and actual sidewalk width.
- Modern terrain uses a single continuously blended ground function, not alternating centreline, prototype and nearest-shoulder height ownership; legacy map unchanged. Marked flyovers/tunnels do not lift terrain. Pedestrian paths do not lift a nearby carriageway at another elevation; DEM height additionally favours grounded road surfaces when multiple vehicle carriageways overlap in 2D.
- Asphalt radial closing triangles are generated only at real junctions, never along straight segment seams, and cannot exceed the local road-grade envelope. Added focused regression tests for all these behaviours.

## Verified whole-map metrics (CI run 35330211763)

- **124,499** sampled pedestrian segments: 0 contact errors at original tolerances; maximum difference 0.080 m.
- **418,603** sampled sidewalk points: 0 contact errors at original tolerances; maximum difference 0.436 m.
- **5** residual wrong-ground-owner samples at different-height overlapping corridors, versus 239 before these edits. Examples: Cavalcavia Borgomagno twice, Cavalcavia Dalmazia, Via Stazione, Prato della Valle. They are not suppressed.
- **12,280 / 527,194** sampled ordinary-road shoulders fail; 7,358 gaps exceed 0.55 m near the road, 7,395 transverse transitions exceed 1.35 m (groups overlap). Initial work baseline was 24,671, but an intermediate branch with the older nearest-road logic achieved 10,670; this latest approach fixes ownership better but is WORSE on total shoulder errors than that intermediate branch and must not be called a finished correction.
- Peak near-road gap 12.446 m, transverse change 9.713 m. Some samples involve embankments or real vertical roads; others are errors, requiring classification.
- 424,192 road segments sampled for longitudinal grade: 0 over their road-type limit. 1,530 bridge/water samples and all 8 sampled flat-zone cores pass.
- Structural audit: 9,342 bridge slab boxes, 785 main piers, 886 underpass supports, 11,327 parapets, 0 errors under structural tests; maximum discrepancy between slab and its own road 0.309 m.
- Synthetic tests, startup, Portello, micromobility, taxi, two Tangenziale races, online racing pass. Not equivalent to visual browser or full driving validation.

## Specific reproducible sources of remaining failures

The elevation diagnostic prints road deck, near/far actual terrain and the neighbouring road profile. Significant examples:

- Cavalcavia Stati Uniti over Viale della Regione Veneto around (6209.8, 2011.9): deck ~14.87 m, other road ~10.19 m and transverse ground transition ~3.83 m. Never flatten both levels together.
- Prato della Valle around (-130.4, 971.5): specially authored Prato terrain ~14.00 m vs road deck ~12.42 m. The Prato ring/canal and road geometry need a compatible local transition, not removal of the whole plateau.
- Riviera San Benedetto around (-681.7, -427.4): near road ~20.44 m, far riverbank ~13.17 m. Determine whether a retaining wall/bank is legitimate before judging a transverse drop traversable.
- Via Paolotti/service overlap around (765.6, -246.5), Via Giovanni Gradenigo, other riverside streets, tracks and service roads recur.

The 12,280 count is *samples*, not independently verified geographical defects. A bridge or riverbank deliberately separated by a retaining face needs a separate structural classification and check; genuinely traversable shoulders must be smooth. Hiding violations by raising limits, turning CI green despite errors, or flattening overpasses is unacceptable.

## Reproduction and remaining acceptance

`node --max-old-space-size=3072 verify-walkability.mjs` prints `WALKABILITY_AUDIT`; its diagnostic CI step uses `continue-on-error` while 5 conflicts remain. `npm run test:geometry-integrity` prints `ELEVATION_DIAGNOSTIC` and fails the release with 12,280 shoulder violations. [Latest measured failing run](https://github.com/Dreamer-archalo/padova-open-world/actions/runs/35330211763).

1. Classify each stacked road and adjoining riverside ground as same-level connected roadway, physically separated bridge, or retained bank; add necessary visible decks/retaining geometry and reconcile colliders with paint and ground accordingly.
2. Correct Prato's special terrain-to-road boundary and real accessible sidewalk/road transitions, without shifting the water, bridge or underpass to another level.
3. Bring both road and pedestrian suites green at existing limits, with legitimate structural separation tested explicitly rather than mislabelled a traversable shoulder.
4. Drive car, motorcycle and walking routes through named locations in an actual rendered WebGL browser, inspect from overhead and below at bridges, and only then merge `main` and check the published website.

Issues are disabled on this GitHub repo; [PR #49](https://github.com/Dreamer-archalo/padova-open-world/pull/49) and this document retain the blocking work.
