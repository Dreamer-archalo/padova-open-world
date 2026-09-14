import {project,pointInside} from './core.js';

const ALBIGNASEGO=[
 project(45.3792,11.8470),project(45.3792,11.8925),
 project(45.3498,11.8960),project(45.3498,11.8415)
].map(p=>[p.x,p.z]);

export class ZoneManager{
 constructor(){
  this.active='';this.acc=0;
  this.district=document.getElementById('district');
  this.location=document.getElementById('location');
  this.observer=new MutationObserver(()=>this.enforce());
  if(this.district)this.observer.observe(this.district,{childList:true,subtree:true,characterData:true});
  if(this.location)this.observer.observe(this.location,{childList:true,subtree:true,characterData:true});
 }
 zoneAt(state){return pointInside(state.x,state.z,ALBIGNASEGO)?'albignasego':'';}
 enforce(){
  if(this.active!=='albignasego')return;
  if(this.district&&this.district.textContent!=='ALBIGNASEGO')this.district.textContent='ALBIGNASEGO';
  if(this.location&&this.location.textContent!=='Albignasego')this.location.textContent='Albignasego';
  document.body.dataset.gameZone='albignasego';
 }
 update(game,dt){
  this.acc+=dt;if(this.acc<.12)return;this.acc=0;
  const next=this.zoneAt(game.state);
  if(next!==this.active){this.active=next;if(!next)delete document.body.dataset.gameZone;}
  this.enforce();
 }
}
