// Shared workshop/dealer layout: only the options column scrolls.
export function mountConfiguratorLayout(root,{previewId,totalId,actionIds=[]}){
 const preview=root.querySelector('#'+previewId),total=root.querySelector('#'+totalId);
 const layout=document.createElement('div');layout.className='configurator-layout';
 const visual=document.createElement('section');visual.className='configurator-visual';visual.setAttribute('aria-label','Anteprima e acquisto');
 const panel=document.createElement('section');panel.className='configurator-controls';panel.setAttribute('aria-label','Opzioni di personalizzazione');panel.tabIndex=0;
 const name=root.querySelector('p');if(name)visual.append(name);visual.append(preview);
 const hint=document.createElement('p');hint.className='dealer-preview-hint';hint.textContent='Trascina per ruotare · le modifiche si vedono subito';visual.append(hint);
 root.querySelector('.dealer-preview-hint')?.remove();visual.append(hint);
 const payment=document.createElement('div');payment.className='configurator-payment';payment.append(total);
 for(const id of actionIds){const button=root.querySelector('#'+id);if(button)payment.append(button);}visual.append(payment);
 while(root.firstChild)panel.append(root.firstChild);
 const summary=document.createElement('details');summary.className='configuration-summary';summary.open=true;summary.innerHTML='<summary>Allestimento selezionato</summary><ul id="configurationChanges" aria-live="polite"></ul>';panel.append(summary);
 layout.append(visual,panel);root.append(layout);root.closest('dialog')?.classList.add('configurator-dialog');return layout;
}
export function updateConfigurationSummary(root,definitions,build,previous={}){
 const list=root.querySelector('#configurationChanges');list.replaceChildren();
 for(const [key,def] of Object.entries(definitions)){const row=def.values.find(v=>v[0]===build[key]);if(!row||row[0]===def.values[0][0]&&(!previous[key]||previous[key]===row[0]))continue;const li=document.createElement('li');li.textContent=def.label+': '+row[1]+(row[0]===previous[key]?' · già montato':'');list.append(li);}
 if(!list.children.length){const li=document.createElement('li');li.textContent='Optional di serie';list.append(li);}
}
export const CONFIGURATION_PRESETS={
 elegant:{label:'Elegante',values:{wheels:'graphite',paintFinish:'pearl',chromeMirrors:'satin',chromeGrille:'satin',interior:'premium',upholstery:'cream'}},
 sport:{label:'Sportivo',values:{wheels:'black',wheelDesign:'sport',paintFinish:'metallic',tyres:'sport',brakes:'sport',response:'sport'}},
 touring:{label:'Turismo',values:{wheels:'bronze',bodykit:'touring',interior:'premium',upholstery:'tan',saddlebags:'hard',windscreen:'touring'}}
};
export function mountConfigurationPresets(root,definitions,update){
 const old=root.querySelector('[data-dealer-preset]')?.parentElement;if(!old)return;
 const details=document.createElement('details');details.className='configuration-packages';
 const heading=document.createElement('summary');heading.textContent='Pacchetti pronti · facoltativi';details.append(heading);
 const intro=document.createElement('p');intro.textContent='Ogni pacchetto cambia soltanto le voci elencate. Puoi modificarle singolarmente o annullare l’ultima applicazione. L’acquisto avviene solo dopo la conferma.';details.append(intro);
 let previous=null;
 for(const [key,preset] of Object.entries(CONFIGURATION_PRESETS)){
  const entries=Object.entries(preset.values).map(([field,value])=>[field,definitions[field],definitions[field]?.values.find(row=>row[0]===value)]).filter(([,def,row])=>def&&row),card=document.createElement('article'),title=document.createElement('strong');title.textContent=preset.label;card.append(title);
  const desc=document.createElement('p');desc.textContent=entries.map(([,def,row])=>def.label+': '+row[1]).join(' · ');card.append(desc);
  const button=document.createElement('button');button.dataset.dealerPreset=key;button.textContent='Applica '+preset.label;button.onclick=()=>{previous=Object.fromEntries([...root.querySelectorAll('[data-dealer-option]')].map(el=>[el.dataset.dealerOption,el.value]));for(const [field,,row] of entries)root.querySelector('[data-dealer-option="'+field+'"]').value=row[0];undo.disabled=false;status.textContent='Pacchetto '+preset.label+' applicato in anteprima.';update();};card.append(button);details.append(card);
 }
 const undo=document.createElement('button');undo.id='dealerPresetUndo';undo.textContent='Annulla ultimo pacchetto';undo.disabled=true;undo.onclick=()=>{for(const [field,value] of Object.entries(previous||{}))root.querySelector('[data-dealer-option="'+field+'"]').value=value;previous=null;undo.disabled=true;status.textContent='Scelte precedenti ripristinate.';update();};details.append(undo);
 const status=document.createElement('p');status.setAttribute('aria-live','polite');details.append(status);old.replaceWith(details);
}
