import assert from 'node:assert/strict';
import {TaxiMenuController} from './dist/TaxiMenuController.js';
await import('./dist/taxi-confirmation-runtime.js');

class Button{
 constructor(disabled=false){this.disabled=disabled;this.handlers=[];}
 addEventListener(type,handler){if(type==='click')this.handlers.push(handler);}
 click(){if(this.disabled)return;for(const handler of this.handlers)handler({preventDefault(){},stopPropagation(){}});}
}
class Content{
 constructor(){this.style={};this.buttons=new Map();}
 set innerHTML(html){this.html=html;this.buttons.set('#confirmTaxi',new Button(/id="confirmTaxi" disabled/.test(html)));this.buttons.set('#cancelTaxiConfirm',new Button());}
 querySelector(selector){return this.buttons.get(selector);}
}
const wallet={money:50000},content=new Content(),menu={open:true,style:{},close(){this.open=false;},showModal(){this.open=true;}},mapDialog={open:false,style:{},close(){},showModal(){}};
let trips=0,warnings=0;
const taxi=new TaxiMenuController({document:{getElementById:()=>({textContent:''})},menu,mapDialog,menuContent:content,mapPlaces:{style:{}},inputManager:{disable(){},enable(){}},bounds:{x:0,z:0,w:100,h:100},getFare:()=>180,getBalance:()=>wallet.money,onInsufficientFunds:()=>warnings++,setPaused(){},onError:error=>{throw error;},executeTransition:async()=>{trips++;},delayMs:1});
assert(taxi.startTaxiTransition({x:20,z:20,name:'Aeroporto'}));
assert.match(content.html,/Saldo: €50\.000/);
assert.equal(content.querySelector('#confirmTaxi').disabled,false,'€50,000 balance must permit €180 taxi');
content.querySelector('#confirmTaxi').click();await new Promise(resolve=>setTimeout(resolve,12));
assert.equal(trips,1);
wallet.money=50;assert(taxi.startTaxiTransition({x:30,z:30,name:'Dolo'}));
assert.equal(content.querySelector('#confirmTaxi').disabled,true);
assert.equal(taxi.executeConfirmedTransition(),false,'Final handoff must recheck real balance');
assert.equal(warnings,1);assert.equal(trips,1);
console.log('PASS taxi wallet: €50,000 can confirm; insufficient balance cannot travel');
