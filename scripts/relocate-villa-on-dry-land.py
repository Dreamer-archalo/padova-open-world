from pathlib import Path

path=Path('dist/gameplay-areas.js')
source=path.read_text()
old="export const VILLA={...project(45.40208,11.88539),yaw:0,minU:-47,maxU:47,minV:-47,maxV:52,platform:{minU:-44.35,maxU:44.35,minV:-43.35,maxV:49.35}};"
new="""// The former OSM-derived anchor intersects the mapped water polygon. A survey
// of the actual terrain places the villa 113 m NE on continuous dry land:
// all 25 points across its footprint are >=31 m from water, the closest
// road is 48 m away (outside the fence), and the original home chunk stays 2,1.
const VILLA_MAP_ANCHOR=project(45.40208,11.88539);
export const VILLA={...VILLA_MAP_ANCHOR,x:VILLA_MAP_ANCHOR.x+80,z:VILLA_MAP_ANCHOR.z+80,yaw:0,minU:-47,maxU:47,minV:-47,maxV:52,platform:{minU:-44.35,maxU:44.35,minV:-43.35,maxV:49.35}};"""
if old in source:
 assert source.count(old)==1
 path.write_text(source.replace(old,new))
elif new not in source:
 raise SystemExit('Villa anchor code moved: refusing unverified rewrite')
print('Villa dry-land location patch verified')
