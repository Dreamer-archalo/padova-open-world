"""Merge Padova, the road corridor and Venice into one global metre-based dataset."""
import json, math, pathlib

ROOT=pathlib.Path(__file__).parent
PADOVA_ORIGIN=[45.4064,11.8768]
KX=111320*math.cos(math.radians(PADOVA_ORIGIN[0]))
KZ=111320
# Playable/display envelope. OSM ways crossing an extract boundary can carry
# remote vertices; they remain in source data but must not stretch the world map.
PLAYABLE_BOUNDS=[-6500,-12000,39000,9000]

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
    # The Venice Overpass query is the historic city + Giudecca. Use that
    # geographic envelope instead of way vertices that can continue outside it.
    sw=global_point(-2095.0,1246.6,origin)
    ne=global_point(1813.0,-1425.1,origin)
    out["bounds"]=[min(sw[0],ne[0]),min(sw[1],ne[1]),max(sw[0],ne[0]),max(sw[1],ne[1])]
    return out

padova=json.load(open(ROOT/"dist/data/padova.json"))
corridor=json.load(open(ROOT/"dist/data/corridor.json"))
venice=convert_venice(json.load(open(ROOT/"dist/data/venice.json")))

corridor_buildings=[b for b in corridor.get("buildings",[]) if max(p[0] for p in b["p"])>7100]
buildings=[*padova.get("buildings",[]),*corridor_buildings,*venice.get("buildings",[])]
roads=[*padova.get("roads",[]),*corridor.get("roads",[]),*venice.get("roads",[])]
water=[*padova.get("water",[]),*corridor.get("water",[]),*venice.get("water",[])]
areas=[*padova.get("areas",[]),*corridor.get("areas",[]),*venice.get("areas",[])]
shorelines=corridor.get("shorelines",[])
bounds=PLAYABLE_BOUNDS
places=[
 {"name":"Padova","tag":"Centro città","x":-150,"z":-49},
 *corridor.get("places",[]),
 *venice.get("places",[])
]
out={"version":1,"origin":PADOVA_ORIGIN,"bounds":bounds,"buildings":buildings,"roads":roads,"water":water,"areas":areas,"shorelines":shorelines,
     "places":places,"regions":{"padova":padova.get("bounds"),"corridor":corridor.get("bounds"),"venice":venice.get("bounds")},
     "attribution":"© OpenStreetMap contributors","source":"https://www.openstreetmap.org/copyright","license":"ODbL 1.0",
     "scale":"One world unit = one metre; unified Padova origin."}
dest=ROOT/"dist/data/world-padova-venice.json";dest.write_text(json.dumps(out,separators=(",",":")))
print(json.dumps({"buildings":len(buildings),"roads":len(roads),"water":len(water),"areas":len(areas),"bounds":bounds,"bytes":dest.stat().st_size}))

# Regional chunks are shipped separately: loading the full 90k-building
# Padova JSON a second time would waste memory and stall the user's current game.
regional={
 "version":1,"origin":PADOVA_ORIGIN,"bounds":PLAYABLE_BOUNDS,
 "buildings":corridor_buildings+venice.get("buildings",[]),
 "roads":[r for r in corridor.get("roads",[]) if max(p[0] for p in r["p"])>7000]+venice.get("roads",[]),
 "water":[w for w in corridor.get("water",[]) if max(p[0] for p in w["p"])>7000]+venice.get("water",[]),
 "areas":[a for a in corridor.get("areas",[]) if max(p[0] for p in a["p"])>7000]+venice.get("areas",[]),
 "shorelines":[s for s in shorelines if max(p[0] for p in s["p"])>26000],
 "places":corridor.get("places",[])+venice.get("places",[]),
 "attribution":"© OpenStreetMap contributors","source":"https://www.openstreetmap.org/copyright","license":"ODbL 1.0"
}
regionalDest=ROOT/"dist/data/region-padova-venice.json"
regionalDest.write_text(json.dumps(regional,separators=(",",":"),ensure_ascii=False),encoding="utf-8")
print(json.dumps({"regionalBuildings":len(regional["buildings"]),
                  "regionalRoads":len(regional["roads"]),
                  "regionalBytes":regionalDest.stat().st_size}))
