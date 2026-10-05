import {clamp} from './core.js';
import {vehicleFootprint,polygonsOverlap} from './movement.js';
import {vehiclePerformanceFactor} from './vehicle-damage.js';

// Pure shared rules: both drivers use the same caps, boost and impact damage.
export function raceDriveSettings(car,time,health=car.health??100){
 const boosted=time<Math.max(car.raceTurboUntil||0,car.raceSprintUntil||0),slow=time<(car.raceSlowUntil||0),condition=vehiclePerformanceFactor(health);
 return {boosted,max:(boosted?car.spec.turboMax:car.spec.max)*condition*(slow?.5:1),
  accel:(boosted?car.spec.turboAccel:car.spec.accel)*condition*(slow?.45:1)};
}
export function activateRaceTurbo(actor,car,time,until){
 car.raceTurboUntil=until;
 actor.speed=Math.min(raceDriveSettings(car,time,actor.health??car.health).max,Math.max(0,actor.speed)+8);
 car.speed=actor.speed;
}
export function raceBodiesOverlap(a,b){
 if(Math.abs((a.y||0)-(b.y||0))>=Math.max(a.spec.height,b.spec.height))return false;
 if(Math.hypot(a.x-b.x,a.z-b.z)>Math.hypot(a.spec.width+a.spec.length,b.spec.width+b.spec.length))return false;
 return polygonsOverlap(vehicleFootprint(a.x,a.z,a.yaw,a.spec.width,a.spec.length),vehicleFootprint(b.x,b.z,b.yaw,b.spec.width,b.spec.length));
}
export function applyRaceImpact(actor,car,impact,time){
 if(time<(car.raceHitUntil||0)||impact<4)return 0;
 const damage=clamp((impact-3)*.8,0,70)*(car.spec.raceDamageFactor||1);
 actor.health=Math.max(0,(actor.health??100)-damage);actor.speed*=.28;
 car.health=actor.health;car.speed=actor.speed;car.raceHitUntil=time+.8;
 return damage;
}
export function collideRaceCars(a,b,time,actorA=a,actorB=b){
 // Use velocity vectors: head-on collisions are harder than side-by-side contact.
 const impact=Math.hypot(Math.sin(actorA.yaw)*actorA.speed-Math.sin(actorB.yaw)*actorB.speed,
  Math.cos(actorA.yaw)*actorA.speed-Math.cos(actorB.yaw)*actorB.speed);
 const first=applyRaceImpact(actorA,a,impact,time),second=b.raceOneRules?applyRaceImpact(actorB,b,impact,time):0;
 return {impact,damage:first,otherDamage:second};
}
