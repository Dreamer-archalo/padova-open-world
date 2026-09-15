const finite=Number.isFinite;
const round=n=>Math.round(n*100)/100;

export class BuildingCollisionManager{
  constructor(world){this.world=world;this.index=world.collision;this.buildings=new Set(world.data?.buildings||[]);this.structures=new Set(world.structures||[]);this.tagExisting();}
  all(){const out=new Set();for(const cell of this.index?.cells?.values?.()||[])for(const item of cell)out.add(item);return [...out];}
  tagExisting(){
    for(const c of this.all()){
      if(c.colliderOwnerType)continue;
      if(this.buildings.has(c)){c.colliderOwnerType='building';c.colliderOwner=c;c.isIntentionalInvisibleCollider=false;}
      else if(this.structures.has(c)){c.colliderOwnerType='structure';c.colliderOwner=c;c.isIntentionalInvisibleCollider=c.solid===false;}
      else{
        // Legacy authored barriers (e.g. Prato balustrades) predate ownership
        // metadata. Keep them until explicitly migrated rather than deleting a
        // potentially intentional gameplay blocker.
        c.colliderOwnerType='legacy-static';c.colliderOwner=c;c.isIntentionalInvisibleCollider=true;
      }
    }
  }
  remove(c){for(const [key,cell] of this.index.cells){const filtered=cell.filter(v=>v!==c);if(filtered.length)this.index.cells.set(key,filtered);else this.index.cells.delete(key);}}
  releaseRoot(root){for(const c of root?.userData?.staticColliders||[])this.remove(c);if(root?.userData)root.userData.staticColliders=[];}
  registerVegetation(root,key){
    this.releaseRoot(root);const terrain=this.world.terrain,list=[];
    for(const [i,t] of (root?.userData?.vegetation||[]).entries()){
      if(!finite(t.x)||!finite(t.z)||!finite(t.s))continue;const r=Math.max(.22,Math.min(.62,t.s*.085)),p=[];for(let a=0;a<8;a++){const angle=a*Math.PI/4;p.push([t.x+Math.cos(angle)*r,t.z+Math.sin(angle)*r]);}
      const y=terrain.height(t.x,t.z),c={p,minX:t.x-r,maxX:t.x+r,minZ:t.z-r,maxZ:t.z+r,minY:y,h:Math.max(1.4,t.s*1.55),colliderOwnerType:'tree',colliderOwner:root,colliderVisualIndex:i,chunkId:key,isIntentionalInvisibleCollider:false};this.index.add(c,c.minX,c.minZ,c.maxX,c.maxZ);list.push(c);
    }
    if(root?.userData)root.userData.staticColliders=list;return list.length;
  }
  audit(center={x:0,z:0},{radius=500,prune=false}={}){
    this.tagExisting();const candidates=[...this.index.near(center.x,center.z,radius)],report={tested:0,invalid:0,orphans:0,duplicates:0,transformMismatch:0,pruned:0,examples:[],passed:true},seen=new Map();
    const issue=(type,c,extra={})=>{report[type]++;report.passed=false;if(report.examples.length<24)report.examples.push({type,owner:c.colliderOwnerType,minX:c.minX,maxX:c.maxX,minZ:c.minZ,maxZ:c.maxZ,...extra});};
    for(const c of candidates){
      const cx=(c.minX+c.maxX)/2,cz=(c.minZ+c.maxZ)/2;if(Math.hypot(cx-center.x,cz-center.z)>radius+40)continue;report.tested++;
      const valid=[c.minX,c.maxX,c.minZ,c.maxZ,c.minY??0,c.h??0].every(finite)&&c.maxX>=c.minX&&c.maxZ>=c.minZ&&(c.h??0)>=0&&Array.isArray(c.p)&&c.p.length>=3&&c.p.every(p=>p.length>=2&&p.every(finite));
      if(!valid){issue('invalid',c);if(prune&&!c.isIntentionalInvisibleCollider){this.remove(c);report.pruned++;}continue;}
      const owner=c.colliderOwner,visualOrphan=c.colliderOwnerType==='tree'&&(!owner?.parent||owner.userData?.staticColliders&&!owner.userData.staticColliders.includes(c));
      if((!owner||visualOrphan)&&!c.isIntentionalInvisibleCollider){issue('orphans',c);if(prune){this.remove(c);report.pruned++;}continue;}
      if(owner&&finite(owner.cx)&&finite(owner.cz)&&Math.hypot(owner.cx-cx,owner.cz-cz)>Math.max(20,Math.hypot(c.maxX-c.minX,c.maxZ-c.minZ))){issue('transformMismatch',c,{ownerX:owner.cx,ownerZ:owner.cz});}
      const id=c.colliderOwnerType==='tree'?(c.chunkId+':'+c.colliderVisualIndex):c.colliderOwnerType,key=[id,round(c.minX),round(c.maxX),round(c.minZ),round(c.maxZ),round(c.minY??0),round(c.h??0)].join(':');const previous=seen.get(key);
      if(previous&&previous!==c){issue('duplicates',c);if(prune&&!c.isIntentionalInvisibleCollider){this.remove(c);report.pruned++;}}else seen.set(key,c);
    }
    return report;
  }
}

export const ensureCollisionManager=world=>world.__buildingCollisionManager||(world.__buildingCollisionManager=new BuildingCollisionManager(world));
