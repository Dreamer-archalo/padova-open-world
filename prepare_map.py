"""Convert a public OpenStreetMap Overpass extract into compact local game data.
Usage: python prepare_map.py /absolute/path/to/overpass.json
Map data © OpenStreetMap contributors, ODbL 1.0.
"""
import json, math, sys, pathlib, re

ORIGIN = [45.4064, 11.8768]
KX = 111320 * math.cos(math.radians(ORIGIN[0]))
KZ = 111320

def project(p):
    return [round((p['lon']-ORIGIN[1])*KX,1), round((ORIGIN[0]-p['lat'])*KZ,1)]

def number(v, default):
    try: return float(re.search(r'[\d.]+', str(v)).group())
    except (ValueError, AttributeError): return default

def simplify(points, tol=.4):
    if len(points)<3: return points
    ax,az=points[0]; bx,bz=points[-1]; dx=bx-ax; dz=bz-az; den=dx*dx+dz*dz
    best=0; idx=0
    for i,(x,z) in enumerate(points[1:-1],1):
        t=max(0,min(1,((x-ax)*dx+(z-az)*dz)/den)) if den else 0
        d=(x-ax-t*dx)**2+(z-az-t*dz)**2
        if d>best: best=d;idx=i
    if best>tol*tol: return simplify(points[:idx+1],tol)[:-1]+simplify(points[idx:],tol)
    return [points[0],points[-1]]

src=json.load(open(sys.argv[1])); buildings=[];roads=[];areas=[];water=[];names=[]
widths={'motorway':13,'motorway_link':7,'trunk':12,'trunk_link':7,'primary':10,'primary_link':7,'secondary':9,'secondary_link':7,'tertiary':8,'tertiary_link':6,'residential':6.5,'living_street':5.5,'unclassified':6.5,'service':4.5,'pedestrian':7,'footway':2.1,'path':2,'cycleway':2.5,'steps':2,'track':3.5}
for e in src.get('elements',[]):
    t=e.get('tags',{}); geom=e.get('geometry',[])
    if len(geom)<2: continue
    # Keep road nodes: apparently collinear nodes can be shared junctions.
    p=[project(g) for g in geom] if 'highway' in t else simplify([project(g) for g in geom]); name=t.get('name','')
    if 'building' in t and len(p)>=4:
        if p[0]==p[-1]: p.pop()
        if len(p)<3: continue
        levels=number(t.get('building:levels'),2+(e['id']%3))
        h=number(t.get('height'),levels*3.1)
        if t['building'] in ['garage','garages','shed','roof']: h=3.2
        if t['building'] in ['industrial','warehouse']: h=min(h,12)
        h=max(2.5,min(110,h))
        buildings.append({'p':p,'h':round(h,1),'c':e['id']%7,'n':name,'t':t['building']})
        if name and any(w.lower() in name.lower() for w in ['basilica','ragione','scrovegni','specola','duomo','pedrocchi']): names.append([name,p[0],h])
    elif 'highway' in t and t['highway'] in widths:
        k=t['highway'];w=number(t.get('width'),widths[k]);w=max(1.5,min(28,w))
        roads.append({'p':p,'w':w,'k':k,'n':name,'b':t.get('bridge')=='yes','one':t.get('oneway')=='yes'})
    elif 'waterway' in t and t['waterway'] in ['river','canal','stream','ditch','drain']:
        k=t['waterway'];water.append({'p':p,'w':number(t.get('width'),{'river':30,'canal':12,'stream':5,'ditch':2,'drain':2}[k])})
    elif t.get('natural')=='water' and len(p)>=4:
        areas.append({'p':p,'k':'water'})
    elif t.get('leisure') in ['park','garden','pitch'] and len(p)>=4:
        areas.append({'p':p,'k':t['leisure']})
out={'origin':ORIGIN,'bounds':[-6020,-6530,7300,6280],'buildings':buildings,'roads':roads,'areas':areas,'water':water,'attribution':'© OpenStreetMap contributors','source':'https://www.openstreetmap.org/copyright','license':'ODbL 1.0','dataDate':src.get('osm3s',{}).get('timestamp_osm_base',''),'scale':'One world unit = one metre; inferred heights where OSM lacks height tags.'}
dest=pathlib.Path(__file__).parent/'dist/data/padova.json';dest.write_text(json.dumps(out,separators=(',',':')))
print(json.dumps({'buildings':len(buildings),'roads':len(roads),'areas':len(areas),'water':len(water),'bytes':dest.stat().st_size,'landmarks':names},ensure_ascii=False))
