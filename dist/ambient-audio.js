// Procedural ambience: no external files, no autoplay. It only follows the
// existing Sound toggle and stays intentionally quiet under the engine audio.
const district=document.getElementById('district');
const locationName=document.getElementById('location');
let ctx=null,master=null,noiseGain=null,humGain=null,noise=null,hum=null,timer=0,enabled=false;

function makeNoise(context){
 const length=context.sampleRate*2,buffer=context.createBuffer(1,length,context.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*.55;
 const source=context.createBufferSource();source.buffer=buffer;source.loop=true;
 const low=context.createBiquadFilter();low.type='lowpass';low.frequency.value=950;low.Q.value=.2;
 noiseGain=context.createGain();noiseGain.gain.value=.012;source.connect(low).connect(noiseGain).connect(master);source.start();return source;
}
function makeHum(context){const osc=context.createOscillator();osc.type='sine';osc.frequency.value=48;humGain=context.createGain();humGain.gain.value=.0045;osc.connect(humGain).connect(master);osc.start();return osc;}
function zoneProfile(){const text=((district?.textContent||'')+' '+(locationName?.textContent||'')).toLowerCase();if(/aeroporto|airport/.test(text))return {noise:.017,hum:.010,chime:.08};if(/industr/.test(text))return {noise:.014,hum:.013,chime:.02};if(/portello|univers/.test(text))return {noise:.017,hum:.005,chime:.28};if(/centro|storico|piazza|prato/.test(text))return {noise:.016,hum:.005,chime:.22};if(/verde|campagna|selvaggio/.test(text))return {noise:.008,hum:.002,chime:.09};if(/tangenziale/.test(text))return {noise:.019,hum:.007,chime:0};return {noise:.012,hum:.0045,chime:.08};}
function applyProfile(){if(!ctx||!noiseGain||!humGain)return;const p=zoneProfile(),now=ctx.currentTime;noiseGain.gain.setTargetAtTime(p.noise,now,.8);humGain.gain.setTargetAtTime(p.hum,now,.8);}
function chime(){if(!enabled||!ctx||ctx.state!=='running')return;const p=zoneProfile();if(Math.random()>p.chime)return;const now=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='triangle';osc.frequency.setValueAtTime(880,now);osc.frequency.exponentialRampToValueAtTime(620,now+.48);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.018,now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+.75);osc.connect(gain).connect(master);osc.start(now);osc.stop(now+.8);}
function ensure(){if(ctx)return;const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;ctx=new AudioContext();master=ctx.createGain();master.gain.value=.72;master.connect(ctx.destination);noise=makeNoise(ctx);hum=makeHum(ctx);applyProfile();timer=window.setInterval(chime,9000);}
async function setEnabled(on){enabled=!!on;if(enabled){ensure();try{await ctx?.resume();}catch{}applyProfile();}else if(ctx?.state==='running')try{await ctx.suspend();}catch{}}
function syncFromButton(button){const on=/sound:\s*on/i.test(button?.textContent||'');setEnabled(on);}
document.addEventListener('click',event=>{const button=event.target?.closest?.('#soundBtn');if(button)setTimeout(()=>syncFromButton(button),0);});
const zoneObserver=new MutationObserver(applyProfile);if(district)zoneObserver.observe(district,{childList:true,subtree:true,characterData:true});if(locationName)zoneObserver.observe(locationName,{childList:true,subtree:true,characterData:true});
window.addEventListener('pagehide',()=>{clearInterval(timer);try{noise?.stop();hum?.stop();ctx?.close();}catch{}});
