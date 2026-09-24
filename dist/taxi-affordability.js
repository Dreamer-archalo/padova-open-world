// The fare is informative and is charged by the game transition itself.
// Do not disable CONFERMA based on the current balance: the game historically
// clamps the post-trip balance at zero, and blocking the button makes a valid
// taxi look frozen (for example on a fresh save with €0).
const content=document.getElementById('menuContent');

function numeric(text=''){const value=Number(String(text).replace(/[^0-9.-]/g,''));return Number.isFinite(value)?value:0;}
function fareFromDialog(){
 if(!content)return null;
 const node=[...content.querySelectorAll('strong')].find(el=>/^\s*€\s*\d/.test(el.textContent||''));
 return node?numeric(node.textContent):null;
}
function refreshTaxiAffordability(){
 const button=document.getElementById('confirmTaxi');if(!button)return;
 const fare=fareFromDialog();if(fare===null)return;
 if(button.disabled)button.disabled=false;
 button.removeAttribute('aria-disabled');
 if(button.dataset.taxiFare!==String(fare))button.dataset.taxiFare=String(fare);
 document.getElementById('taxiFundsWarning')?.remove();
}
const observer=new MutationObserver(refreshTaxiAffordability);
if(content)observer.observe(content,{childList:true,subtree:true,characterData:true});
export {refreshTaxiAffordability};
