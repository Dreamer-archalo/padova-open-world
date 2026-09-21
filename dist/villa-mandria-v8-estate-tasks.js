// Optional Mandria estate interactions: one order at a time, with observable work.
// Does not alter city jobs, save files, or existing hangar ownership.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
import {VILLA,areaPoint,areaLocal} from './gameplay-areas.js';
import {mandriaFree} from './villa-mandria-placement-fix.js';
const point=(u,v)=>areaPoint(VILLA,u,v);
const TASKS=Object.freeze([
 ['Patrón, sono arrivate le casse per la piantagione. Le porto ai filari prima che il sole sia troppo alto?','cassa di sementi','Ai filari, procedi.','Portala alla zona di servizio.',-7,-9,8,6,'Le sementi arriveranno ai filari, patrón.'],
 ['Jefe, il caposquadra aspetta i registri del raccolto. Vuole che glieli consegni personalmente?','registro del raccolto','Consegna il registro.','Prima passa al deposito.',8,-5,-7,5,'Consegno il registro senza lasciarlo incustodito.'],
 ['Patrón, l’acqua è poca sul lato ovest: ho una tanica pronta. Autorizza il giro di irrigazione?','tanica d’acqua','Irriga il lato ovest.','Porta l’acqua al secondo filare.',-9,4,5,-8,'Procedo con l’irrigazione e controllo le valvole.'],
 ['Señor, il veterinario ha lasciato le istruzioni per le pecore. Le porto al recinto?','cartella veterinaria','Vai al recinto.','Portale al responsabile della stalla.',-8,7,8,7,'Le consegno e controllo che nessun animale resti fuori.'],
 ['Patrón, sono arrivati i ricambi del trattore. Li trasferisco in officina prima del turno?','cassa di ricambi','All’officina.','Prima al magazzino.',9,6,-8,-5,'I ricambi saranno inventariati, jefe.'],
 ['Jefe, il cuoco chiede il basilico appena raccolto. Posso portargli la cesta?','cesta di basilico','Portala alla cucina.','Mettila prima nella zona d’ombra.',-6,9,8,-6,'La cucina riceverà soltanto le foglie migliori.'],
 ['Patrón, ho trovato due guanti vicino al cancello. Con il suo permesso li porto alla sicurezza.','guanti da lavoro','Consegnali alla sicurezza.','Lasciali al deposito.',7,8,-8,3,'Li consegno al responsabile e registro il ritrovamento.'],
 ['Señor, una cassa per la scuderia è stata lasciata nel cortile. La sposto al riparo?','cassa di finimenti','Alla scuderia.','Mettila nell’area di carico.',-8,-8,8,6,'La scuderia sarà pronta prima del prossimo giro.'],
 ['Patrón, il capo dei giardinieri aspetta gli attrezzi per la siepe esterna. Procedo?','cassetta degli attrezzi','Portali alla siepe.','Passa dalla rimessa.',-10,2,7,-7,'Sistemeremo la siepe senza bloccare il viale.'],
 ['Jefe, il fornitore ha lasciato il documento delle consegne. Lo porto all’amministrazione?','busta sigillata','Consegnalo subito.','Prima fallo protocollare al deposito.',8,-6,-6,8,'Il documento resterà sigillato fino alla consegna.'],
 ['Patrón, le nuove piantine aspettano nella cassa. Mi autorizza a spostarle dove il terreno è pronto?','cassetta di piantine','Alla parcella pronta.','Spostale vicino all’irrigazione.',-9,-7,7,5,'Le trasporto con cura, una alla volta.'],
 ['Señor, la stalla ha chiesto una balla di fieno supplementare. La porto ai cavalli?','balla di fieno','Ai cavalli.','Prima al ricovero del fieno.',8,6,-7,-7,'Arriverà prima della distribuzione del mangime.'],
 ['Patrón, il responsabile del turno vuole la radio di riserva per il cancello. Posso consegnargliela?','radio di riserva','Al cancello.','Portala al capopattuglia.',6,10,-8,4,'La radio sarà controllata prima di essere consegnata.'],
 ['Jefe, al vivaio mancano le etichette delle nuove colture. Le porto al personale?','etichette del vivaio','Al vivaio.','Al banco del responsabile.',-8,4,9,-5,'Ogni piantina avrà il nome corretto.'],
 ['Patrón, i documenti del trasporto sono pronti ma il camion non può aspettare. Posso portarli all’area carico?','documenti del trasporto','All’area carico.','Prima dal capomagazzino.',9,5,-8,5,'Il camion avrà i documenti prima di ripartire.'],
 ['Señor, le casse di ortaggi sono state pesate. Dove preferisce che porti il primo campione?','cesta di ortaggi','Al punto di controllo.','Alla cucina per la selezione.',-7,-8,8,7,'Porto un campione integro, patrón.'],
 ['Patrón, le guardie chiedono una lanterna per il sentiero della fattoria. La consegno?','lanterna','Al sentiero.','Prima alla guardiola.',-9,6,8,9,'Il percorso sarà illuminato prima del tramonto.'],
 ['Jefe, il fabbro ha preparato una serratura di ricambio per il recinto. Mi dia una destinazione.','serratura nuova','Portala al recinto.','Consegnala al manutentore.',-8,8,8,-5,'Il recinto resterà chiuso durante il lavoro.'],
 ['Patrón, il responsabile dell’orto chiede il piano dei turni. Vuole che glielo porti?','piano dei turni','All’orto.','Prima al caposquadra.',9,-8,-8,6,'Tutti riceveranno le istruzioni prima di iniziare.'],
 ['Señor, ci sono coperte pulite per la guardia di notte e la scuderia. Dove le porto?','coperte pulite','Alla guardiola.','Alla scuderia.',8,9,-8,-8,'Provvedo immediatamente, patrón.']
]);
export const MANDRIA_ESTATE_TASKS=TASKS;
const GUARD_LINES=Object.freeze([
 'Con su permiso, patrón.','A sus órdenes, señor.','La casa está segura, jefe.','Todo en orden, patrón.',
 'El perímetro está tranquilo.','Seguimos atentos, señor.','Nadie entra sin su autorización.',
 'Bienvenido a su casa, patrón.','La ronda sigue su curso.','Su seguridad es nuestra prioridad.',
 'La entrada está bajo control.','Los hombres están en sus puestos.','Sin novedades que comunicar, jefe.',
 'El camino está despejado.','Vigilamos también la zona norte.','Las puertas están aseguradas, patrón.',
 'El turno de noche está preparado.','La escolta está disponible, señor.',
 'Recibido, patrón. Seguimos trabajando.','Cuando usted diga, jefe.'
]);
const greetings=new Map();
function speechTexture(message){if(greetings.has(message))return greetings.get(message);
 const c=document.createElement('canvas');c.width=700;c.height=156;const x=c.getContext('2d');
 x.fillStyle='#f6e9ce';x.strokeStyle='#8c633b';x.lineWidth=7;x.beginPath();x.roundRect(6,6,688,142,18);x.fill();x.stroke();
 x.fillStyle='#233b3a';x.textAlign='center';x.textBaseline='middle';let font=39;
 do{x.font=`bold ${font}px Arial`;if(x.measureText(message).width<650)break;font-=2;}while(font>19);
 x.fillText(message,350,77);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;greetings.set(message,texture);return texture;
}
let game=null,installed=false;
const visit=new WeakMap();
const nearby=g=>{if(!g?.state?.started||g.state.mode!=='foot'||!g.villaLife)return null;
 let best=null,d=4.3;for(const p of g.villaLife.people){if(p.role!=='worker'||!p.obj?.visible)continue;
  const a=Math.hypot(g.state.x-p.obj.position.x,g.state.z-p.obj.position.z);if(a<d){best=p;d=a;}}
 return best;};
