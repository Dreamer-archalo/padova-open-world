# Padova 1500 — implementation brief

## Goal
Add a second playable era without replacing or degrading the current modern Padova mode.

The opening screen must let the player choose between:

- **Run Padova** — current modern game, unchanged.
- **Run Padova from 1500** — a dedicated Renaissance-era version of Padova.

The 1500 mode must feel like a separate world, not a simple reskin.

## Historical-world direction

Build a stylised, research-informed reconstruction of Padova around the year 1500. It does not need to claim survey-grade historical accuracy, but the city layout, major gates, defensive walls, civic/religious landmarks, street hierarchy and material language should be grounded in historical sources whenever possible.

Priorities:

1. Renaissance walls, gates, towers and defensive structures.
2. Dense historic centre with narrower streets, arcades, timber elements, stone, brick, plaster and tiled roofs.
3. Remove all visibly modern elements from this mode: modern cars, motorcycles, trucks, traffic lights, road markings, modern street furniture, modern clothing and modern signs.
4. Add dirt, stone and timber road/street treatments appropriate to the period.
5. Add market squares, workshops, carts, barrels, crates, hay, wells, animals and period props.
6. Keep recognizable Padova landmarks where historically appropriate, but give them period-specific surroundings.

## Transportation

Replace modern vehicles with period transportation:

- Rideable horses.
- Horse-drawn carts and wagons.
- Parked/tethered horses.
- NPC riders.
- Merchant carts moving through the city.

Player controls should stay as close as possible to the modern game:

- WASD / arrows: move or steer.
- Shift: sprint on foot / gallop on horse.
- E: mount/dismount horse or enter/leave a cart.
- Space: brake/slow cart or horse.
- Camera controls remain consistent with modern mode.

Horse and cart physics should be slower and heavier than modern vehicles. Horses should have acceleration, turning limits and recovery behavior appropriate to an arcade game rather than behaving like cars with a new mesh.

## NPC system

The main objective is to make the city feel inhabited. NPCs must have **roles and routines**, not just random walking.

Required archetypes include:

- Merchants and stall owners.
- Customers at markets.
- Artisans and apprentices.
- Priests, friars and other clergy.
- Scholars/students connected to the university.
- Porters and laborers.
- Nobles / wealthier citizens.
- Beggars / poorer citizens where appropriate.
- Guards/soldiers.
- Mounted guards.
- Farmers or people bringing goods into town.
- Children/families where technically practical.

Each role should have a small behavior state machine. Examples:

- Merchant: stay near stall, arrange goods, talk to nearby NPCs, occasionally move crates.
- Customer: approach stalls, stop, browse, leave.
- Priest: walk between church-related points, stop near church entrances, occasionally speak with citizens.
- Artisan: remain around workshop, alternate between work animation and short local movement.
- Porter: carry an item between two destinations.
- Scholar: walk between university/civic areas and pause in groups.
- Guard: patrol assigned route, watch the player, investigate disturbances, chase if needed.

NPCs should react to nearby incidents: move aside for a fast horse/cart, gather around unusual events, flee from danger, and alert guards where relevant.

## Guards and wanted behavior

Replace modern police with period guards/soldiers.

- Guards patrol on foot and on horseback.
- If the player attacks, repeatedly collides with people, steals a guarded mount/cart, or causes serious disorder, a wanted state begins.
- Guards should pursue using streets rather than simply moving directly through geometry.
- Mounted guards should be faster than guards on foot.
- Sword-equipped guards can use short-range melee attacks once close enough.
- Avoid graphic violence; combat can be arcade/stylised.
- If caught, the player is reset to a safe historical location and the wanted state clears.

## Animals

Add ambient animals where appropriate:

- Horses.
- Chickens.
- Pigs.
- Goats/sheep where suitable.
- Dogs if feasible.

Animals need simple wandering, avoidance and panic reactions so they do not behave like static decoration.

## Markets and daily life

At least one major market area should be visibly active with:

- Stalls.
- Produce and goods.
- Sellers and customers.
- Carts arriving/leaving.
- Porters carrying goods.
- Barrels, crates, baskets, sacks and timber structures.

The market should have denser NPC activity than quiet residential streets.

## World materials and visual language

The 1500 mode should emphasize:

- Timber.
- Brick.
- Stone.
- Lime plaster.
- Terracotta roofs.
- Cloth awnings.
- Dirt/mud/stone road surfaces.
- Less metal and glass than the modern mode.

Districts should still differ visually, but with period-specific logic: civic/religious centre, market/commercial areas, gates and defensive perimeter, poorer outer streets, workshops, gardens and open land.

## Technical architecture

Do **not** duplicate the entire modern game if avoidable. Introduce an era/world-mode selector and isolate era-specific systems behind configuration/modules.

Suggested structure:

- `modern` mode keeps all current behavior.
- `1500` mode swaps world dressing, transport set, NPC archetypes, law-enforcement system, props and UI labels.
- Share movement, collision, camera, terrain and map infrastructure where technically safe.
- Keep save/progression for the two modes separate where needed.

The modern mode must remain regression-safe.

## Start screen

The intro must clearly expose two choices:

**RUN PADOVA**
Current-day Padova.

**RUN PADOVA FROM 1500**
Renaissance Padova with horses, carts, walls, markets, clergy, guards and period NPC life.

Do not hide the historical mode inside a settings menu.

## Historical accuracy / sourcing

Use open/public-domain or appropriately licensed historical maps and references where useful. Document sources in `docs/` and distinguish:

- historically sourced placement,
- inferred reconstruction,
- gameplay approximation.

Do not copy Google/Street View assets or unlicensed commercial models/textures.

## Performance

The 1500 mode should remain playable on the same target devices as the modern game. Use instancing/batching/LOD for repeated props, crowds, vegetation, walls and market objects. NPC intelligence should use distance-based simulation so far-away NPCs do not consume full AI cost.

## Acceptance criteria

A first acceptable version should demonstrate all of the following:

1. Start screen has both era choices.
2. Modern Padova still works as before.
3. 1500 mode loads a visibly distinct historical city.
4. Modern traffic/vehicles are absent in 1500 mode.
5. Player can walk, run, ride a horse and use a horse-drawn cart.
6. Historical walls/gates are visible and navigable around the old city.
7. At least one functioning market exists with role-based NPC activity.
8. Clergy, merchants, artisans, civilians and guards have visibly different behavior.
9. Guards can detect disorder and chase the player, including mounted pursuit.
10. Ambient animals exist and react to nearby movement.
11. Historical limitations and source assumptions are documented.
12. No regression to the existing modern mode.

This feature should be delivered incrementally if needed, but the final intent is a genuinely separate playable Padova-1500 experience rather than a cosmetic filter over the present-day city.
