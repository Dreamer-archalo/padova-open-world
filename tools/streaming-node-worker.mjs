import {parentPort} from 'node:worker_threads';
import {installWorkerHandler} from '../dist/streaming-worker.js';
const port={postMessage:(m,t)=>parentPort.postMessage(m,t)};
installWorkerHandler(port);
parentPort.on('message',data=>port.onmessage({data}));
