const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function timeoutError(label,ms){
 const error=new Error(`${label}: nessun dato ricevuto per ${Math.round(ms/1000)} secondi`);
 error.name='TimeoutError';
 return error;
}

async function nextChunk(reader,stallMs,label){
 let timer;
 try{
  return await Promise.race([
   reader.read(),
   new Promise((_,reject)=>{timer=setTimeout(()=>reject(timeoutError(label,stallMs)),stallMs);})
  ]);
 }finally{clearTimeout(timer);}
}

export async function readJsonResponse(response,{label='file',stallMs=45000,onProgress=()=>{}}={}){
 if(!response?.body?.getReader){
  const value=await response.json();
  onProgress({loaded:0,total:0,done:true});
  return value;
 }
 const headerTotal=Number(response.headers?.get?.('Content-Length'))||0;
 let capacity=Math.max(headerTotal,1024*1024),buffer=new Uint8Array(capacity),loaded=0;
 const reader=response.body.getReader();
 try{
  while(true){
   const {done,value}=await nextChunk(reader,stallMs,label);
   if(done)break;
   if(loaded+value.length>capacity){
    while(capacity<loaded+value.length)capacity=Math.ceil(capacity*1.6);
    const grown=new Uint8Array(capacity);grown.set(buffer.subarray(0,loaded));buffer=grown;
   }
   buffer.set(value,loaded);loaded+=value.length;
   onProgress({loaded,total:headerTotal,done:false});
  }
 }catch(error){
  await reader.cancel(error).catch(()=>{});
  throw error;
 }
 onProgress({loaded,total:headerTotal||loaded,done:true});
 try{return JSON.parse(new TextDecoder().decode(buffer.subarray(0,loaded)));}
 catch(error){throw new Error(`${label}: dati JSON non validi`,{cause:error});}
}

export async function fetchJsonResilient(url,{
 label=url,attempts=3,timeoutMs=180000,stallMs=45000,
 onProgress=()=>{},onRetry=()=>{},fetchImpl=globalThis.fetch
}={}){
 if(typeof fetchImpl!=='function')throw new Error(`${label}: download non disponibile`);
 let lastError;
 for(let attempt=1;attempt<=attempts;attempt++){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(timeoutError(label,timeoutMs)),timeoutMs);
  try{
   const response=await fetchImpl(url,{signal:controller.signal,cache:'default'});
   if(!response.ok)throw new Error(`${label}: HTTP ${response.status}`);
   return await readJsonResponse(response,{label,stallMs,onProgress:event=>onProgress({...event,attempt,attempts})});
  }catch(error){
   lastError=error?.name==='AbortError'?timeoutError(label,timeoutMs):error;
   if(attempt>=attempts)break;
   onRetry({attempt,nextAttempt:attempt+1,attempts,error:lastError});
   await wait(Math.min(3500,650*attempt));
  }finally{clearTimeout(timer);}
 }
 throw new Error(`${label}: download fallito dopo ${attempts} tentativi`,{cause:lastError});
}
