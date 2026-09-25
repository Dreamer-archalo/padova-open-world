[out:json][timeout:120];
// Coastal water, docks and dry urban land outlines around Porto Marghera
// and the lagoon. OSM footprints, not synthetic blue rectangles.
// Filter land use to avoid downloading every individual city building.
(
  way["natural"="water"](45.3930,12.1950,45.5250,12.3950);
  way["waterway"="riverbank"](45.3930,12.1950,45.5250,12.3950);
  way["landuse"~"^(basin|reservoir|salt_pond)$"](45.3930,12.1950,45.5250,12.3950);
  way["water"~"^(dock|basin|lagoon|harbour|lake|river)$"](45.3930,12.1950,45.5250,12.3950);
  way["man_made"="dock"](45.3930,12.1950,45.5250,12.3950);
  way["landuse"~"^(industrial|residential|commercial|retail|port|harbour)$"](45.4250,12.2100,45.5000,12.3800);
  way["natural"~"^(wood|scrub)$"](45.4230,12.3000,45.4630,12.3690);
  way["leisure"~"^(park|garden)$"](45.4210,12.3050,45.4590,12.3760);
);
out geom tags;
