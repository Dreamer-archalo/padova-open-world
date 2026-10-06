export const CLUB_SAVE_KEY='padova-biker-club-v1';
export const CLUB_TRIALS=[
 {id:'formation',name:'Ruota a ruota',reward:'club_naked',cash:250,desc:'Resta 18 secondi in formazione: 8–24 m dietro il capogruppo.'},
 {id:'wheelie',name:'Una ruota sola',reward:'club_enduro',cash:350,desc:'Tieni B e percorri 20 m consecutivi in impennata nella zona segnata.'},
 {id:'jumps',name:'Due salti, zero cadute',reward:'club_supersport',cash:500,desc:'Supera entrambe le rampe e atterra in corsia senza incidenti.'}
];
export function readClubProgress(storage){
 try{storage??=globalThis.localStorage;const p=JSON.parse(storage?.getItem(CLUB_SAVE_KEY)||'{}');return {completed:CLUB_TRIALS.filter(t=>p.completed?.includes(t.id)).map(t=>t.id),best:Object.fromEntries(CLUB_TRIALS.filter(t=>Number.isFinite(p.best?.[t.id])&&p.best[t.id]>0).map(t=>[t.id,p.best[t.id]]))};}
 catch{return {completed:[],best:{}};}
}
export function clubVehicleUnlocked(id,storage){const trial=CLUB_TRIALS.find(t=>t.reward===id);return !trial||readClubProgress(storage).completed.includes(trial.id);}
export function recordClubTrial(id,seconds,storage){
 const p=readClubProgress(storage),first=!p.completed.includes(id);if(!CLUB_TRIALS.some(t=>t.id===id)||!Number.isFinite(seconds)||seconds<=0)return {progress:p,first:false,saved:false};
 if(first)p.completed.push(id);p.best[id]=Math.min(seconds,p.best[id]||Infinity);let saved=false;try{storage??=globalThis.localStorage;storage?.setItem(CLUB_SAVE_KEY,JSON.stringify(p));saved=!!storage;}catch{}
 return {progress:p,first,saved};
}
