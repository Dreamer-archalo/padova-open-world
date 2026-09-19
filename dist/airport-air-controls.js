// Keyboard remapping is installed before the legacy flight and dogfight listeners.
// It is active ONLY aboard military jets: ground vehicles and civilian aircraft
// retain their original keys. No global terrain/physics changes.
import {ModernGameplay} from './modern-gameplay.js';
export const airControlHeld=new Set();
const military=c=>!!c&&['airport-jet','airport-interceptor','airport-strike','airport-blackbird'].includes(c.style);
let activeGame=null;
const previousPopulate=ModernGameplay.prototype.populate;
if(!ModernGameplay.prototype.__airControls20260919){
 ModernGameplay.prototype.__airControls20260919=true;
 ModernGameplay.prototype.populate=function(...args){const result=previousPopulate.apply(this,args);activeGame=this;return result;};
}
export const flightCommand=held=>({climb:held.has('ArrowUp'),dive:held.has('ArrowDown'),throttle:held.has('Tab'),brake:held.has('ControlLeft')||held.has('ControlRight')});
export function controlSpeed(speed,{throttle=false,brake=false}={},dt=0,accel=15,decel=32,limit=130){
 if(!Number.isFinite(dt)||dt<=0)return speed;
 return Math.max(0,Math.min(limit,speed+(throttle?accel*dt:0)-(brake?decel*dt:0)));
}
function inMilitaryFlight(){const s=activeGame?.state;return !!s?.started&&!s.paused&&s.mode==='car'&&military(s.car);}
if(typeof window!=='undefined'){
 window.addEventListener('keydown',event=>{
  if(!inMilitaryFlight()||document.querySelector('dialog[open]'))return;
  // An internally dispatched Tab is the legacy guided-missile action, now on G.
  if(event.code==='Tab'&&!event.isTrusted)return;
  const code=event.code;
  if(code==='KeyG'){
   event.preventDefault();event.stopImmediatePropagation();
   if(!event.repeat)window.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',code:'Tab',bubbles:true,cancelable:true}));
   return;
  }
  if(!['ArrowUp','ArrowDown','Tab','ControlLeft','ControlRight'].includes(code))return;
  event.preventDefault();event.stopImmediatePropagation();airControlHeld.add(code);
 },true);
 window.addEventListener('keyup',event=>{
  // Let legacy keyup listeners clear their own sets, even if the key was held
  // while switching between a car and a jet.
  airControlHeld.delete(event.code);
 },true);
 // The legacy mobile descent button fires both ControlLeft and touchDive.
 // Capture it before those handlers so its NEW brake label really brakes.
 document.addEventListener('pointerdown',event=>{
  if(!inMilitaryFlight()||!event.target?.closest?.('#touchDescend'))return;
  event.preventDefault();event.stopImmediatePropagation();airControlHeld.add('ControlLeft');
 },true);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,event=>{
  if(event.target?.closest?.('#touchDescend'))airControlHeld.delete('ControlLeft');
 },true);
 window.addEventListener('blur',()=>airControlHeld.clear());
}
