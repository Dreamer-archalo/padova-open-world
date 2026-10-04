import assert from 'node:assert/strict';
import {TaxiMenuController} from './dist/TaxiMenuController.js';
import {TaxiSystem} from './dist/TaxiSystem.js';

let observer;
globalThis.MutationObserver=class {constructor(callback){observer=callback;}observe(){}};
globalThis.window={addEventListener(){}};

class Button {
 constructor(disabled=false){this.disabled=disabled;this.listeners=[];this.style={};}
 addEventListener(type,callback,options={}){if(type==='click')this.listeners.push({callback,capture:options===true||options?.capture,once:!!options?.once});}
 async click(){
  if(this.disabled)return;
  const event={preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}};
  for(const listener of this.listeners.filter(item=>item.capture))listener.callback(event);
  // Browsers can run a microtask checkpoint between a capture listener and
  // the button's own click handler. The old guard disabled the button here.
  await Promise.resolve();
  if(this.disabled)return;
  for(const listener of [...this.listeners.filter(item=>!item.capture)]){
   listener.callback(event);
   if(listener.once)this.listeners.splice(this.listeners.indexOf(listener),1);
  }
 }
}
const content={style:{},buttons:new Map(),set innerHTML(value){
 this.html=value;this.buttons.clear();
 this.buttons.set('#confirmTaxi',new Button(/id="confirmTaxi" disabled/.test(value)));
 this.buttons.set('#cancelTaxiConfirm',new Button());
 queueMicrotask(()=>observer?.());
},querySelector(selector){return this.buttons.get(selector)||null;},querySelectorAll(){return [];}};
const title={textContent:''};
const menu={open:true,style:{},close(){this.open=false;},showModal(){this.open=true;}};
const mapDialog={open:false,style:{},close(){this.open=false;},showModal(){this.open=true;}};
globalThis.document={activeElement:null,getElementById(id){return {menuContent:content,menu,confirmTaxi:content.querySelector('#confirmTaxi'),menuTitle:title,taxiChoose:null}[id]??null;}};

// Match the live module order: the UI helper loads before the confirmation
// runtime and must not steal or disable its first click.
await import('./dist/taxi-map-ui.js');
await import('./dist/taxi-confirmation-runtime.js');

const state={money:50000,x:0,z:0,charges:0,arrivals:0};
const input={enabled:true,disable(){this.enabled=false;},enable(){this.enabled=true;}};
const taxiSystem=new TaxiSystem({inputManager:input,executeTeleport:async({targetCoords,price})=>{
 state.x=targetCoords.x;state.z=targetCoords.z;state.money-=price;state.charges++;state.arrivals++;
}});
const controller=new TaxiMenuController({document,menu,mapDialog,menuContent:content,mapPlaces:{style:{}},inputManager:input,
 bounds:{x:-100,z:-100,w:300,h:300},getFare:()=>35,getBalance:()=>state.money,setPaused(){},
 onError:error=>{throw error;},executeTransition:async({targetCoords,meta})=>{
  await taxiSystem.travel({targetCoords,price:meta.quotedFare});
 },delayMs:1});

assert(controller.startTaxiTransition({x:40,z:50,name:'Portello'},{source:'list',name:'Portello'}));
await Promise.resolve();
const confirm=content.querySelector('#confirmTaxi');
await confirm.click();
await new Promise(resolve=>setTimeout(resolve,25));
assert.equal(state.arrivals,1,'the first confirmation must start and complete travel');
assert.deepEqual([state.x,state.z],[40,50]);
assert.equal(state.money,49965,'fare is charged once');
await confirm.click();
await new Promise(resolve=>setTimeout(resolve,5));
assert.equal(state.charges,1,'repeat click must not charge or travel again');
assert.equal(controller.busy,false);
assert.equal(input.enabled,true);

assert(controller.onSelectFromMap(70,80));
await Promise.resolve();
await content.querySelector('#confirmTaxi').click();
await new Promise(resolve=>setTimeout(resolve,25));
assert.deepEqual([state.x,state.z],[70,80],'custom map destination also travels');
assert.equal(state.money,49930);
console.log('PASS first taxi confirmation, map destination, one charge, unlocked controls');
