export class PerformanceOverlay{
 constructor(element){this.element=element;this.visible=false;this.frames=0;this.total=0;this.last=0;this.fps=0;element.hidden=true;}
 toggle(){this.visible=!this.visible;this.element.hidden=!this.visible;}
 update(dt,world,state,counts){
  this.frames++;this.total+=dt;const m=world.streaming?.metrics;
  if(m&&dt>.05)m.longFrames++;
  if(this.total>.5){this.fps=this.frames/this.total;this.frames=0;this.total=0;}
  if(!this.visible||state.elapsed-this.last<.2)return;this.last=state.elapsed;
  this.element.textContent=[`FPS ${this.fps.toFixed(0)} · ${state.quality}`,`Chunk ${m?.loaded||0} · coda ${m?.queued||0} (nucleo ${m?.coreQueued||0})`,
   `Streaming ${(m?.streamMs||0).toFixed(1)} ms · max ${(m?.maxStreamMs||0).toFixed(1)} ms`,
   `Nucleo ${(m?.coreLoadMs||0).toFixed(0)} ms · worker ${(m?.workerMs||0).toFixed(0)} ms`,
   `Prefetch ${m?.prefetch||0} m · ${m?.backend||'avvio'} · ${m?.pressure?'priorità terreno/strade':'dettaglio'}`,
   `NPC ${counts.people} · veicoli ${counts.cars} · tram ${counts.trams}`,`Frame >50 ms: ${m?.longFrames||0} · F3 chiude`].join('\n');
 }
}
