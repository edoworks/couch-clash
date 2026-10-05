'use strict';
// Read-only presentation over the existing five-call model. No scoring mutations.
const callLabels=['First team to score','First scoring play','Final winner','Second-half leader','Second-half total'];
function callRevealed(i){
 return Object.hasOwn(s.answers,i)&&(s.phase==='podium'||(s.round===1&&i<2));
}
function settlement(){
 const revealed=matchQuestions().map((_,i)=>i).filter(callRevealed);
 const voided=revealed.filter(i=>s.answers[i]===-1).length;
 return {settled:revealed.length,voided,resolved:revealed.length-voided,pending:5-revealed.length};
}
function sourceLabel(){return s.mode==='demo'?'Fictional demo · not real game results':'Host-reported · no live feed';}
function confirmationLabel(){
 const times=Object.values(s.outcomeConfirmedAt||{}).filter(t=>typeof t==='number'&&Number.isFinite(t)&&!Number.isNaN(new Date(t).getTime()));
 if(!times.length)return settlement().settled?'Confirmation time not recorded for this saved match.':'No outcomes confirmed yet.';
 return `${s.mode==='demo'?'Demo':'Host'} confirmation on this device: ${new Date(Math.max(...times)).toLocaleString()}.`;
}
function settlementStrip(){
 const n=settlement();
 return `<section class="settlement" aria-label="Prediction progress"><div class="settlement-top"><span class="eyebrow">PREDICTION BOARD</span><strong>${n.settled}<span> / 5 settled</span></strong></div><div class="call-track" aria-hidden="true">${matchQuestions().map((_,i)=>`<span class="${callRevealed(i)?s.answers[i]===-1?'void':'done':''}"></span>`).join('')}</div><p>${n.resolved} resolved · ${n.voided} voided · ${n.pending} awaiting results</p></section>`;
}
function callStatus(i){
 if(callRevealed(i))return s.answers[i]===-1?'Voided':'Resolved';
 if(s.round===0&&i>=3)return 'Opens at halftime';
 return 'Awaiting result';
}
function revealedChoices(i){
 if(!callRevealed(i))return '';
 return `<details class="revealed-choices"><summary>Revealed choices & points</summary>${s.players.map(p=>`<div class="revealed-player"><div><strong>${esc(p.name)}</strong><span>${p.picks[i]>=0?esc(matchQuestions()[i].opts[p.picks[i]]):'Skipped'}${p.boost===i?' · boosted':''}</span></div><strong>+${points(p,i)}</strong></div>`).join('')}</details>`;
}
function callTile(i){
 const known=callRevealed(i),status=callStatus(i);
 const detail=known?(s.answers[i]===-1?'Void · 0 prediction points for everyone':matchQuestions()[i].opts[s.answers[i]]):(i<2?'Choices stay concealed until halftime confirmation.':i===2?'Winner choices stay concealed until final confirmation.':s.round===0?'Two new calls open after the halftime reveal.':'Choices stay concealed until final confirmation.');
 return `<article class="prediction-tile ${known?'settled-tile':''}" data-call="${i}"><div class="tile-top"><span class="call-number" aria-hidden="true">0${i+1}</span><span class="call-status">${status}</span></div><h3>${callLabels[i]}</h3><p class="call-outcome">${esc(detail)}</p><p class="note">${esc(matchQuestions()[i].when)}</p>${revealedChoices(i)}</article>`;
}
function hostNext(){
 if(s.phase==='picks'){
  const count=s.players.filter(p=>p.locked[s.round]).length;
  return `<section class="host-next"><p><strong>${count} of ${s.players.length} cards locked</strong> · ${esc(s.players[s.active].name)} next</p><button class="primary" data-action="backtocards">Back to private handoff →</button></section>`;
 }
 return `<section class="host-next"><h2>${s.round?'Next: the final whistle':'Next: halftime'}</h2><p>${s.round?'Confirm the last three outcomes, then read the recap together.':'Confirm the first two outcomes, then pass the phone for two halftime calls.'} ${s.mode==='demo'?'The button advances a fictional rehearsal.':'Wait for the broadcast break; this board does not track the game.'}</p><button class="primary" data-action="resolve">${s.mode==='demo'?'Advance demo':s.round?'Host: full time reached':'Host: halftime reached'} →</button></section>`;
}
function predictionBoard(){
 return `${steps()}<section class="board-heading"><h1>The couch’s calls.</h1><p class="source-note">${sourceLabel()}</p></section>${settlementStrip()}${hostNext()}<div class="board-list" aria-label="Five predictions">${matchQuestions().map((_,i)=>callTile(i)).join('')}</div><p class="note confirmation-time">${esc(confirmationLabel())}</p>${s.round===1?`<details class="standings-drawer"><summary>Standings after the first two calls · not final</summary>${board(true)}</details>`:''}${rules()}`;
}
function recapHighlights(){
 const rows=matchQuestions().map((q,i)=>({i,total:s.players.reduce((n,p)=>n+points(p,i),0)})).sort((a,b)=>b.total-a.total||a.i-b.i);
 const biggest=rows[0];
 const split=matchQuestions().map((_,i)=>i).find(i=>i!==biggest.i&&new Set(s.players.map(p=>p.picks[i]).filter(v=>v>=0)).size>1);
 const noPoints=biggest.total===0;
 const biggestCard=noPoints?`<section class="recap-highlight"><div class="eyebrow">THE STORY</div><h2>${settlement().voided===5?'Five voids. A shared finish.':'No correct calls this time.'}</h2><p>Everyone finishes on zero. Skips, misses and voids earn zero; equal scores share rank.</p></section>`:`<section class="recap-highlight"><div class="eyebrow">MOST POINTS WON · ACROSS THE GROUP</div><h2>${callLabels[biggest.i]}</h2><p><strong>${esc(matchQuestions()[biggest.i].opts[s.answers[biggest.i]])}</strong> · ${biggest.total} prediction points earned across the couch.</p><div class="recap-picks">${s.players.filter(p=>points(p,biggest.i)>0).map(p=>`<span>${esc(p.name)} <strong>+${points(p,biggest.i)}</strong>${p.boost===biggest.i?' · boost':''}</span>`).join('')}</div></section>`;
 const splitCard=split===undefined?'':`<section class="recap-highlight split-highlight"><div class="eyebrow">ONE SPLIT TO REVISIT</div><h2>${callLabels[split]}</h2><p>Result: <strong>${s.answers[split]===-1?'Void · no points awarded':esc(matchQuestions()[split].opts[s.answers[split]])}</strong></p><div class="recap-picks">${s.players.map(p=>`<span><strong>${esc(p.name)}</strong> · ${p.picks[split]>=0?esc(matchQuestions()[split].opts[p.picks[split]]):'Skipped'}</span>`).join('')}</div></section>`;
 return biggestCard+splitCard;
}
function groupRecap(readOnly=false){
 // Do not expose private picks if a malformed/incomplete history is ever rendered here.
 if(s.phase!=='podium'||settlement().settled!==5)return `${settlementStrip()}<h1>Results aren’t ready.</h1><p>Every call needs a confirmed result or an explicit void before the final recap.</p>`;
 const ranks=ranked(),winners=ranks.filter(p=>p.total===ranks[0].total),saved=history.some(r=>r.id===s.id);
 return `<section class="recap-heading"><div class="eyebrow">${readOnly?'SAVED RECAP':'FIVE CALLS · FINAL RECAP'}</div><h1>The couch<br>has spoken.</h1><p class="source-note">${sourceLabel()}</p><div class="winner-ribbon"><span class="recap-mark" aria-hidden="true">${couchMark()}</span><div><strong>${winners.map(p=>esc(p.name)).join(' & ')}</strong><p>${winners.length>1?'Shared first':'First place'} · ${ranks[0].total} prediction points</p></div></div><p class="note">Read it out together: the finish, the biggest call, the split.</p></section>${settlementStrip()}${board()}${recapHighlights()}${breakdown()}<p class="note confirmation-time">${esc(confirmationLabel())}</p>${readOnly?'<p class="note">Saved final game · read-only. This cannot reopen picks or replace your current match.</p>':`<button class="primary" data-action="archive" ${saved?'disabled':''}>${saved?'Saved to local history':'Save final game'}</button><p class="note">${saved?'This recap is ready to revisit in Saved games.':'Keep this recap on this device before starting another match.'}</p><button class="secondary" data-action="library">${saved?'Open saved recaps':'Saved games & leave'}</button><button class="secondary" data-action="reset">Run it back →</button><p class="note">Starts a new match after confirmation. Saved history is kept.</p>`}`;
}
function recentRecap(){
 const recent=history[0];
 return recent?`<section class="recent-recap"><div class="eyebrow">LAST TIME ON THE COUCH</div><h2>Your latest recap.</h2><p>${esc(recent.game.players.map(p=>p.name).join(' · '))}</p><button class="secondary" data-history="${esc(recent.id)}">Revisit the last saved game →</button></section>`:'';
}
