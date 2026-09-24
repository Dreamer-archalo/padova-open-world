"""Merge Padova, the road corridor and Venice into one global metre-based dataset."""
import json, math, pathlib

ROOT=pathlib.Path(__file__).parent
PADOVA_ORIGIN=[45.4064,11.8768]
KX=111320*math.cos(math.radians(PADOVA_ORIGIN[0]))
KZ=111320

def global_point(x,z,origin):
    lat=origin[0]-z/111320
    lon=origin[1]+x/(111320*math.cos(math.radians(origin[0])))
    return [round((lon-PADOVA_ORIGIN[1])*KX,1),round((PADOVA_ORIGIN[0]-lat)*KZ,1)]

def convert_venice(v):
    origin=v.get("origin",[45.4342,12.3388])
    def pts(p):return [global_point(x,z,origin) for x,z in p]
    out={**v,"origin":PADOVA_ORIGIN}
    out["buildings"]=[{**b,"p":pts(b["p"])} for b in v.get("buildings",[])]
    out["roads"]=[{**r,"p":pts(r["p"])} for r in v.get("roads",[])]
    out["water"]=[{**w,"p":pts(w["p"])} for w in v.get("water",[])]
    out["areas"]=[{**a,"p":pts(a["p"])} for a in v.get("areas",[])]
    out["places"]=[]
    for p in v.get("places",[]):
        x,z=global_point(p["x"],p["z"],origin);out["places"].append({**p,"x":x,"z":z})
    if v.get("spawn"):
        x,z=global_point(v["spawn"]["x"],v["spawn"]["z"],origin);out["spawn"]={**v["spawn"],"x":x,"z":z}
    return out

padova=json.load(open(ROOT/"dist/data/padova.json"))
corridor=json.load(open(ROOT/"dist/data/corridor.json"))
venice=convert_venice(json.load(open(ROOT/"dist/data/venice.json")))

buildings=[*padova.get("buildings",[]),*venice.get("buildings",[])]
roads=[*padova.get("roads",[]),*corridor.get("roads",[]),*venice.get("roads",[])]
water=[*padova.get("water",[]),*corridor.get("water",[]),*venice.get("water",[])]
areas=[*padova.get("areas",[]),*corridor.get("areas",[]),*venice.get("areas",[])]

allx=[];allz=[]
for group in (buildings,roads,water,areas):
    for item in group:
        for x,z in item.get("p",[]):allx.append(x);allz.append(z)
bounds=[round(min(allx)-400,1),round(min(allz)-400,1),round(max(allx)+400,1),round(max(allz)+400,1)]
places=[
 {"name":"Padova","tag":"Centro città","x":-150,"z":-49},
 *corridor.get("places",[]),
 *venice.get("places",[])
]
out={"version":1,"origin":PADOVA_ORIGIN,"bounds":bounds,"buildings":buildings,"roads":roads,"water":water,"areas":areas,
     "places":places,"regions":{"padova":padova.get("bounds"),"corridor":corridor.get("bounds"),"venice":venice.get("bounds")},
     "attribution":"© OpenStreetMap contributors","source":"https://www.openstreetmap.org/copyright","license":"ODbL 1.0",
     "scale":"One world unit = one metre; unified Padova origin."}
dest=ROOT/"dist/data/world-padova-venice.json";dest.write_text(json.dumps(out,separators=(",",":")))
print(json.dumps({"buildings":len(buildings),"roads":len(roads),"water":len(water),"areas":len(areas),"bounds":bounds,"bytes":dest.stat().st_size}))
