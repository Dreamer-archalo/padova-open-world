import * as THREE from './vendor/three.module.js';
import {dist,angleDiff,clamp} from './core.js';
export class TrafficSignals{
 constructor(graph,mapped=[]){this.graph=graph;this.junctions=new Map();
  const incoming=new Map();for(const s of graph.segments){if(s.road.k==='pedestrian'||s.road.junction==='roundabout'||s.road.roundabout||/motorway|trunk/.test(s.road.k))continue;const direction=s.road.oneway??(s.road.one?1:0);for(const [from,to] of [[s.a,s.b],[s.b,s.a]]){if(direction===1&&to===s.a||direction===-1&&to===s.b)continue;const a=graph.nodes[from],n=graph.nodes[to];if(!incoming.has(to))incoming.set(to,[]);incoming.get(to).push({from,road:s.road,yaw:Math.atan2(n.x-a.x,n.z-a.z)});}}
  const occupied=[];
  for(const [id,approaches] of incoming){const n=graph.nodes[id],unique=approaches.filter((a,i)=>approaches.findIndex(b=>Math.abs(angleDiff(a.yaw,b.yaw))<.3)===i),isMapped=mapped.some(([x,z])=>Math.hypot(n.x-x,n.z-z)<30);
   if(unique.length<2||(!isMapped&&(unique.length<3||!unique.some(a=>['primary','secondary'].includes(a.road.k)))))continue;
   if(occupied.some(j=>dist(j,n)<35))continue;
   const radius=Math.max(5,...unique.map(a=>a.road.w/2+2)),j={id,x:n.x,z:n.z,offset:(id%7)*3,approaches:unique,radius,mapped:isMapped};this.junctions.set(id,j);occupied.push(j);
  }this.group=new THREE.Group();this.visible=[];this.lastCell='';}

 phase(id,time,heading){const j=this.junctions.get(id);if(!j)return 'green';const phase=(time+j.offset)%30,axis=Math.abs(Math.sin(heading))>.707?1:0;if(phase<12)return axis===0?'green':'red';if(phase<14)return axis===0?'amber':'red';if(phase<15)return 'red';if(phase<27)return axis===1?'green':'red';if(phase<29)return axis===1?'amber':'red';return 'red';}
 allowed(id,time,heading){return this.phase(id,time,heading)==='green';}
 update(scene,terrain,x,z,time){const key=Math.floor(x/200)+','+Math.floor(z/200);if(key!==this.lastCell){this.lastCell=key;for(const o of this.group.children)o.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});this.group.clear();this.visible=[];
  for(const j of this.junctions.values())if(Math.hypot(j.x-x,j.z-z)<350)for(const approach of j.approaches){
   const {yaw,road}=approach,offset=road.w/2+.65,px=j.x-Math.sin(yaw)*j.radius-Math.cos(yaw)*offset,pz=j.z-Math.cos(yaw)*j.radius+Math.sin(yaw)*offset;
   if(terrain.roads.candidates(px,pz).some(s=>s.road!==road))continue;
   const g=new THREE.Group(),pole=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,4,6),new THREE.MeshStandardMaterial({color:'#606862'}));pole.position.y=2;g.add(pole);const housing=new THREE.Mesh(new THREE.BoxGeometry(.38,1.05,.3),new THREE.MeshStandardMaterial({color:'#293436'}));housing.position.y=3.45;g.add(housing);const bulbs=[];for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.12,6,4),new THREE.MeshBasicMaterial({color:'#26312c'}));m.position.set(0,3.76-i*.3,.18);g.add(m);bulbs.push(m);}g.position.set(px,terrain.height(px,pz),pz);g.rotation.y=yaw+Math.PI;this.group.add(g);this.visible.push({j,yaw,bulbs});
   // Stop bar and pedestrian stripes sit across the incoming lane, before the node.
   const laneWidth=road.oneway?road.w:road.w/2,lateral=road.oneway?0:-road.w/4;
   for(let i=-1;i<Math.floor(road.w/.9);i++){const lateralMark=i<0?lateral:-road.w/2+.45+i*.9,along=i<0?j.radius+.4:j.radius-1.1;
    const mx=j.x-Math.sin(yaw)*along+Math.cos(yaw)*lateralMark,mz=j.z-Math.cos(yaw)*along-Math.sin(yaw)*lateralMark;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(i<0?laneWidth:.45,i<0?.25:1.7),new THREE.MeshBasicMaterial({color:'#d9d6c4'}));m.rotation.set(-Math.PI/2,0,-yaw);m.position.set(mx,terrain.roads.sample(road,mx,mz)+.1,mz);this.group.add(m);
   }
  }if(!this.group.parent)scene.add(this.group);
 }for(const {j,yaw,bulbs} of this.visible){const p=this.phase(j.id,time,yaw);bulbs.forEach((b,i)=>b.material.color.set(i===(p==='red'?0:p==='amber'?1:2)?['#ff4234','#ffc547','#5cff8a'][i]:'#26312c'));}}

}
export function lanePoint(node,from,road){const yaw=Math.atan2(node.x-from.x,node.z-from.z),offset=(road?.oneway??road?.one)?0:Math.min(1.55,(road?.w||6)/4);return {x:node.x-Math.cos(yaw)*offset,z:node.z+Math.sin(yaw)*offset,yaw};}
export function trafficSpeed(car,target,actors,signals,time){const yaw=Math.atan2(target.x-car.x,target.z-car.z),turn=Math.abs(angleDiff(yaw,car.yaw)),limit=car.road?.k?.includes('motorway')?24:['primary','secondary'].includes(car.road?.k)?14:car.road?.k==='pedestrian'?3:9;let speed=Math.min(car.spec.max*.7,turn>.7?4:limit*(car.driver||1));
 const j=signals.junctions?.get(car.target),remaining=dist(car,target)-(j?.radius||3)-car.spec.length/2;
 if(!signals.allowed(car.target,time,yaw)&&remaining> -car.spec.length)speed=Math.min(speed,remaining<.25?0:Math.sqrt(2*car.spec.brake*.65*Math.max(0,remaining)));
 if(!signals.allowed(car.target,time,yaw)&&dist(car,target)<7)speed=0;
 for(const other of actors){if(other===car||!other.mesh?.visible||Math.abs((other.y||0)-(car.y||0))>3)continue;const dx=other.x-car.x,dz=other.z-car.z,ahead=dx*Math.sin(car.yaw)+dz*Math.cos(car.yaw),side=Math.abs(dx*Math.cos(car.yaw)-dz*Math.sin(car.yaw)),gap=ahead-(car.spec.length+(other.spec?.length||1))/2;if(ahead>0&&side<(car.spec.width+(other.spec?.width||1))/2+.35&&gap<Math.max(4,car.speed*1.3))speed=Math.min(speed,Math.max(0,(gap-2)*.6));}return speed;
}
