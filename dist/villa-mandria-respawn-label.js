// Core spawn already uses relocated HOME. Correct only legacy hard-coded UI labels.
const fixes=[
 [document.querySelector('#characterSelect+small'),'villa di Parco Treves','Villa della Mandria'],
 [document.querySelector('#characterPicker .character-heading p'),'villa di Parco Treves','Villa della Mandria']
];
for(const [element,oldName,newName] of fixes){
 if(element?.textContent?.includes(oldName))element.textContent=element.textContent.replace(oldName,newName);
}
const notification=document.getElementById('toast');
if(notification){
 const label=()=>{
  const text=notification.textContent||'';
  if(text.includes('Villa di Parco Treves'))notification.textContent=text.replace('Villa di Parco Treves','Villa della Mandria');
 };
 const observer=new MutationObserver(label);
 observer.observe(notification,{subtree:true,childList:true,characterData:true});
 label();
}
