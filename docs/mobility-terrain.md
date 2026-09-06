# Vehicles, terrain and water recovery

This change builds on `4a1a186` (the movement and local GLB import work). It remains a static, offline-capable game: no Google key, live elevation query, new engine, build step or deployment configuration is required.

## Playable vehicles

The first parked car in Piazza delle Erbe is **Milano 955**, an original stylised three-door compact inspired by the Alfa Romeo MiTo: approximately 4.06 m body length, 2.51 m wheelbase, sloping hatch, oval headlights, triangular centre grille and round rear lamps. It is not an official/licensed Alfa model. Dimensions were referenced from [Stellantis' MiTo technical sheet](https://www.media.stellantis.com/uploads/uk/UK/2014/ALFA_ROMEO/TECH_SPECS/140609_AR_MiToQV_TechSpec.pdf); no manufacturer image or mesh is bundled.

Motorcycles, scooters and a rigid six-wheel cargo truck join the existing cars. Each has its own acceleration, braking, top speed, reverse limit, steering rate, wheelbase and collision footprint including mirrors. Motorcycle riders appear when occupied or in moving traffic. Player bikes lean into turns. Vehicle meshes are batched; riders remain separate so parked motorcycles can be empty.

Press **V**, click **VEHICLES** in the driving panel, or use **Choose a vehicle** in Pause. Select a type to bring one to a clear nearby road and follow its marker. Existing vehicles of that type are reused where possible. **E** enters/leaves every type; the existing driving, camera and activity controls apply. Vehicle exit checks use its width/length and reject water. The HUD adds altitude and road grade; RPM/gears remain arcade estimates.

## Elevation provenance and fidelity

`dist/data/terrain.json` bundles 43,665 heights on a 64 m grid, covering and slightly exceeding the whole playable map. Source: [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/), nine zoom-12 [Terrarium PNGs](https://github.com/tilezen/joerd/blob/master/docs/formats.md). The dataset contains source URLs and SHA-256 hashes. Downloaded 2026-09-06.

Decode uses `(R * 256 + G + B / 256) - 32768` metres. `prepare_terrain.py` bilinearly samples the source and applies a Gaussian filter with a 128 m standard deviation to suppress roof/tree noise and isolated DEM artefacts. The resulting range is **2.74–25.23 m**, with **no vertical exaggeration**. This represents broad local relief; it cannot resolve individual kerbs, surveyed bridge decks or every embankment.

Reproduce with Python, Pillow, numpy and scipy:

```sh
python prepare_terrain.py --cache /tmp/padova-terrain
```

The JSON includes the required source attribution and a link to the [upstream attribution/licence information](https://github.com/tilezen/joerd/blob/master/docs/attribution.md). Europe terrain uses Copernicus EU-DEM; SRTM/GMTED are credited to the U.S. Geological Survey. Attribution is also visible in the footer and About panel; the derived dataset can be downloaded there.

World ground, road ribbons, parks, trees, player, traffic, camera, destination markers, procedural buildings and imported GLBs now share a height reference. Buildings stand on level foundations and their camera collision bounds include the foundation altitude. Streaming terrain uses 16 m cells, refined near water down to 4 m. Road ribbons subdivide at 8 m. Vehicle pitch follows the wheelbase slope, and uphill travel reduces acceleration.

## Rivers, bridges and recovery

OSM waterway positions and widths are preserved. A regional least-squares plane fitted to the DEM provides a continuous, gently declining reference shared by intersecting rivers. Water is 1.8 m below that reference, with a bed below it and a transition to the banks. This deliberately avoids per-way discontinuities and independent sloping ribbons at intersections.

**Water levels are an approximation, not measured river stages or a hydraulic simulation.** The extract lacks flow direction and water-level data. Regulated canals, locks, seasonal levels and exact local embankment profiles are not reconstructed. Bridge-tagged ways get modest arches with continuous approaches; true stacked/grade-separated roads are still outside the 2.5D collision model.

Stepping or driving into a mapped water polygon or river triggers a visible downward fall and automatic recovery after about 1.35 seconds. Movement and vehicle exit are suspended during the fall; money, chosen vehicle and current activity are preserved. Recovery searches a clear, dry road near the last safe position, rejects vehicle/building overlap and resets speed/condition. R and map travel also require dry destinations. If the local search cannot succeed, recovery uses the Prato area as a fallback.

Mapped bridges remain passable. Prato della Valle uses the same rotated ellipse for rendering and water detection: the canal ring is lowered, the island is dry and both crossing paths stay usable. Complex OSM multipolygons remain limited by the original ways-only map extraction; missing holes or geometry can still require source-map repair.

## Recognizable monuments

Three previously generic landmark additions are replaced with original, batched exterior geometry aligned to mapped footprints:

- **Palazzo della Ragione:** closed ship-hull roof, ribs, two loggia tiers, balustrades and circular details; references from [Turismo Padova](https://www.turismopadova.it/il-palazzo-della-ragione/).
- **Cappella degli Scrovegni:** a correctly oriented narrow nave, gabled brick façade, arched portal, triple window and side windows; [Padova Musei Civici](https://cappellascrovegni.padovamusei.it/it) and the [stained-glass restorer's exterior reference](https://www.poliartesacra.com/news-restuaro-cappella-degli-scrovegni.php?ogg3=restauri).
- **Chiesa degli Eremitani:** long pitched roof, pale stone lower façade, rose window, smaller oculi, brick pilasters and blind arcades; [Diocese of Padova restoration photograph](https://www.diocesipadova.it/restauro-agli-eremitani-la-facciata-rivela-la-sua-policromia/).

These are architectural interpretations, not photogrammetry. Images are consulted as references and are not included as textures or redistributed. No Street View imagery, Google building geometry or Google elevation data is exported: [Google Maps Platform EEA terms](https://cloud.google.com/terms/maps-platform/eea) restrict creating derived map/building content from those services. Existing local GLB replacements still override these authored landmarks and restore them on unload/failure.

## Validation and limits

```sh
node verify-stability.mjs
node verify-terrain.mjs
node verify.mjs
```

Checks cover the actual controller, frame-rate independence, falling and automatic respawn on foot and in each new vehicle, dry teleports, oriented truck corners, raised camera collisions, bridge approaches, real mapped bridges, Prato passages, every landmark's dry vehicle spawn, finite generated geometry, route connectivity and model replacement. These checks do not claim browser rendering, visual acceptance or measured device frame rates. No deployment is performed by this PR.
