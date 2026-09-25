// Precision OSM-aligned regional targets; geometry remains sourced from OSM.
import {project} from './core.js';

const detailed=[
 ['Cazzago',45.44004,12.07439,1050,'centro urbano'],
 ['Dolo',45.4259,12.0773,1500,'Riviera del Brenta'],
 ['Mira Porte',45.43851,12.13862,1150,'Riviera del Brenta'],
 ['Marano Veneziano',45.46531,12.11765,850,'centro urbano'],
 ['Oriago',45.45141,12.17107,1500,'Riviera del Brenta'],
 ['Marghera',45.469,12.231,1600,'zona urbana e portuale'],
 ['Porto Marghera',45.457,12.265,2400,'area industriale e portuale']
];
const extra=[
 ['Mestre',45.4931,12.2427,1750,'area di transito'],
 ['Ponte della Libertà',45.4567,12.2965,650,'collegamento stradale'],
 ['Piazzale Roma',45.43868,12.31811,450,'arrivo Venezia'],
 ['Venezia - San Marco',45.43415,12.33846,550,'centro storico']
];
export const REGIONAL_ZONES=[
 ...detailed.map(([name,lat,lon,radius,tag])=>({name,tag,radius,lod:'detailed',...project(lat,lon)})),
 ...extra.map(([name,lat,lon,radius,tag])=>({name,tag,radius,lod:name.startsWith('Venezia')||name==='Piazzale Roma'?'detailed':'transit',...project(lat,lon)}))
];
// Do not make Mestre detailed just because it is near Marghera.
// The Venice footprint is a polygonal / bounded city region, not a concentric
// disc that would accidentally detail the whole lagoon.
export const VENEZIA_DETAIL={x0:33600,z0:-6300,x1:39400,z1:-1450};
export const PADOVA_EAST=7350;
export function regionalDetail(x,z){
 if(x<PADOVA_EAST)return 'padova';
 if(x>=VENEZIA_DETAIL.x0&&x<=VENEZIA_DETAIL.x1&&z>=VENEZIA_DETAIL.z0&&z<=VENEZIA_DETAIL.z1)return 'detailed';
 const mestre=REGIONAL_ZONES.find(p=>p.name==='Mestre');
 if(Math.hypot(x-mestre.x,z-mestre.z)<mestre.radius)return 'transit';
 return REGIONAL_ZONES.some(p=>p.lod==='detailed'&&Math.hypot(x-p.x,z-p.z)<p.radius)?'detailed':'transit';
}
export function activeRegionalPlace(x,z){
 let best=null,nearest=Infinity;
 for(const p of REGIONAL_ZONES){const d=Math.hypot(x-p.x,z-p.z);if(d<nearest){nearest=d;best=p;}}
 return nearest<Math.max(best?.radius||0,1250)?best:null;
}
