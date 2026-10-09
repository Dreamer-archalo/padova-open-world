import {VILLA,areaPoint,areaLocal} from './gameplay-areas.js';
import {VEHICLES} from './vehicles.js';
import {dealerBuildSpec} from './dealer-customization.js';
import {groundVehicle,garageParkingPoint,isTestVehicle} from './vehicle-ownership.js';
import {vehicleFootprint,polygonsOverlap} from './movement.js';
export const HOME_DELIVERY_PRICE=350;
export class HomeVehicleServices{
 constructor(env){Object.assign(this,env);}
 atHome(){const p=areaLocal(VILLA,this.state.x,this.state.z);return p.u>-42&&p.u<48&&p.v>0&&p.v<60&&Math.abs(this.state.y-this.terrain.height(this.state.x,this.state.z))<4;}
 parkingPlan(style,ignore=null){
  const spec=VEHICLES[style];if(!spec||!groundVehicle({spec}))return null;
  for(const u of [24,12,35,-30,-17])for(const v of [14,27,40]){
   const p=areaPoint(VILLA,u,v),yaw=VILLA.yaw,y=this.terrain.height(p.x,p.z),footprint=vehicleFootprint(p.x,p.z,yaw,spec.width+.7,spec.length+.7);
   if(!footprint.every(([x,z])=>garageParkingPoint({x,z})&&this.terrain.dry(x,z,.25)&&this.clear(x,z,y,.4)))continue;
   if(this.cars.some(c=>c!==ignore&&(c.mesh.visible||c.claimedByPlayer||c.dealershipStock)&&Math.abs((c.y||0)-y)<Math.max(spec.height,c.spec.height)&&polygonsOverlap(footprint,vehicleFootprint(c.x,c.z,c.yaw,c.spec.width+.5,c.spec.length+.5))))continue;
   if(this.atHome()&&polygonsOverlap(footprint,vehicleFootprint(this.state.x,this.state.z,0,1,1)))continue;
   return {...p,y,yaw};
  }return null;
 }
 receive(car,plan){
  Object.assign(car,plan,{speed:0,parked:true,fixedSpawn:true,requestedByPlayer:true,budgetSleeping:false});car.mesh.visible=true;this.pose(car);car.y=plan.y;car.mesh.position.y=plan.y;
  const record=this.garage.register(car,'purchase');if(!record)return false;
  Object.assign(record,{everStored:true,status:'stored',health:car.health,build:car.mesh.userData.dealerBuild});this.garage.persist();this.save();return true;
 }
 repairQuote(token){
  if(!this.atHome()||Math.abs(this.state.speed)>1)return null;
  const record=this.garage.records.get(token);if(!record||record.health<=0)return null;
  const car=this.garage.live(token);if(car&&(!garageParkingPoint(car)||Math.abs(car.speed)>1||car.permanentlyDestroyed||Math.abs((car.y||0)-this.terrain.height(car.x,car.z))>3||!groundVehicle(car)||isTestVehicle(car)))return null;
  if(car===this.state.car)car.health=this.state.health;
  const health=car?.health??record.health,capacity=car?.spec.maxHealth||dealerBuildSpec(VEHICLES[record.style],record.build||{}).maxHealth||100;
  if(health<=0||health>=100)return null;
  return {record,car,price:Math.max(150,Math.ceil((100-health)*capacity*.08)),health};
 }
 repair(token){
  const q=this.repairQuote(token);if(!q||this.state.money<q.price)return false;
  this.state.money-=q.price;q.record.health=100;if(q.car){q.car.health=100;q.car.crashDisabled=false;if(q.car===this.state.car)this.state.health=100;}
  this.garage.persist();this.save();return true;
 }
}
