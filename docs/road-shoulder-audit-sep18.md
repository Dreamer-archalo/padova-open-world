# Road, sidewalk and pedestrian continuity audit — 18 September 2026

## Release status

PR #49 remains a draft. Its changes are committed on `fix/continuous-road-support-sep18`, not merged into `main` or released to the public site. GitHub Actions verifies code and full-map synthetic geometry; no actual WebGL driving/walking session has occurred. The full terrain audit remains an explicit CI release blocker. Do not suppress its failures or raise its thresholds to obtain green CI.

## Implemented

- Bridge decks remain on their own road, main piers meet generated ground, steep footbridges use short collision segments and lower roads stay independently traversable.
- Pedestrian paths crossing below or above another road retain their visual surface. At-grade junctions alone clip clashing sidewalks; the character's ground contact respects the selected vertical level and 1.2 m sidewalk footprint.
- The modern terrain uses one continuous ground field built from nearby ordinary road profiles; the old immediate road-centre snap and separate 7.5 m nearest-road override no longer take turns at neighbouring points. Legacy map terrain is unchanged.
- If a roadway is immediately nearby, pedestrian paths at different heights do not contribute to its supporting ground; isolated paths keep their own terrain support. Independently tagged bridges and tunnels never lift this ground field.
- Circular asphalt end caps occur only at genuine graph intersections. Their radial heights are now constrained to the local road's permitted grade to stop artificial triangular roof-like spikes.
- Slope limits, bridge clearance, southern flattened-area patches, online races and other previously tested systems remain in regression tests.

## Whole-map results verified in GitHub Actions

The original pedestrian audit identified 247 walking-height errors and 2,005 sidewalk-height errors. In the latest tested revision (run 35329675785):

- 124,499 pedestrian segment samples: **0 contact errors** at the existing threshold; maximum deviation 0.080 m.
- 418,603 sidewalk samples: **0 contact errors** at the existing 0.55 m threshold; maximum deviation 0.436 m.
- Wrong ground ownership at different-height overlapping corridors: **7 flagged samples** (239 before the current iteration). The seven are unresolved, including Cavalcavia Borgomagno, Via Ca' Rasi, Via Stazione and Prato della Valle.
- 527,194 road shoulder samples: **12,303 failures** (previous release-branch baseline 10,670; original baseline 24,671). Of the current 12,303, 7,343 near-road gaps exceed 0.55 m and 7,508 transverse differences exceed 1.35 m; these groups overlap. The continuous-field method substantially reduces wrong-level ownership but, at this stage, worsens the general shoulder count relative to 10,670: this tradeoff is NOT an acceptable complete repair.
- Maximum observed near-road gap 12.445 m and transverse difference 9.449 m; particularly problematic around raised or unmarked crossings and river embankments.
- All 424,192 checked longitudinal road segments respect their class grade limits; 1,530 bridge/water checks and all eight sampled flat-zone cores pass.
- Full bridge structural scan: 9,342 deck slabs, 778 main piers, 886 underpass supports and 11,327 parapets, no failures under the specific structural tests; max deck-to-own-road difference 0.309 m.
- CI steps for pedestrian/junction synthetic tests, taxi, both Tangenziale races, online race logic, initial loading, Portello and micromobility passed. These do not substitute for a WebGL playtest.

## Diagnosis of representative failures

The whole-map `ELEVATION_DIAGNOSTIC` captures the offending road, its own carriageway height, near/far ground heights and neighbouring surface selected by the road index. It shows distinct mechanisms requiring local geometry/topology decisions:

- Cavalcavia Stati Uniti / Viale della Regione Veneto near (6209.8, 2011.9): upper road about 14.87 m and lower road about 10.19 m; a 3.08 m transverse ground change cannot be fixed by merging the two roads' elevation.
- Via Paolotti / service road near (765.6, -246.5): road about 15.74 m, neighbouring service about 17.13 m, near shoulder around 16.29 m.
- Prato della Valle near (-130.4, 971.5): an authored terrain/platform level about 14.00 m does not agree with road sampled at 12.42 m; the special Prato channel/bridge geometry must be reconciled rather than disabled.
- Riviera San Benedetto near (-681.7, -427.4): street about 20.70 m, outer bank ground about 13.19 m. Verify actual riverbank/retaining geometry before declaring this a traversable shoulder.
- Via Giovanni Gradenigo and multiple argini also show metres of lateral mismatch. Service roads and tracks appear especially frequently in the aggregate.

The counters are **samples**, not 12,303 distinct geographical defects. Some may represent intentional, currently unclassified retaining banks or overpasses; others are real missing embankment/road ownership issues. Do not conceal either category by relaxing the audit indiscriminately.

## Reproduce

`node --max-old-space-size=3072 verify-walkability.mjs` prints `WALKABILITY_AUDIT` and exits with failure if any of the seven conflicts or other walkability errors persist. The CI workflow marks this one check diagnostic until they are solved.

`npm run test:geometry-integrity` prints `ELEVATION_DIAGNOSTIC`, then fails the release when road shoulder violations remain. [Latest full-map run](https://github.com/Dreamer-archalo/padova-open-world/actions/runs/35329675785).

## Acceptance criteria before publication

1. Classify each geometrically overlapping road pair by topology and altitude: at-grade segments should join smoothly, independently elevated roads need actual decks/retaining faces, and river embankments need bounded visible banks. Do not replace the lower road with the upper level.
2. Reconcile authored Prato level, lateral shoulder support, and any actual road-versus-sidewalk discontinuity with the corresponding visible mesh, collider and driving/walking height.
3. Eliminate real traversable-shoulder and wrong-owner defects, distinguishing legitimate non-traversable bridge/bank geometry in a documented, separate structural test rather than silently ignoring it. Both full-map suites must pass without threshold inflation.
4. Drive representative car/motorcycle routes and walk at the named locations in the rendered WebGL game, inspect approaches and underpasses, and confirm `main` and the hosted public site only after tests and the playtest are successful.

GitHub Issues are disabled for this repository; this document and [PR #49](https://github.com/Dreamer-archalo/padova-open-world/pull/49) preserve the blocking findings.
