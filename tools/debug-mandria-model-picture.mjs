import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1280,height:800}});
try{
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.getElementById('playBtn')&&!document.getElementById('playBtn').disabled);
 await page.locator('#initialQuality').selectOption('hyper');await page.locator('#playBtn').click();
 await page.waitForFunction(()=>document.documentElement.dataset.initialWorldReady==='true',null,{timeout:220000});
 await page.locator('#confirmCharacter').click();
 await page.waitForFunction(()=>document.getElementById('hangarSections')&&document.getElementById('mandriaHangarButton')&&!document.getElementById('mandriaHangarButton').hidden,{timeout:45000});
 await page.locator('#mandriaHangarButton').click();await page.locator('[data-section="land"]').click();await page.locator('#hangarSearch').fill('mastino');
 await page.locator('[data-hangar-id="mil-tank-heavy"] img').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>document.querySelector('[data-hangar-id="mil-tank-heavy"] img')?.dataset.previewReady.startsWith('mil-tank-heavy/'),null,{timeout:45000});
 const data=await page.evaluate(async()=>{
  const {default:THREE}=await import('./vendor/three.module.js').then(m=>({default:m}));
  const {hangarPreviewModel}=await import('./villa-mandria-catalog-ui.js');
  const img=document.querySelector('[data-hangar-id="mil-tank-heavy"] img');
  const inspect=el=>{const c=document.createElement('canvas');c.width=el.naturalWidth;c.height=el.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(el,0,0);const pix=ctx.getImageData(0,0,c.width,c.height).data;let n=0,min=999,max=0;for(let i=0;i<pix.length;i+=4){const d=Math.abs(pix[i]-23)+Math.abs(pix[i+1]-37)+Math.abs(pix[i+2]-50);if(d>35)n++;min=Math.min(min,d);max=Math.max(max,d);}return {width:c.width,height:c.height,nonBackground:n,min,max,sample:[...pix.slice(0,8)]};};
  const model=hangarPreviewModel('mil-tank-heavy','#b52f3d',null);model.updateMatrixWorld(true);const bbox=new THREE.Box3().setFromObject(model);
  const b=bbox.getSize(new THREE.Vector3()),centre=bbox.getCenter(new THREE.Vector3());let meshes=0;model.traverse(o=>{if(o.isMesh)meshes++;});
  const cvs=document.createElement('canvas'),r=new THREE.WebGLRenderer({canvas:cvs,preserveDrawingBuffer:true});r.setSize(256,176,false);r.setClearColor(0x172532);const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(34,256/176,.1,1000);sc.add(new THREE.HemisphereLight(0xffffff,0x657184,2));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(20,30,25);sc.add(sun);sc.add(model);cam.position.set(15,12,15);cam.lookAt(centre);r.render(sc,cam);
  const testImg=new Image();testImg.src=cvs.toDataURL('image/png');await testImg.decode();
  return {card:inspect(img),fresh:inspect(testImg),bbox:{min:bbox.min.toArray(),max:bbox.max.toArray(),size:b.toArray(),centre:centre.toArray()},meshes,modelVisible:model.visible,childVisible:model.children.map(c=>c.visible),renderer:r.info.render};
 });
 console.log('MODEL_PICTURE_DIAGNOSTIC '+JSON.stringify(data));
}catch(e){console.error('MODEL_PICTURE_DIAGNOSTIC_FAIL '+e.stack);process.exitCode=1;}finally{await browser.close();}
