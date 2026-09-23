// Keep the taxi fare dialog responsive: a MutationObserver watches this same
// subtree, so never rewrite DOM text unless its value actually changed.
const content=document.getElementById('menuContent');
const money=document.getElementById('money');

function numeric(text=''){const value=Number(String(text).replace(/[^0-9.-]/g,''));return Number.isFinite(value)?value:0;}
function fareFromDialog(){
 if(!content)return null;
 const node=[...content.querySelectorAll('strong')].find(el=>/^\s*€\s*\d/.test(el.textContent||''));
 return node?numeric(node.textContent):null;
}
function balance(){return numeric(money?.textContent);}
function warning(){
 let p=document.getElementById('taxiFundsWarning');
 if(!p&&content){p=document.createElement('p');p.id='taxiFundsWarning';p.className='about-copy taxi-funds-warning';p.setAttribute('role','alert');content.appendChild(p);}
 return p;
}
function refreshTaxiAffordability(){
 const button=document.getElementById('confirmTaxi');if(!button)return;
 const fare=fareFromDialog();if(fare===null)return;
 const available=balance(),short=available<fare;
 if(button.disabled!==short)button.disabled=short;
 if(button.getAttribute('aria-disabled')!==String(short))button.setAttribute('aria-disabled',String(short));
 if(button.dataset.taxiFare!==String(fare))button.dataset.taxiFare=String(fare);
 if(!button.dataset.defaultLabel)button.dataset.defaultLabel=button.textContent||'Conferma e parti';
 const label=short?`Fondi insufficienti · €${fare}`:button.dataset.defaultLabel;
 if(button.textContent!==label)button.textContent=label;
 const existing=document.getElementById('taxiFundsWarning');
 if(short){
  const p=existing||warning();
  const message=`Servono €${fare}. Saldo disponibile: €${Math.max(0,Math.floor(available))}.`;
  if(p&&p.textContent!==message)p.textContent=message;
 }else if(existing)existing.remove();
}

// Reentrant refreshes must be idempotent: the confirmation must never cause
// an endless microtask cycle that starves rendering, ESC or the close button.
const observer=new MutationObserver(refreshTaxiAffordability);
if(content)observer.observe(content,{childList:true,subtree:true,characterData:true});
if(money)observer.observe(money,{childList:true,subtree:true,characterData:true});
document.addEventListener('click',event=>{
 const button=event.target?.closest?.('#confirmTaxi');if(!button)return;
 refreshTaxiAffordability();
 const fare=Number(button.dataset.taxiFare||0);
 if(fare>0&&balance()<fare){event.preventDefault();event.stopImmediatePropagation();}
},true);

export {refreshTaxiAffordability};
