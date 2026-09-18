# Road, sidewalk and pedestrian continuity audit — 18 September 2026

## Release status

PR #49 is a draft and MUST NOT be merged/published as a complete repair yet. Tests cover the real full-map road data, but not actual WebGL driving or a two-device multiplayer session. CI correctly fails on unresolved terrain discontinuities; never suppress or silently raise thresholds to force green.

## Implemented in this branch

- Bridge deck collision follows its own carriageway, support columns terminate on rendered ground and steep footbridges use shorter structural elements.
- Pedestrian surfaces preserve paths passing below/above separate roads; a same-level intersection clips conflicting pavement instead.
- `Terrain.height` chooses the sampled surface at the actual actor/vehicle level, matching the 1.2-metre generated sidewalk footprint.
- Ground blends several ordinary road profiles continuously with a 36-metre embankment falloff, excluding explicitly tagged bridges/tunnels/nonzero layers; source DEM is retained outside the corridor.
- Circular asphalt junction fans are generated only at graph nodes with degree above two, not every few metres at road segment endpoints.

## Actual automated measurements

Baseline of this work: 247 pedestrian-contact errors and 2,005 sidewalk-contact errors in a 124,499-segment pedestrian sample and 418,603 sidewalk samples; shoulder geometry had 24,671 failures. After the current corrections and map-wide runs:

- **0 pedestrian contact mismatches**, maximum deviation 0.080 m.
- **0 sidewalk contact mismatches** under the defined 0.55 m test threshold; maximum deviation 0.436 m.
- **239 conflicting road/ground ownership samples** remain where a different road at another height occupies the same 2D footprint. These may be genuine overpasses or inconsistent road topology: each must be distinguished, never flattened indiscriminately.
- **10,670 / 527,194 sampled ordinary-road shoulders still fail**: 1,750 near-road height errors over 0.55 m, 9,014 transverse changes over 1.35 m; these categories overlap. Worst observed gap 10.85 m, transverse change 11.05 m.
- 424,192 road segments audited for grade (0 grades above their road-type limit); 1,530 bridge-water samples passed; all 8 authored level-patch flatness checks passed.
- Bridge structure scan: 9,342 deck boxes, approximately 680 main piers after ground harmonisation, 886 portal supports, 11,327 parapets; 0 issues under its structural consistency checks, maximum slab/own-road difference 0.309 m. A different ground field changes the number of supports, not the deck or underpass collision rules.
- Taxi, both Tangenziale races, online race regressions, initial world, Portello and micromobility CI steps pass. This does not establish real browser driving quality.

## Evidence and reproducibility

`node --max-old-space-size=3072 verify-walkability.mjs` prints `WALKABILITY_AUDIT`. It deliberately returns an error while 239 conflicting-height ownership samples remain, even though ordinary pedestrian and sidewalk contact checks are clean.

`npm run test:geometry-integrity` executes `verify-elevation-harmony.mjs` and prints `ELEVATION_DIAGNOSTIC` before its release-blocking assertion, including the top offending roads, near/far height samples, and their owning road. The latest available diagnostic run counted 10,670 failures after widening the distance falloff; no tolerances were altered. See [measured CI run](https://github.com/Dreamer-archalo/padova-open-world/actions/runs/35301745448).

The diagnostic identifies recurring examples: Cavalcavia Stati Uniti over Viale della Regione Veneto, Via Paolotti overlapping a service road, Via San Massimo beside a footway, Cavalcavia Borgomagno, Lungargine Angelo Donati, Via Sant'Urbano, Ponte dell'Unità d'Italia and multiple argini. This is a distributed topology/level ownership problem, not simply one isolated terrain vertex.

## Remaining acceptance conditions

1. Classify the overlapping level pairs by actual connection: at-grade joins must share a smooth longitudinal and transverse profile; true flyovers and stairways must retain their distinct elevations and have explicit retaining/deck geometry.
2. Repair the 10,670 remaining shoulder samples without destroying bank, river or bridge clearances; separately reconcile the 239 ownership cases. No automatic rule should turn a 6-metre bridge into an unintended terrain ramp.
3. Keep the geometry and walkability audits as release blockers once their measured failures are resolved, without changing limits merely to hide defects.
4. Test representative routes in actual WebGL with car, motorcycle and walking at named error coordinates, including overhead, underpass, bridge-water and loading transitions. Only then merge to `main` and verify the live site update.

GitHub Issues are disabled on the repository; this file and [PR #49](https://github.com/Dreamer-archalo/padova-open-world/pull/49) retain the outstanding findings.
