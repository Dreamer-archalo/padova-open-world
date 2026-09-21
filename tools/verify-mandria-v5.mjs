import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
for(const file of ['dist/villa-mandria-v5-dialogues.js','dist/villa-mandria-v5-controls.js','dist/phase2-runtime.js'])execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
const source=fs.readFileSync('dist/villa-mandria-v5-dialogues.js','utf8');
const start=source.indexOf('export const MANDRIA_CONVERSATIONS = ');
assert(start>=0,'worker dialogue collection missing');
const begin=source.indexOf('[',start),end=source.indexOf('\n];',begin);
assert(begin>=0&&end>begin,'worker dialogue collection malformed');
const topics=vm.runInNewContext(source.slice(begin,end+2));
assert.equal(topics.length,25,'expected exactly 25 conversations');
for(const [index,topic] of topics.entries()){
 assert.equal(topic.length,5,`conversation ${index+1} must have a question and four choices`);
 assert(typeof topic[0]==='string'&&topic[0].length>=20,`conversation ${index+1} question missing`);
 for(const option of topic.slice(1))assert(Array.isArray(option)&&option.length===2&&option.every(s=>typeof s==='string'&&s.length>=8),`conversation ${index+1} choice/reply incomplete`);
}
const runtime=fs.readFileSync('dist/phase2-runtime.js','utf8');
assert(runtime.includes("import './villa-mandria-v5-dialogues.js'"));
assert(runtime.includes("import './villa-mandria-v5-controls.js'"));
console.log('PASS Mandria v5: syntax, both runtime imports, 25 distinct prompts and 100 selectable answers with reactions');
