import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('./dist/TaxiMenuController.js',import.meta.url),'utf8');

const checks=[
 ['selection opens confirmation instead of travelling',/startTaxiTransition\(targetCoords, meta = \{\}\) \{\s*return this\.openConfirmation\(targetCoords, meta\);/.test(source)],
 ['fare is calculated before confirmation',/const fare = this\.fareFor\(targetCoords\)/.test(source)&&/Tariffa calcolata: <strong>€\$\{fare\}<\/strong>/.test(source)],
 ['explicit confirm button exists',/id=\\"confirmTaxi\\"/.test(JSON.stringify(source))||/id="confirmTaxi"/.test(source)],
 ['travel only begins from confirmed action',/executeConfirmedTransition\(\)/.test(source)&&/await this\.executeTransition\(\{targetCoords: target, meta: confirmedMeta\}\)/.test(source)],
 ['quoted fare is retained through the confirmation handoff',/quotedFare: fare/.test(source)&&/const confirmedMeta = \{\.\.\.meta, quotedFare: fare\}/.test(source)],
 ['back from confirmation returns to list or map',/source === 'map'\) this\.openMap\(\)/.test(source)&&/this\.openList\(this\.lastDestinations\)/.test(source)],
 ['map copy promises fare and confirmation before travel',/Prima di partire ti mostreremo la tariffa e ti chiederemo conferma/.test(source)],
 ['pointer lock happens only after confirmation',/executeConfirmedTransition\(\)[\s\S]*this\.lockPointerEvents\(\)/.test(source)]
];

for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+name);assert.ok(ok,name);}
console.log('PASS taxi fare quote requires explicit confirmation before travel');
