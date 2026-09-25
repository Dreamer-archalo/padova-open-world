"""Convert a light OpenStreetMap Padova→Venezia corridor extract to world coordinates.
Usage: python prepare_corridor.py /tmp/corridor-overpass.json
Map data © OpenStreetMap contributors, ODbL 1.0.
"""
import json, math, pathlib, re, sys

ORIGIN=[45.4064,11.8768]
KX=111320*math.cos(math.radians(ORIGIN[0]))
KZ=111320

def project(g):
    return [round((g["lon"]-ORIGIN[1])*KX,1),round((ORIGIN[0]-g["lat"])*KZ,1)]

def number(value,default):
    try:return float(re.search(r"[\d.]+",str(value)).group())
    except (ValueError,AttributeError):return default

def simplify(points,tol=1.2):
    if len(points)<3:return points
    ax,az=points[0]; bx,bz=points[-1]; dx=bx-ax; dz=bz-az; den=dx*dx+dz*dz
    best=0; idx=0
    for i,(x,z) in enumerate(points[1:-1],1):
        t=max(0,min(1,((x-ax)*dx+(z-az)*dz)/den)) if den else 0
        d=(x-ax-t*dx)**2+(z-az-t*dz)**2
        if d>best:best=d;idx=i
    if best>tol*tol:return simplify(points[:idx+1],tol)[:-1]+simplify(points[idx:],tol)
    return [points[0],points[-1]]

widths={"motorway":13,"motorway_link":7,"trunk":12,"trunk_link":7,"primary":10,"primary_link":7,
        "secondary":9,"secondary_link":7,"tertiary":8,"tertiary_link":6,"unclassified":6.5,
        "residential":6.5,"living_street":5.5,"service":4.2,"pedestrian":3.6,
        "footway":2.0,"path":1.7,"steps":1.7,"cycleway":2.2}
src=json.load(open(sys.argv[1]))
roads=[];water=[];areas=[];buildings=[]
road_ids=set()

def add_road(e, tolerance=.7):
    tags=e.get("tags",{});geom=e.get("geometry",[]);kind=tags.get("highway")
    if kind not in widths or len(geom)<2 or e["id"] in road_ids:return
    # Local narrow streets need their original junction/bridge geometry.
    points=[project(g) for g in geom]
    p=points if kind in ("footway","pedestrian","steps","path","cycleway") else simplify(points,tolerance)
    if len(p)<2:return
    roads.append({"p":p,"w":max(1.3,min(28,number(tags.get("width"),widths[kind]))),
      "k":kind,"n":tags.get("name",""),"b":tags.get("bridge","no") not in ("no","false","0"),
      "one":tags.get("oneway")=="yes",
      "layer":int(tags.get("layer","0") or 0) if str(tags.get("layer","0")).lstrip("-").isdigit() else 0})
    road_ids.add(e["id"])
for e in src.get("elements",[]):
    tags=e.get("tags",{});geom=e.get("geometry",[])
    if len(geom)<2:continue
    p=simplify([project(g) for g in geom],.7 if "highway" in tags else 1.5)
    if "highway" in tags and tags["highway"] in widths:
        add_road(e)
    elif tags.get("waterway") in ("river","canal","stream"):
        k=tags["waterway"];water.append({"p":p,"w":max(2,min(90,number(tags.get("width"),{"river":35,"canal":14,"stream":5}[k]))),"k":k})
    elif tags.get("natural")=="water" and len(p)>=4:
        if p[0]==p[-1]:p.pop()
        if len(p)>=3:areas.append({"p":p,"k":"water"})

# Dedicated focused extract supplies walkable local street networks in each
# specifically requested detailed municipality. Keep main transit extraction
# lean and discard duplicates across overlapping bounding boxes.
if len(sys.argv)>3:
    local=json.load(open(sys.argv[3],encoding="utf-8"))
    if len(local.get("elements",[]))<150:
        raise ValueError("Detailed municipality street extract is unexpectedly small")
    for e in local["elements"]:
        add_road(e,.3)

