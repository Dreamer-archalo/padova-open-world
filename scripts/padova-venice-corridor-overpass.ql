[out:json][timeout:120];
(
  way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street)$"](45.3500,11.9200,45.4850,12.1600);
  way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street)$"](45.3700,12.1200,45.5350,12.3000);
  way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street)$"](45.4100,12.2600,45.4750,12.3550);
  way["waterway"~"^(river|canal|stream)$"](45.3500,11.9200,45.5350,12.3550);
  way["natural"="water"](45.3500,11.9200,45.5350,12.3550);
);
out geom tags;