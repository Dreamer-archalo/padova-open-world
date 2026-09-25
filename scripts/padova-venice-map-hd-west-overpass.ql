[out:json][timeout:125];
// 2D-only map enrichment: missing settlements and secondary streets OUTSIDE
// the existing detailed Dolo/Mira/Oriago building extracts.
(
  way["building"](45.4450,11.9620,45.4730,12.1040); // Stra, Vigonovo / north Riviera
  way["building"](45.4020,11.9650,45.4190,12.1800); // rural/southern corridor
  way["building"](45.4220,12.1040,45.4500,12.1260); // Dolo -> Mira gap
  way["building"](45.4840,12.0940,45.5080,12.1330); // Mirano
  way["highway"~"^(residential|living_street|service|unclassified|pedestrian|footway|path|steps|cycleway|track)$"](45.4450,11.9620,45.4730,12.1040);
  way["highway"~"^(residential|living_street|service|unclassified|pedestrian|footway|path|steps|cycleway|track)$"](45.4020,11.9650,45.4190,12.1800);
  way["highway"~"^(residential|living_street|service|unclassified|pedestrian|footway|path|steps|cycleway|track)$"](45.4220,12.1040,45.4500,12.1260);
  way["highway"~"^(residential|living_street|service|unclassified|pedestrian|footway|path|steps|cycleway|track)$"](45.4840,12.0940,45.5080,12.1330); // Mirano
);
out geom tags;