# Local rural/suburban connectors bridge the gaps between designated towns.
# Merge by OSM way ID before building the combined regional data.
if len(sys.argv)>4:
    backroads=json.load(open(sys.argv[4],encoding="utf-8"))
    if len(backroads.get("elements",[]))<150:
        raise ValueError("Backroad corridor extract unexpectedly small")
    for e in backroads["elements"]:
        add_road(e,.55)

# Building footprints in the key corridor communes are downloaded as a second,
# narrower OSM extract, so regional transport does not depend on a huge query.
if len(sys.argv)>2:
    extra=json.load(open(sys.argv[2]))
    for e in extra.get("elements",[]):
        tags=e.get("tags",{});geom=e.get("geometry",[])
        if "building" not in tags or len(geom)<4:continue
        pts=simplify([project(g) for g in geom],.38)
        if pts and pts[0]==pts[-1]:pts.pop()
        if len(pts)<3:continue
        levels=number(tags.get("building:levels"),2+e["id"]%3)
        height=number(tags.get("height"),levels*3)
        if tags["building"] in ("shed","garage","garages","roof"):height=min(height,5)
        x=sum(p[0] for p in pts)/len(pts)
        lod="energy"
        for lat,lon,r in [
            (45.44004,12.07439,1050),(45.4259,12.0773,1500),
            (45.43851,12.13862,1150),(45.46531,12.11765,850),
            (45.45141,12.17107,1500),(45.469,12.231,1600),
            (45.457,12.265,2400)
        ]:
            cx=round((lon-ORIGIN[1])*KX,1);cz=round((ORIGIN[0]-lat)*KZ,1)
            if math.hypot(x-cx,sum(p[1] for p in pts)/len(pts)-cz)<r:lod="detailed";break
        buildings.append({"p":pts,"h":round(max(2.6,min(75,height)),1),
                          "n":tags.get("name",""),"t":tags["building"],"c":e["id"]%7,"lod":lod})

def place(name,lat,lon,tag):
    x,z=project({"lat":lat,"lon":lon});return {"name":name,"x":x,"z":z,"tag":tag}

places=[
 place("Padova Est",45.4162,11.9530,"Ingresso corridoio verso Venezia"),
 place("Cazzago",45.44004,12.07439,"Centro dettagliato"),
 place("Dolo",45.4259,12.0773,"Centro dettagliato"),
 place("Mira Porte",45.43851,12.13862,"Centro dettagliato"),
 place("Marano Veneziano",45.46531,12.11765,"Centro dettagliato"),
 place("Oriago",45.45141,12.17107,"Centro dettagliato"),
 place("Marghera",45.469,12.231,"Centro dettagliato"),
 place("Porto Marghera",45.457,12.265,"Porti e terminal merci"),
 place("Mestre",45.4931,12.2427,"Terraferma veneziana"),
 place("Ponte della Libertà",45.4567,12.2965,"Collegamento con la laguna"),
 place("Piazzale Roma",45.4380,12.3182,"Fine accesso automobilistico")
]
xs=[q for r in roads for q,_ in r["p"]];zs=[q for r in roads for _,q in r["p"]]
bounds=[min(xs)-500,min(zs)-500,max(xs)+500,max(zs)+500] if xs else [5000,-9000,39000,9000]
out={"origin":ORIGIN,"bounds":[round(v,1) for v in bounds],"buildings":buildings,"roads":roads,"areas":areas,"water":water,
     "places":places,"attribution":"© OpenStreetMap contributors","source":"https://www.openstreetmap.org/copyright",
     "license":"ODbL 1.0","dataDate":src.get("osm3s",{}).get("timestamp_osm_base",""),
     "scale":"One world unit = one metre; Padova global origin."}
dest=pathlib.Path(__file__).parent/"dist/data/corridor.json"
dest.write_text(json.dumps(out,separators=(",",":")))
print(json.dumps({"buildings":len(buildings),"roads":len(roads),"water":len(water),"areas":len(areas),"bounds":out["bounds"],"bytes":dest.stat().st_size}))
