"""Synthetic acceptance check: riverbank outlines, dry islands and coastline orientation."""
from prepare_hydro_geometry import ingest_hydrology, assemble_rings, point_inside

def geo(x,y):return {"lon":x,"lat":y}
def proj(p):return [p["lon"],p["lat"]]
def simple(p,tol):return p
def member(role,coords):return {"type":"way","role":role,"geometry":[geo(*p) for p in coords]}
outer=[[0,0],[100,0],[100,100],[0,100],[0,0]]
inner=[[30,30],[30,70],[70,70],[70,30],[30,30]]
elements=[
 {"type":"relation","id":15,"tags":{"type":"multipolygon","natural":"water"},
  "members":[member("outer",outer[:3]),member("outer",outer[2:]),
             member("inner",inner)]},
 {"type":"way","id":16,"tags":{"natural":"coastline"},"geometry":[geo(200,0),geo(240,0)]},
 {"type":"way","id":17,"tags":{"natural":"coastline"},"geometry":[geo(300,0),geo(340,0),
   geo(340,40),geo(300,40),geo(300,0)]},
 {"type":"way","id":18,"tags":{"natural":"water"},"geometry":[geo(130,0),geo(160,0),geo(160,30),geo(130,30),geo(130,0)]}
]
areas=[];shores=[];seen=set()
ingest_hydrology({"elements":elements},proj,simple,areas,shores,seen)
mapped=[a for a in areas if a["k"]=="water"]
assert len(mapped)>=2,mapped
lake=next(a for a in mapped if a.get("osm")==15)
assert len(lake.get("holes",[]))==1,lake
assert point_inside(20,20,lake["p"]) and not point_inside(50,50,lake["holes"][0])
assert any(a["k"]=="land" and a.get("osm")==15 for a in areas)
assert any(s.get("osm")==16 and not s["closed"] for s in shores)
assert any(s.get("osm")==17 and s["closed"] for s in shores)
assert not any(a.get("osm")==16 for a in areas),"Open coastline must not fabricate a filled polygon"
print("PASS: stitched multipolygon riverbank, dry island hole, natural water and real open/closed coastlines.")
