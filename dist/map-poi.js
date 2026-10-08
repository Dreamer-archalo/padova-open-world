// One legend is shared by the category list and the map markers.
export const MAP_CATEGORIES=Object.freeze({
 workshops:{label:'Officine',color:'#65d6c4',symbol:'⚒'},
 dealers:{label:'Concessionari',color:'#bca1ff',symbol:'◆'},
 home:{label:'Casa e garage',color:'#ffb875',symbol:'⌂'},
 places:{label:'Luoghi di interesse',color:'#f5d971',symbol:'●'},
 towns:{label:'Città e destinazioni',color:'#85caff',symbol:'◇'}
});
export function mapPoints(groups){return Object.entries(groups).flatMap(([category,points])=>points.map(p=>({...p,category,...MAP_CATEGORIES[category],name:p.name})));}
export function mountMapCategories(root,groups,onSelect){
 root.replaceChildren();
 for(const [category,points] of Object.entries(groups)){
  if(!points.length)continue;
  const def=MAP_CATEGORIES[category],details=document.createElement('details');details.className='map-category';details.dataset.mapCategory=category;
  const summary=document.createElement('summary'),badge=document.createElement('span');badge.className='map-poi-badge';badge.style.color=def.color;badge.textContent=def.symbol;badge.setAttribute('aria-hidden','true');summary.append(badge,document.createTextNode(def.label+' · '+points.length));details.append(summary);
  for(const p of points){const button=document.createElement('button');button.type='button';button.textContent=p.name;const small=document.createElement('small');small.textContent=p.tag||p.address||'';button.append(small);button.onclick=()=>onSelect(p,category);details.append(button);}
  root.append(details);
 }
}
export function drawMapPoint(ctx,screen,point,scale=1){
 const r=8*scale;ctx.save();ctx.fillStyle='#132d3e';ctx.strokeStyle=point.color;ctx.lineWidth=1.8*scale;ctx.beginPath();ctx.arc(screen.x,screen.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=point.color;ctx.font='700 '+Math.round(11*scale)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(point.symbol,screen.x,screen.y);ctx.restore();
}
