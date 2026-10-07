import test from 'node:test';import assert from 'node:assert/strict';import {serve,PREVIEW_PORT} from './serve.mjs';
test('fixed preview default and occupied-port failure never select a new origin',async()=>{
 assert.equal(PREVIEW_PORT,64798);const port=64801;let first=await serve({port});
 try{assert.equal(first.address().port,port);await assert.rejects(serve({port}),e=>e.code==='EADDRINUSE');assert.equal((await fetch(`http://127.0.0.1:${port}/`)).status,200);}finally{await new Promise(r=>first.close(r));}
 const restarted=await serve({port});try{assert.equal(restarted.address().port,port);}finally{await new Promise(r=>restarted.close(r));}
 await assert.rejects(serve({port:0}));await assert.rejects(serve({port:'64801'}));
});
