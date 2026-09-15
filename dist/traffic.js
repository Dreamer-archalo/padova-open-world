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
   const laneWidth=road.oneway?road.w:road.w/2,lateral=road.oneway?0:-road.w/4;
   for(let i=-1;i<Math.floor(road.w/.9);i++){const lateralMark=i<0?lateral:-road.w/2+.45+i*.9,along=i<0?j.radius+.4:j.radius-1.1;
    const mx=j.x-Math.sin(yaw)*along+Math.cos(yaw)*lateralMark,mz=j.z-Math.cos(yaw)*along-Math.sin(yaw)*lateralMark;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(i<0?laneWidth:.45,i<0?.25:1.7),new THREE.MeshBasicMaterial({color:'#d9d6c4'}));m.rotation.set(-Math.PI/2,0,-yaw);m.position.set(mx,terrain.roads.sample(road,mx,mz)+.1,mz);this.group.add(m);
   }
  }if(!this.group.parent)scene.add(this.group);
 }for(const {j,yaw,bulbs} of this.visible){const p=this.phase(j.id,time,yaw);bulbs.forEach((b,i)=>b.material.color.set(i===(p==='red'?0:p==='amber'?1:2)?['#ff4234','#ffc547','#5cff8a'][i]:'#26312c'));}}

}
export function laneCount(road){const w=road?.w||6;if(road?.oneway??road?.one){const base=Math.floor((w-.5)/3.2);return /motorway|trunk/.test(road?.k||'')&&w>=6.2?clamp(Math.max(2,base),1,3):clamp(base,1,3);}return clamp(Math.floor(w/6),1,3);}
export function laneOffset(road,lane=0){
 const count=laneCount(road),i=clamp(Math.round(lane),0,count-1),w=road?.w||6;
 if(road?.oneway??road?.one){const laneWidth=Math.min(3.4,(w-.8)/count);return (i-(count-1)/2)*laneWidth;}
 const laneWidth=Math.min(3.3,(w/2-.5)/count);return -w/2+.5+laneWidth*(i+.5);
}
export function lanePoint(node,from,road,lane=0){const yaw=Math.atan2(node.x-from.x,node.z-from.z),offset=typeof lane==='object'?lane.offset:laneOffset(road,lane);return {x:node.x+Math.cos(yaw)*offset,z:node.z-Math.sin(yaw)*offset,yaw,offset};}
export function laneClearance(car,road,lane,actors,yaw=car.yaw){
 const targetOffset=laneOffset(road,lane),currentOffset=car.laneOffset??laneOffset(road,car.lane||0);let front=Infinity,rear=Infinity,frontActor=null;
 for(const other of actors){if(other===car||!other.mesh?.visible||Math.abs((other.y||0)-(car.y||0))>3)continue;const dx=other.x-car.x,dz=other.z-car.z,ahead=dx*Math.sin(yaw)+dz*Math.cos(yaw),side=dx*Math.cos(yaw)-dz*Math.sin(yaw)+currentOffset,girth=(car.spec.width+(other.spec?.width||1))/2+.55;if(Math.abs(side-targetOffset)>girth)continue;const gap=Math.abs(ahead)-(car.spec.length+(other.spec?.length||1))/2;if(ahead>=0&&gap<front){front=gap;frontActor=other;}else if(ahead<0)rear=Math.min(rear,gap);
 }return {front,rear,frontActor};
}
function scooterMood(car){if(!['scooter','motorcycle'].includes(car.style))return null;if(car.scooterMood)return car.scooterMood;const seed=(car.mesh?.id||Math.round((car.x+car.z)*3))%12;car.scooterSeed=Math.abs(seed);car.scooterMood=['group','group','wheelie','zigzag','zigzag','normal','group','wheelie','normal','zigzag','normal','group'][Math.abs(seed)]||'normal';return car.scooterMood;}
function scooterVisual(car,time,mood){if(!mood||!car.mesh)return;if(!car.scooterVisualBase)car.scooterVisualBase=[...car.mesh.children].map(o=>({o,rx:o.rotation.x,y:o.position.y}));const phase=(time+(car.scooterSeed||0)*1.7)%10,wheelie=mood==='wheelie'&&car.speed>7&&phase>2.2&&phase<5.4,blend=wheelie?Math.min(1,(phase-2.2)*2,(5.4-phase)*2):0,angle=-.30*Math.max(0,blend),lift=.22*Math.max(0,blend);for(const v of car.scooterVisualBase){if(!v.o.parent)continue;v.o.rotation.x=v.rx+angle;v.o.position.y=v.y+lift;}car.mesh.userData.npcScooterMood=mood;}
export function trafficLane(car,target,actors,player,time,nextYaw=null){
 const count=laneCount(car.road);car.lane=clamp(car.lane||0,0,count-1);let desired=clamp(car.desiredLane??car.lane,0,count-1),yaw=Math.atan2(target.x-car.x,target.z-car.z),remaining=dist(car,target),mood=scooterMood(car);
 scooterVisual(car,time,mood);
 const safe=lane=>{const q=laneClearance(car,car.road,lane,actors,yaw);return q.front>Math.max(10,car.speed*.8)&&q.rear>Math.max(9,car.speed*.45);};
 if(nextYaw!==null&&remaining<75){const turn=angleDiff(nextYaw,yaw);desired=turn>.3?count-1:0;car.laneReason='svincolo';}
 else if(time>=(car.laneDecisionAt||0)){
  const here=laneClearance(car,car.road,desired,actors,yaw),dx=(player?.x??Infinity)-car.x,dz=(player?.z??Infinity)-car.z,behind=dx*Math.sin(yaw)+dz*Math.cos(yaw),side=dx*Math.cos(yaw)-dz*Math.sin(yaw),fastPlayer=player&&behind<0&&behind>-55&&Math.abs(side)<2.2&&Math.abs(player.speed||0)>car.speed+8;
  if(mood==='zigzag'&&count>1){const options=[desired-1,desired+1].filter(l=>l>=0&&l<count&&safe(l));if(options.length){desired=options[(Math.floor(time*1.7)+(car.scooterSeed||0))%options.length];car.laneReason='scooter zigzag';car.scooterSlalom=true;}}
  else if(fastPlayer&&desired>0&&safe(desired-1)&&((car.mesh?.id||Math.round((car.driver||1)*100))%4===0)){desired--;car.laneReason='libera corsia';}
  else if(here.front<Math.max(14,car.speed*1.45)&&desired<count-1&&safe(desired+1)){desired++;car.overtakeUntil=time+5;car.laneReason='sorpasso';}
  else if(desired>0&&time>(car.overtakeUntil||0)&&safe(desired-1)){desired--;car.laneReason='rientro';}
  else{const options=[desired-1,desired+1].filter(l=>l>=0&&l<count&&safe(l)).map(l=>({lane:l,...laneClearance(car,car.road,l,actors,yaw)})).sort((a,b)=>b.front-a.front);if(options[0]&&options[0].front>here.front+22&&((car.mesh?.id||0)+Math.floor(time/4))%3===0){desired=options[0].lane;car.laneReason='corsia libera';}}
  car.laneDecisionAt=time+(mood==='zigzag'?1.35:mood==='group'?4.5:3)+((car.mesh?.id||0)%5)*.35;
 }
 if(mood==='zigzag'&&count===1){const centre=laneOffset(car.road,desired),room=Math.max(.18,Math.min(.55,((car.road?.w||6)-car.spec.width-1.2)/4));car.laneOffset=centre+Math.sin(time*2.15+(car.scooterSeed||0))*room;}
 car.desiredLane=desired;return desired;
}
export function advanceTrafficSpeed(car,desired,dt){const wanted=clamp((desired-car.speed)/Math.max(dt,1/60),-car.spec.brake*.72,car.spec.accel*.72),jerk=wanted<(car.longAccel||0)?car.spec.brake*3:car.spec.accel*2.2;car.longAccel=(car.longAccel||0)+clamp(wanted-(car.longAccel||0),-jerk*dt,jerk*dt);car.speed=Math.max(0,car.speed+car.longAccel*dt);if(desired===0&&car.speed<.08){car.speed=0;car.longAccel=0;}return car.speed;}
function roundaboutRoad(road){return road?.junction==='roundabout'||road?.roundabout===true||road?.j==='roundabout';}
export function trafficSpeed(car,target,actors,signals,time,{nextYaw=null}={}){const yaw=Math.atan2(target.x-car.x,target.z-car.z),turn=Math.abs(angleDiff(yaw,car.yaw)),road=car.road,k=road?.k||'',limit=/motorway|trunk/.test(k)?31:k==='primary'?18:k==='secondary'?15:k==='pedestrian'?3:10,family=car.spec.family||car.style||'',mood=scooterMood(car),moodFactor=mood==='group'?1.12:mood==='wheelie'?1.08:mood==='zigzag'?1.06:1,classFactor=(['sport','supercar'].includes(family)?1.1:['freight','work','van','truck','utility'].includes(family)?.86:1)*moodFactor,curve=clamp(1-turn/1.25,.3,1);let speed=Math.min(car.spec.max*.86,limit*(car.driver||1)*classFactor)*curve;
 if(mood==='group'){const friend=actors.find(a=>a!==car&&['scooter','motorcycle'].includes(a.style)&&a.mesh?.visible&&dist(a,car)<35);if(friend)speed=Math.min(car.spec.max*.88,Math.max(speed,friend.speed*.97));}
 if(nextYaw!==null){const bend=Math.abs(angleDiff(nextYaw,yaw)),remaining=dist(car,target);if(remaining<Math.max(28,car.speed*2.2))speed=Math.min(speed,Math.max(5,limit*clamp(1-bend/1.45,.28,1)));}
 const enteringRoundabout=!roundaboutRoad(road)&&roundaboutRoad(car.plannedEdge?.road),distanceToEntry=dist(car,target);if(enteringRoundabout&&distanceToEntry<24){const circulating=actors.some(other=>other!==car&&other.mesh?.visible&&roundaboutRoad(other.road)&&Math.abs((other.y||0)-(car.y||0))<3&&dist(other,target)<28);if(circulating)speed=Math.min(speed,distanceToEntry<5?0:Math.max(1.5,(distanceToEntry-3)*.42));}
 const j=signals.junctions?.get(car.target),remaining=dist(car,target)-(j?.radius||3)-car.spec.length/2;
 if(!signals.allowed(car.target,time,yaw)&&remaining> -car.spec.length)speed=Math.min(speed,remaining<.25?0:Math.sqrt(2*car.spec.brake*.65*Math.max(0,remaining)));
 if(!signals.allowed(car.target,time,yaw)&&dist(car,target)<7)speed=0;
 for(const other of actors){if(other===car||!other.mesh?.visible||Math.abs((other.y||0)-(car.y||0))>3)continue;const dx=other.x-car.x,dz=other.z-car.z,ahead=dx*Math.sin(car.yaw)+dz*Math.cos(car.yaw),side=Math.abs(dx*Math.cos(car.yaw)-dz*Math.sin(car.yaw)),gap=ahead-(car.spec.length+(other.spec?.length||1))/2;if(ahead>0&&side<(car.spec.width+(other.spec?.width||1))/2+.35&&gap<Math.max(4,car.speed*1.3))speed=Math.min(speed,Math.max(0,(gap-2)*.6));}return speed;
}
