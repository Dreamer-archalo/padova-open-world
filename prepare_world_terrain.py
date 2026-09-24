"""Build a regional DEM covering Padova, the Brenta corridor, Mestre and Venice.
Uses the same Terrarium/Mapzen source and attribution as prepare_terrain.py.
"""
import argparse, concurrent.futures, hashlib, json, math, pathlib, urllib.request
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates

ORIGIN=[45.4064,11.8768]

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--cache",type=pathlib.Path,default=pathlib.Path("/tmp/padova-venice-terrain"));args=ap.parse_args()
    args.cache.mkdir(parents=True,exist_ok=True)
    zoom,size,step=12,256,96
    x0,z0,x1,z1=-7000,-9500,44000,9500
    width=int((x1-x0)//step)+1;height=int((z1-z0)//step)+1
    xs,zs=np.meshgrid(x0+np.arange(width)*step,z0+np.arange(height)*step)
    lon=ORIGIN[1]+xs/(111320*math.cos(math.radians(ORIGIN[0])))
    lat=np.radians(ORIGIN[0]-zs/111320)
    px=(lon+180)/360*2**zoom*size
    py=(1-np.arcsinh(np.tan(lat))/np.pi)/2*2**zoom*size
    tx0,tx1=int(px.min()//size),int(px.max()//size);ty0,ty1=int(py.min()//size),int(py.max()//size)
    tiles=[(x,y) for x in range(tx0,tx1+1) for y in range(ty0,ty1+1)]
    def download(tile):
        x,y=tile;path=args.cache/f"{x}-{y}.png";url=f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{zoom}/{x}/{y}.png"
        if not path.exists():
            with urllib.request.urlopen(url,timeout=60) as response:content=response.read()
            Image.open(__import__("io").BytesIO(content)).verify();path.write_bytes(content)
        rgb=np.array(Image.open(path).convert("RGB"),dtype=float)
        elev=rgb[:,:,0]*256+rgb[:,:,1]+rgb[:,:,2]/256-32768
        return x,y,elev,{"url":url,"sha256":hashlib.sha256(path.read_bytes()).hexdigest()}
    mosaic=np.zeros(((ty1-ty0+1)*size,(tx1-tx0+1)*size));sources=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for x,y,elev,source in pool.map(download,tiles):
            mosaic[(y-ty0)*size:(y-ty0+1)*size,(x-tx0)*size:(x-tx0+1)*size]=elev;sources.append(source)
    sampled=map_coordinates(mosaic,[py-ty0*size-.5,px-tx0*size-.5],order=1,mode="nearest")
    grid=gaussian_filter(sampled,sigma=1.6,mode="nearest")
    assert np.isfinite(grid).all() and grid.min()>-30 and grid.max()<180
    matrix=np.column_stack([np.ones(xs.size),xs.ravel(),zs.ravel()])
    plane=np.linalg.lstsq(matrix,grid.ravel(),rcond=None)[0]
    result={"version":1,"x0":x0,"z0":z0,"step":step,"width":width,"height":height,"origin":ORIGIN,"verticalScale":1,
      "units":"metres","heights":np.round(grid,2).ravel().tolist(),"waterPlane":plane.tolist(),
      "source":"Mapzen Terrain Tiles / EU-DEM, SRTM and GMTED; Terrarium z12",
      "attribution":"Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers; SRTM and GMTED courtesy of the U.S. Geological Survey.",
      "sourceInfo":"https://github.com/tilezen/joerd/blob/master/docs/attribution.md",
      "processing":"96 m regional grid; Gaussian smoothing; no vertical exaggeration.","tiles":sources}
    dest=pathlib.Path(__file__).parent/"dist/data/world-terrain.json";dest.write_text(json.dumps(result,separators=(",",":"))+"\n")
    print(f"{dest}: {width}x{height}, {grid.min():.2f}–{grid.max():.2f} m, {len(sources)} tiles")
if __name__=="__main__":main()
