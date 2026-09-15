export class InputManager {
  constructor(target=globalThis.window??globalThis, keys=new Set()){
    this.target=target;
    this.keys=keys;
    this.enabled=true;
    this.started=false;
    this.onKeyDown=null;
    this._down=e=>{
      if(!this.enabled)return;
      this.onKeyDown?.(e,this);
    };
    this._up=e=>this.keys.delete(e.code);
  }
  start(handler){
    if(this.started)return;
    this.started=true;
    this.onKeyDown=handler;
    this.target.addEventListener?.('keydown',this._down);
    this.target.addEventListener?.('keyup',this._up);
  }
  enable(){this.enabled=true;}
  disable(){this.enabled=false;this.keys.clear();}
  clear(){this.keys.clear();}
  isDown(code){return this.keys.has(code);}
}
