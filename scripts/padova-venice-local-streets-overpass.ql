[out:json][timeout:115];
// Residential streets, quays, pavements and bridge approaches ONLY around
// the user-selected high-detail corridor towns. Arterial roads remain in the
// lightweight regional extract and are deduplicated during preparation.
(
  way["highway"~"^(residential|living_street|service|unclassified|pedestrian|footway|path|steps|cycleway)$"](45.4190,12.0610,45.4490,12.1010); // Cazzago + Dolo
  way["highway"~"^(residential|living_street|service|unclassified|pedestrian|footway|path|steps|cycleway)$"](45.4260,12.1250,45.4530,12.1580); // Mira Porte
  way["highway"~"^(residential|living_street|service|unclassified|pedestrian|footway|path|steps|cycleway)$"](45.4540,12.1000,45.4780,12.1380); // Marano
  way["highway"~"^(residential|living_street|service|unclassified|pedestrian|footway|path|steps|cycleway)$"](45.4390,12.1500,45.4670,12.1950); // Oriago
  way["highway"~"^(residential|living_street|service|unclassified|pedestrian|footway|path|steps|cycleway)$"](45.4410,12.2110,45.4850,12.2960); // Marghera + Porto Marghera
);
out geom tags;
