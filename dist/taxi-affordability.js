// UI/runtime safety net for Taxi abusivo fares. The game controller owns the
// actual trip; this module prevents confirmation when the displayed balance
// cannot cover the fare, so money can never be driven negative by the dialog.
const menu=document.getElementById('menu');
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
 const short=balance()<fare;
 button.disabled=short;button.setAttribute('aria-disabled',String(short));
 button.dataset.taxiFare=String(fare);
 if(!button.dataset.defaultLabel)button.dataset.defaultLabel=button.textContent||'Conferma e parti';
 button.textContent=short?`Fondi insufficienti · €${fare}`:button.dataset.defaultLabel;
 const existing=document.getElementById('taxiFundsWarning');
 if(short){const p=warning();if(p)p.textContent=`Servono €${fare}. Saldo disponibile: €${Math.max(0,Math.floor(balance()))}.`;}else existing?.remove();
}

// MutationObserver covers every newly rendered confirmation dialog. A capture
// guard is kept as a second line of defence in case a click lands in the same
// frame in which the dialog was created.
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
