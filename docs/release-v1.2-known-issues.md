# Version 1.2 — issues not resolved by release consolidation

The release 1.2 work consolidates one source tree and deployment process. It does **not** certify that every gameplay issue is fixed.

## Existing elevation regression: Bassanello

The full `npm run test:geometry-integrity` suite runs `verify-elevation-harmony.mjs`, which detected a `Bassanello core variation 0.671 m` against the strict `variation < 0.35 m` threshold on the 16 September 2026 base source. The check is preserved unchanged. Its step is explicitly labelled *nonblocking known issue* in release and GitHub Pages workflows; the step shows a failed result even if the workflow proceeds. Road slopes and other zones may have additional errors because this assertion halts the audit on its first failure. Do not represent this suite as passed. Fix source geometry and restore this test as a blocking check in the next corrective PR.

## Manual validation

Taxi travel, both Tangenziale races, and online lobby tests validate code contracts/controller logic but cannot establish a complete WebGL browser experience or real two-device race. Full game smoke tests, bridge geometry inspection, and FPS measurements are pending.

## Unmerged or unimplemented features

PR #13 remains draft and is excluded pending targeted rebase/review. Divergent geometry branches are not incorporated without review. Villa relocation, UFO, mercenaries and drivable boats are requests not implemented by the 1.2 consolidation.

## Publishing

The previous official Netlify production deployment was still at PR #15 (`147d5d9975d78f5ce9b2285d1999c0a81ebf468c`). Authorizing the existing Netlify project to link to canonical GitHub `main` is a separate account-owner action, and the final deploy must be checked by commit SHA. A successful GitHub Pages release does not imply Netlify synchronization.
