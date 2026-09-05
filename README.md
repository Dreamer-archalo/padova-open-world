# PADOVA / Open World

A self-contained Three.js browser game using actual OpenStreetMap streets and building footprints across Padua and its surroundings. Static files in `dist/` are the entire deployed app. No API key, build step, server-side state or live map service is needed while playing.

## Play

- WASD / arrow keys: accelerate, reverse, turn.
- E: enter a nearby parked / slow car or exit when slow.
- Shift: boost / sprint. Space: handbrake / jump.
- C: three camera modes. Drag the world: orbit camera.
- J: delivery, checkpoint race or police escape.
- M: map, waypoints and travel to landmarks.
- R: recover and repair. Escape: pause and graphics settings.

Progress (earned money and completed jobs) is saved to this browser's localStorage. Graphics default to Balanced; Performance reduces rendering distance and disables shadows. Map geometry streams into GPU memory by 320 m chunks and old chunks are disposed. Car meshes are batched to reduce draw calls.

## Reconstruction fidelity

The map contains 87,881 mapped building footprints, 34,539 road/path ways, 1,080 water/park/pitch polygons and 770 waterway ways. Source bbox: latitude 45.35–45.465, longitude 11.80–11.97. This is a roughly 13 × 13 km rectangular extract, not a municipality boundary guarantee. Projection: local equirectangular around 45.4064, 11.8768; one world unit = one metre. Low local projection distortion; not a survey-grade projection.

Footprints and roads use OSM coordinates. Missing height data is estimated from floors or a deterministic building ID choice. Landmark roofs, domes, facades and Prato decoration are approximate interpretive geometry, not photogrammetry. Terrain, grade separations and bridges are flattened for arcade movement. The Overpass extract uses ways, not fully assembled relations; complex multipolygon courtyards / water / buildings can be incomplete. No enterable interiors, combat weapons, multiplayer or commercial GTA content.

## Data and licenses

Map data and derived `dist/data/padova.json`: © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright). The derived data can be downloaded from the in-game About panel. `prepare_map.py` reproduces the conversion from an Overpass JSON extract with geometry. Data timestamp is embedded in the JSON.

Three.js 0.170.0 is bundled locally under MIT; see `dist/vendor/THREE-LICENSE.txt`. Fonts are optional Google Fonts with local system fallbacks. Game remains functional if fonts are unavailable.

## Validation

JavaScript syntax, local asset references, geometry, real map navigation, collision placement and mission destination reachability are checked locally. No browser visual QA or measured MacBook frame-rate claim is made without running on an actual browser / device.
