import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.TEST_URL||'http://127.0.0.1:5211/',out=new URL('./evidence/',import.meta.url),KEY='couch-clash-host-defined-v1',OLD='couch-clash-public-v1',MNF='couch-clash-web-mnf-2026-10-05-v1';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,headless:true});
const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'}),p=await ctx.newPage(),errors=[];
p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
const action=n=>p.locator(`[data-action="${n}"]`).first().click();
const fit=async()=>assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
const shot=async n=>p.screenshot({path:new URL(n+'.png',out).pathname,fullPage:true});
const intact=async()=>assert.deepEqual(await p.evaluate(({OLD,MNF})=>[localStorage.getItem(OLD),localStorage.getItem(MNF),localStorage.getItem(OLD+':v1-backup')],{OLD,MNF}),['old sentinel','official sentinel','backup sentinel']);
const teams=async(a,b)=>{await p.locator('[data-fixture="away"]').fill(a);await p.locator('[data-fixture="home"]').fill(b);};
try{
 await p.goto(base);await p.getByRole('link',{name:'Host another football game',exact:true}).click();
 await p.evaluate(({OLD,MNF})=>{localStorage.setItem(OLD,'old sentinel');localStorage.setItem(MNF,'official sentinel');localStorage.setItem(OLD+':v1-backup','backup sentinel');},{OLD,MNF});
 assert(await p.locator('[data-action="start"]').isDisabled());
 await teams('Cedar','Cedar');await p.locator('[data-before-kickoff]').check();assert(await p.locator('[data-action="start"]').isDisabled());
 await teams('<img src=x>','Harbor');await p.locator('[data-before-kickoff]').check();assert(await p.locator('[data-action="start"]').isDisabled());assert.equal(await p.locator('img[src=x]').count(),0);
 await teams('Cedar','Harbor');await p.locator('[data-before-kickoff]').check();assert(!(await p.locator('[data-action="start"]').isDisabled()));
 await p.reload();assert.equal(await p.locator('[data-fixture="away"]').inputValue(),'Cedar');assert(await p.locator('[data-action="start"]').isDisabled(),'acknowledgement must be fresh after reload');
 await action('remove');const ack=p.locator('[data-before-kickoff]');await ack.focus();await p.keyboard.press('Space');assert(await ack.isChecked());await fit();await shot('manual-setup');await action('start');
 const definition=await p.evaluate(()=>JSON.stringify(s.definition));assert(await p.evaluate(()=>Object.isFrozen(s.definition)&&Object.isFrozen(s.definition.questions[0].opts)));assert.equal(await p.locator('[data-fixture]').count(),0);
 for(let n=0;n<2;n++){await action('open');assert(await p.locator('[data-action="lock"]').isDisabled());for(const i of [0,1,2])await p.locator(`[data-pick="${i}:${n?-1:0}"]`).click();if(!n)await p.locator('[data-boost="0"]').click();await action('lock');if(!n){await p.reload();assert.equal(await p.locator('[data-pick]').count(),0);assert(await p.evaluate(()=>Object.isFrozen(s.definition.questions[0].opts)));}}
 await action('resolve');for(const i of [0,1])await p.locator(`[data-outcome="${i}"]`).selectOption('0');await action('review');await action('confirm');
 for(let n=0;n<2;n++){await action('open');for(const i of [3,4])await p.locator(`[data-pick="${i}:${n?-1:0}"]`).click();await action('lock');}
 await action('resolve');for(const i of [2,3,4])await p.locator(`[data-outcome="${i}"]`).selectOption('0');await action('review');await action('confirm');assert.equal(await p.locator('.pts').first().innerText(),'800');assert.match(await p.locator('main').innerText(),/Host-defined · host-reported/);assert.equal(await p.evaluate(()=>JSON.stringify(s.definition)),definition);
 await action('archive');assert(await p.evaluate(()=>Object.isFrozen(history[0].game.definition.questions[0].opts)));await intact();await shot('manual-recap');
 await action('reset');await teams('Mountain','River');await p.locator('[data-before-kickoff]').check();await action('start');assert.notEqual(await p.evaluate(()=>JSON.stringify(s.definition)),definition);
 await action('open');for(const i of [0,1,2])await p.locator(`[data-pick="${i}:0"]`).click();await action('lock');const locked=await p.evaluate(()=>JSON.stringify(s.players[0]));await action('closecards');assert.equal(await p.evaluate(()=>JSON.stringify(s.players[0])),locked);assert(await p.evaluate(()=>s.players.slice(1).every(p=>p.locked[0]&&Object.values(p.picks).every(v=>v===-1))));
 await p.locator('.local-tools summary').click();await action('library');await p.locator('[data-history]').first().click();assert.match(await p.locator('.preview-label').innerText(),/Cedar at Harbor/);assert.equal(await p.evaluate(()=>JSON.stringify(history[0].game.definition)),definition);assert.equal(await p.locator('[data-action="lock"]').count(),0);await intact();
 await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();await ctx.setOffline(true);await p.goto(base+'manual');assert.equal(new URL(p.url()).pathname,'/manual/');await p.locator('[data-history]').first().click();assert.match(await p.locator('main').innerText(),/800/);await p.setViewportSize({width:320,height:740});await fit();await shot('manual-offline-history');await ctx.setOffline(false);
 await action('historyback');await action('resume');await p.evaluate(()=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('quota-test');};});await action('reset');assert.match(await p.locator('.save-notice').innerText(),/current match was kept/);await p.evaluate(()=>Storage.prototype.setItem=window.originalSet);
 await p.locator('.local-tools summary').click();await action('library');await action('eraseall');await intact();assert.equal(await p.evaluate(k=>localStorage.getItem(k),KEY),null);
 // Tampered definitions must not be accepted or overwritten on reload.
 await p.locator('[data-mode="demo"]').click();await action('start');const validRaw=await p.evaluate(k=>localStorage.getItem(k),KEY);const corrupt=await p.evaluate(k=>{const v=JSON.parse(localStorage.getItem(k));v.current.definition.questions[0].points=900;const raw=JSON.stringify(v);localStorage.setItem(k,raw);return raw;},KEY);await p.reload();assert.match(await p.locator('.alert').innerText(),/could not be read safely/);assert.equal(await p.evaluate(k=>localStorage.getItem(k),KEY),corrupt);
 const badName=await p.evaluate(({KEY,validRaw})=>{const v=JSON.parse(validRaw);v.current.players[0].name='';const raw=JSON.stringify(v);localStorage.setItem(KEY,raw);return raw;},{KEY,validRaw});
 await p.reload();assert.match(await p.locator('.alert').innerText(),/could not be read safely/);assert.equal(await p.evaluate(k=>localStorage.getItem(k),KEY),badName);
 await p.locator('.local-tools summary').click();await action('library');await action('eraseall');assert.equal(await p.evaluate(k=>localStorage.getItem(k),KEY),null);await intact();
 // Fictional custom demo still completes with a shared zero-point win.
 const demoCtx=await browser.newContext({viewport:{width:390,height:844}});const demo=await demoCtx.newPage();
 await demo.goto(base+'manual/');const act=n=>demo.locator(`[data-action="${n}"]`).first().click();
 await demo.locator('[data-mode="demo"]').click();await act('remove');await act('start');
 for(let round=0;round<2;round++){for(let player=0;player<2;player++){await act('open');for(const i of round?[3,4]:[0,1,2])await demo.locator(`[data-pick="${i}:-1"]`).click();await act('lock');}await act('resolve');await act('review');await act('confirm');}
 assert.equal(await demo.getByText('Shared winner',{exact:true}).count(),2);await demoCtx.close();
 // Fresh context after kickoff: custom route must not alter official restrictions.
 const official=await browser.newContext({viewport:{width:390,height:844}});await official.addInitScript(()=>{const D=Date;window.Date=class extends D{static now(){return Date.parse('2026-10-07T00:00:00Z');}};});const q=await official.newPage();await q.goto(base+'mnf-2026-10-05/?mode=host');assert(await q.locator('[data-action="start"]').isDisabled());await official.close();
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('manual-results.json',out),JSON.stringify({passed:true,fullGame800:true,customDemoSharedTie:true,immutableDefinition:true,historyAcrossDifferentTeams:true,missingPicks:true,lockedCardPreservedOnHostClose:true,freshBeforeKickoffAcknowledgement:true,invalidLabels:true,corruptDefinitionReadOnly:true,corruptPlayerNameRecovery:true,offlineFirstNoSlash:true,quotaFailurePreservesMatch:true,officialAndLegacyStoresUntouched:true,officialLateEntryBlocked:true,keyboard:true,mobileWidths:[390,320],errors},null,2));console.log('PASS host-defined manual candidate: full game, frozen definitions/history, offline, locks, quota, official cutoff and storage isolation');
}finally{await browser.close();}
