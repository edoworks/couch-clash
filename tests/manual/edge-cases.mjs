import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,headless:true});
const context=await browser.newContext({viewport:{width:320,height:740},deviceScaleFactor:2});
const p=await context.newPage();p.on('dialog',d=>d.accept());const action=n=>p.locator(`[data-action="${n}"]`).first().click();
try{
 await p.goto((process.env.TEST_URL||'http://127.0.0.1:5212/')+'manual/');
 await p.locator('[data-fixture="away"]').fill('W'.repeat(24));await p.locator('[data-fixture="home"]').fill('M'.repeat(24));await p.locator('[data-before-kickoff]').check();await action('start');await action('open');
 const width=await p.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth}));console.log('24-character names:',width);assert(width.content<=width.width,'long option labels must fit viewport');
 assert.equal(await p.locator('[data-pick="0:0"]').innerText(),'W'.repeat(24));assert.equal(await p.locator('[data-pick="0:1"]').innerText(),'M'.repeat(24));
 const boxes=await p.locator('.options button').evaluateAll(es=>es.map(e=>({height:e.getBoundingClientRect().height,scroll:e.scrollWidth,width:e.clientWidth})));assert(boxes.every(x=>x.height>=44&&x.scroll<=x.width));
 await p.locator('.local-tools summary').click();await action('library');await action('eraseall');
 assert.equal(await p.locator('[data-before-kickoff]').isChecked(),false);assert(await p.locator('[data-action="start"]').isDisabled());
 console.log('PASS long labels fit 320px with full identities and erase requires a new acknowledgement');
}finally{await browser.close();}
