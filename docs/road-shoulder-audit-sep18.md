# Road and sidewalk continuity audit — 18 September 2026

## Status

The corrections proposed in PR #49 pass the targeted synthetic bridge/vehicle collision regression and a citywide generated-structure audit. The full road-to-ground elevation audit **does not pass** and must not be described as successful merely because an earlier GitHub Actions step used `continue-on-error: true`. The CI setting has been changed so the failure blocks the release check.

## Verified bridge structure results

Run `node --max-old-space-size=3072 verify-road-support-map.mjs`:

- 9,342 generated bridge deck boxes examined.
- 709 main support piers, 886 underpass pier boxes, 11,327 parapets examined.
- Maximum local deck-to-own-road-height difference: 0.309 m; the audited limit is 0.65 m (the difference includes slab slope within short spans).
- Main-pier base relative to rendered ground: maximum difference 0 m under the audit definition.
- Zero failed cases in the new generated-structure audit.

This is a **geometry consistency audit**, not evidence that the game has been visually driven everywhere in a WebGL browser.

## Still failing: `npm run test:geometry-integrity`

`verify-elevation-harmony.mjs` records **24,671 shoulder violations** in the whole-map sample and exits with assertion failure. The previously first-failing Bassanello core-variation assertion was no longer the first error after the southern plateau changes, but this does not prove Bassanello is visually perfect.

Examples from CI logs:

- Cavalcavia Stati Uniti near x=6209.8, z=2011.9: 4.646 m transverse change; samples of the same sequence reach 4.805 m.
- Via Paolotti near x=765.6, z=-246.5: 1.338 m near-shoulder height gap.
- Via San Massimo near x=1041.9, z=166.6: 3.618 m transverse change.

## Source of investigation

`Terrain.groundHeight()` and the override in `dist/phase4-terrain-fixes.js` independently select a nearby road to feather the surrounding terrain. At junctions, parallel carriageways, water boundaries or grade-separated crossings, distinct sample points can select different height references. This is a plausible mechanism, not a proven sole cause of all 24,671 failures.

## Next acceptance criteria

1. Verify and repair road-to-road and road-to-sidewalk height ownership at every mapped at-grade junction, without projecting underpasses up onto bridge decks.
2. Keep visible triangles, collision/contact height, sidewalk edges and roadside terrain consistent, including the outer shoulder samples.
3. Make `npm run test:geometry-integrity` pass without suppressing failures or increasing thresholds merely to hide them; preserve bridge and race regressions.
4. Test actual car and motorcycle traversal in a rendered WebGL browser at the three named sites, Bassanello and a representative sample of other districts. Do not claim this browser test has occurred until it has.

GitHub Issues are disabled for this repository; this document preserves the outstanding task with reproduction and acceptance conditions.

[Failing diagnostic run](https://github.com/Dreamer-archalo/padova-open-world/actions/runs/35293190094) · [PR #49](https://github.com/Dreamer-archalo/padova-open-world/pull/49).
