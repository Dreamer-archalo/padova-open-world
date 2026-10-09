# R42 — Driveable roofs and consecutive vehicle jumps

After a 9/Numpad9 jump, ground vehicles land on the actual building roof and can accelerate, reverse, steer and jump again immediately. The existing 50 m jump and one life-point landing charge remain in place.

## Physical support

- Shared triangle profiles cover flat, gabled, hipped and irregular city roofs and the regional corridor. Authored landmarks, churches, imported GLB replacements, villa structures, the hangar, rooftop deck and estate houses use physical surfaces as well.
- Roof support uses the occupied elevation. Ground traffic and dealership deliveries remain at ground/floor level; facades remain solid below their local roof.
- The collision volume ends at the local roof surface, including authored sloping roofs below the building’s global maximum height.
- Leaving a roof edge or entering a concave void starts a fall, including very slow and reverse motion. No invisible platforms extend beyond roof polygons.
- Landing resets vertical slope history and immediately makes the next jump available.
- Lazy road clipping updates the roof registry to the final rendered fragments. Runtime callbacks remain non-enumerable so streaming worker messages stay cloneable.
- Roof profiles are retained while switching quality and unloading/reloading chunks. Core and detail stages share the same selected pitched geometry.

## Validation

`node tools/verify-roof-driving-r42.mjs` covers roof landings and retained momentum at 20/30/60/120 Hz; steering, repeat jumps, facades, concave gaps, slow/reverse falls, dry roofs above water, authored clearance, worker serialization and 9/Numpad9 through the real controller. The full Padova map audit samples over 600,000 roof triangle locations.

`node tools/test-roof-driving-r42-browser.mjs` exercises real Chromium/WebGL, keyboard 9/W/Numpad9 and checks physical/rendered roof equality on an actual warehouse, pitched roof, Palazzo della Ragione and a regional warehouse. Its images and results are uploaded with the preview workflow.

Regression checks cover existing truck/motorway/airport jumps, dealerships, Monoblocco, initial-world loading, cooperative streaming, shared street surfaces and performance budgets.

Preview: https://dreamer-archalo.github.io/padova-open-world/preview/roof-driving-r42/

Production deployment remains a separate approved merge.
