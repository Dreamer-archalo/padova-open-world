import * as THREE from './vendor/three.module.js';
import {nearestOnSegment,dist,project,angleDiff,clamp} from './core.js';
import {box,shape,label,freeze} from './scene-primitives.js';

export const VELOX_SOURCE='https://www.polizialocalepadova.it/index.php/2013-06-25-09-00-27/2013-07-02-09-57-13/rilevamenti-sanzionatori-elettronici/autovelox';
// Official road, chainage and direction; geometry is matched to the bundled OSM
// road and referenced exit. These are game placements, not surveyed coordinates.
export const CAMERA_SITES=[
 {id:'1A',road:'Corso John e Robert Kennedy',km:'6+246',cross:'Corso Stati Uniti',offset:440,heading:Math.PI,limit:90},
 {id:'1B',road:'Corso John e Robert Kennedy',km:'5+248',cross:'Corso Stati Uniti',offset:1438,heading:0,limit:90},
 {id:'2B',road:'Corso John e Robert Kennedy',km:'6+686',cross:'Corso Stati Uniti',offset:0,heading:0,limit:90},
 {id:'PD1',road:'Corso Primo Maggio',km:'2+694',fromWest:2694,heading:Math.PI/2,limit:90},
 {id:'PD2',road:'Corso Primo Maggio',km:'1+951',fromWest:1951,heading:-Math.PI/2,limit:90},
 {id:'4A',road:'Corso Boston',km:'7+400',hint:[-3490,3350],heading:Math.PI/2,limit:70},
 {id:'5A',road:'Corso Boston',km:'8+350',cross:'Via Armistizio',heading:Math.PI/2,limit:90},
 {id:'4B',road:'Corso Australia',km:'3+400',cross:'Via Chiesanuova',heading:Math.PI,limit:90},
 {id:'6B',road:'Corso Australia',km:'1+264',hint:[-2050,-3000],heading:Math.PI,limit:90},
 {id:'7B',road:'Corso Australia',km:'4+100 SP47',cross:'Via Po',heading:Math.PI,limit:90},
 {id:'PD3',road:'Corso Australia',km:'5+190',cross:'Via dei Colli',heading:0,limit:90},
 {id:'PD4',road:'Nuova Strada del Santo',km:'1+300',hint:[3660,-4660],heading:0,limit:90}
];
function alongRoad(roads,anchor,distance,heading){
 const edges=roads.flatMap(r=>r.p.slice(1).map((b,i)=>({a:r.p[i],b})));let point={...anchor},remaining=distance,previous=-1,direction=heading;
 for(let step=0;step<2000&&remaining>.01;step++){
  let best=null,score=Infinity;
  for(let i=0;i<edges.length;i++){if(i===previous)continue;const e=edges[i],q=nearestOnSegment(point.x,point.z,e.a,e.b);
   if(dist(q,point)>20)continue;
   for(const end of [e.a,e.b]){const length=Math.hypot(end[0]-q.x,end[1]-q.z);if(length<.05)continue;const yaw=Math.atan2(end[0]-q.x,end[1]-q.z),angle=Math.abs(angleDiff(yaw,direction));if(angle>1.4)continue;const value=dist(q,point)+angle*5;if(value<score){score=value;best={i,q,end,length,yaw};}}
  }
  if(!best)break;const t=Math.min(1,remaining/best.length);point={x:best.q.x+(best.end[0]-best.q.x)*t,z:best.q.z+(best.end[1]-best.q.z)*t};remaining-=best.length;previous=best.i;direction=best.yaw;
 }
 return {...point,unmappedDistance:Math.max(0,remaining)};
}
export function cameraPlacements(map,terrain){
 const sites=[];
 for(const site of CAMERA_SITES){
  const roads=map.roads.filter(r=>r.n===site.road&&!r.k.endsWith('_link'));
  const western=roads.flatMap(r=>r.p).sort((a,b)=>a[0]-b[0])[0];
  const reference=site.fromWest?[western]:site.cross?map.roads.filter(r=>r.n?.toLowerCase()===site.cross.toLowerCase()).flatMap(r=>r.p):[site.hint];
  let anchor=null,best=Infinity;
  for(const r of roads)for(let i=1;i<r.p.length;i++)for(const p of reference){if(!p)continue;const q=nearestOnSegment(...p,r.p[i-1],r.p[i]),d=Math.hypot(q.x-p[0],q.z-p[1]);if(d<best){best=d;anchor=q;}}
  if(!anchor)continue;
  // Chainage difference from the Stati Uniti crossing measured southwards along
  // the road, rather than inventing unrelated urban radar locations.
  const target=site.fromWest?alongRoad(roads,anchor,site.fromWest,Math.PI/2):site.offset?alongRoad(roads,anchor,site.offset,0):anchor;let match=null;best=Infinity;
  for(const r of roads)for(let i=1;i<r.p.length;i++){
   const a=r.p[i-1],b=r.p[i],q=nearestOnSegment(target.x,target.z,a,b),yaw=Math.atan2(b[0]-a[0],b[1]-a[1])+(r.oneway===-1?Math.PI:0);
   const headingError=Math.abs(angleDiff(yaw,site.heading));
   if((r.oneway||r.one)&&headingError>Math.PI/2)continue;
   const score=dist(q,target);if(score<best){best=score;match={...q,road:r,yaw:(r.oneway||r.one)?yaw:site.heading};}
  }
  if(!match)continue;
  const y=terrain.roads.sample(match.road,match.x,match.z)+.05;
  sites.push({...site,x:match.x,z:match.z,y,yaw:match.yaw,road:match.road,roadName:site.road,approximationMetres:best+(target.unmappedDistance||0),placement:'approximate chainage on mapped road',source:VELOX_SOURCE,cooldownUntil:0,armed:true});
 }
 return sites;
}

