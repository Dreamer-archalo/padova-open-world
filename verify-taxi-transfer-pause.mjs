import assert from 'node:assert/strict';
import {TaxiMenuController} from './dist/TaxiMenuController.js';
await import('./dist/taxi-confirmation-runtime.js');

class Button{
 constructor(){this.disabled=false;this.handlers=[];}
 addEventListener(type,fn){if(type==='click')this.handlers.push(fn);}
 click(){for(const handler of this.handlers)handler({preventDefault(){},stopPropagation(){}});}
}
const content={style:{},buttons:new Map(),set innerHTML(value){this.buttons.clear();if(value.includes('id="confirmTaxi"'))this.buttons.set('#confirmTaxi',new Button());if(value.includes('id="cancelTaxiConfirm"'))this.buttons.set('#cancelTaxiConfirm',new Button());},querySelector(selector){return this.buttons.get(selector)||null;},querySelectorAll(){return [];}};
const menu={open:true,style:{},close(){this.open=false;},showModal(){this.open=true;}},mapDialog={open:false,close(){this.open=false;},showModal(){this.open=true;}};
let paused=false,executions=0,release;
const pending=new Promise(resolve=>{release=resolve;});
const controller=new TaxiMenuController({document:{getElementById:()=>({textContent:''})},menu,mapDialog,menuContent:content,mapPlaces:{style:{}},fullMap:null,overlay:{hidden:true},status:{textContent:''},inputManager:{disable(){},enable(){}},bounds:{x:-100,z:-100,w:200,h:200},setPaused:v=>{paused=v;},drawFullMap(){},getFare:()=>25,executeTransition:async()=>{executions++;await pending;},onError:error=>{throw error;},onMapPickingChange(){},delayMs:1});
assert(controller.startTaxiTransition({x:20,z:30,name:'Piazza'},{}));
const confirm=content.querySelector('#confirmTaxi');confirm.click();
assert.equal(paused,true,'3D simulation must be paused as soon as the confirmation closes');
await new Promise(resolve=>setTimeout(resolve,12));
assert.equal(executions,1,'one transfer starts');
assert.equal(paused,true,'3D simulation must remain paused while transfer is pending');
confirm.click();assert.equal(executions,1,'repeated confirmation cannot launch another transfer');
release();await new Promise(resolve=>setTimeout(resolve,12));
assert.equal(paused,false,'normal simulation resumes after completed transfer');
assert.equal(controller.busy,false,'controls are released after transfer');
console.log('PASS actual asynchronous taxi transfer stays paused, runs once, and restores controls');
