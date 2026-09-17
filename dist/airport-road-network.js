// Land-side airport road network. All coordinates are local (u,v) metres.
// The runway occupies u=-15..15 and the aircraft taxiway is centred at u=65.
// Car routes stay east of u=130; connections use identical vertices so the
// road graph can route through the entrance, terminal, services and hangars.
export const AIRPORT_ROAD_LAYOUT = [
  {name:'Viale aeroporto · dorsale',width:5.2,points:[[210,-400],[210,-390],[210,-263],[210,-185],[210,-124],[210,80],[210,145],[210,205],[205,220],[205,250],[205,280],[210,295],[210,410],[210,535]]},
  {name:'Terminal e parcheggi · anello',width:5.2,points:[[210,410],[134,410],[134,535],[210,535]]},
  {name:'Terminal · area sosta breve',width:5,points:[[210,410],[200,410],[200,420]]},
  {name:'Eliporto civile · accesso',width:5,points:[[134,410],[144,390],[144,380]]},
  {name:'Hangar civili · corsia di servizio',width:5.2,points:[[210,145],[132,145],[132,110],[132,80],[210,80]]},
  {name:'Hangar civile nord · ingresso',width:4.8,points:[[132,110],[141,110]]},
  {name:'Hangar civile sud · ingresso',width:4.8,points:[[132,80],[132,42],[141,42]]},
  {name:'Area militare · accesso',width:5.2,points:[[210,-263],[132,-263],[132,-228]]},
  {name:'Hangar militare nord · ingresso',width:4.8,points:[[132,-228],[141,-228]]},
  {name:'Hangar militare sud · ingresso',width:4.8,points:[[132,-263],[132,-295],[141,-295]]},
  {name:'Officina e deposito · accesso',width:5.2,points:[[210,-185],[180,-185]]},
  {name:'Carburante · accesso servizi',width:4.8,points:[[210,-124],[158,-124],[158,-93],[166,-93]]},
  {name:'Servizi sud · accesso',width:5.2,points:[[210,-390],[170,-390],[170,-360]]}
];

export function buildAirportRoads(airport, areaPoint) {
  return AIRPORT_ROAD_LAYOUT.map(({name,width,points})=>({
    n:name,
    p:points.map(([u,v])=>{const p=areaPoint(airport,u,v);return [p.x,p.z];}),
    w:width,k:'service',access:'private',layer:0,gameplay:true,airportRoad:true
  }));
}
