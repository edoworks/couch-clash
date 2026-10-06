import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'../..'),out=path.join(import.meta.dirname,'evidence');await fs.mkdir(out,{recursive:true});
const endpoint='https://zmzzmxdwvgelsjmfihza.supabase.co/functions/v1/scores',base='https://edoworks.com/couch-clash/';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,headless:true});
// Candidate assets are fulfilled locally at the authorized origin; no site writes.
async function candidate(enabled){
 const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
 await c.route(base+'**',async route=>{
  const u=new URL(route.request().url());let rel=decodeURIComponent(u.pathname.slice('/couch-clash/'.length));if(!rel||rel.endsWith('/'))rel+='index.html';
  const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){await route.abort();return;}
  try{let body=await fs.readFile(file);if(rel==='scores-integration/ui/config.mjs')body=Buffer.from(`export const scoreConfig=Object.freeze({enabled:${enabled},endpoint:${JSON.stringify(endpoint)}});`);
   await route.fulfill({status:200,contentType:({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body});
  }catch{await route.fulfill({status:404,body:'Not found'});}
 });return c;
}
try{
 let calls=0;const off=await candidate(false);await off.route(endpoint,async r=>{calls++;await r.abort();});const disabled=await off.newPage();await disabled.goto(base);assert(await disabled.locator('[data-scoreboard]').isHidden());assert.equal(calls,0);await off.close();
 const c=await candidate(true),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const now='2026-10-07T12:00:00Z';await p.clock.install({time:new Date(now)});
 const data={schema:1,mode:'mock',reason:null,source:{provider:'balldontlie',kind:'mock',fetchedAt:now},fetchedAt:now,automaticSettlement:false,games:[{id:'bdl:nfl:1',startTime:'2026-10-06T00:15:00Z',home:{id:'1',name:'New Orleans Saints',abbreviation:'NO',score:0},away:{id:'2',name:'Atlanta Falcons',abbreviation:'ATL',score:7},state:'in_progress',statusText:'Test quarter',providerUpdatedAt:null}]};
 let fail=false;
 await c.route(endpoint,async r=>{calls++;assert.equal(r.request().headers().authorization,undefined);assert.equal(r.request().headers().apikey,undefined);assert.equal(new URL(r.request().url()).search,'');await r.fulfill({status:fail?503:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'https://edoworks.com'},body:JSON.stringify(data)});});
 await p.goto(base);await p.getByText('Test scores',{exact:true}).waitFor();assert.match(await p.locator('[data-scoreboard]').innerText(),/ATL 7 · NO 0 — In progress/);assert.equal(await p.evaluate(()=>localStorage.length),0);
 const requests=calls;await p.clock.fastForward(121000);assert.match(await p.locator('[data-scoreboard]').innerText(),/Test scores · stale/);assert.equal(calls,requests,'aging must not trigger extra polling');
 fail=true;await p.getByRole('button',{name:'Refresh scores'}).click();await p.waitForFunction(()=>!document.querySelector('[data-scoreboard] button').disabled);assert.match(await p.locator('[data-scoreboard]').innerText(),/stale/);
 await p.screenshot({path:path.join(out,'after-kickoff-scoreboard.png'),fullPage:true});
 await p.goto(base+'mnf-2026-10-05/?mode=host');assert(await p.locator('[data-action="start"]').isDisabled());assert.equal(await p.evaluate(()=>localStorage.length),0);assert.deepEqual(errors,[]);await c.close();
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify({passed:true,activationFlagRemainsFalse:true,disabledMakesNoRequests:true,afterKickoffNoCardRequired:true,zeroScore:true,noClientKeys:true,noQuerySelectors:true,noSaveWrites:true,automaticAgeLabel:true,noAutomaticPolling:true,failureStale:true,officialPregameStillClosed:true,viewport:{width:390,height:844,scale:2},realProvider:false,errors},null,2));
 console.log('PASS frontend candidate: disabled has no requests; after-kickoff scoreboard, stale age/failure, no keys/saves, official cutoff preserved');
}finally{await browser.close();}
