'use strict';
// Frozen October 4 web save reader. Deliberately no storage writes or migrations.
const LEGACY_KEY='couch-clash-public-v1';
const OLD_QUESTIONS=[
 ['First-half first score?',['Seahawks','Chargers','No score'],100],
 ['First points come from…',['Touchdown','Field goal','Safety','No score'],100],
 ['Who gets the last laugh?',['Seahawks','Chargers','Tie'],100],
 ['Who owns the second half?',['Seahawks','Chargers','Even'],200],
 ['Second-half point party?',['0–20','21–35','36+'],200]
];
const el=document.getElementById('legacy'),escapeHtml=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let records=[],selected=null,privatePlayer=null,error='';
function validOld(m){return m&&[1,2].includes(m.version)&&['setup','picks','watch','resolve','podium'].includes(m.phase)&&['host','demo'].includes(m.mode)&&[0,1].includes(m.round)&&Array.isArray(m.players)&&m.players.length<=6&&m.players.every(p=>p&&typeof p.name==='string'&&p.picks&&Array.isArray(p.locked))&&m.answers&&typeof m.answers==='object';}
try{
 const raw=localStorage.getItem(LEGACY_KEY),data=raw===null?null:JSON.parse(raw);
 if(data!==null){
  if(data.version===1&&validOld(data))records.push({label:'Current October 4 match',game:data});
  else if(data.version===2&&validOld(data.current)&&Array.isArray(data.history)&&data.history.length<=20&&data.history.every(r=>r&&validOld(r.game)&&r.game.phase==='podium')){
   if(data.current.phase!=='setup')records.push({label:'Current October 4 match',game:data.current});
   data.history.forEach((r,i)=>records.push({label:'Saved October 4 game '+(i+1),game:r.game}));
  }else error='This older save format could not be read safely. It has not been changed. Keep the original browser data.';
 }
}catch(e){error='Older saves are unavailable or could not be read safely. Nothing was changed.';}
function known(m,i){return Object.hasOwn(m.answers,i)&&(m.phase==='podium'||(m.round===1&&i<2));}
function oldPoints(m,p,i){return known(m,i)&&Number.isInteger(m.answers[i])&&m.answers[i]>=0&&m.answers[i]<OLD_QUESTIONS[i][1].length&&p.picks[i]===m.answers[i]?OLD_QUESTIONS[i][2]*(p.boost===i?2:1):0;}
function oldComplete(m){return m.phase==='podium'&&OLD_QUESTIONS.every((q,i)=>Number.isInteger(m.answers[i])&&m.answers[i]>=-1&&m.answers[i]<q[1].length);}
function oldTotal(m,p){return OLD_QUESTIONS.reduce((n,_,i)=>n+oldPoints(m,p,i),0);}
function renderLegacy(){
 let body=`<div class="eyebrow">OCTOBER 4 · READ-ONLY</div><h1>The last<br>watch party.</h1><p class="intro">Seahawks vs Chargers</p><p class="note">Original five calls, original scoring. After-halftime calls include overtime. These saves cannot be edited here. Names, drafts, locks, results and backups stay in their original web store.</p>`;
 if(error)body+=`<p class="alert">${escapeHtml(error)}</p>`;
 else if(!records.length)body+='<section class="card"><h2>No October 4 web saves found.</h2><p class="note">Check the same browser and address used for that game. HTTP and HTTPS have separate saves. TestFlight app saves stay in the native app and cannot be read here.</p></section>';
 else if(selected===null)body+=records.map((r,i)=>`<section class="legacy-card"><h2>${escapeHtml(r.label)}</h2><p>${r.game.players.map(p=>escapeHtml(p.name)).join(' · ')}</p><p class="note">${r.game.mode==='demo'?'Fictional demo':'Host-reported'} · ${oldComplete(r.game)?'Completed':r.game.round?'Halftime · unfinished':'Pregame · unfinished'}</p><button class="secondary" data-record="${i}">Open read-only record</button></section>`).join('');
 else{
  const r=records[selected],m=r.game,ranked=m.players.map((p,i)=>({p,i,total:oldTotal(m,p)})).sort((a,b)=>b.total-a.total);
  body+=`<button class="secondary" data-back>← All October 4 records</button><h2>${escapeHtml(r.label)}</h2><p class="note">${m.mode==='demo'?'Fictional demo · not real results':'Host-reported · no live feed'} · ${oldComplete(m)?'Final':'Unfinished · pending results stay pending'}</p>`;
  body+=ranked.map(x=>`<section class="legacy-card"><h3>${escapeHtml(x.p.name)}</h3><p><strong>${x.total} prediction points</strong> · ${oldComplete(m)?(x.total===ranked[0].total?(ranked.filter(y=>y.total===x.total).length>1?'Shared winner':'Winner'):'Finished'):'Not final'}</p><p class="note">Pregame ${x.p.locked[0]?'locked':'not locked'} · Halftime ${x.p.locked[1]?'locked':'not locked'}</p>${!oldComplete(m)?`<button class="secondary" data-private="${x.i}">I’m ${escapeHtml(x.p.name)} · read my saved card</button>`:''}${oldComplete(m)||privatePlayer===x.i?OLD_QUESTIONS.map((q,i)=>`<p>${escapeHtml(q[0])}<br><small>Pick: ${Number.isInteger(x.p.picks[i])&&x.p.picks[i]>=0&&x.p.picks[i]<q[1].length?escapeHtml(q[1][x.p.picks[i]]):x.p.picks[i]===-1?'Skipped':'Not picked'}${x.p.boost===i?' · boosted':''} · Result: ${known(m,i)?m.answers[i]===-1?'Void · 0 points':escapeHtml(q[1][m.answers[i]]??'Unavailable'):'Pending / concealed'} · +${oldPoints(m,x.p,i)}</small></p>`).join(''):''}</section>`).join('');
  if(!oldComplete(m))body+='<p class="note">Courtesy privacy only: anyone holding this device can open a saved card. Back or reload hides it again. Start tonight’s game separately; this historical session will not be reset.</p>';
 }
 body+='<a class="route-link" href="../mnf-2026-10-05/?mode=host">Tonight: Falcons at Saints →</a><a class="route-link secondary" href="../">Game picker</a>';
 el.innerHTML=body;
}
el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.record!==undefined){selected=+b.dataset.record;privatePlayer=null;}else if(b.hasAttribute('data-back')){selected=null;privatePlayer=null;}else if(b.dataset.private!==undefined)privatePlayer=+b.dataset.private;renderLegacy();});
renderLegacy();
if('serviceWorker' in navigator)navigator.serviceWorker.register('../sw.js').catch(()=>{});
