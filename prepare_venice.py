"""Convert a public OpenStreetMap Overpass extract for the Venice playable scene.
Usage: python prepare_venice.py /absolute/path/to/overpass.json
Map data © OpenStreetMap contributors, ODbL 1.0.
"""
import json, math, pathlib, re, sys

ORIGIN = [45.4342, 12.3388]  # Piazza San Marco reference
KX = 111320 * math.cos(math.radians(ORIGIN[0]))
KZ = 111320

def project_geo(lat, lon):
    return [round((lon - ORIGIN[1]) * KX, 1), round((ORIGIN[0] - lat) * KZ, 1)]

def project(p):
    return project_geo(p["lat"], p["lon"])

def number(value, default):
    try:
        return float(re.search(r"-?[\d.]+", str(value)).group())
    except (ValueError, AttributeError):
        return default

def simplify(points, tol=.35):
    if len(points) < 3:
        return points
    ax, az = points[0]
    bx, bz = points[-1]
    dx, dz = bx - ax, bz - az
    den = dx * dx + dz * dz
    best, idx = 0, 0
    for i, (x, z) in enumerate(points[1:-1], 1):
        t = max(0, min(1, ((x-ax)*dx + (z-az)*dz) / den)) if den else 0
        d = (x-ax-t*dx)**2 + (z-az-t*dz)**2
        if d > best:
            best, idx = d, i
    if best > tol * tol:
        return simplify(points[:idx+1], tol)[:-1] + simplify(points[idx:], tol)
    return [points[0], points[-1]]

def canal_width(tags):
    explicit = number(tags.get("width"), 0)
    if explicit > 0:
        return max(2.5, min(180, explicit))
    name = tags.get("name", "").lower()
    if "giudecca" in name:
        return 115
    if "canal grande" in name or "canale grande" in name:
        return 42
    if "canale" in name:
        return 24
    if "rio" in name:
        return 8
    return {"canal": 10, "river": 22, "stream": 5, "ditch": 3, "drain": 3}.get(tags.get("waterway"), 9)

ROAD_WIDTHS = {
    "pedestrian": 4.2, "footway": 2.2, "path": 1.8, "steps": 2.0,
    "living_street": 4.8, "residential": 5.4, "service": 3.8,
    "unclassified": 4.8, "cycleway": 2.2, "track": 2.6,
    "primary": 8.0, "secondary": 7.0, "tertiary": 6.0
}

src = json.load(open(sys.argv[1], encoding="utf-8"))
buildings, roads, areas, water = [], [], [], []
all_points = []

for e in src.get("elements", []):
    tags = e.get("tags", {})
    geom = e.get("geometry", [])
    if len(geom) < 2:
        continue
    pts = [project(g) for g in geom]
    all_points.extend(pts)
    name = tags.get("name", "")

    if "building" in tags and len(pts) >= 4:
        p = simplify(pts, .22)
        if p and p[0] == p[-1]:
            p.pop()
        if len(p) < 3:
            continue
        levels = number(tags.get("building:levels"), 2 + (e["id"] % 4))
        height = number(tags.get("height"), levels * 3.05)
        if tags["building"] in ("shed", "garage", "garages", "roof"):
            height = min(height, 4.2)
        height = max(2.6, min(65, height))
        buildings.append({
            "p": p, "h": round(height, 1), "n": name,
            "t": tags.get("building", "yes"), "c": e["id"] % 7
        })
        continue

    highway = tags.get("highway")
    if highway in ROAD_WIDTHS:
        p = pts  # preserve junction nodes and bridge geometry
        width = number(tags.get("width"), ROAD_WIDTHS[highway])
        roads.append({
            "p": p, "w": round(max(1.3, min(14, width)), 1),
            "k": highway, "n": name,
            "bridge": tags.get("bridge", "no") not in ("no", "false", "0"),
            "tunnel": tags.get("tunnel", "no") not in ("no", "false", "0")
        })
        continue

    if tags.get("waterway") in ("river", "canal", "stream", "ditch", "drain"):
        p = simplify(pts, .35)
        water.append({
            "p": p, "w": round(canal_width(tags), 1),
            "k": tags.get("waterway"), "n": name
        })
        continue

    if tags.get("natural") == "water" and len(pts) >= 4:
        p = simplify(pts, .45)
        if p and p[0] == p[-1]:
            p.pop()
        if len(p) >= 3:
            areas.append({"p": p, "k": "water", "n": name})
        continue

    if tags.get("leisure") in ("park", "garden") and len(pts) >= 4:
        p = simplify(pts, .45)
        if p and p[0] == p[-1]:
            p.pop()
        if len(p) >= 3:
            areas.append({"p": p, "k": tags["leisure"], "n": name})

if not all_points:
    raise SystemExit("No Venice geometry returned by Overpass")

xs = [p[0] for p in all_points]
zs = [p[1] for p in all_points]
pad = 80
bounds = [
    round(min(xs)-pad, 1), round(min(zs)-pad, 1),
    round(max(xs)+pad, 1), round(max(zs)+pad, 1)
]

places_geo = [
    ("Piazza San Marco", "San Marco", 45.43415, 12.33846),
    ("Ponte di Rialto", "Canal Grande", 45.43804, 12.33591),
    ("Venezia Santa Lucia", "Stazione", 45.44103, 12.32104),
    ("Piazzale Roma", "Accesso da terraferma", 45.43868, 12.31811),
    ("Arsenale", "Castello", 45.43557, 12.35363),
    ("Accademia", "Dorsoduro", 45.43194, 12.32880),
    ("Giudecca", "Canale della Giudecca", 45.42676, 12.32970),
]
places = [{"name": n, "tag": tag, "x": project_geo(lat, lon)[0], "z": project_geo(lat, lon)[1]}
          for n, tag, lat, lon in places_geo]

out = {
    "city": "Venezia",
    "origin": ORIGIN,
    "bounds": bounds,
    "spawn": {"name": "Piazzale Roma", "x": project_geo(45.43868, 12.31811)[0], "z": project_geo(45.43868, 12.31811)[1]},
    "places": places,
    "buildings": buildings,
    "roads": roads,
    "areas": areas,
    "water": water,
    "attribution": "© OpenStreetMap contributors",
    "source": "https://www.openstreetmap.org/copyright",
    "license": "ODbL 1.0",
    "dataDate": src.get("osm3s", {}).get("timestamp_osm_base", ""),
    "scale": "One world unit = one metre; building heights inferred where OSM lacks height tags."
}

dest = pathlib.Path(__file__).parent / "dist/data/venice.json"
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
print(json.dumps({
    "buildings": len(buildings), "roads": len(roads), "areas": len(areas),
    "water": len(water), "bytes": dest.stat().st_size, "bounds": bounds
}, ensure_ascii=False))
