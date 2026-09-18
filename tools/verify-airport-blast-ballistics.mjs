import assert from 'node:assert/strict';
import {ballisticHeight} from '../dist/airport-blast-ballistics.js';
let y=0,vy=16,max=0;
for(let i=0;i<170;i++){
 vy-=18/60;y=ballisticHeight(y,vy,1/60,0);max=Math.max(max,y);
 assert(y>=0&&Number.isFinite(y),'blast wreck must never sink through terrain');
}
assert(max>4,'blast wreck must rise visibly under the impulse');
assert.equal(y,0,'blast wreck must fall and settle back on ground');
assert.equal(ballisticHeight(5,-200,1,3),3,'large stalled frames clamp to terrain height');
console.log('PASS ballistic wreck rises, responds to gravity and settles without passing below terrain');
