import assert from 'node:assert/strict';
const base='https://dreamer-archalo.github.io/padova-open-world/preview/npc-r17/';
let failure;
for(let attempt=0;attempt<12;attempt++){
 try{
  const [build,html,source]=await Promise.all(['build-r17.json','index.html','urban-life.js'].map(async name=>{const response=await fetch(base+name+'?verify='+Date.now());assert.equal(response.status,200,name);return response.text();}));
  const metadata=JSON.parse(build);assert.equal(metadata.version,'padova-intelligent-npc-r17');if(process.env.GITHUB_SHA)assert.equal(metadata.commit,process.env.GITHUB_SHA);assert(html.includes('game.js?v=regional-taxi-r16-padova-intelligent-npc-r17'));assert(source.includes('export class PadovaIntelligentNPC'));
  console.log('PASS public preview',JSON.stringify(metadata),base);process.exit(0);
 }catch(error){failure=error;await new Promise(resolve=>setTimeout(resolve,5000));}
}
throw failure;
