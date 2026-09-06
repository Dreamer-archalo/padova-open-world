# Real Padua: current implementation and next steps

The browser renderer and static Sites hosting can support a bounded, textured city scene. The original rendering engine was not the reason buildings looked invented: the input had footprints and estimated heights, without real façade geometry or imagery. More procedural detail does not recover that missing information.

## Implemented in this change

- 60 Hz fixed simulation, capped catch-up after stalls and interpolated actor rendering.
- Camera-relative third-person walking, normalised diagonal speed, sliding circle collision with conservative substeps.
- Camera boom sweeps from shoulder height both before and after smoothing. Roof height is considered.
- Three circles along the car body prevent its nose/tail passing through walls; blocked rotation is rejected.
- Grounded enter/exit, recovery resets jump state, safer full-car starting position.
- Hip and shoulder pivots for procedural characters; this is not a mocap character.
- Traffic checks for vehicles immediately ahead.
- Start at Piazza delle Erbe; all original travel locations and three driving activities remain.
- Local Three.js r170 GLTFLoader, with no runtime CDN dependency.
- A contributor command imports embedded GLBs, validates metadata/budgets, copies assets and updates the catalogue.
- Up to six nearby real-building models load; unload beyond 800 m. Map extrusions remain when an asset is absent or fails.
- Model substitution hides the old named landmark decoration and restores it on unload. Attribution follows the model catalogue.

## Not delivered / remaining blockers

**No photographed building has been added.** A genuine free-download candidate was verified through the creator's Sketchfab public API:

- Palazzo della Ragione Padova, archeologya.
- https://sketchfab.com/3d-models/palazzo-della-ragione-padova-7099891d795046c39644466d19eb8aca
- API metadata: https://api.sketchfab.com/v3/models/7099891d795046c39644466d19eb8aca
- CC Attribution / CC BY 4.0; 148,770 faces; downloadable flag true.
- Official download endpoint returned HTTP 401 without authentication. No viewer mesh extraction or access workaround was attempted.
- The exterior coverage, texture quality, orientation and measured total height of the actual download still need inspection. Do not call this a verified exterior survey merely from the title.

The full centre needs reusable models or overlapping photographs/scans, followed by reconstruction, cleanup, measured placement and LOD/texture optimisation. A licence for a paper describing a survey is not automatically permission to redistribute its underlying scan.

The current collision world remains 2.5D: solid building footprints on a sampled terrain height field. It cannot yet support surveyed stairs, walkable roofs, stacked bridges, open porticoes or interiors. Before those are advertised, add simplified authored collision meshes, a capsule character controller with slope/step limits, and appropriate path navigation. Rapier is a candidate for that stage; importing a new physics engine alone does not repair inaccurate collision data. The small arcade missions remain, not GTA's full systems or multiplayer.

## Asset pipeline

1. Obtain a model or capture a small area. Apple Object Capture offers photogrammetry on supported Macs; Blender can clean and export meshes. Neither guarantees a city-wide survey from a few street pictures.
2. Export a single triangulated GLB, Y up, embedded textures, no Draco/Meshopt requirement. Target <=20 MB / <=250k triangles per building, <=2K textures as a starting budget. These are project guardrails, not measured hardware guarantees.
3. Run `node tools/add-building.mjs --help`. Use the exact mapped building name and measured overall height. Offsets/rotation are explicit.
4. Inspect placement and exterior quality. Collision deliberately remains the OSM solid footprint until a reviewed collider exists.
5. Commit `dist/models/*.glb` plus `dist/data/building-models.json` in the same PR. Publish the resulting GitHub source state to Sites.

The importer uses a content hash in asset filenames. It does not delete older files when replacing a model; remove unreferenced assets in a separate reviewed cleanup. Catalogue metadata requires source/author/licence but cannot independently establish legal ownership.

## Why these data choices

- Google terms restrict extracting/rehosting Google Maps content and creating models from it: https://cloud.google.com/maps-platform/terms (section 3.2.3).
- New/modified EEA-billed integrations cannot use Photorealistic 3D Tiles: https://developers.google.com/maps/comms/eea/map-tiles . An official paid/quotad map integration is a different product from owning free game assets.
- Sentinel-2's finest resolution is 10 m: https://sentiwiki.copernicus.eu/web/s2-mission . Useful regional imagery, not façade reconstruction.
- Veneto's cited LiDAR download is a 5 m terrain product, not a textured city mesh: https://idt2.regione.veneto.it/idt/downloader/download . Coverage and each dataset's licence require checking.
- Capture guidance: https://developer.apple.com/documentation/realitykit/capturing-photographs-for-realitykit-object-capture/ . Hardware support must be checked before reconstruction.

## Validation

Run `node verify.mjs` and `node verify-stability.mjs`. The second uses actual game functions and strict DOM IDs, compares controller endpoints at 30/60/144 Hz, checks the fixed clock at 120 Hz too, tests wall/camera/vehicle collision, mission completion, and parses an actual generated GLB fixture through the official loader to exercise substitution, unloading and failure fallback.

The fixture is a test triangle and is never shipped as a Padua building. No browser visual QA or measured GPU/FPS benchmark has been performed by these Node tests. Confirm the result on the target MacBook before calling movement or imagery polished.
