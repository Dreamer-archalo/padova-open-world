# R43 — Villa performance

The estate repeatedly scanned the full Padova road graph at every simulation tick to mark two private access roads. A graph-scoped cache now retains those roads and still enforces their privacy. Replacing the graph invalidates the cache.

After estate layout, roof and collision registration finish, fixed ornaments are batched by original material, shadow settings, visibility layer and 48 m cell. Moving people, animal limbs, patrols, fountain water and markers retain their original hierarchy. Source geometry stays available for inspection; cleanup restores it and disposes only generated buffers. Existing collisions and rooftop support remain authoritative.

Ordinary city and regional roof triangles are now cached on first use instead of triangulating the entire world during registration. Non-enumerable accessors prevent worker snapshots from evaluating or cloning them. Rendered roof upgrades and physical support use the same cached geometry.

## Measurements

Real Chromium 140/WebGL, SwiftShader, 1280×800, Performance (`low`). In one running game, pause the simulation, restore fixed ornaments, render, batch them again, then render the **same camera and scene**:

| View | Before draw calls | After draw calls | Reduction |
| --- | ---: | ---: | ---: |
| Starting position | 1,302 | 662 | 49.2% |
| Villa entrance | 1,628 | 823 | 49.4% |
| Rear estate | 318 | 212 | 33.3% |

The entrance draws 276,207 versus 283,269 triangles (+2.6%) because small batches include a few previously culled ornaments. Material, shape and lighting are preserved. The complete estate batches 2,140 fixed meshes into 213 submissions, saving up to 1,927 calls across all views.

Separate warm five-second samples on the same machine show entrance simulation work falling from 13.35 to 5.64 ms per tick (about 58%). A CPU sampling profile identified the removed whole-graph scan as the dominant estate cost. These are draw-submission and CPU measurements, **not a promised device FPS**. SwiftShader rendering times vary; graphics performance must also be assessed on the player's GPU. Total local startup stayed around 33 seconds, so no download-time improvement is claimed.

Reproduce paired rendering measurements with:

```sh
PERF_LABEL=acceptance PERF_AB=1 PERF_ASSERT=1 node tools/profile-villa-performance-r43.mjs
```

The browser suite also runs estate v7/v11 acceptance and R42's real keyboard rooftop landing, driving and repeat-jump tests. The R43 verifier checks road-scan caching, lazy roof support and clone safety, transformed batch geometry, moving actors, separate visibility layers and cleanup. Existing initial-world, performance, phase3 runtime and general game checks are retained.

The public playtest is isolated at `preview/villa-performance-r43/`; the production version is unchanged until the R43 release is approved.
