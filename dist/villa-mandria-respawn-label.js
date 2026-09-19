// The core respawn already uses the moved HOME coordinates. Replace only the
// legacy hardcoded location label left in its UI notification; no gameplay hooks.
const notification=document.getElementById('toast');
if(notification){
 const label=()=>{
  const text=notification.textContent||'';
  if(text.includes('Villa di Parco Treves')){
   notification.textContent=text.replace('Villa di Parco Treves','Villa della Mandria');
  }
 };
 const observer=new MutationObserver(label);
 observer.observe(notification,{subtree:true,childList:true,characterData:true});
 label();
}
