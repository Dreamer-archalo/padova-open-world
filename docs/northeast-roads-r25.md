# Northeast road corrections R25

Based on PR #69 / `1a053682b054087a4d36638c459b6afc5295f92d`.

- Restore a continuous deck on both Charles Darwin carriageways after Corso Irlanda. The compact extract omits their bridge tags; terrain and land-use polygons previously covered the middle of each way.
- Separate all four A4 Serenissima / Corso Irlanda crossings. The motorway passes above the ring road with at least 5.2 m driving-surface separation. Apply structure geometry only to the local span of the long motorway way, retaining the existing Via Boves stunt and shoulder openings.
- Preserve the bank/deck height throughout the Nuova Strada del Santo bridge: a canal in one part of the way no longer removes the lift from its dry approach. Carve smooth terrain ceilings across the named corridor's width.
- Render land-use polygons at ground level beneath bridges, with asphalt kept visibly above ground layers.
- Remove low approach slabs at untagged zero-layer roads; verify the full Via Bassette chain in both directions.

Local validation: 11,502 carriageway-width samples, 34 connected road seams, 416 Via Bassette structure-clearance headings; 577 underpass supports and 1,792 upper/lower crossing headings; full road grade/shoulder/water audit; guardrails; two existing road-to-road stunts and vehicle jumps. Chromium WebGL starts successfully and checks 136 rendered/contact positions across five locations; screenshots retained by the preview workflow. The wider crossing audit has 432 candidates, with the previous 44 low-clearance candidates outside this targeted fix still requiring review.

Preview: `https://dreamer-archalo.github.io/padova-open-world/preview/road-fixes-r25/`.
Production and the earlier R23 preview are retained separately; no merge into main.
