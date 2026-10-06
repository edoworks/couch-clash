// Local integration: actual handler/provider + actual SQL RPCs through psql.
// This is NOT a deployed PostgREST verification or production transport.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createScoreHandler } from '../src/handler.mjs';
import { createProvider } from '../src/provider.mjs';
import { fixture } from './support.mjs';
const docker='/Applications/Docker.app/Contents/Resources/bin/docker', name='cc-handler-'+randomUUID().slice(0,12), root=new URL('../',import.meta.url);
function run(args,input=''){return new Promise((resolve,reject)=>{const p=spawn(docker,args,{stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);p.on('error',reject);p.on('close',code=>code?reject(Error(err)):resolve(out.trim()));p.stdin.end(input);});}
const sql=(query,role=true)=>run(['exec','-i',name,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres'],(role?'SET ROLE service_role;\n':'')+query);
const literal=v=>v==null?'NULL':"'"+String(v).replaceAll("'","''")+"'";
const cache={read:async()=>JSON.parse(await sql('SELECT public.cc_scores_read();')),claim:async()=>JSON.parse(await sql('SELECT public.cc_scores_claim();')),finish:async(token,snapshot,error,cooldown)=>await sql(`SELECT public.cc_scores_finish(${literal(token)}::uuid,${literal(snapshot&&JSON.stringify(snapshot))}::jsonb,${literal(error)},${Number(cooldown)});`)==='t'};
let calls=0,status=200;
const provider=createProvider({key:'fake-test-key',kind:'mock',fetcher:async()=>{calls++;return new Response(JSON.stringify(fixture()),{status});}});
const h=createScoreHandler({enabled:true,cache,provider});
const get=async()=>await(await h(new Request('https://local.invalid/scores'))).json();
try{
 await run(['run','--detach','--rm','--pull','never','--network','none','--tmpfs','/var/lib/postgresql/data','--name',name,'--env','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine']);
 for(let i=0;i<100;i++){try{await run(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres']);break;}catch{if(i===99)throw Error('DB not ready');await new Promise(r=>setTimeout(r,100));}}
 await sql(await fs.readFile(new URL('tests/db-local-bootstrap.sql',root),'utf8'),false);await sql(await fs.readFile(new URL('db/schema.sql',root),'utf8'),false);
 assert.equal((await get()).mode,'manual');assert.equal(calls,0);
 await sql('UPDATE cc_scores_private.cache SET enabled=true;',false);
 await Promise.all(Array.from({length:20},get));assert.equal(calls,1);let good=await get();assert.equal(good.mode,'mock');assert.equal(good.games[0].home.score,0);
 await sql("UPDATE cc_scores_private.cache SET next_attempt_at=clock_timestamp()-interval '1 second';",false);status=503;
 const stale=await get();assert.equal(stale.mode,'stale');assert.deepEqual(stale.games,good.games);assert.equal(stale.reason,'upstream');await get();assert.equal(calls,2);
 await sql('UPDATE cc_scores_private.cache SET week=5;',false);assert.equal((await get()).mode,'unavailable');assert.equal(calls,2);
 await sql('UPDATE cc_scores_private.cache SET enabled=false;',false);assert.equal((await get()).mode,'manual');
 await fs.writeFile(new URL('evidence/postgres-handler-results.json',root),JSON.stringify({passed:true,actualSQL:true,actualHandler:true,actualProviderAdapter:true,upstream:'fictional mocked fetch',concurrentRequests:20,concurrentUpstreamAttempts:1,failedAttemptCooldown:true,lastGoodStale:true,scopeInvalidation:true,killSwitch:true,postgrest:false},null,2));console.log('PASS actual handler + provider + PostgreSQL cache: 20 concurrent requests, one upstream, stale/failure/scope/kill');
}finally{await run(['rm','--force',name]).catch(()=>{});}
