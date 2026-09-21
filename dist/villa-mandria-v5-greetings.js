// Short fictional estate banter layered on established 19-second NPC greeting
// cooldowns; it never forces extra speech events or overrides guard exchanges.
import * as THREE from './vendor/three.module.js';
import {ModernGameplay} from './modern-gameplay.js';
const GREETINGS=[
 '¡Hola, patrón!','A las órdenes, patrón.','Todo tranquilo, jefe.',
 'La zona está limpia.','Aquí estamos, patrón.','Perímetro bajo control.',
 '¿Qué se le ofrece, jefe?','Nessun problema, capo.','Ronda completata, patrón.',
 'Tutto sotto controllo, signore.','¡Buenos días, jefe!','I cavalli hanno già fatto colazione.',
 'Hoy manda usted, patrón.','Il portone è più puntuale del tram.'
];
const ORIGINALS=new Set([
 'Hola signor','Hola patron','Hola, patrón','A sus órdenes, patrón',
 'Accesso vigilado, señor','Perímetro seguro, señor','Todo tranquilo, señor',
 'Patrulla en marcha, señor','Con permesso, signore','Perimetro sicuro',
 'Resto in posizione','Nessuna novità','Acceso controllato',
 'Buona giornata, capo','Ordini, patrón?','Todo tranquilo, patrón',
 'Patrulla móvil, señor','Ruta despejada, patrón'
]);
const cache=new Map();function textImage(label){if(cache.has(label))return cache.get(label);
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=180;const c=canvas.getContext('2d');
 c.fillStyle='#faf0d6';c.strokeStyle='#b7854b';c.lineWidth=7;c.beginPath();c.roundRect(8,8,624,134,20);c.fill();c.stroke();
 c.beginPath();c.moveTo(291,139);c.lineTo(320,172);c.lineTo(349,139);c.closePath();c.fill();c.stroke();
 c.textAlign='center';c.textBaseline='middle';c.fillStyle='#1d3437';let size=42;do{c.font=`bold ${size}px Arial`;if(c.measureText(label).width<580)break;size-=2;}while(size>24);c.fillText(label,320,76);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;cache.set(label,tex);return tex;
}
function override(speech,text){if(!speech)return;speech.material.map=textImage(text);speech.material.needsUpdate=true;}
function refresh(g){if(!g.state?.started||!g.villaV4||!g.villaLife)return;
 const t=g.state.elapsed;
 for(const [i,p] of g.villaLife.people.entries()){
  if(!['gate','bodyguard'].includes(p.role)||!p.speech||p.helloAt<0||p.v5TextAt===p.helloAt)continue;
  p.v5TextAt=p.helloAt;
  if(!p.speech.visible||p.v4SilentUntil>t||!ORIGINALS.has(p.lastText))continue;
  const phrase=GREETINGS[(Math.floor(t/21)+i*3+(p.greetingCount||0))%GREETINGS.length];
  override(p.speech,phrase);p.lastText=phrase;
 }
 for(const [i,c] of g.villaV3?.patrols?.filter(c=>c.mandriaPatrol==='ape')?.entries()||[]){
  if(!c.speechActor?.speech||c.lastHello===c.v5HelloAt||c.lastHello===undefined)continue;
  c.v5HelloAt=c.lastHello;if(!c.speechActor.speech.visible)continue;
  override(c.speechActor.speech,GREETINGS[(i*5+(c.phraseIndex||0))%GREETINGS.length]);
 }
}
const old=ModernGameplay.prototype.update;
if(!ModernGameplay.prototype.__mandriaV5Greetings){ModernGameplay.prototype.__mandriaV5Greetings=true;
 ModernGameplay.prototype.update=function(dt){old.call(this,dt);refresh(this);};
}
