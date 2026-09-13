import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const centre=read('./dist/historic-center.js');
const details=read('./dist/city-details.js');
const checks={
 moduleWired:details.includes("createHistoricCenter")&&details.includes('historic.update(x,z)'),
 signori:centre.includes("piazza-signori-complete")&&centre.includes('const tx=-336,tz=-162'),
 pedrocchi:centre.includes("poi='pedrocchi'")||centre.includes("g.userData.poi='pedrocchi'"),
 municipio:centre.includes("g.userData.poi='palazzo-moroni'"),
 universita:centre.includes("g.userData.poi='palazzo-bo'"),
 passablePorticos:centre.includes('passablePortico=true')&&centre.includes('roadClearance(data'),
 roadsUntouched:!centre.includes('passableGateway')&&!centre.includes('collision.add')&&!centre.includes('road.w='),
 sparseArcades:centre.includes('if(count>=6)break'),
 piazzaAccents:centre.includes("poi='piazza-accents'")||centre.includes("g.userData.poi='piazza-accents'")
};
const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([k])=>k);
if(failed.length)throw new Error('Historic center verification failed: '+failed.join(', '));
console.log(JSON.stringify({ok:true,checks},null,2));
