import assert from 'node:assert/strict';
import {TaxiMenuController} from './dist/TaxiMenuController.js';
await import('./dist/taxi-confirmation-runtime.js');

class FakeButton{
 constructor(){this.disabled=false;this.listeners=[];}
 addEventListener(type,fn){if(type==='click')this.listeners.push(fn);}
 click(){const event={preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}};for(const fn of [...this.listeners])fn(event);}
}
class FakeContent{
 constructor(){this.style={};this.buttons=new Map();this._html='';}
 set innerHTML(value){this._html=String(value);this.buttons.clear();if(this._html.includes('id="confirmTaxi"'))this.buttons.set('#confirmTaxi',new FakeButton());if(this._html.includes('id="cancelTaxiConfirm"'))this.buttons.set('#cancelTaxiConfirm',new FakeButton());}
 get innerHTML(){return this._html;}
 querySelector(selector){return this.buttons.get(selector)||null;}
 querySelectorAll(){return [];}
}
const content=new FakeContent();
const title={textContent:''};
const menu={open:true,style:{},showModal(){this.open=true;},close(){this.open=false;}};
const mapDialog={open:false,style:{},showModal(){this.open=true;},close(){this.open=false;}};
let paused=false,executions=0,lastPayload=null;
const controller=new TaxiMenuController({
 document:{getElementById:id=>id==='menuTitle'?title:null},menu,mapDialog,menuContent:content,mapPlaces:{style:{}},fullMap:null,overlay:null,status:null,inputManager:{disable(){},enable(){}},bounds:{x:-100,z:-100,w:200,h:200},
 setPaused:value=>{paused=value;},drawFullMap(){},getFare:()=>35,executeTransition:async payload=>{executions++;lastPayload=payload;},onError:error=>{throw error;},onMapPickingChange(){},delayMs:1
});

assert.equal(controller.startTaxiTransition({x:10,y:0,z:20,name:'Prato della Valle'},{source:'list',name:'Prato della Valle',tag:'Piazza'}),true);
assert.equal(executions,0,'selection must not start travel');
assert.equal(paused,true,'game stays paused while asking confirmation');
assert.equal(title.textContent,'Conferma taxi');
assert.match(content.innerHTML,/Tariffa: <strong>€35<\/strong>/);
assert.match(content.innerHTML,/non partirà finché non confermi/);
const confirm=content.querySelector('#confirmTaxi');
assert.ok(confirm,'confirm button rendered');
confirm.click();
assert.equal(executions,0,'transition remains asynchronous after confirmation click');
await new Promise(resolve=>setTimeout(resolve,15));
assert.equal(executions,1,'confirmed trip executes exactly once');
assert.equal(lastPayload.meta.confirmed,true);
assert.equal(lastPayload.meta.quotedFare,35);
confirm.click();
await new Promise(resolve=>setTimeout(resolve,5));
assert.equal(executions,1,'same confirmation cannot execute twice');
console.log('PASS taxi runtime requires fare confirmation and executes once');
