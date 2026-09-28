import assert from 'node:assert/strict';
import {fetchJsonResilient,readJsonResponse} from './dist/loading-resilience.js';

const payload={city:'Padova',buildings:3},encoded=JSON.stringify(payload);
const progress=[];
const direct=await readJsonResponse(new Response(encoded,{headers:{'Content-Length':String(encoded.length)}}),{
 label:'test map',onProgress:event=>progress.push(event)
});
assert.deepEqual(direct,payload);
assert(progress.some(event=>event.done&&event.loaded===encoded.length),'Streaming reader must report completed bytes');

let calls=0,retries=0;
const recovered=await fetchJsonResilient('/map.json',{
 label:'test map',attempts:3,timeoutMs:1000,stallMs:1000,
 fetchImpl:async()=>{
  calls++;
  if(calls===1)throw new TypeError('Failed to fetch');
  return new Response(encoded,{status:200,headers:{'Content-Length':String(encoded.length)}});
 },
 onRetry:()=>{retries++;}
});
assert.deepEqual(recovered,payload);
assert.equal(calls,2,'Only the failed file should be retried');
assert.equal(retries,1,'Retry telemetry should be visible to the loader');

await assert.rejects(()=>fetchJsonResilient('/missing.json',{
 label:'missing',attempts:2,timeoutMs:1000,stallMs:1000,
 fetchImpl:async()=>new Response('',{status:503})
}),/download fallito dopo 2 tentativi/);
console.log('PASS R15 loading: streamed byte progress, file-level retry and final actionable failure.');
