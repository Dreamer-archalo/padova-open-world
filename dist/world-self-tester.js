import {WorldValidator,combineValidationReports} from './world-validator.js';

const finite=Number.isFinite;
const invalidNormals=g=>{const n=g.attributes?.normal;if(!n)return true;for(let i=0;i<n.count;i++)if(!finite(n.getX(i))||!finite(n.getY(i))||!finite(n.getZ(i))||Math.hypot(n.getX(i),n.getY(i),n.getZ(i))<1e-5)return true;return false;};

export class WorldSelfTester{
  static healMeshMetadata(root){
    let healedVertices=0,healedMeshes=0;root?.traverse(mesh=>{if(!mesh.isMesh||mesh.isInstancedMesh)return;const g=mesh.geometry,p=g?.attributes?.position;if(!p)return;
      if(invalidNormals(g)){g.computeVertexNormals();g.attributes.normal.needsUpdate=true;healedVertices+=p.count;healedMeshes++;}
      if(!g.boundingBox||![...g.boundingBox.min.toArray(),...g.boundingBox.max.toArray()].every(finite)){g.computeBoundingBox();healedMeshes++;}
      if(!g.boundingSphere||!finite(g.boundingSphere.radius)){g.computeBoundingSphere();healedMeshes++;}
    });return {healedVertices,healedMeshes};
  }
  static auditAndHealChunk({world,key,stage='unknown',heal=true}={}){
    if(!world?.terrain||!key)return null;const root=world.loaded.get(key),healed=heal?this.healMeshMetadata(root):{healedVertices:0,healedMeshes:0},validator=new WorldValidator(world),report=validator.validateChunk(key,{mesh:true,seams:true,colliders:true});report.stage=stage;report.healedVertices=healed.healedVertices;report.healedMeshes=healed.healedMeshes;report.passed=report.passed&&report.invalidGeometry===0;world.__selfTestReports??=new Map();world.__selfTestReports.set(key,report);globalThis.__padovaLastSelfTest=report;return report;
  }
  static auditInitialArea(world,center,keys=[]){
    const validator=new WorldValidator(world),chunks=(keys.length?keys:[...world.loaded.keys()]).map(key=>validator.validateChunk(key,{mesh:true,seams:true,colliders:true})),area=validator.validateArea(center,{radius:72,step:8,denseStep:2,raycast:true}),summary=combineValidationReports([...chunks,area]);summary.kind='boot';summary.chunkReports=chunks;summary.area=area;globalThis.__padovaBootValidation=summary;return summary;
  }
  static auditActiveArea(world,center){const validator=new WorldValidator(world),area=validator.validateArea(center,{radius:48,step:12,denseStep:3,raycast:true});globalThis.__padovaActiveAreaValidation=area;return area;}
}

export function scheduleWorldSelfTest(world,key,stage){
  const run=()=>{try{WorldSelfTester.auditAndHealChunk({world,key,stage,heal:true});}catch(error){console.warn('[Padova world self-test] failed',key,stage,error);}};
  (globalThis.requestIdleCallback||((fn)=>setTimeout(fn,80)))(run,{timeout:1800});
}