function pathFree(g,a,b){const count=Math.max(1,Math.ceil(Math.hypot(b.u-a.u,b.v-a.v)/1.1));let previous=null;
 for(let i=0;i<=count;i++){const t=i/count,u=a.u+(b.u-a.u)*t,v=a.v+(b.v-a.v)*t,p=point(u,v),h=g.terrain.height(p.x,p.z);
  if(!mandriaFree(g,u,v,.52,2.4)||!Number.isFinite(h)||previous!==null&&Math.abs(h-previous)>.43)return false;previous=h;}
 return true;}
function destination(g,worker,du,dv){const from=areaLocal(VILLA,worker.obj.position.x,worker.obj.position.z),original={u:from.u+du,v:from.v+dv};
 // Try the requested location before a shorter safe staging area. Never phase
 // workers through buildings or fences just to make a dialogue appear complete.
 const trials=[original,...[.82,.62,.42].map(f=>({u:from.u+du*f,v:from.v+dv*f}))];
 for(const goal of trials)if(pathFree(g,from,goal))return {goal,from};return null;}
function offer(dialog){const g=game,p=nearby(g);if(!p)return;
 if(p.v8Job){dialog.close();g.toast?.('Il dipendente sta completando l’incarico precedente.',2);return;}
 const workers=g.villaLife.people.filter(x=>x.role==='worker'),index=workers.indexOf(p),n=visit.get(p)||0,task=TASKS[(index*3+n*7)%TASKS.length];visit.set(p,n+1);
 const [question,cargo,yes,alternative,du,dv,au,av,reply]=task;
 dialog.querySelector('#mwName').textContent=['Mateo','Lucía','Rafael','Inés','Diego','Camila'][index%6]+' · incarico della tenuta';
 dialog.querySelector('#mwQuestion').textContent=question;
 const choices=dialog.querySelector('#mwChoices'),response=dialog.querySelector('#mwReply'),done=dialog.querySelector('.mw-next');
 if(!choices||!response||!done)return;choices.replaceChildren();choices.hidden=false;response.hidden=true;done.hidden=true;
 const options=[
  [yes,du,dv,reply],
  [alternative,au,av,'Cambio di destinazione ricevuto, patrón. Eseguo personalmente.'],
  ['Non procedere. Rimani al tuo posto.',null,null,'Come desidera, patrón. Rimango in posizione.']
 ];
 for(const [i,[label,u,v,text]] of options.entries()){
  const button=document.createElement('button');button.type='button';button.textContent=(i+1)+'. '+label;
  button.addEventListener('click',()=>{
   if(u!==null){const route=destination(g,p,u,v);
    if(route){p.v8Job={...route,cargo,started:g.state.elapsed,deadline:g.state.elapsed+100,task:question};
     g.toast?.('Incarico assegnato · '+cargo,2.3);response.textContent=text;
    }else response.textContent='Patrón, il passaggio è ostruito: mantengo il carico qui, senza attraversare recinti o edifici.';
   }else response.textContent=text;
   choices.hidden=true;response.hidden=false;done.hidden=false;done.textContent='Concludi ✓';done.focus();
  });choices.appendChild(button);
 }
}
function install(){if(installed)return;const dialog=document.getElementById('mandriaWorkerDialog');if(!dialog)return;
 installed=true;const old=dialog.showModal.bind(dialog);
 dialog.showModal=function(...args){const result=old(...args);if(dialog.open)offer(dialog);return result;};
}
function animateJobs(g,dt){if(!g.villaLife||!Number.isFinite(dt)||dt<=0)return;
 for(const p of g.villaLife.people){const job=p.v8Job;if(!job)continue;
  if(!p.v8Cargo){const box=new THREE.Mesh(new THREE.BoxGeometry(.48,.38,.42),new THREE.MeshStandardMaterial({color:0xa77a42}));box.position.set(0,1,.40);p.obj.add(box);p.v8Cargo=box;}
  const target=point(job.goal.u,job.goal.v),pos=p.obj.position,dx=target.x-pos.x,dz=target.z-pos.z,d=Math.hypot(dx,dz);
  if(d<.24){p.obj.remove(p.v8Cargo);p.v8Cargo=null;p.v8Job=null;p.home={x:pos.x,z:pos.z};g.toast?.('Incarico concluso: '+job.cargo+' consegnato.',2.2);continue;}
  if(g.state.elapsed>job.deadline){p.obj.remove(p.v8Cargo);p.v8Cargo=null;p.v8Job=null;g.toast?.('Incarico interrotto: percorso non completato.',2.2);continue;}
  const step=Math.min(d,1.10*Math.min(dt,.08)),nx=pos.x+dx/d*step,nz=pos.z+dz/d*step,local=areaLocal(VILLA,nx,nz);
  if(!mandriaFree(g,local.u,local.v,.5,2.4)){p.obj.remove(p.v8Cargo);p.v8Cargo=null;p.v8Job=null;g.toast?.('Incarico sospeso: passaggio occupato.',2.2);continue;}
  pos.x=nx;pos.z=nz;pos.y=g.terrain.height(nx,nz);p.obj.rotation.y=Math.atan2(dx,dz);
  p.left.rotation.x=Math.sin(g.state.elapsed*7)*.35;p.right.rotation.x=-p.left.rotation.x;
 }
}
function salute(g){const t=g.state.elapsed;if(!g.villaLife)return;
 const guards=g.villaLife.people.filter(p=>p.role==='gate'||p.role==='bodyguard');
 for(const [i,p] of guards.entries()){
  if(!p.speech||p.helloAt<0||p.v8SalutedAt===p.helloAt)continue;p.v8SalutedAt=p.helloAt;
  // Every third sentry merely acknowledges the boss without a speech bubble.
  if((i+(p.greetingCount||0))%3===0){p.speech.visible=false;p.lastText='';continue;}
  const text=GUARD_LINES[(i*7+(p.greetingCount||0)*3)%GUARD_LINES.length];
  p.speech.material.map=speechTexture(text);p.speech.material.needsUpdate=true;p.lastText=text;
 }
 for(const [i,c] of (g.villaV3?.patrols||[]).filter(c=>c.estateHorse||c.mandriaPatrol==='ape').entries()){
  if(!c.speechActor?.speech||c.lastHello===undefined||c.v8SalutedAt===c.lastHello)continue;c.v8SalutedAt=c.lastHello;
  if(i%3===0){c.speechActor.speech.visible=false;continue;}
  const text=GUARD_LINES[(i*11+(c.phraseIndex||0)*3)%GUARD_LINES.length];
  c.speechActor.speech.material.map=speechTexture(text);c.speechActor.speech.material.needsUpdate=true;
 }
}
const oldPopulate=ModernGameplay.prototype.populate,oldUpdate=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV8EstateTasks){
 ModernGameplay.prototype.__mandriaV8EstateTasks=true;
 ModernGameplay.prototype.populate=function(...args){game=this;installed=false;return oldPopulate.apply(this,args);};
 ModernGameplay.prototype.update=function(dt){oldUpdate.call(this,dt);game=this;
  if(!this.state?.started||Math.hypot(this.state.x-VILLA.x,this.state.z-VILLA.z)>355)return;
  install();salute(this);animateJobs(this,dt);
  const prompt=document.getElementById('mandriaWorkerPrompt'),p=nearby(this);
  if(prompt&&p?.v8Job)prompt.hidden=true;
 };
}
