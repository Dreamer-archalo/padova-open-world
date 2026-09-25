"""Convert OSM sea/river bank polygons and oriented coastlines to game metres.
Unlike a line's fallback nominal width, tagged riverbank multipolygons reflect
actual channel and port-basin outlines. Inner multipolygon rings are dry islands.
© OpenStreetMap contributors, ODbL 1.0.
"""
from math import hypot

def assemble_rings(members, project, tolerance=0.8):
    """Stitch relation member ways into closed outer/inner rings."""
    rings=[]
    for role in ("outer","inner"):
        pieces=[]
        for member in members:
            if member.get("role","outer") != role or len(member.get("geometry") or [])<2:continue
            pts=[project(p) for p in member["geometry"]]
            if len(pts)>1:pieces.append(pts)
        while pieces:
            ring=pieces.pop(0)
            if len(ring)>3 and hypot(ring[-1][0]-ring[0][0],ring[-1][1]-ring[0][1])<tolerance:
                rings.append((role,ring));continue
            limit=len(pieces)+2
            for _ in range(limit):
                found=False
                for i,p in enumerate(pieces):
                    if hypot(ring[-1][0]-p[0][0],ring[-1][1]-p[0][1])<tolerance:
                        ring.extend(p[1:]);pieces.pop(i);found=True;break
                    if hypot(ring[-1][0]-p[-1][0],ring[-1][1]-p[-1][1])<tolerance:
                        ring.extend(list(reversed(p[:-1])));pieces.pop(i);found=True;break
                if not found:break
                if len(ring)>3 and hypot(ring[-1][0]-ring[0][0],ring[-1][1]-ring[0][1])<tolerance:
                    rings.append((role,ring));break
    return rings

def ingest_hydrology(doc, project, simplify, areas, shorelines, seen):
    for e in doc.get("elements",[]):
        tags=e.get("tags") or {}
        natural=tags.get("natural")
        coastal=natural=="coastline"
        waterbody=(natural=="water" or tags.get("waterway")=="riverbank"
          or tags.get("landuse") in ("basin","reservoir","salt_pond")
          or tags.get("water") in ("dock","basin","lagoon","harbour","lake","river")
          or tags.get("man_made")=="dock")
        land=(tags.get("landuse") in ("industrial","residential","commercial","retail","port","harbour")
          or tags.get("leisure") in ("park","garden")
          or natural in ("wood","scrub"))
        if not (coastal or waterbody or land):continue
        oid=(e.get("type","way"),e.get("id"))
        if oid in seen:continue
        seen.add(oid)
        if coastal:
            geom=e.get("geometry") or []
            if len(geom)<2:continue
            p=[project(g) for g in geom]
            closed=hypot(p[-1][0]-p[0][0],p[-1][1]-p[0][1])<.8
            # Never invent a rectangular coast polygon from an open way.
            if closed:
                p=simplify(p,.65)
                if p[0]==p[-1]:p.pop()
                if len(p)>=3:
                    shorelines.append({"p":p,"closed":True,"osm":e["id"]})
                    area={"p":p,"k":"land","osm":e["id"],"n":"Island"}
                    xs=[x for x,_ in p];zs=[z for _,z in p]
                    if max(xs)-min(xs)<8500 and max(zs)-min(zs)<8500:areas.append(area)
            else:
                # Keep each original projected node and the OSM direction.
                # Segment indexing later ignores ways outside the lagoon.
                shorelines.append({"p":p,"closed":False,"osm":e["id"]})
            continue

        geometries=[]
        if e.get("type")=="relation":
            geometries=assemble_rings(e.get("members",[]),project)
        else:
            geom=e.get("geometry") or []
            if len(geom)>=4:
                p=[project(g) for g in geom]
                if hypot(p[-1][0]-p[0][0],p[-1][1]-p[0][1])<.8:
                    geometries=[("outer",p)]
        for role,p in geometries:
            if len(p)<4:continue
            p=simplify(p,.38 if waterbody else .8)
            if hypot(p[0][0]-p[-1][0],p[0][1]-p[-1][1])<.8:p.pop()
            if len(p)<3:continue
            xs=[x for x,_ in p];zs=[z for _,z in p]
            if max(xs)-min(xs)>8500 or max(zs)-min(zs)>8500:continue
            # The inner ring of a water multipolygon is NOT water.
            kind="land" if role=="inner" else "water" if waterbody else "land"
            areas.append({"p":p,"k":kind,"n":tags.get("name",""),"osm":e["id"]})
