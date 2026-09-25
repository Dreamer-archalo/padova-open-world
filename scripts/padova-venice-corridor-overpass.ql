[out:json][timeout:90];
(
  way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link)$"](45.3850,11.9200,45.4550,12.1600);
  way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link)$"](45.4000,12.1200,45.5100,12.3000);
  way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link)$"](45.4200,12.2600,45.4700,12.3550);
  way["waterway"~"^(river|canal|stream)$"](45.3850,11.9200,45.5100,12.3550);
  way["natural"="water"](45.3850,11.9200,45.5100,12.3550);
);
out geom tags;