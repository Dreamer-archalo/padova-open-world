[out:json][timeout:125];
// Extra map-only detail: Mestre intentionally remains cheap ENERGY 3D while
// this geometry remains completely visible and sharp when M is zoomed in.
(
  way["building"](45.4780,12.2150,45.5130,12.3000); // Mestre
  way["highway"~"^(residential|living_street|service|unclassified|pedestrian|footway|path|steps|cycleway|tertiary)$"](45.4780,12.2150,45.5130,12.3000);
  way["building"](45.4150,12.1930,45.4390,12.2940); // Malcontenta/Fusina
  way["highway"~"^(residential|living_street|service|unclassified|pedestrian|footway|path|steps|cycleway|tertiary)$"](45.4150,12.1930,45.4390,12.2940);
  way["building"](45.4660,12.1740,45.4940,12.2150); // interurban link
  way["highway"~"^(residential|living_street|service|unclassified|pedestrian|footway|path|steps|cycleway|tertiary)$"](45.4660,12.1740,45.4940,12.2150);
);
out geom tags;
