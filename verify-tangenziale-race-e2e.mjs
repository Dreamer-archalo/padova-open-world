import assert from 'node:assert/strict';
import {COUNTDOWN_SECONDS,countdownValue,nextCheckpoint,respawnCheckpoint,resultsReady,formatRaceTime} from './dist/tangenziale-race-rules.js';

console.log('Tangenziale race deterministic start-to-finish test');

assert.equal(COUNTDOWN_SECONDS,5);
assert.deepEqual([0,.99,1.01,2.01,3.01,4.01,5.0].map(countdownValue),[5,5,4,3,2,1,0]);

const start=10;let hint=10,checkpoint=10;
for(const candidate of [11,12,13]){const previous=hint;checkpoint=nextCheckpoint(start,checkpoint,candidate,previous);hint=candidate;}
assert.equal(checkpoint,13);
checkpoint=nextCheckpoint(start,checkpoint,44,hint);
assert.equal(checkpoint,13);
hint=14;checkpoint=nextCheckpoint(start,checkpoint,14,13);
assert.equal(checkpoint,14);
assert.equal(respawnCheckpoint(start,checkpoint,100),14);
assert.equal(respawnCheckpoint(start,-50,100),10);
assert.equal(respawnCheckpoint(start,999,100),97);

const finishTimes=[null,null,null,null],firstFinishAt=52.3;
finishTimes[2]=42.3;
assert.equal(resultsReady(firstFinishAt+5,firstFinishAt,finishTimes),false);
finishTimes[0]=44.1;finishTimes[1]=45.9;finishTimes[3]=47.0;
assert.equal(resultsReady(firstFinishAt+5,firstFinishAt,finishTimes),true);
assert.equal(formatRaceTime(44.1),'00:44.1');
assert.equal(formatRaceTime(67.25),'01:07.3');

assert.equal(resultsReady(64.29,52.3,[44.1,null,42.3,null]),false);
assert.equal(resultsReady(64.31,52.3,[44.1,null,42.3,null]),true);

console.log('PASS countdown lock');
console.log('PASS checkpoint/respawn isolation');
console.log('PASS four-car timing/results');
console.log('PASS result timeout');
