[out:json][timeout:115];
// Minor connections across the entire drivable Padova–Venezia corridor.
// Together with the existing primary/secondary/tertiary extract and dedicated
// walkable town-center query, these form a continuous rural + suburban network.
(
 way["highway"~"^(residential|living_street|unclassified|service|track)$"](45.4080,11.9500,45.4600,12.0610); // Padova est, Noventa, Vigonza, Stra
 way["highway"~"^(residential|living_street|unclassified|service|track)$"](45.4080,12.0450,45.4740,12.1570); // Stra, Cazzago, Dolo, Mira
 way["highway"~"^(residential|living_street|unclassified|service|track)$"](45.4260,12.1430,45.4840,12.2890); // Oriago, Malcontenta, Marghera
);
out geom tags;
