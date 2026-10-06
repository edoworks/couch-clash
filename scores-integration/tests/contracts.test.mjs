import test from 'node:test';
import assert from 'node:assert/strict';
import { createProvider, normalizeGames, scopeURL, MAX_BYTES } from '../src/provider.mjs';
import { createScoreHandler, publicState } from '../src/handler.mjs';
import { createRPCCache } from '../src/rpc-cache.mjs';
import { sanitizePublicScore } from '../src/dto.mjs';
import { fixture, TestCache } from './support.mjs';
const scope = { season: 2026, week: 4 }, at = '2026-10-06T00:20:00Z', secret = 'test-server-secret-not-real';
const response = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
const provider = (fetcher, options = {}) => createProvider({ key: secret, fetcher, now: () => new Date(at), kind: 'mock', ...options });
const request = (path = '/scores', options) => new Request(`https://local.invalid${path}`, options);
test('zero/null scores, complete enum, unknown state and provider timestamp semantics', () => {
  for (const state of ['scheduled','in_progress','final','postponed','canceled','delayed','suspended','abandoned','unknown','invented']) {
    const raw = fixture(state); const s = normalizeGames(raw, scope, at, 'mock');
    assert.equal(s.games[0].home.score, 0); assert.equal(s.games[0].providerUpdatedAt, null);
    assert.equal(s.games[0].state, state === 'invented' ? 'unknown' : state);
  }
  const raw = fixture('scheduled', null); raw.data[0].visitor_team_score = null;
  assert.equal(normalizeGames(raw, scope, at).games[0].home.score, null);
  assert.deepEqual(normalizeGames({ data: [], meta: {} }, scope, at).games, []);
});
test('fixed upstream, server authorization, redirects blocked, field allowlist', async () => {
  let seen;
  const s = await provider(async (url, options) => { seen = { url, options }; const raw = fixture(); raw.private = secret; raw.data[0].key = secret; return response(raw); })(scope);
  assert.equal(seen.url, scopeURL(scope)); assert.equal(new URL(seen.url).origin, 'https://api.balldontlie.io');
  assert.equal(seen.options.headers.Authorization, secret); assert.equal(seen.options.redirect, 'error');
  assert.equal(JSON.stringify(s).includes(secret), false); assert.equal(s.source.kind, 'mock');
});
test('malformed/duplicate/wrong-scope/paginated/invalid-score input rejected', () => {
  for (const change of [r => r.data.push(r.data[0]), r => r.data[0].season = 2025, r => r.data[0].home_team_score = -1, r => r.data[0].postseason = true, r => r.meta.next_cursor = 2, r => r.data[0].date = 'nope', r => r.data = {}]) {
    const r = fixture(); change(r); assert.throws(() => normalizeGames(r, scope, at), { code: 'invalid_response' });
  }
  assert.throws(() => scopeURL({ season: 2026, week: '4&url=evil' }));
});
test('401/403/429/5xx sanitized with bounded cooldown', async () => {
  for (const [status, code] of [[401,'unauthorized'],[403,'unauthorized'],[429,'rate_limited'],[500,'upstream'],[503,'upstream']]) {
    await assert.rejects(provider(async () => new Response(secret, { status, headers: { 'retry-after': '99999' } }))(scope), e => e.code === code && !e.message.includes(secret) && e.cooldown === 99999);
  }
});
test('full-body deadline, invalid JSON, header/body limits and network failure', async () => {
  await assert.rejects(provider(async () => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{')); } })), { timeoutMs: 20 })(scope), { code: 'timeout' });
  await assert.rejects(provider(async () => new Response('oops'))(scope), { code: 'invalid_response' });
  await assert.rejects(provider(async () => new Response('x'.repeat(MAX_BYTES + 1)))(scope), { code: 'oversized' });
  await assert.rejects(provider(async () => new Response('{}', { headers: { 'content-length': String(MAX_BYTES + 1) } }))(scope), { code: 'oversized' });
  await assert.rejects(provider(async () => { throw Error(secret); })(scope), { code: 'unavailable' });
});
test('disabled and missing configuration do no work; HTTP cannot select URL/query/RPC', async () => {
  let calls = 0;
  const handler = createScoreHandler({ cache: { read() { calls++; } }, provider() { calls++; } });
  assert.equal((await (await handler(request())).json()).mode, 'manual'); assert.equal(calls, 0);
  for (const [path, options, status] of [['/scores?url=https://evil.invalid',{},400],['/scores?rpc=drop',{},400],['/other',{},404],['/scores',{method:'POST'},405],['/scores',{headers:{origin:'https://evil.invalid'}},403]]) assert.equal((await handler(request(path, options))).status, status);
});
test('20 concurrent handler calls make one upstream attempt; last-good survives errors and corrections never settle', async () => {
  let clock = Date.parse(at), calls = 0, fail = false;
  const cache = new TestCache(() => clock);
  const p = provider(async () => { calls++; await new Promise(r => setTimeout(r, 10)); return fail ? new Response(secret, {status:429}) : response(fixture()); });
  const h = createScoreHandler({ enabled: true, cache, provider: p, now: () => clock });
  await Promise.all(Array.from({length:20}, () => h(request()))); assert.equal(calls, 1);
  let state = await (await h(request())).json(); assert.equal(state.mode, 'mock'); assert.equal(state.games[0].home.score, 0); assert.equal(state.automaticSettlement, false);
  assert.equal(JSON.stringify(state).includes('test-lease'), false); assert.equal(JSON.stringify(state).includes(secret), false);
  clock += 61000; fail = true;
  state = await (await h(request())).json(); assert.equal(state.mode, 'stale'); assert.equal(state.reason, 'rate_limited'); assert.equal(state.games[0].home.score, 0);
  await h(request()); assert.equal(calls, 2); assert.equal((await (await h(request())).json()).mode, 'stale');
  cache.state.enabled = false; assert.equal((await (await h(request())).json()).mode, 'manual');
});
test('crashed and late leases do not expose uncommitted data; old scope hidden', async () => {
  let clock = Date.parse(at); const cache = new TestCache(() => clock);
  await cache.claim(); clock += 16000; assert.equal((await cache.claim()).acquired, false);
  clock += 45000;
  const h = createScoreHandler({enabled:true,cache,now:()=>clock,provider:async () => {clock += 16000; return normalizeGames(fixture(),scope,at,'mock');}});
  assert.equal((await (await h(request())).json()).mode, 'unavailable'); assert.equal(cache.state.snapshot, null);
  cache.state.snapshot = normalizeGames(fixture(),scope,at); cache.state.week = 5;
  assert.equal(publicState(cache.state,clock).mode,'unavailable');
});
test('RPC client exposes only fixed methods and keeps key server-side', async () => {
  const seen = [];
  const c = createRPCCache({url:'https://test-ref.supabase.co',serviceKey:secret,fetcher:async (url,o) => {seen.push({url,o}); return response(true);}});
  await c.read(); await c.claim(); await c.finish('uuid', null, 'timeout', 60);
  assert.deepEqual(Object.keys(c),['read','claim','finish']);
  assert.deepEqual(seen.map(x=>new URL(x.url).pathname),['/rest/v1/rpc/cc_scores_read','/rest/v1/rpc/cc_scores_claim','/rest/v1/rpc/cc_scores_finish']);
  assert.equal(seen[0].o.headers.apikey, secret);
  assert.throws(()=>createRPCCache({url:'https://evil.invalid',serviceKey:secret}));
});
test('HTTP-date Retry-After is honored and clamped', async () => {
  const future = new Date(Date.now()+300000).toUTCString();
  await assert.rejects(provider(async()=>new Response('',{status:429,headers:{'retry-after':future}}))(scope),e=>e.code==='rate_limited'&&e.cooldown>=299&&e.cooldown<=300);
});
test('observed disablement and failed cache reads fail closed; malformed snapshots cannot throw', async () => {
  let reads=0, upstream=0;
  const h=createScoreHandler({enabled:true,provider:async()=>{upstream++;},cache:{claim:async()=>({enabled:false,acquired:false}),read:async()=>{reads++;throw Error();}}});
  assert.equal((await(await h(request())).json()).mode,'manual');assert.equal(reads,0);assert.equal(upstream,0);
  const bad={enabled:true,season:2026,week:4,fetchedAt:at,snapshot:{schema:1,scope,games:[null]}};
  assert.equal(publicState(bad).mode,'unavailable');
  const failed=createScoreHandler({enabled:true,provider:async()=>{},cache:{claim:async()=>{throw Error(secret);}}});
  const value=await(await failed(request())).json();assert.equal(value.mode,'unavailable');assert(!JSON.stringify(value).includes(secret));
});
test('public DTO boundary rejects malformed entries/oversized arrays and removes unknown properties',()=>{
  const s=publicState({enabled:true,...scope,snapshot:normalizeGames(fixture(),scope,at,'mock'),fetchedAt:at},Date.parse(at));
  assert.equal(sanitizePublicScore({...s,private:secret}).private,undefined);
  for(const mutate of [x=>x.games=[null],x=>x.games=Array(101).fill(x.games[0]),x=>x.source=null,x=>x.games[0].home.score='0',x=>x.games[0].statusText='x'.repeat(81),x=>x.mode='live']){
    const x=structuredClone(s);mutate(x);assert.throws(()=>sanitizePublicScore(x));
  }
});

test('long Retry-After is never shortened; unrepresentable delay holds indefinitely', async()=>{
 for(const [header,expected] of [['7200',7200],['999999999999999999999999999999999999999999',2147483647],['missing',60]]){
  await assert.rejects(provider(async()=>new Response('',{status:429,headers:{'retry-after':header}}))(scope),e=>e.cooldown===expected);
 }
 const date=new Date(Date.now()+7200000).toUTCString();
 await assert.rejects(provider(async()=>new Response('',{status:429,headers:{'retry-after':date}}))(scope),e=>e.cooldown>=7199&&e.cooldown<=7200);
});

test('overall request deadline prevents late provider commit even if a mock ignores abort',async()=>{
 let finishes=0,signal;const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const cache={claim:async()=>({enabled:true,acquired:true,token:'test',...scope}),finish:async()=>{finishes++;},read:async()=>{throw Error();}};
 const h=createScoreHandler({enabled:true,cache,timeoutMs:30,provider:async(s,o)=>{signal=o.signal;await wait(80);return normalizeGames(fixture(),scope,at,'mock');}});
 const start=Date.now(),result=await(await h(request())).json();assert.equal(result.reason,'timeout');assert(Date.now()-start<75);assert(signal.aborted);await wait(90);assert.equal(finishes,0);
});
test('four successful 1.8-second operations fit explicit eight-second server budget',async()=>{
 const wait=()=>new Promise(r=>setTimeout(r,1800)),snapshot=normalizeGames(fixture(),scope,at,'mock');
 const cache={claim:async()=>{await wait();return {enabled:true,acquired:true,token:'test',...scope};},finish:async()=>{await wait();return true;},read:async()=>{await wait();return {enabled:true,...scope,snapshot,fetchedAt:at};}};
 const h=createScoreHandler({enabled:true,cache,provider:async()=>{await wait();return snapshot;},now:()=>Date.parse(at)});
 const started=Date.now();assert.equal((await(await h(request())).json()).mode,'mock');assert(Date.now()-started<8000);
});
test('overall abort reaches actual provider and RPC transports',async()=>{
 for(const kind of ['provider','rpc']){
  const c=new AbortController();let observed=false;
  const fetcher=async(url,o)=>{o.signal.addEventListener('abort',()=>{observed=true;});return new Response(new ReadableStream({start(s){s.enqueue(new TextEncoder().encode('{'));}}));};
  const promise=kind==='provider'?provider(fetcher)(scope,{signal:c.signal}):createRPCCache({url:'https://test-ref.supabase.co',serviceKey:secret,fetcher}).read({signal:c.signal});
  setTimeout(()=>c.abort(),5);await assert.rejects(promise,{code:'timeout'});assert(observed);
 }
});
