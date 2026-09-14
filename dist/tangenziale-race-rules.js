export const COUNTDOWN_SECONDS=5;

export function countdownValue(elapsed){
 if(elapsed>=COUNTDOWN_SECONDS)return 0;
 return Math.max(1,COUNTDOWN_SECONDS-Math.floor(Math.max(0,elapsed)));
}

export function nextCheckpoint(start,current,candidate,previousHint){
 const floor=Math.max(start,current??start);
 if(candidate<floor)return floor;
 // A grade-separated crossing must not teleport progress dozens of samples ahead.
 if(candidate>(previousHint??floor)+6)return floor;
 return candidate;
}

export function respawnCheckpoint(start,checkpoint,sampleCount){
 return Math.max(start,Math.min(Math.max(start,sampleCount-3),Number.isFinite(checkpoint)?checkpoint:start));
}

export function resultsReady(now,firstFinishAt,finishTimes,grace=12){
 if(firstFinishAt===null||firstFinishAt===undefined)return false;
 return finishTimes.every(v=>v!==null)||now-firstFinishAt>=grace;
}

export function formatRaceTime(seconds){
 const s=Math.max(0,Number.isFinite(seconds)?seconds:0),m=Math.floor(s/60),rest=s-m*60;
 return String(m).padStart(2,'0')+':'+rest.toFixed(1).padStart(4,'0');
}
