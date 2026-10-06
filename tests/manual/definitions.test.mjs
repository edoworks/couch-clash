import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const root=new URL('../../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
const manual=vm.createContext({}),official=vm.createContext({});
vm.runInContext(read('manual/definitions.js'),manual);vm.runInContext(read('mnf-2026-10-05/definitions.js'),official);
const run=s=>vm.runInContext(s,manual),plain=v=>JSON.parse(JSON.stringify(v));
test('custom fixture has independent identity and no invented schedule/source',()=>{
 const d=plain(run("newManualDefinition('abcdefgh','Cedar','Harbor')"));
 assert.deepEqual(d.fixture,{id:'manual-abcdefgh',kind:'host_defined',away:'Cedar',home:'Harbor',awayId:'away',homeId:'home',kickoff:null,timezone:null,source:null,verifiedAt:null});
});
test('all five rules, values, OT scopes and scoring functions match the released fixture',()=>{
 const a=plain(run("newManualDefinition('abcdefgh','Cedar','Harbor')")),b=plain(vm.runInContext('MNF_DEFINITION',official));
 for(let i=0;i<5;i++){
  for(const k of ['id','title','points','when'])assert.deepEqual(a.questions[i][k],b.questions[i][k]);
  if(![0,2,3].includes(i)){assert.deepEqual(a.questions[i].opts,b.questions[i].opts);assert.deepEqual(a.questions[i].optionIds,b.questions[i].optionIds);}
  else {assert.deepEqual(a.questions[i].opts,['Cedar','Harbor',b.questions[i].opts[2]]);}
 }
 for(const name of ['points','score']){const extract=t=>t.match(new RegExp(`function ${name}\\([^\\n]+`))[0];assert.equal(extract(read('manual/app.js')),extract(read('mnf-2026-10-05/app.js')));}
});
test('nested definitions freeze and tampering cannot validate on restore',()=>{
 run("globalThis.saved=newManualDefinition('abcdefgh','Cedar','Harbor')");
 assert(run('Object.isFrozen(saved)&&Object.isFrozen(saved.questions)&&Object.isFrozen(saved.questions[0].opts)'));
 assert.throws(()=>run("'use strict';saved.questions[0].opts[0]='Other'"));
 for(const change of ["d.questions[0].points=900","d.questions[0].opts[0]='Other'","d.fixture.source='https://example.com'","d.fixture.id='nfl-official'","d.questions[4].when='Regulation only'"]){assert.equal(run(`(()=>{const d=JSON.parse(JSON.stringify(saved));${change};return validDefinition(d)})()`),false);}
 assert(run('validDefinition(JSON.parse(JSON.stringify(saved)))'));
});
test('labels reject confusing or unsafe values and retain valid Unicode/apostrophes',()=>{
 for(const name of ['', 'Tie','No score','Even','<script>', 'x'.repeat(25)])assert.equal(run(`validTeam(${JSON.stringify(name)})`),false);
 assert(run(`validTeam("O'Brien")&&validTeam('Montréal')`));assert.equal(run("validTeams('Cedar','cedar')"),false);
});
