# PADOVA / Open World

## Dreamer-archalo edition

- Public game: https://padova-open-world.tfyudartuuyikgfdsgafrdyu.chatgpt.site
- Source and Pull Requests: https://github.com/Dreamer-archalo/padova-open-world
- Target branch for new Pull Requests: `Dreamer-archalo/padova-open-world:main`.
- Publication uses the complete `dist/` directory from this repository. The Site identity is recorded in `.openai/hosting.json`.
- Merging a Pull Request updates the source; publishing the Site is a separate operation. See [contribution and publication instructions](CONTRIBUTING.md).

This edition continues the project from [scandolo/padova-open-world](https://github.com/scandolo/padova-open-world), retaining its history and credits.

A self-contained Three.js browser game using actual OpenStreetMap streets and building footprints across Padua and its surroundings. Static files in `dist/` are the entire deployed app. No API key, build step, server-side state or live map service is needed while playing.

## Play

- On foot: WASD / arrow keys move relative to the camera; drag to turn the view.
- In a vehicle: WASD / arrow keys accelerate, reverse and steer.
- E: enter a nearby parked / slow vehicle or exit when slow.
- V or VEHICLES in the HUD: choose a MiTo-inspired compact, motorcycle, scooter or truck.
- Shift: boost / sprint. Space: handbrake / jump.
- C: three camera modes. Drag the world: orbit camera.
- J: delivery, checkpoint race or police escape.
- M: map, waypoints and travel to landmarks.
- R: recover and repair. Escape: pause and graphics settings.

Progress (earned money and completed jobs) is saved to this browser's localStorage. Graphics default to Balanced; Performance reduces rendering distance and disables shadows. Map geometry streams into GPU memory by 320 m chunks and old chunks are disposed. Car meshes are batched to reduce draw calls.

The driving HUD includes speed, gear, RPM, trip distance, heading, altitude, grade, vehicle condition and nearby traffic density. Traffic includes nine vehicle types, with distinct motorcycle, scooter and truck handling; pedestrian and traffic density are selected from graphics quality at startup (reload after changing quality to update population). Gear and RPM are arcade display estimates, not a simulated transmission.

## Reconstruction fidelity

The map contains 87,881 mapped building footprints, 34,539 road/path ways, 1,080 water/park/pitch polygons and 770 waterway ways. Source bbox: latitude 45.35–45.465, longitude 11.80–11.97. This is a roughly 13 × 13 km rectangular extract, not a municipality boundary guarantee. Projection: local equirectangular around 45.4064, 11.8768; one world unit = one metre. Low local projection distortion; not a survey-grade projection.

Footprints and roads use OSM coordinates. Missing height data is estimated from floors or a deterministic building ID choice. Landmark roofs, domes, facades and Prato decoration are approximate interpretive geometry, not photogrammetry. Terrain uses a bundled, smoothed DEM without vertical exaggeration. Rivers and bridge ramps follow an approximate height model; true stacked grade separations are not supported. The Overpass extract uses ways, not fully assembled relations; complex multipolygon courtyards / water / buildings can be incomplete. No enterable interiors, combat weapons, multiplayer or commercial GTA content.

## Urban appearance pass

Facade materials distinguish historic, residential and industrial buildings, using OSM building types and an approximate central-area boundary. Decorative arcade panels are selected procedurally; they are not surveyed or walkable porticoes. Bridge-tagged roads have parapets and raised driving surfaces. Pedestrian paving is warmer in the centre. Ragione, Scrovegni and Eremitani have authored façades and roofs oriented to their mapped footprints.

This is a first visual differentiation pass, not a building-by-building reconstruction. The mapped street and river alignments are preserved; rivers now have a lowered bed and water hazards. Landmark proportions, street-facing detail placement and the denser population still need visual/performance review in a real browser before merging.

## Data and licenses

Map data and derived `dist/data/padova.json`: © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright). The derived data can be downloaded from the in-game About panel. `prepare_map.py` reproduces the conversion from an Overpass JSON extract with geometry. Data timestamp is embedded in the JSON.

Three.js 0.170.0 is bundled locally under MIT; see `dist/vendor/THREE-LICENSE.txt`. Fonts are optional Google Fonts with local system fallbacks. Game remains functional if fonts are unavailable.

## Validation

JavaScript syntax, local asset references, geometry, real map navigation, collision placement and mission destination reachability are checked locally. No browser visual QA or measured MacBook frame-rate claim is made without running on an actual browser / device.

## Stable movement and real-building imports

The game starts in Piazza delle Erbe. Simulation now runs at a fixed 60 Hz with interpolated actors. Walking slides along walls; camera obstruction is checked after smoothing; car collisions include the nose and tail. Hip and shoulder pivots replace ground-level limb rotation. These changes are covered by `node verify-stability.mjs`.

Real building models can replace named OSM buildings through `node tools/add-building.mjs --help`. The game vendors its GLTF loader and serves models locally, without paid map APIs. **No scanned Padua buildings are bundled yet:** the verified Palazzo della Ragione candidate requires an authenticated Sketchfab download. See [the build notes](docs/real-city.md) and [the in-game contributor guide](dist/model-guide.html) for the exact asset path, licensing references and remaining 2.5D collision limitations.

## Terrain and new vehicles

The first car is inspired by the Alfa Romeo MiTo. Motorcycles, scooters and trucks are also drivable and available through V or the HUD. Water triggers a fall and automatic return to a dry road; mapped bridges and Prato’s crossings remain usable. Altitude comes from open Mapzen/Copernicus/USGS terrain data, bundled in `dist/data/terrain.json`; river levels and bridge arches are gameplay approximations.

See [implementation, source credits, reproduction and limitations](docs/mobility-terrain.md). Run `node verify-stability.mjs`, `node verify-terrain.mjs` and `node verify.mjs` for local regression checks.
