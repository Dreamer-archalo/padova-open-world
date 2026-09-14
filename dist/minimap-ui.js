const mini=document.getElementById('minimap');

export class MinimapUI{
 constructor(canvas=mini){
  this.canvas=canvas;this.heading=0;this.installed=false;this.mapTransform=false;this.arrowStage=false;
  if(canvas)this.install();
 }
 install(){
  if(this.installed||!this.canvas)return;const ctx=this.canvas.getContext('2d');if(!ctx)return;
  this.installed=true;this.ctx=ctx;
  const original={
   drawImage:ctx.drawImage.bind(ctx),save:ctx.save.bind(ctx),restore:ctx.restore.bind(ctx),
   translate:ctx.translate.bind(ctx),rotate:ctx.rotate.bind(ctx)
  };
  this.original=original;
  ctx.drawImage=(source,...args)=>{
   const mapCanvas=source?.tagName==='CANVAS'&&source!==this.canvas;
   if(mapCanvas){
    if(this.mapTransform){original.restore();this.mapTransform=false;}
    original.save();original.translate(this.canvas.width/2,this.canvas.height/2);
    original.rotate(Math.PI+this.heading);original.translate(-this.canvas.width/2,-this.canvas.height/2);
    this.mapTransform=true;
   }
   return original.drawImage(source,...args);
  };
  ctx.save=()=>{
   if(this.mapTransform){original.restore();this.mapTransform=false;this.arrowStage=true;}
   return original.save();
  };
  ctx.rotate=angle=>this.arrowStage?original.rotate(Math.PI):original.rotate(angle);
  ctx.restore=()=>{const out=original.restore();if(this.arrowStage)this.arrowStage=false;return out;};
 }
 update(game){this.heading=Number.isFinite(game?.state?.yaw)?game.state.yaw:0;}
}
