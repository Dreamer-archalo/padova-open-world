import {createAirportTraffic,tickAirportTraffic} from '../dist/airport-air-traffic.js';
const sim=createAirportTraffic(),events=[];let previous=sim.aircraft.map(a=>a.phase);
for(let step=0;step<25000;step++){
 tickAirportTraffic(sim,.1);
 for(const [i,a] of sim.aircraft.entries())if(a.phase!==previous[i]&&['parked','taxi','hold','lineup','takeoff','arrival-hold','approach','landing','return'].includes(a.phase))events.push({t:Math.round(sim.time),id:a.id,phase:a.phase,runway:sim.runway,taxiway:sim.taxiway});
 previous=sim.aircraft.map(a=>a.phase);
}
console.log('AIRPORT_TRAFFIC_FINAL '+JSON.stringify({runway:sim.runway,taxiway:sim.taxiway,aircraft:sim.aircraft.map(a=>({id:a.id,phase:a.phase,u:Math.round(a.u),v:Math.round(a.v),routeIndex:a.routeIndex,completed:a.completed,waitUntil:a.waitUntil}))}));
console.log('AIRPORT_TRAFFIC_LAST_EVENTS '+JSON.stringify(events.slice(-30)));
