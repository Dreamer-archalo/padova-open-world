import {dist} from './core.js';
import {advanceTaxi} from './taxi-service.js';
import {TaxiPathfinder} from './Pathfinder.js';

const now=()=>globalThis.performance?.now?.()??Date.now();
const inTransit=()=>typeof document!=='undefined'&&document.body?.classList?.contains('taxi-transit');

export class TaxiDispatcher {
  constructor({graph,terrain,collision,taxiSpec,vehicleBlocked,pathfinder=null}) {
    this.graph=graph;
    this.terrain=terrain;
    this.collision=collision;
    this.taxiSpec=taxiSpec;
    this.vehicleBlocked=vehicleBlocked;
    this.pathfinder=pathfinder??new TaxiPathfinder({graph,terrain});
    this.departureLookups=0;
    this.departureRoutes=0;
  }

  roadNear(pos,radius=180) {
    // The arrival callback formerly made up to 24 consecutive road and route
    // searches before the browser could paint another frame. Allow only four
    // attempts during this one synchronous transfer; after transit the normal
    // limits apply again. A failed departure safely despawns the empty cab.
    if(inTransit()){
      if(++this.departureLookups>4)return null;
    }else{this.departureLookups=0;this.departureRoutes=0;}
    return this.pathfinder.nearestRoad(pos,{maxRadius:radius,maxCandidates:1100,maxMs:10});
  }

  safe(point) {
    if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.z)||!Number.isFinite(point.y))return false;
    const spec=this.taxiSpec;
    return this.terrain.dry(point.x,point.z,spec.width/2,point.y)&&
      !this.vehicleBlocked(point.x,point.z,point.yaw,this.collision,spec,point.y);
  }

  pickup(player) {
    for(const metres of [10,4,0]){
      const p={x:player.x+Math.sin(player.yaw)*metres,z:player.z+Math.cos(player.yaw)*metres};
      const road=this.roadNear(p,220);
      if(this.safe(road))return road;
    }
    return null;
  }

  route(from,to) {
    if(inTransit()&&++this.departureRoutes>4)return [];
    return this.pathfinder.route(from,to,{maxSteps:4500,maxMs:12});
  }

  planDispatch(player) {
    const started=now(),target=this.pickup(player);
    if(!target)return null;
    // First safe connected route wins: ranking thirty A* paths to find the
    // shortest taxi approach caused long synchronous freezes in dense areas.
    let attempts=0;
    for(const radius of [40,52,72]){
      for(const offset of [Math.PI,Math.PI*.84,-Math.PI*.84,Math.PI*.68,-Math.PI*.68]){
        if(++attempts>10||now()-started>160)return null;
        const yaw=player.yaw+offset,probe={x:player.x+Math.sin(yaw)*radius,z:player.z+Math.cos(yaw)*radius};
        const spawn=this.roadNear(probe,140);
        if(!this.safe(spawn))continue;
        const straight=dist(spawn,player);
        if(straight<28||straight>82)continue;
        const path=this.route(spawn,target);
        if(path.length<2)continue;
        let metres=0;
        for(let i=1,steps=0;i<path.length&&steps++<2500;i++)metres+=dist(path[i-1],path[i]);
        if(Number.isFinite(metres)&&metres>0)return {spawn,target,path,metres};
      }
    }
    return null;
  }

  step(car,path,index,dt) {
    return advanceTaxi(car,path,index,dt,this.terrain,this.collision);
  }
}
