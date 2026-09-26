import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WaterGameplay} from './dist/water-gameplay.js';
const game=fs.readFileSync('dist/game.js','utf8'),html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/unified-water.css','utf8');
assert(html.includes('MAPPA-GTA-R7')&&html.includes('veniceLoadingStatus'));
assert(css.includes('.venice-loading[hidden]{display:none!important}'));
assert(game.includes("ws.hidden=!waterGame.active||(waterGame.swimming&&waterGame.swimDepth<=.85)"));
assert(game.includes("hint='W/A/S/D · NUOTA · SPAZIO IMMERGITI · R RECUPERA'"));
const terrain=(h=0)=>({waterAt:x=>x<1?0:null,waterHeight:()=>0,dry:(x,z,m)=>x>=1+m,height:x=>x>=1?h:0});
const make=()=>({x:0,z:0,y:-.33,vy:0,speed:0,health:100});
let player=make(),swim=new WaterGameplay();swim.startSwimming(player,0);
assert(swim.stepSwim(player,{dx:.03,dz:0},.016,terrain(),()=>true).landed);
assert(player.x>=1&&!swim.swimming,'Level bank must auto-climb');
player=make();swim=new WaterGameplay();swim.startSwimming(player,0);
assert(!swim.stepSwim(player,{dx:.03,dz:0},.016,terrain(3),()=>true).landed,'High quays stay inaccessible');
player=make();swim=new WaterGameplay();swim.startSwimming(player,0);
assert(!swim.stepSwim(player,{dx:.03,dz:0},.016,terrain(),()=>false).landed,'Solid walls stay blocked');
const start=game.indexOf('async function preloadLagoon(){'),end=game.indexOf('async function regionalFastTravel(p){',start);
assert(start>=0&&end>start);
const source=game.slice(start,end);
let loadedWhileVisible=false,paused=false,frames=0;
const overlay={hidden:true,setAttribute(){},removeAttribute(){}},status={textContent:''};
const world={queue:Array.from({length:14},(_,i)=>i),update(){if(!overlay.hidden)loadedWhileVisible=true;this.queue.pop();}};
const state={ready:true,started:true,paused:false,x:35800,z:-3200};
const makeLoader=new Function('regionalWorld','state','$','setPaused','requestAnimationFrame','performance','clock','console',
 'let lagoonPreloadActive=false,lagoonPreloadDone=false;'+source+
 'return {preloadLagoon,done:()=>lagoonPreloadDone};');
const runtime=makeLoader(world,state,id=>id==='veniceLoading'?overlay:status,v=>{paused=v;state.paused=v;},
 cb=>{frames++;Promise.resolve().then(cb);},{now:()=>frames*16},{reset(){}},console);
await runtime.preloadLagoon();
assert(loadedWhileVisible&&frames>=14&&runtime.done()&&!paused&&overlay.hidden,
 'The 2D image must hide ACTUAL chunk building, then resume gameplay.');
console.log('PASS: 2D Venice loading warms 3D chunks; low shoreline exit; high quay/wall blocks; single compact swim HUD.');
