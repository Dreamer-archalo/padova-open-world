# City continuity — work in progress, not released

Repository: Dreamer-archalo/padova-open-world. Base: main d5d2faf.
Branch: fix/driveable-city-continuity-20260920.

The player requested continuous driving between streets, sidewalks, bridge approaches and earth embankments, with intentional jumps at speed. This branch selectively carries the relevant unfinished PR49 corrections onto current main and adds new fixes. It does not merge the separate villa PR51.

## Implemented

- One blended ground field for modern road shoulders; physical support on the visible sidewalk; pedestrian corridors remain visible at different road levels.
- Bridge slabs stay at their own deck height; piers meet the ground/river bed. Junction caps no longer generate spikes along every road segment.
- OSM tunnel=true without a negative layer is interpreted as a covered passage, rather than excavating the connected street by 5.4 m. This is a conservative inference from the compact source data: the original tunnel subtype is not retained by that dataset.
- River crossings no longer receive an automatic additional 5.4 m motorway-style lift. Actual crossing clearance remains solved independently.
- River carving no longer lowers the dry road shoulder within a ten-metre bank strip. Prato's dry surface now participates in the same road/ground field rather than switching at an oval boundary.
- Fixed periodic guardrail gaps: the road name string was compared with a road object, silently suppressing all 48 intended periodic gaps. Other collision barriers remain enabled.
- Smooth earth access selection at existing motorway gaps, with dry approaches, bounded grades, building/structure collision checks and world bounds. Same surface used by terrain rendering and vehicle/foot contact.
- Fast convex crests can launch the car with its existing momentum; slow passage stays grounded. Tiny kerbs do not act as jump ramps. Terrain mesh subdivision follows local curvature rather than always spanning 16 m.

## Tests observed

- PASS focused city continuity, covered/underground passages, river/road bridge separation, fast/slow crest at 30/60/120 Hz, kerbs, guardrail gaps, adaptive sampling, road shoulders, bridge support, junction fans and pedestrian layering.
- PASS map-wide bridge structures: 9,342 slabs, 722 piers, 888 portal supports, 11,280 parapets; no failures in their structural checks. This audit preceded the final removal of the Prato dry-boundary override.
- PASS pedestrian contact: 124,498 segments, zero contact failures. Sidewalk contact: 418,529 samples, zero contact failures. Four different-level ground-ownership conflicts remain, so the full walkability suite still FAILS.
- PASS guardrail audit: 16,279 barriers, 48 periodic gaps, 277,060 edge samples, zero blocked-access samples.
- PASS taxi checks, both Tangenziale race suites, simulated online race/lobby checks and feature-preservation checks. These are not browser or two-device tests.
- Earth-access driving test includes the actual phase4 terrain module and checks both directions at low speed. See the saved test log for the exact final accepted sites and result.

## Release blockers — remain enforced

- Global elevation audit FAILS: 6,505 of 527,522 shoulder samples outside the unchanged limits, down from 12,280 in the selectively imported PR49 state. These are sample counts, not a count of distinct roads. Main's initial full audit also failed Bassanello flatness before reaching its final shoulder assertion.
- Four overlap-ground-ownership conflicts remain: two samples at Cavalcavia Borgomagno, one at Cavalcavia Dalmazia and one at Via Stazione. Need explicit physical classification of stacked roads and local supports/retaining structures; do not flatten the lower carriageway or loosen audit tolerances.
- 424,232 road-grade checks and 1,530 bridge/water checks have no violations in the latest global audit.
- Existing verify-vehicle-jumps fails at the cargo-north airport ramp. Reproduced identically on the unchanged main d5d2faf in an isolated worktree: pre-existing failure, not certified fixed here.
- No actual WebGL/browser drive-through or FPS measurement completed. Local Chromium was unavailable and its download timed out. Browser proof is required before any release claim.
- No merge, PR publication or deployment occurred. Automatic approval review rejected pushing the new GitHub branch, citing authorization/publication risk. Do not work around that rejection through another publishing tool; obtain explicit authorization for uploading this branch and opening its draft PR.

## Next work

1. Upload the reviewed branch and create one draft PR when authorized; keep main and the public game unchanged while the release gates fail.
2. Classify remaining stacked-road/retained-bank cases and correct the connected surfaces without hiding failures.
3. Run actual browser driving in the centre, Prato, Riviera San Benedetto, motorway earth accesses and underpasses; measure mesh/contact agreement and frame cost.
4. Integrate independently with the latest villa branch only after checking compatibility. Lighting/colour polish and the broader damage/traffic wish list are not implemented by this terrain pass.
