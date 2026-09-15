const LABELS={Matt:'Mattia',Marchese:'Marchese',Nino:'Nino',Milo:'Milo',Scando:'Fede'};
const SELECT_VALUES={Matt:'mattia',Marchese:'marchese',Nino:'nico',Milo:'milo',Scando:'scando'};
let activeUser=null,finished=false,lastPlayAt=0,lastConfirmAt=0;

function closeOnlineDialog(){
  const dialog=document.getElementById('onlineDialog');
  if(dialog?.open){try{dialog.close();}catch{}}
}

function selectOnlineCharacter(user){
  const hiddenSelect=document.getElementById('characterSelect');
  const value=SELECT_VALUES[user];
  if(hiddenSelect&&value){
    hiddenSelect.value=value;
    hiddenSelect.dispatchEvent(new Event('change',{bubbles:true}));
  }

  const picker=document.getElementById('characterPicker');
  if(!picker||picker.hidden)return false;
  const wanted=LABELS[user];
  const button=[...document.querySelectorAll('#characterChoices button')].find(b=>b.textContent.trim()===wanted);
  if(!button)return false;
  button.click();
  const confirm=document.getElementById('confirmCharacter');
  if(!confirm)return false;
  const now=performance.now();
  if(now-lastConfirmAt>120){lastConfirmAt=now;confirm.click();}
  return true;
}

function step(now){
  requestAnimationFrame(step);
  const online=window.PadovaOnline;
  if(!online?.connected){activeUser=null;finished=false;return;}
  const user=online.user;
  if(!user)return;
  if(activeUser!==user){activeUser=user;finished=false;lastPlayAt=0;lastConfirmAt=0;}
  if(finished)return;

  closeOnlineDialog();

  const playing=document.getElementById('playingUI');
  if(playing&&!playing.hidden){finished=true;return;}

  if(selectOnlineCharacter(user))return;

  const play=document.getElementById('playBtn');
  if(play&&!play.disabled&&now-lastPlayAt>350){
    lastPlayAt=now;
    play.click();
  }
}

requestAnimationFrame(step);
