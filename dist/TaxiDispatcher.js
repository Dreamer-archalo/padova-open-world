import {dist,roadRoute} from './core.js';
import {advanceTaxi,findTaxiRoad} from './taxi-service.js';

export class TaxiDispatcher {
  constructor({graph,terrain,collision,taxiSpec,vehicleBlocked}){
    this.graph=graph;
    this.terrain=terrain;
    this.collision=collision;
    this.taxiSpec=taxiSpec;
    this.vehicleBlocked=vehicleBlocked;
  }
  roadNear(pos,radius=180){
    return findTaxiRoad(pos,this.graph,this.terrain,{maxRadius:radius,maxCandidates:1400,maxMs:12});
  }
  safe(point){
    if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.z)||!Number.isFinite(point.y))return false;
    const spec=this.taxiSpec;
    return this.terrain.dry(point.x,point.z,spec.width/2,point.y)&&
      !this.vehicleBlocked(point.x,point.z,point.yaw,this.collision,spec,point.y);
  }
  pickup(player){
    for(const metres of [10,7,4,0]){
      const p={x:player.x+Math.sin(player.yaw)*metres,z:player.z+Math.cos(player.yaw)*metres};
      const road=this.roadNear(p,220);
      if(this.safe(road))return road;
    }
    return null;
  }
  route(from,to){
    if(!from||!to)return [];
    return roadRoute(from,to,this.graph,{maxSteps:12000,maxMs:20});
  }
  planDispatch(player){
    const target=this.pickup(player);
    if(!target)return null;
    const radii=[34,40,46,52,62,72];
    const rearAngles=[Math.PI,Math.PI*.84,-Math.PI*.84,Math.PI*.68,-Math.PI*.68];
    let best=null;
    for(const radius of radii){
      for(const offset of rearAngles){
        const yaw=player.yaw+offset;
        const probe={x:player.x+Math.sin(yaw)*radius,z:player.z+Math.cos(yaw)*radius};
        const spawn=this.roadNear(probe,140);
        if(!this.safe(spawn))continue;
        const straight=dist(spawn,player);
        if(straight<28||straight>82)continue;
        const path=this.route(spawn,target);
        if(path.length<2)continue;
        let metres=0;
        for(let i=1;i<path.length&&i<2500;i++)metres+=dist(path[i-1],path[i]);
        if(!Number.isFinite(metres)||metres<=0)continue;
        if(!best||metres<best.metres)best={spawn,target,path,metres};
      }
      if(best&&radius<=52)return best;
    }
    return best;
  }
  step(car,path,index,dt){
    return advanceTaxi(car,path,index,dt,this.terrain,this.collision);
  }
}
