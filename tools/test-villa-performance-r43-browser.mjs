import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['tools/serve.mjs','--host','127.0.0.1','--port','4173']);
await new Promise((ok,bad)=>{server.stdout.once('data',ok);server.once('error',bad);});
const run=file=>new Promise((resolve,reject)=>{const p=spawn(process.execPath,[file],{stdio:'inherit',env:{...process.env,PERF_LABEL:'acceptance',PERF_AB:'1',PERF_ASSERT:'1'}});p.once('error',reject);p.once('exit',code=>code===0?resolve():reject(Error(file+' exited '+code)));});
try{for(const file of ['tools/test-mandria-v7-browser.mjs','tools/test-mandria-v11-browser.mjs','tools/test-roof-driving-r42-browser.mjs','tools/profile-villa-performance-r43.mjs'])await run(file);}
catch(e){console.error(e.stack);process.exitCode=1;}finally{server.kill();}
