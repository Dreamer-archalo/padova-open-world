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
        "residential":6.5,"living_street":5.5}
src=json.load(open(sys.argv[1]))
roads=[];water=[];areas=[]
for e in src.get("elements",[]):
    tags=e.get("tags",{});geom=e.get("geometry",[])
    if len(geom)<2:continue
    p=simplify([project(g) for g in geom],.7 if "highway" in tags else 1.5)
    if "highway" in tags and tags["highway"] in widths:
        k=tags["highway"];roads.append({"p":p,"w":max(2,min(28,number(tags.get("width"),widths[k]))),
          "k":k,"n":tags.get("name",""),"b":tags.get("bridge") in ("yes","viaduct"),
          "one":tags.get("oneway")=="yes","layer":int(tags.get("layer","0") or 0) if str(tags.get("layer","0")).lstrip("-").isdigit() else 0})
    elif tags.get("waterway") in ("river","canal","stream"):
        k=tags["waterway"];water.append({"p":p,"w":max(2,min(90,number(tags.get("width"),{"river":35,"canal":14,"stream":5}[k]))),"k":k})
    elif tags.get("natural")=="water" and len(p)>=4:
        if p[0]==p[-1]:p.pop()
        if len(p)>=3:areas.append({"p":p,"k":"water"})

def place(name,lat,lon,tag):
    x,z=project({"lat":lat,"lon":lon});return {"name":name,"x":x,"z":z,"tag":tag}

places=[
 place("Padova Est",45.4162,11.9530,"Ingresso corridoio verso Venezia"),
 place("Dolo",45.4252,12.0828,"Riviera del Brenta"),
 place("Mira",45.4348,12.1348,"Riviera del Brenta"),
 place("Marghera",45.4700,12.2530,"Area industriale e porto"),
 place("Mestre",45.4931,12.2427,"Terraferma veneziana"),
 place("Ponte della Libertà",45.4567,12.2965,"Collegamento con la laguna"),
 place("Piazzale Roma",45.4380,12.3182,"Fine accesso automobilistico")
]
xs=[q for r in roads for q,_ in r["p"]];zs=[q for r in roads for _,q in r["p"]]
bounds=[min(xs)-500,min(zs)-500,max(xs)+500,max(zs)+500] if xs else [5000,-9000,39000,9000]
out={"origin":ORIGIN,"bounds":[round(v,1) for v in bounds],"buildings":[],"roads":roads,"areas":areas,"water":water,
     "places":places,"attribution":"© OpenStreetMap contributors","source":"https://www.openstreetmap.org/copyright",
     "license":"ODbL 1.0","dataDate":src.get("osm3s",{}).get("timestamp_osm_base",""),
     "scale":"One world unit = one metre; Padova global origin."}
dest=pathlib.Path(__file__).parent/"dist/data/corridor.json"
dest.write_text(json.dumps(out,separators=(",",":")))
print(json.dumps({"roads":len(roads),"water":len(water),"areas":len(areas),"bounds":out["bounds"],"bytes":dest.stat().st_size}))
