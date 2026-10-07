import {VEHICLES} from './vehicles.js';
import {VILLA,areaLocal} from './gameplay-areas.js';

export const TEST_VEHICLES=Object.freeze(['mito','cinquecento','motorcycle','scooter']);
export const isTestVehicle=car=>!!car?.testingVehicle;
export const groundVehicle=car=>!!car?.spec&&!car.spec.aircraft&&!car.spec.watercraft&&!car.spec.tracked&&!car.raceOneRules&&!car.tangenzialeRace;
export const garageParkingPoint=car=>{const p=areaLocal(VILLA,car.x,car.z);return p.u>-38&&p.u<48&&p.v>3&&p.v<57;};
export const OWNERSHIP_NOTICE='Porta il mezzo a casa e parcheggialo nella zona garage per conservarlo tra i tuoi veicoli. Prima del parcheggio non viene salvato. Danni e modifiche restano sul mezzo; se viene distrutto lo perdi. R non ripara né ricrea le auto normali.';
export class VehicleGarage{
 constructor({state,cars,dealerships,toast=()=>{},save=()=>{},storage=globalThis.localStorage}){Object.assign(this,{state,cars,dealerships,toast,save,storage});this.records=new Map();this.lastSync=-Infinity;
  try{for(const r of JSON.parse(this.storage.getItem('padova-physical-garage-v1')||'[]'))if(VEHICLES[r.style]&&r.health>0)this.records.set(r.token,{...r,everStored:true,status:'stored'});}catch{}
  // R36 purchases were immediately unlocked. Migrate those existing purchases
  // once; new purchases require a real journey to the parking area.
  try{if(!this.storage.getItem('padova-garage-migrated-r37')){for(const style of dealerships.owned)if(VEHICLES[style]){const token='legacy-'+style;this.records.set(token,{token,style,health:100,build:dealerships.builds.get(style),everStored:true,status:'stored',source:'purchase'});}this.storage.setItem('padova-garage-migrated-r37','1');}}catch{}
  dealerships.owned.clear();for(const r of this.records.values())if(r.source==='purchase'){dealerships.owned.add(r.style);if(r.build)dealerships.builds.set(r.style,r.build);}dealerships.persist();this.persist();
 }
 register(car,source='street'){
  if(!groundVehicle(car)||isTestVehicle(car))return null;
  car.claimedByPlayer=true;car.fixedSpawn=true;car.parked=true;
  if(!car.garageToken){car.garageToken='car-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);this.records.set(car.garageToken,{token:car.garageToken,style:car.style,health:car.health,build:car.mesh.userData.dealerBuild||null,everStored:false,status:'out',source});}
  return this.records.get(car.garageToken);
 }
 live(token){return this.cars.find(c=>c.garageToken===token&&c.health>0&&!c.permanentlyDestroyed);}
 available(style){return [...this.records.values()].find(r=>r.style===style&&r.everStored&&r.health>0&&!this.live(r.token));}
 forStyle(style){return [...this.records.values()].filter(r=>r.style===style&&r.health>0);}
 list(){return [...this.records.values()].filter(r=>r.everStored&&r.health>0);}
 attach(car,record){if(!record)return;Object.assign(car,{garageToken:record.token,claimedByPlayer:true,fixedSpawn:true,health:record.health,requestedByPlayer:true,testingVehicle:false});record.status='out';car.mesh.userData.dealerBuild=record.build;this.persist();}
 destroy(car){if(!groundVehicle(car)||isTestVehicle(car))return;car.permanentlyDestroyed=true;car.crashDisabled=true;car.parked=true;car.speed=0;car.mesh.visible=true;
  const record=this.records.get(car.garageToken);if(record){this.records.delete(record.token);if(record.source==='purchase'&&![...this.records.values()].some(r=>r.style===record.style&&r.source==='purchase')){this.dealerships.owned.delete(record.style);this.dealerships.builds.delete(record.style);}this.dealerships.persist();this.persist();}
 }
 sync(){for(const car of this.cars){if(!car.garageToken)continue;const r=this.records.get(car.garageToken);if(!r)continue;if(car===this.state.car)car.health=this.state.health;
   if(car.health<=0){this.destroy(car);continue;}r.health=car.health;r.build=car.mesh.userData.dealerBuild||r.build;
   if(car.parked&&car!==this.state.car&&Math.abs(car.speed)<.5&&garageParkingPoint(car)&&Math.abs((car.y||0)-this.state.y)<8){if(!r.everStored)this.toast(car.name+' · salvato nel garage di casa. Danni conservati.',5);r.everStored=true;r.status='stored';}else r.status='out';
  }this.persist();}
 persist(){try{this.storage.setItem('padova-physical-garage-v1',JSON.stringify([...this.records.values()].filter(r=>r.everStored&&r.health>0)));}catch{}}
 update(){if(this.state.elapsed-this.lastSync<1)return;this.lastSync=this.state.elapsed;this.sync();}
}
