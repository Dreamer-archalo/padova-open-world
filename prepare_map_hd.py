"""Optional full-detail 2D map enrichment; never affects the streamed 3D world.
Usage: python prepare_map_hd.py [/tmp/map-hd-west.json /tmp/map-hd-east.json]
All coordinates use the exact Padova unified world-metre origin.
© OpenStreetMap contributors, ODbL 1.0.
"""
import json, math, pathlib, re, sys
ORIGIN=(45.4064,11.8768)
KX=111320*math.cos(math.radians(ORIGIN[0]))
KZ=111320
ROOT=pathlib.Path(__file__).parent
WIDTHS={"motorway":13,"trunk":12,"primary":10,"secondary":9,"tertiary":8,
        "residential":6.5,"unclassified":6.5,"service":4.2,"living_street":5.5,
        "footway":2,"pedestrian":3.6,"cycleway":2.2,"path":1.7,"steps":1.7,"track":3}
def number(v,fallback):
    try:return float(re.search(r"-?[0-9.]+",str(v)).group())
    except (ValueError,AttributeError):return fallback
def project(g):
    return [round((g["lon"]-ORIGIN[1])*KX,1),round((ORIGIN[0]-g["lat"])*KZ,1)]
def simplify(points,tol):
    if len(points)<3:return points
    a,b=points[0],points[-1];dx=b[0]-a[0];dz=b[1]-a[1];den=dx*dx+dz*dz
    maxdist=0;idx=0
    for i,p in enumerate(points[1:-1],1):
        t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/den)) if den else 0
        dist=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dz)**2
        if dist>maxdist:maxdist=dist;idx=i
    if maxdist>tol*tol:return simplify(points[:idx+1],tol)[:-1]+simplify(points[idx:],tol)
    return [a,b]

out={"version":1,"origin":list(ORIGIN),"buildings":[],"roads":[],"areas":[],"water":[],
     "attribution":"© OpenStreetMap contributors","license":"ODbL 1.0","mapOnly":True}
seen=set()
for path in sys.argv[1:]:
    path=pathlib.Path(path)
    if not path.exists():continue
    try:elements=json.loads(path.read_text(encoding="utf-8")).get("elements",[])
    except (ValueError,OSError):continue
    for e in elements:
        oid=(e.get("type","way"),e.get("id"))
        if oid in seen:continue
        seen.add(oid)
        g=e.get("geometry") or []
        if len(g)<2:continue
        tag=e.get("tags") or {}
        p=[project(x) for x in g]
        # These polygons are for detailed 2D viewing, not simplification to
        # blurry energy boxes; retain quarter-metre geometry where available.
        if "building" in tag and len(p)>=4 and p[0]==p[-1]:
            shape=simplify(p,.25)
            if shape[0]==shape[-1]:shape.pop()
            if len(shape)>=3:
                out["buildings"].append({"p":shape,"lod":"detailed","n":tag.get("name","")})
        elif tag.get("highway") in WIDTHS:
            kind=tag["highway"]
            points=p if kind in ("footway","steps","pedestrian","path","cycleway") else simplify(p,.25)
            if len(points)>=2:out["roads"].append({"p":points,"k":kind,
                 "w":round(max(1.3,min(28,number(tag.get("width"),WIDTHS[kind]))),1),
                 "n":tag.get("name","")})
dest=ROOT/"dist/data/map-hd-extras.json"
dest.parent.mkdir(parents=True,exist_ok=True)
dest.write_text(json.dumps(out,separators=(",",":"),ensure_ascii=False),encoding="utf-8")
print(json.dumps({"mapOnly":True,"extrasBuildings":len(out["buildings"]),
                  "extrasRoads":len(out["roads"]),"bytes":dest.stat().st_size}))
