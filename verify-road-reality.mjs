import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const pass=read('./dist/road-reality-pass.js');
const audit=read('./dist/road-reality-audit.js');
const surfaces=read('./dist/surface-layers.js');
const roads=read('./dist/modern-roads.js');
const peds=read('./dist/pedestrian-manager.js');
const traffic=read('./dist/traffic.js');
const quality=read('./dist/quality.js');
const runtime=read('./dist/phase2-runtime.js');
const checks={
 ordinaryRoadTerrainLock:pass.includes('__ordinaryRoadTerrainLock')&&pass.includes('solved-natural')&&pass.includes('MOTORWAY_ROAD_TOLERANCE'),
 trueLevelsPreserved:pass.includes('road.crossing')&&pass.includes('road.b')&&pass.includes('road.tunnel')&&pass.includes('Number(road.layer)'),
 roadEdgeLock:pass.includes('__ordinaryRoadEdgeLock')&&pass.includes('ROAD_EDGE_BLEND'),
 streetTramLock:pass.includes('__streetRunningTerrainLock')&&pass.includes('natural+clamp(rail-natural,-.12,.12)+.05'),
 motorwayDensity:pass.includes('HIGHWAY_TRAFFIC_TARGET={hyper:7,low:11,medium:16,high:22}')&&pass.includes('ensureHighwayTraffic'),
 spatialIndexSetHandled:pass.includes('[...game.graph.index.near(state.x,state.z,720)].filter(highwaySegment)'),
 noVisibleTrafficRecycling:pass.includes('dist(c,state)>900'),
 protectedIncidents:pass.includes('Polizia Stradale · Incidente')&&pass.includes('Veicolo coinvolto nell’incidente'),
 grassBelowRoad:surfaces.includes('support.height-.18')&&surfaces.includes('road.w/2+1.0'),
 flushSidewalks:roads.includes(".083,colour('#b7b5a8')")&&!roads.includes("1.2)),Math.max(side*road.w/2,side*(road.w/2+1.2)),.13"),
 cleanMotorwayMerges:roads.includes('!coarse&&!atJunction&&/motorway|trunk/'),
 roundaboutPedestrians:peds.includes('!roundabout&&(p.crossGoal||p.crossing')&&peds.includes('this.roundaboutFixed++'),
 roundaboutYield:traffic.includes('enteringRoundabout')&&traffic.includes('roundaboutRoad(other.road)'),
 motorwayTwoLanes:traffic.includes("/motorway|trunk/.test(road?.k||'')&&w>=6.2")&&traffic.includes('Math.max(2,base)'),
 detailedTraffic:quality.includes("high:{label:'Detailed'")&&quality.includes('traffic:96'),
 fullNetworkAudit:audit.includes('for(const profile of terrain.roads.profiles.values())')&&audit.includes('maxRoadTerrainDelta')&&audit.includes('maxEdgeDelta'),
 wired:runtime.includes("import './road-reality-pass.js';")&&runtime.includes("import './road-reality-audit.js';")
};
const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
if(failed.length)throw new Error('Road reality verification failed: '+failed.join(', '));
console.log(JSON.stringify({ok:true,checks},null,2));