export class SpeedCameras{
 constructor(env){Object.assign(this,env);this.sites=cameraPlacements(this.data,this.terrain);this.previous=null;this.root=new THREE.Group();this.scene.add(this.root);
  for(const s of this.sites){const group=new THREE.Group(),side=s.road.w/2+1.3;group.position.set(s.x,s.y,s.z);group.rotation.y=s.yaw;
   box(group,'#777f7c',-side,1.6,0,.18,3.2,.18);box(group,'#e7b536',-side,2.3,0,.8,1.1,.65);shape(group,'sphere','#1a323d',-side,2.5,.34,.15,.15,.035);
   for(const along of [0,-85]){box(group,'#79847d',-side,1.7,along,.13,3.4,.13);const sign=label(along?'CONTROLLO VELOCITÀ':String(s.limit),'#182b30','#f0e9d3',along?5:1.7,1.3);sign.position.set(-side,3.8,along);group.add(sign);}
   freeze(group);this.root.add(group);s.mesh=group;
  }
 }
 update(){const s=this.state,p=this.previous;this.previous={x:s.x,z:s.z,y:s.y,car:s.car};
  for(const radar of this.sites){const d=dist(s,radar);radar.mesh.visible=d<500;if(d>45)radar.armed=true;
   if(!s.car||s.car.spec.aircraft||s.car.spec.boat||!p||p.car!==s.car||dist(s,p)>30||Math.abs(s.y-radar.y)>3||!radar.armed||s.elapsed<radar.cooldownUntil)continue;
   const dx=s.x-p.x,dz=s.z-p.z,den=dx*Math.sin(radar.yaw)+dz*Math.cos(radar.yaw);if(den<=0)continue;
   const before=(p.x-radar.x)*Math.sin(radar.yaw)+(p.z-radar.z)*Math.cos(radar.yaw),after=(s.x-radar.x)*Math.sin(radar.yaw)+(s.z-radar.z)*Math.cos(radar.yaw);
   if(before>0||after<0)continue;const t=clamp(-before/den,0,1),x=p.x+dx*t,z=p.z+dz*t,lateral=Math.abs((x-radar.x)*Math.cos(radar.yaw)-(z-radar.z)*Math.sin(radar.yaw));
   if(lateral>radar.road.w/2)continue;radar.armed=false;radar.cooldownUntil=s.elapsed+12;
   if(Math.abs(s.speed)*3.6>radar.limit){s.money-=25;this.save();this.toast('MULTA AUTOVELOX -25',4);}
  }
 }
}
