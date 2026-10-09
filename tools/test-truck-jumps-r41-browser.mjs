import assert from 'node:assert/strict';
export async function verifyTruckJumps(page){
 await page.evaluate(()=>{
  const q=__r41;q.closeDialogs();q.setPaused(true);q.keys.clear();
  const c=q.cars.find(c=>c.style==='mito'),base=q.terrain.height(c.x,c.z,c.y);
  globalThis.__r41OriginalRoofs=q.terrain.roofs;q.terrain.roofs=null;
  q.terrain.height=()=>base;q.terrain.slope=()=>0;q.terrain.waterAt=()=>null;q.collision.near=()=>[];
  for(const other of q.cars)other.mesh.visible=false;q.player.visible=false;
  q.resetGroundMotion(c);c.mesh.visible=true;c.health=100;c.spec={...c.spec,maxHealth:100};
  Object.assign(q.state,{mode:'car',car:c,x:c.x,z:c.z,y:base,yaw:c.yaw,speed:0,health:100,paused:false});
  globalThis.__jumpBase=base;
 });
 await page.keyboard.press('9');
 assert(await page.evaluate(()=>__r41.state.car.jump?.airborne),'actual numeric key starts jump');
 const jump=await page.evaluate(()=>{
  const q=__r41;q.setPaused(true);const c=q.state.car;let peak=q.state.y;
  for(let i=0;i<600&&c.jump.airborne;i++){
   q.movePlayer(1/60);peak=Math.max(peak,q.state.y);
   if(c.jump.vy<=0)break;
  }
  q.poseVehicle(c);q.updateUI();for(let i=0;i<120;i++)q.updateCamera(1/60);q.renderer.render(q.scene,q.camera);
  return {height:peak-__jumpBase,health:q.state.health};
 });
 assert(Math.abs(jump.height-50)<.01);assert.equal(jump.health,100);
 await page.screenshot({path:'test-artifacts/r41/jump-50m-apex.png'});
 const landing=await page.evaluate(()=>{const q=__r41,c=q.state.car;for(let i=0;i<600&&c.jump.airborne;i++)q.movePlayer(1/60);q.updateUI();return {health:q.state.health,airborne:c.jump.airborne,burning:!!c.burning,severeCrash:!!c.severeCrash,y:q.state.y};});
 assert.deepEqual(landing,{health:99,airborne:false,burning:false,severeCrash:false,y:await page.evaluate(()=>__jumpBase)});
 assert((await page.locator('#commandGuide').textContent()).includes('Salto 50 m'));
 await page.evaluate(()=>{
  const q=__r41,c=q.state.car;q.resetGroundMotion(c);q.state.paused=false;
  const field=document.createElement('input');field.id='r41-key-capture-test';document.body.append(field);
  field.addEventListener('keydown',event=>event.stopPropagation());field.focus();
 });await page.keyboard.press('Numpad9');assert(await page.evaluate(()=>__r41.state.car.jump?.airborne),'numeric keypad starts jump');
 await page.evaluate(()=>{
  document.getElementById('r41-key-capture-test')?.remove();
  const q=__r41,c=q.state.car;q.setPaused(true);q.resetGroundMotion(c);q.keys.clear();
  const yaw=q.state.yaw,truck=q.addCar(q.state.x+Math.sin(yaw)*11,q.state.z+Math.cos(yaw)*11,yaw,false,false,'camionrampa');
  truck.y=__jumpBase;truck.speed=4;truck.health=100;q.poseVehicle(truck);globalThis.__rampTruck=truck;
  Object.assign(q.state,{y:__jumpBase,speed:24,health:100});c.health=100;q.keys.add('KeyW');
 });
 // Snapshot the approach with the redesigned deck visible.
 await page.evaluate(()=>{const q=__r41;q.poseVehicle(q.state.car);q.updateUI();for(let i=0;i<120;i++)q.updateCamera(1/60);q.renderer.render(q.scene,q.camera);});
 await page.screenshot({path:'test-artifacts/r41/truck-ramp-approach.png'});
 const ramp=await page.evaluate(()=>{
  const q=__r41,truck=__rampTruck,c=q.state.car;let launched=false,landed=false,peak=__jumpBase,entryHealth=null;
  for(let i=0;i<600;i++){
   truck.x+=Math.sin(truck.yaw)*truck.speed/60;truck.z+=Math.cos(truck.yaw)*truck.speed/60;q.poseVehicle(truck);q.movePlayer(1/60);
   peak=Math.max(peak,q.state.y);
   if(!launched&&c.jump?.airborne){launched=true;entryHealth=q.state.health;}
   if(launched&&!c.jump?.airborne){landed=true;break;}
  }
  q.keys.clear();return {launched,landed,peak:peak-__jumpBase,entryHealth};
 });
 assert(ramp.launched&&ramp.landed&&ramp.peak>3.5);assert.equal(ramp.entryHealth,100);
 await page.evaluate(()=>{__r41.terrain.roofs=__r41OriginalRoofs;});
 console.log('PASS R41 browser: keyboard 9/Numpad9, 50 m apex, exact 99 life landing, redesigned moving truck ramp without approach damage.',{jump,landing,ramp});
}
