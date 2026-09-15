import {TaxiMenuController} from './TaxiMenuController.js';

// Runtime safety layer: every taxi destination must pass through an explicit
// fare quote + confirmation before executeTransition can ever be called.
// This patches the controller prototype, so it also protects an already-created
// controller instance and older cached controller implementations.
const BASE_OPEN_LIST=TaxiMenuController.prototype.openList;

function quoteFare(controller,target){
 try{
  const fare=Number(controller.getFare?.(target));
  return Number.isFinite(fare)?Math.max(0,Math.round(fare)):null;
 }catch(error){
  controller.onError?.(error,'fare calculation');
  return null;
 }
}
function escapeHtml(value){
 return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function restorePrevious(controller,source){
 controller.__taxiConfirmPending=null;
 controller.pending=null;
 if(source==='map')return controller.openMap?.();
 const destinations=controller.__taxiConfirmDestinations||controller.lastDestinations||[];
 if(destinations.length)return controller.openList?.(destinations);
 try{if(controller.menu?.open)controller.menu.close();}catch{}
 controller.setPaused?.(false);
 return true;
}
function runConfirmed(controller){
 const pending=controller.__taxiConfirmPending;
 if(!pending||controller.busy)return false;
 const {targetCoords,meta,fare}=pending;
 controller.__taxiConfirmPending=null;
 controller.pending=null;
 if(!controller.validCoords?.(targetCoords)){
  controller.onError?.(new Error('Invalid confirmed taxi target'),'confirmed destination');
  return false;
 }
 controller.busy=true;
 controller.lockPointerEvents?.();
 controller.inputManager?.disable?.();
 controller.closeAllTaxiUI?.();
 controller.showFastFadeOverlay?.();
 const target={...targetCoords};
 const confirmedMeta={...meta,quotedFare:fare,confirmed:true};
 const delay=Math.max(0,Number(controller.delayMs)||50);
 controller.transitionTimer=setTimeout(async()=>{
  try{
   await controller.executeTransition?.({targetCoords:target,meta:confirmedMeta});
  }catch(error){
   console.error('[Taxi confirmation runtime]',error);
   controller.onError?.(error,'confirmed taxi transition');
  }finally{
   controller.transitionTimer=null;
   controller.hideFastFadeOverlay?.();
   controller.inputManager?.enable?.();
   controller.unlockPointerEvents?.();
   controller.setPaused?.(false);
   controller.busy=false;
  }
 },delay);
 return true;
}

TaxiMenuController.prototype.openList=function(destinations=[]){
 this.__taxiConfirmDestinations=[...destinations];
 return BASE_OPEN_LIST.call(this,destinations);
};

TaxiMenuController.prototype.startTaxiTransition=function(targetCoords,meta={}){
 if(this.busy)return false;
 if(!this.validCoords?.(targetCoords)){
  this.onError?.(new Error('Invalid static taxi target'),'static destination');
  return false;
 }
 const fare=quoteFare(this,targetCoords);
 if(fare===null){
  this.onError?.(new Error('Unable to calculate taxi fare'),'fare calculation');
  return false;
 }
 const target={...targetCoords};
 const pending={targetCoords:target,meta:{...meta,quotedFare:fare},fare};
 this.__taxiConfirmPending=pending;
 this.pending=pending;
 this.setMapPicking?.(false);
 try{if(this.mapDialog?.open)this.mapDialog.close();}catch{}
 this.setPaused?.(true);
 this.unlockPointerEvents?.();
 if(!this.menu||!this.menuContent){
  this.onError?.(new Error('Taxi confirmation DOM unavailable'),'confirmation UI');
  return false;
 }
 const title=this.document?.getElementById?.('menuTitle');
 if(title)title.textContent='Conferma taxi';
 const name=escapeHtml(meta.name||target.name||'Destinazione');
 const tag=escapeHtml(meta.tag||'');
 this.menuContent.innerHTML=`<p class="about-copy"><strong>${name}</strong>${tag?`<br>${tag}`:''}<br><br>Tariffa: <strong>€${fare}</strong><br><small>Lo spostamento non partirà finché non confermi.</small></p><div class="menu-actions"><button type="button" class="primary" id="confirmTaxi">CONFERMA · €${fare}</button><button type="button" id="cancelTaxiConfirm">INDIETRO</button></div>`;
 try{if(!this.menu.open)this.menu.showModal();}catch(error){this.onError?.(error,'confirmation dialog');return false;}
 const confirm=this.menuContent.querySelector?.('#confirmTaxi');
 const back=this.menuContent.querySelector?.('#cancelTaxiConfirm');
 confirm?.addEventListener('click',event=>{
  event.preventDefault();event.stopPropagation();
  if(confirm.disabled)return;
  confirm.disabled=true;
  runConfirmed(this);
 },{once:true});
 back?.addEventListener('click',event=>{
  event.preventDefault();event.stopPropagation();
  restorePrevious(this,meta.source);
 },{once:true});
 return true;
};

TaxiMenuController.prototype.executeConfirmedTransition=function(){return runConfirmed(this);};

export const TAXI_CONFIRMATION_RUNTIME=true;
