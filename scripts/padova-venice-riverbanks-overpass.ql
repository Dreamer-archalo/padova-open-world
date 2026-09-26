[out:json][timeout:125];
// River banks and closed water surfaces across the whole Padova → Riviera
// del Brenta → Mirano → Marghera driveable world. The actual riverbank
// outlines override approximate river centre-line widths where mapped.
(
 way["waterway"="riverbank"](45.387,11.935,45.514,12.245);
 way["natural"="water"](45.387,11.935,45.514,12.245);
 way["water"~"^(river|canal|lake|pond|reservoir)$"](45.387,11.935,45.514,12.245);
 way["landuse"~"^(basin|reservoir)$"](45.387,11.935,45.514,12.245);
 rel["waterway"="riverbank"]["type"="multipolygon"](45.387,11.935,45.514,12.245);
 rel["natural"="water"]["type"="multipolygon"](45.387,11.935,45.514,12.245);
);
out geom tags;
