# Solo game, compact HUD and 15 collector cars R26

Built on the R25 road corrections (`7ad45f1332c3b95a79518336ddd9a9929d56857d`). Preview remains separate from main.

The normal entry point no longer imports multiplayer, its start-button injection, online character selection or online race hooks. Local tangenziale races and cruise control remain available. The startup retains its ordinary graphics selection, loading and character picker.

Compact HUD is the default. Speed and vehicle condition appear only while driving; the entire vehicle panel disappears on foot, including when hurt or swimming. Wanted stars appear only when wanted, in both HUD layouts. Mission information remains contextual. Ordinary telemetry and the permanent keyboard legend are collapsed. HUD + restores extra information and the choice is saved on this browser. The minimap keeps the same dimensions in both layouts. Hangar and boat actions join the small action bar. Mobile controls use separate areas.

Villa supplier messages are translucent notifications with an accessible close button and a six-second timeout. A notice appears once per truck/phase; frame updates do not reopen dismissed or expired notices. Closing one leaves the truck waiting and the ordinary nearby E interaction available. Arrival and permission notices no longer duplicate the same text in a second toast.

The hangar has a dedicated Auto speciali section with Ametista 01, Ruggine 32, Nebula, Zebra Safari, Mandarino R, Azzurra Barchetta, Cobalto 6, Limone Bubble, Velluto 38, Sale Surf, Prisma E, Bruma Rat, Fiamma Drag, Perla Imperiale and Magnete Mono. All have independent 3-D geometry, dimensions, handling and original liveries. Each model uses one body mesh, at most 1,300 triangles, shared templates and ordinary ground-vehicle physics. Collector cars retain their silhouettes in Iper Performance. Custom paint affects only marked body vertices; original accents, glass, lights and wheels stay intact. Original liveries can be restored.

Eligible traffic spawns have a 1.5% collector chance, with equally weighted models subject to road-width clearance. Padova uses its existing traffic recycling; regional encounters use a stable per-road random seed, so unloading a sector does not reroll its model. All 15 occur on the actual regional spawn map: 60 special cars among 4,042 cars in the validation scan. No extra actor budget or map markers are added.

Validation: 15 distinct geometry hashes, model/physics bounds, isolated repaint and original-livery restoration; 100,000 traffic selections; full regional availability; solo module dependency traversal; hangar/aircraft, taxi, initial-world, damage, controller, performance, street-life and city-system checks. Chromium verifies solo entry, contextual HUD, all 15 rendered hangar thumbnails, all 15 real selections/replacements, collision clearance, delivery and driving. The workflow retains WebGL screenshots and also rechecks the R25 road meshes.

The older `test:modern` suite reports the pre-existing Fulmine geometry/bounds mismatch (also confirmed on the untouched R25 baseline: rendered width 2.2582 m and height 1.4308 m vs. declared width 2.04 m and height 1.10 m). That legacy car is outside this fleet change; the new fleet passes its own complete bounds checks.

Preview: https://dreamer-archalo.github.io/padova-open-world/preview/solo-cars-r26/
