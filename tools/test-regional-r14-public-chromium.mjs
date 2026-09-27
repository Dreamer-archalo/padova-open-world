// Real public R14 smoke: load the actual OSM regional dataset in Chromium,
// visit several distinct streamed town sectors, render real NPC models via
// WebGL and exercise the shared vehicle physics, not source-string assertions.
import {chromium} from 'playwright';
const root='https://dreamer-archalo.github.io/padova-open-world/preview/unified/';
const browser=await chromium.launch({headless:true,args:[
 '--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage'
]});
const page=await browser.newPage({viewport:{width:1150,height:760},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push('PAGE '+(e.stack||e.message)));
page.on('requestfailed',r=>errors.push('REQUEST '+r.url()+' '+r.failure()?.errorText));
try{
 await page.goto(root+'?v=R14browser',{waitUntil:'domcontentloaded',timeout:90000});
 const check=await page.evaluate(async()=>{
  const [THREE,{RegionalWorld},{SpatialIndex},{REGIONAL_ZONES}]=await Promise.all([
   import('./vendor/three.module.js'),
   import('./regional-world.js?v=physical-npcs-r14'),
   import('./core.js'),
   import('./unified-regions.js')
  ]);
  const [map,grid]=await Promise.all([
   fetch('./data/region-padova-venice.json').then(r=>{if(!r.ok)throw Error('Regional OSM '+r.status);return r.json();}),
   fetch('./data/world-terrain.json').then(r=>{if(!r.ok)throw Error('Region DEM '+r.status);return r.json();})
  ]);
  if(map.buildings.length<2000||map.roads.length<100)throw Error('Actual regional map is incomplete');
  const scene=new THREE.Scene(),collision=new SpatialIndex(80),world=new RegionalWorld(scene,map,grid,collision);
  const terrain={height:(x,z,ref)=>world.height(x,z,ref),slope:()=>0,waterAt:()=>null,arcadeRamps:[]},
   player={x:14000,z:300,y:2,mode:'foot',car:null,speed:0},cars=[];
  world.attachTraffic({cars,terrain,player,collision});
  world.quality='hyper';
  const locations=['Dolo','Mira Porte','Marghera','Mestre'];
  const results=[];
  for(const name of locations){
   const place=REGIONAL_ZONES.find(z=>z.name===name);
   if(!place)throw Error('Missing destination '+name);
   world.focus={x:place.x,z:place.z};
   const candidates=[...world.chunks.entries()]
    .filter(([,c])=>c.roads.some(r=>r.w>=3.5&&!/footway|path|cycleway|pedestrian/.test(r.k)&&r.a[0]>7430))
    .map(([k,c])=>({k,d:Math.min(...c.roads.map(r=>Math.hypot((r.a[0]+r.b[0])*.5-place.x,(r.a[1]+r.b[1])*.5-place.z)))}))
    .filter(o=>o.d<1250).sort((a,b)=>a.d-b.d);
   if(!candidates.length)throw Error('No real roads near '+name);
   let group=null,local=[];
   for(const sector of candidates.slice(0,9)){
    world.build(sector.k);
    const g=world.visible.get(sector.k);
    local=(g.userData.ambient||[]).filter(a=>a.regionalTraffic);
    if(local.length){group=g;break;}
   }
   if(!group)throw Error('No regional NPC spawned in '+name);
   if(local.some(a=>!a.mesh.isGroup||!a.damageVisual||!a.registered||!a.spec))
    throw Error('Block placeholder or no real physics for NPC in '+name);
   if(group.userData.ambient.some(a=>a.person&&!a.mesh.isGroup))
    throw Error('Grey-block pedestrian in '+name);
   const npc=local[0],initial={x:npc.x,z:npc.z};
   player.x=npc.x-110;player.z=npc.z+75;player.y=npc.y;
   for(let frame=0;frame<32;frame++)world.updateRegionalCar(npc,.05,frame*.05+.01);
   results.push({town:name,models:local.length,identity:npc.style,
    physicsJumpState:!!npc.jump,metres:Math.round(Math.hypot(npc.x-initial.x,npc.z-initial.z)*100)/100,
    actualGeometry:npc.mesh.children.length});
  }
  const canvas=document.createElement('canvas');canvas.width=460;canvas.height=300;
  canvas.style.cssText='position:fixed;bottom:10px;right:10px;z-index:9999;border:2px solid white';
  document.body.append(canvas);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});
  renderer.setSize(460,300);
  scene.add(new THREE.HemisphereLight(0xe9f3f1,0x65735b,2.7));
  const d=REGIONAL_ZONES.find(z=>z.name==='Dolo'),
   camera=new THREE.PerspectiveCamera(60,460/300,.1,800);
  camera.position.set(d.x+25,36,d.z-35);camera.lookAt(d.x,4,d.z);
  renderer.render(scene,camera);
  return {results,realModels:cars.length,renderCalls:renderer.info.render.calls,
   regionalBuildings:map.buildings.length};
 });
 console.log('REAL_PUBLIC_REGIONAL_NPCS',JSON.stringify(check));
 console.log('BROWSER_JS_ERRORS',JSON.stringify(errors.slice(-20)));
 if(check.results.length!==4||check.results.some(v=>v.models<1||!v.physicsJumpState||v.actualGeometry<3)||
    check.renderCalls<1)throw Error('R14 real OSM/WebGL NPC acceptance failed');
 await page.screenshot({path:'regional-r14-real-npc-webgl.png'});
}catch(e){process.exitCode=1;console.log('PUBLIC_R14_FAILURE',e.stack||e);
 console.log('BROWSER_ERRORS',JSON.stringify(errors.slice(-20)));
 await page.screenshot({path:'regional-r14-real-npc-webgl.png'}).catch(()=>{});
}finally{await browser.close();}
