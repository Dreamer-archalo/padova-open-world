import * as THREE from './vendor/three.module.js';
import {pointInside,nearestOnSegment} from './core.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function showroomWalkable(b,cars,x,z,r=.65){
 if(!pointInside(x,z,b.p)||b.p.some((a,i)=>{const q=nearestOnSegment(x,z,a,b.p[(i+1)%b.p.length]);return Math.hypot(x-q.x,z-q.z)<r;}))return false;
 return !cars.some(c=>{if(c.permanentlyDestroyed||!c.mesh?.visible&&!c.dealershipStock)return false;const dx=x-c.x,dz=z-c.z,cs=Math.cos(c.yaw),sn=Math.sin(c.yaw);return Math.abs(dx*cs-dz*sn)<c.spec.width/2+r&&Math.abs(dx*sn+dz*cs)<c.spec.length/2+r;});
}
export function showroomPaths(b,cars){
 const nodes=[],lookup=new Map(),step=1.4;
 for(let z=b.minZ+.8;z<b.maxZ-.8;z+=step)for(let x=b.minX+.8;x<b.maxX-.8;x+=step){if(!showroomWalkable(b,cars,x,z))continue;const node={x,z,links:[],index:nodes.length};nodes.push(node);lookup.set(Math.round((x-b.minX-.8)/step)+','+Math.round((z-b.minZ-.8)/step),node);}
 for(const node of nodes){const ix=Math.round((node.x-b.minX-.8)/step),iz=Math.round((node.z-b.minZ-.8)/step);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const other=lookup.get((ix+dx)+','+(iz+dz));if(other&&showroomWalkable(b,cars,(node.x+other.x)/2,(node.z+other.z)/2))node.links.push(other.index);}}
 const nearest=p=>nodes.reduce((best,n)=>!best||distance(n,p)<distance(best,p)?n:best,null);
 const route=(from,to)=>{const start=nearest(from),end=nearest(to);if(!start||!end)return [];const queue=[start.index],parents=new Map([[start.index,-1]]);for(let i=0;i<queue.length;i++){const id=queue[i];if(id===end.index)break;for(const next of nodes[id].links)if(!parents.has(next)){parents.set(next,id);queue.push(next);}}if(!parents.has(end.index))return [];const result=[];for(let id=end.index;id!==-1;id=parents.get(id))result.unshift(nodes[id]);return result;};
 const connected=p=>{const start=nearest(p);if(!start)return [];const queue=[start.index],visited=new Set(queue);for(let i=0;i<queue.length;i++)for(const next of nodes[queue[i]].links)if(!visited.has(next)){visited.add(next);queue.push(next);}return queue.map(i=>nodes[i]);};
 return {nodes,nearest,route,connected};
}
function speech(mesh){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=112;const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas),material=new THREE.SpriteMaterial({map:texture,depthTest:true,transparent:true}),sprite=new THREE.Sprite(material);sprite.position.y=2.65;sprite.scale.set(5.8,.85,1);sprite.visible=false;mesh.add(sprite);let previous='';
 return {set(text){sprite.visible=!!text;if(!text||previous===text)return;previous=text;ctx.clearRect(0,0,768,112);ctx.fillStyle='#182c3eed';ctx.fillRect(0,0,768,112);ctx.fillStyle='#fff5df';ctx.font='bold 28px Arial';ctx.textAlign='center';ctx.fillText(text,384,67,740);texture.needsUpdate=true;},dispose(){mesh.remove(sprite);texture.dispose();material.dispose();}};
}
export function createShowroomLife(entry,createPerson,scene){
 if(!createPerson)return null;const b=entry.building,nav=showroomPaths(b,entry.units),actors=[];if(nav.nodes.length<6)return null;
 const door=nav.nearest(b.dealerDoor.inside),component=nav.route(door,door);if(!component.length)return null;
 const reachable=new Set([door.index]),queue=[door.index];for(let i=0;i<queue.length;i++)for(const next of nav.nodes[queue[i]].links)if(!reachable.has(next)){reachable.add(next);queue.push(next);}const accessible=queue.map(id=>nav.nodes[id]);const colors=['#32526b','#536d64','#b9916c','#926c82','#6f879e'];
 for(let i=0;i<5;i++){const preferred=i===0?door:i===2?actors[0]:i===3?actors[1]:accessible[Math.floor(accessible.length*(i+.5)/5)],node=accessible.find(n=>distance(n,preferred)<3&&!actors.some(a=>distance(a,n)<1.2))||accessible.find(n=>!actors.some(a=>distance(a,n)<1.2));if(!node)break;const mesh=createPerson(colors[i],i+1);mesh.position.set(node.x,b.minY+.07,node.z);scene.add(mesh);actors.push({mesh,x:node.x,z:node.z,role:i<2?'staff':'customer',path:[],wait:i+1,seed:i,dialogue:speech(mesh),deliveryUntil:0});}
 actors[0]&&(actors[0].partner=actors[2]);actors[2]&&(actors[2].partner=actors[0]);actors[1]&&(actors[1].partner=actors[3]);actors[3]&&(actors[3].partner=actors[1]);
 let clock=0,last=null;
 const setRoute=(a,p)=>{a.path=nav.route(a,p).slice(1);};
 const refresh=()=>{const updated=showroomPaths(b,entry.units);Object.assign(nav,updated);for(const a of actors){const safe=nav.nearest(a);if(safe&&!showroomWalkable(b,entry.units,a.x,a.z)){a.x=safe.x;a.z=safe.z;}a.path=[];a.wait=1;}};
 const greet=(car,time)=>{refresh();const staff=actors.find(a=>a.role==='staff');if(!staff)return;const beside=nav.nearest({x:car.x+Math.cos(car.yaw)*(car.spec.width/2+1.3),z:car.z-Math.sin(car.yaw)*(car.spec.width/2+1.3)});staff.deliveryUntil=time+16;staff.deliveryCar=car;staff.wait=0;if(beside)setRoute(staff,beside);};
 const animate=(time,player)=>{const dt=last===null?0:Math.min(.08,Math.max(0,time-last));last=time;clock=time;
  for(const a of actors){let moving=false;if(a.path.length){const goal=a.path[0],d=distance(a,goal),step=Math.min(d,dt*.85),nx=a.x+(goal.x-a.x)/Math.max(.001,d)*step,nz=a.z+(goal.z-a.z)/Math.max(.001,d)*step;
   if(!actors.some(other=>other!==a&&Math.hypot(other.x-nx,other.z-nz)<.65)&&showroomWalkable(b,entry.units,nx,nz)){a.mesh.rotation.y=Math.atan2(goal.x-a.x,goal.z-a.z);a.x=nx;a.z=nz;moving=step>.001;if(d<.08){a.path.shift();if(!a.path.length)a.wait=9+a.seed;}}else{a.wait+=dt;if(a.wait>2){a.path=[];a.wait=1;}}
  }else if(a.deliveryUntil>time){a.mesh.rotation.y=Math.atan2(player.x-a.x,player.z-a.z);}
  else {a.wait-=dt;if(a.wait<=0&&nav.nodes.length){const phase=Math.floor(time/14)+a.seed*19,choices=nav.connected(a),target=choices[(phase*47+a.seed*23)%choices.length]||nav.nearest(a);if(a.partner){const partner=a.partner;if(!partner.path.length&&partner.deliveryUntil<=time&&target.links.length){setRoute(a,target);setRoute(partner,nav.nodes[target.links[0]]);a.wait=partner.wait=12;}}else{setRoute(a,target);a.wait=6;}}}
  a.mesh.position.set(a.x,b.minY+.07,a.z);a.mesh.userData.hips?.children.forEach((leg,i)=>leg.rotation.x=moving?Math.sin(time*7+i*Math.PI)*.28:0);a.mesh.userData.arms?.children.forEach((arm,i)=>arm.rotation.x=moving?-Math.sin(time*7+i*Math.PI)*.18:0);
  let text='';if(a.deliveryUntil>time)text='Ottimo acquisto signore';else if(!moving&&distance(a,player)<32){const partner=a.partner&&!a.partner.path.length&&distance(a,a.partner)<3.4?a.partner:actors.find(other=>other!==a&&!other.path.length&&distance(a,other)<3.4);if(partner){a.mesh.rotation.y=Math.atan2(partner.x-a.x,partner.z-a.z);const turn=Math.floor(time/3)%2;if((a.seed+turn)%2===0)text=a.role==='staff'?(partner.role==='staff'?'Ti occupi della prossima consegna?':'Vuole vedere questo modello?'):'Mi mostra gli optional disponibili?';a.mesh.userData.arms?.children.forEach((arm,i)=>arm.rotation.x=i===0?-.35+Math.sin(time*3)*.08:0);}}
  a.dialogue.set(text);
 }};
 return {actors,nav,animate,greet,refresh,dispose(){for(const a of actors){a.dialogue.dispose();scene.remove(a.mesh);a.mesh.traverse(o=>{if(o.isMesh&&o.userData.clothing)o.material.dispose();});}},get clock(){return clock;}};
}
