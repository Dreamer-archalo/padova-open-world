"""Convert a supplementary OSM export without replacing existing building footprints.
Usage: python prepare_city.py /path/to/overpass.json
Query and attribution: docs/city-systems.md. Geometry matching never guesses by name alone.
"""
import json,sys,math,pathlib,hashlib
root=pathlib.Path(__file__).parent
base=json.loads((root/'dist/data/padova.json').read_text());src=json.load(open(sys.argv[1]));kx=111320*math.cos(math.radians(45.4064))
def point(p):return [round((p['lon']-11.8768)*kx,1),round((45.4064-p['lat'])*111320,1)]
def sig(p):return tuple(map(tuple,p))
lookup={sig(r['p']):i for i,r in enumerate(base['roads'])};wlookup={sig(r['p']):i for i,r in enumerate(base['water'])}
updates=[];matched=0;water=[];tracks=[];stops=[];signals=[];zones=[]
for e in src['elements']:
 t=e.get('tags',{});p=[point(g) for g in e.get('geometry',[])];layer=int(t.get('layer','0')) if t.get('layer','0').lstrip('-').isdigit() else 0
 props={'id':e['id'],'layer':layer,'tunnel':t.get('tunnel','no') not in ['no','false','0'],'bridge':t.get('bridge','no') not in ['no','false','0'],'oneway':-1 if t.get('oneway')=='-1' else 1 if t.get('oneway') in ['yes','1'] or t.get('junction')=='roundabout' else 0}
 if 'highway' in t and len(p)>1:
  i=lookup.get(sig(p))
  if i is not None:
   matched+=1;r=base['roads'][i];patch={'i':i}
   for key,value,default in [('layer',layer,0),('tunnel',props['tunnel'],False),('bridge',props['bridge'],bool(r.get('b'))),('oneway',props['oneway'],1 if r.get('one') else 0),('access',t.get('motor_vehicle',t.get('vehicle',t.get('access','yes'))),'yes'),('junction',t.get('junction',''),'')]:
    if value!=default:patch[key]=value
   if t.get('lanes'):patch['lanes']=t['lanes']
   if len(patch)>1:updates.append(patch)
 if 'waterway' in t and len(p)>1:
  # Original converter simplified waterways. Match endpoints and their order.
  for i,r in enumerate(base['water']):
   if r['p'][0]==p[0] and r['p'][-1]==p[-1]:water.append({'i':i,'tunnel':props['tunnel'],'layer':layer,'kind':t['waterway'],'name':t.get('name','')});break
 if t.get('railway')=='tram' and len(p)>1 and t.get('service') not in ['yard','siding','spur']:tracks.append({'p':p,'w':2.5,'k':'tram','n':t.get('name','Tram'),'b':props['bridge'],**props})
 if t.get('railway')=='tram_stop' and e.get('lat'):stops.append({'p':point(e),'name':t.get('name','Tram stop')})
 if t.get('highway')=='traffic_signals' and e.get('lat'):signals.append(point(e))
 kind=t.get('landuse',t.get('natural',''))
 if kind in ['industrial','commercial','retail','residential','forest','wood','farmland','meadow','grass','recreation_ground','brownfield'] and len(p)>3:zones.append({'p':p,'k':kind})
result={'version':1,'date':src.get('osm3s',{}).get('timestamp_osm_base'),'source':'https://www.openstreetmap.org/copyright','license':'ODbL-1.0','baseSha256':hashlib.sha256((root/'dist/data/padova.json').read_bytes()).hexdigest(),'baseRoadCount':len(base['roads']),'matchedRoads':matched,'roads':updates,'water':water,'tracks':tracks,'stops':stops,'signals':signals,'zones':zones}
(root/'dist/data/city.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
print({k:len(result[k]) for k in ['roads','water','tracks','stops','signals','zones']})
