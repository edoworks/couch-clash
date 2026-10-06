import { chromium } from 'playwright';
import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createProvider } from '../src/provider.mjs';
import { createScoreHandler } from '../src/handler.mjs';
import { TestCache, fixture } from './support.mjs';
const root = path.resolve(import.meta.dirname,'..');
let enabled = true, status = 200, state = 'in_progress', score = 0, calls = 0, clock = Date.parse('2026-10-06T00:20:00Z'), malformed = null;
const cache = new TestCache(() => clock);
const provider = createProvider({ key: 'fictional-test-secret', kind: 'mock', now: () => new Date(clock), fetcher: async () => { calls++; return new Response(JSON.stringify(fixture(state,score)),{status}); } });
const handler = createScoreHandler({ enabled: true, cache, provider, now: () => clock });
const server = createServer(async (req,res) => {
  try {
    const u = new URL(req.url,'http://localhost');
    if (u.pathname === '/scores') { if(malformed!==null){res.writeHead(200,{'Content-Type':'application/json'});res.end(malformed);return;} const out = await handler(new Request(u,{method:req.method})); res.writeHead(out.status,Object.fromEntries(out.headers)); res.end(await out.text()); return; }
    if (u.pathname === '/ui/config.mjs') {res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end(`export const scoreConfig={enabled:${enabled},endpoint:'/scores'};`);return;}
    const target = path.resolve(root,'.'+decodeURIComponent(u.pathname.endsWith('/') ? u.pathname+'index.html' : u.pathname));
    if (!target.startsWith(root+path.sep) || !(['preview','ui'].includes(path.relative(root,target).split(path.sep)[0])||['src/transport.mjs','src/dto.mjs'].includes(path.relative(root,target)))) {res.writeHead(404);res.end();return;}
    const body = await fs.readFile(target); res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'}); res.end(body);
  } catch {res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,headless:true});
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
const p=await ctx.newPage(), errors=[]; p.on('pageerror',e=>errors.push(e.message));
await ctx.addInitScript(()=>{const D=Date;window.Date=class extends D{static now(){return Date.parse('2026-10-05T23:00:00Z');}};});
const key='couch-clash-local-scores-test-v1';
const action = n => p.locator(`[data-action="${n}"]`).first().click();
const refresh = async () => {const b=p.getByRole('button',{name:'Refresh scores',exact:true});await b.click();await p.waitForFunction(()=>!document.querySelector('#score-display button').disabled);};
const text = () => p.locator('#score-display').innerText();
try {
  await p.goto(base+'/preview/'); await p.waitForFunction(()=>document.querySelector('#score-display').textContent.includes('Test scores'));
  assert.match(await text(),/ATL 0 · NO 0 — In progress/);
  await p.locator('[data-mode="host"]').click(); await action('remove'); await action('start');
  for(let n=0;n<2;n++){await action('open');for(const i of [0,1,2])await p.locator(`[data-pick="${i}:${n?-1:0}"]`).click();if(!n)await p.locator('[data-boost="0"]').click();await action('lock');}
  await action('resolve');for(const i of [0,1])await p.locator(`[data-outcome="${i}"]`).selectOption('0');await action('review');await action('confirm');
  for(let n=0;n<2;n++){await action('open');for(const i of [3,4])await p.locator(`[data-pick="${i}:${n?-1:0}"]`).click();await action('lock');}
  await action('resolve');for(const i of [2,3,4])await p.locator(`[data-outcome="${i}"]`).selectOption('0');await action('review');await action('confirm');
  assert.equal(await p.locator('.pts').first().innerText(),'800');
  const before=await p.evaluate(k=>localStorage.getItem(k),key);
  score=7;state='final';clock+=61000;await refresh();assert.match(await text(),/NO 7 — Final/);
  score=6;clock+=61000;await refresh();assert.match(await text(),/NO 6 — Final/);
  assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),before,'correction cannot mutate picks/outcomes/score/history');
  await p.locator('#score-display').scrollIntoViewIfNeeded();await p.screenshot({path:root+'/evidence/mock-final-mobile.png',fullPage:true});
  const valid=await(await handler(new Request('http://localhost/scores'))).json();malformed=JSON.stringify({...valid,games:[null]});await refresh();assert.match(await text(),/Test scores · stale/);assert.match(await text(),/NO 6/);
  malformed='x'.repeat(262145);await refresh();assert.match(await text(),/NO 6/);assert.match(await text(),/stale/);malformed=null;
  status=429;clock+=61000;await refresh();assert.match(await text(),/Test scores · stale/);assert.match(await text(),/NO 6/);
  const count=calls;await refresh();assert.equal(calls,count,'failure cooldown prevents another upstream');
  await p.reload();await p.waitForFunction(()=>document.querySelector('#score-display').textContent.includes('stale'));assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),before);
  await ctx.setOffline(true);await refresh();assert.match(await text(),/stale/);assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),before);await ctx.setOffline(false);
  await p.setViewportSize({width:320,height:740});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const b=p.getByRole('button',{name:'Refresh scores',exact:true});await b.focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>!document.querySelector('#score-display button').disabled);assert((await b.boundingBox()).height>=44);
  await p.screenshot({path:root+'/evidence/mock-stale-small.png',fullPage:true});
  cache.state.enabled=false;await refresh();assert.match(await text(),/Host scorekeeping/);assert.equal(await p.locator('#score-display').getByText(/NO 6/).count(),0);
  enabled=false;const disabledCalls=calls;await p.reload();assert.match(await text(),/Host scorekeeping/);assert(await p.locator('#score-display button').isHidden());assert.equal(calls,disabledCalls);
  assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),before);assert.deepEqual(errors,[]);
  await fs.writeFile(root+'/evidence/browser-results.json',JSON.stringify({passed:true,mobile:[{width:390,height:844,scale:2},{width:320,height:740}],fullManualGame800:true,confirmedOutcomesUnchanged:true,zeroScores:true,finalAndCorrection:true,malformedDoesNotPoisonLastGood:true,oversizedRejected:true,stale429:true,persistentCooldown:true,reload:true,offlineExistingPageFallback:true,keyboard:true,killSwitch:true,disabledFlag:true,errors,upstreamCalls:calls},null,2));
  console.log('PASS browser: complete manual game, mock correction, stale/429/offline, reload, disabled, keyboard, 390/320px; confirmed data byte-identical');
} finally {await browser.close();await new Promise(r=>server.close(r));}
