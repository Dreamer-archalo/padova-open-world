// Run at the actual world render call: Three installs render on each instance,
// so replacing WebGLRenderer.prototype.render never changes the live camera.
export function renderEstateCamera(renderer,scene,camera,game,player){
 const s=game?.state,r=game?.villaRange;
 const scoped=!!(s?.started&&!s.paused&&s.mode==='foot'&&r?.active&&r.aiming);
 if(!scoped)return renderer.render(scene,camera);
 const position=camera.position.clone(),rotation=camera.quaternion.clone(),fov=camera.fov;
 const gun=game.villaV4Polish?.gun,playerVisible=player?.visible,gunVisible=gun?.visible;
 camera.fov=22;camera.position.set(s.x,s.y+1.69,s.z);
 camera.lookAt(s.x+Math.sin(s.yaw)*85,s.y+1.69,s.z+Math.cos(s.yaw)*85);
 camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 if(player)player.visible=false;if(gun)gun.visible=false;
 try{return renderer.render(scene,camera);}
 finally{
  camera.position.copy(position);camera.quaternion.copy(rotation);camera.fov=fov;
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  if(player)player.visible=playerVisible;if(gun)gun.visible=gunVisible;
 }
}
