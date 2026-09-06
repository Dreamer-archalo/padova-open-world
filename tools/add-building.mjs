import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {inspectGLB} from '../dist/model-format.js';
import {validateEntry} from '../dist/building-models.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [file, ...args] = process.argv.slice(2);
if (!file || file === '--help') {
  console.log('node tools/add-building.mjs building.glb --name "Exact OSM building name" --height METRES --author "Creator" --source https://source.example/model --license "CC BY 4.0" [--rotation DEGREES] [--offset-x METRES] [--offset-z METRES] [--check-only]');
  process.exit(file ? 0 : 1);
}
try {
  const options = {};
  for (let i=0;i<args.length;i++) {
    const key = args[i];
    if (key === '--check-only') { options.checkOnly = true; continue; }
    if (!['--name','--height','--author','--source','--license','--rotation','--offset-x','--offset-z','--offset-y'].includes(key) || args[i+1] === undefined) throw new Error('Unknown or missing argument: ' + key);
    options[key.slice(2)] = args[++i];
  }
  const bytes = fs.readFileSync(file), ab = bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const info = inspectGLB(ab);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16);
  const entry = validateEntry({name:options.name,url:'./models/'+hash+'.glb',height:Number(options.height),author:options.author,source:options.source,license:options.license,rotation:Number(options.rotation || 0),offsetX:Number(options['offset-x'] || 0),offsetZ:Number(options['offset-z'] || 0),offsetY:Number(options['offset-y'] || 0)});
  const data = JSON.parse(fs.readFileSync(path.join(root,'dist/data/padova.json')));
  if (!data.buildings.some(b => b.n === entry.name)) throw new Error('No exact building match in the map: ' + entry.name);
  const catalogPath = path.join(root,'dist/data/building-models.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath));
  const existing = catalog.models.findIndex(e => e.name === entry.name);
  if (existing >= 0) catalog.models[existing] = entry; else catalog.models.push(entry);
  console.log(JSON.stringify({entry,triangles:info.triangles,bytes:info.bytes,checkOnly:!!options.checkOnly},null,2));
  if (!options.checkOnly) {
    fs.mkdirSync(path.join(root,'dist/models'),{recursive:true});
    fs.writeFileSync(path.join(root,'dist/models',hash+'.glb'),bytes);
    fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
    console.log('Imported. Review scale and alignment in the game, then commit the GLB and catalogue together.');
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
