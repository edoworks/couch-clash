import {EVENT,RULE_TEXT,KEY,Journal,addForecast,addOutcome,advanceClock,review,explain,provider} from './model.mjs';
const $=id=>document.getElementById(id);let journal,clock=EVENT.start,healthy=false;
const say=s=>$('message').textContent=s;
const text=(tag,value,parent,cls)=>{const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;parent.append(el);return el;};
try{journal=new Journal(localStorage);journal.load();clock=journal.value.clock;healthy=true;}catch{say('Storage unavailable or journal damaged. Existing data is preserved; saving is disabled.');}
$('question').textContent=EVENT.question;$('rules').textContent=RULE_TEXT;$('facts').textContent=provider.evidence().map(x=>`${x.id} · ${x.at} · ${x.text}`).join('\n');
function render(){
 $('clock').textContent=`Test clock: ${clock} · cutoff: ${EVENT.cutoff}`;
 $('save').disabled=!healthy||Date.parse(clock)>=Date.parse(EVENT.cutoff)||!!journal?.value.outcomes.length;
 for(const id of ['resolve','export','delete','explain','advance','nextday'])$(id).disabled=!healthy;
 $('explain').disabled=!healthy||!journal?.value.forecasts.length;
 if(!healthy)return;
 const j=journal.value,r=review(j);$('journal').replaceChildren();$('review').replaceChildren();$('explanation').replaceChildren();
 if(!j.forecasts.length)text('p','No forecast yet. Nothing is inferred from your game picks.',$('journal'));
 for(const [i,f] of j.forecasts.entries()){const d=text('article','',$('journal'),'record');text('strong',`${i===0?'Original':'Revision '+i} · ${f.probability}% Yes`,d);text('p',`${f.at} · ${f.id} · ${f.rules}`,d);text('p',f.reason||'No reason recorded.',d);text('p','Evidence frozen: '+f.evidence.map(e=>e.id).join(', '),d);}
 text('h3',`Status: ${r.state}`,$('review'));
 if(r.original!==null){text('p',`Original Brier: ${r.original.toFixed(4)}`,$('review'),'score');text('p',`Final pre-cutoff Brier: ${r.final.toFixed(4)}`,$('review'));text('p','Deterministic calculation: (probability ÷ 100 − outcome)². Yes = 1, No = 0. Lower is better for this outcome.',$('review'));}
 else text('p','Unscored. Pending, disputed and void results are never counted as losses.',$('review'));
 text('p',`Sample size: ${r.sampleSize} resolved event. Revisions are not independent observations. No benchmark available. One outcome does not establish skill or whether your decision was good.`,$('review'));
 for(const o of j.outcomes){const d=text('article','',$('review'),'record');text('strong',`${o.id} · ${o.state}${o.y===null?'':o.y?' · Yes':' · No'}`,d);text('p',`${o.at} · ${o.source}`,d);text('p',o.reason,d);}
}
$('form').onsubmit=e=>{e.preventDefault();try{if($('probability').value.trim()==='')throw Error('Enter a probability.');journal.save(addForecast(journal.value,{probability:Number($('probability').value),reason:$('reason').value,at:clock}));render();say('Saved locally before any commentary. Advance the test clock before making a revision.');}catch(e){say(e.message)}};
function moveClock(at){try{journal.save(advanceClock(journal.value,at));clock=at;render();}catch(e){say(e.message)}}
$('advance').onclick=()=>moveClock(new Date(Date.parse(clock)+300000).toISOString());
$('nextday').onclick=()=>moveClock(new Date(Math.max(Date.parse(clock)+1000,Date.parse(EVENT.cutoff)+86400000)).toISOString());
$('resolve').onclick=()=>{try{const choice=$('outcome').value;const at=new Date(Math.max(Date.parse(clock),Date.parse(journal.value.outcomes.at(-1)?.at??0)+1000)).toISOString();journal.save(addOutcome(journal.value,{state:['yes','no'].includes(choice)?'resolved':choice,y:choice==='yes'?1:choice==='no'?0:null,reason:$('correction').value,at}));clock=at;render();say('Appended synthetic source record. Original forecasts remain unchanged.');}catch(e){say(e.message)}};
$('explain').onclick=async()=>{const result=await explain(journal);if(result.status==='not-saved'){say('Save a forecast before commentary. Reload if another tab changed the journal.');return;}$('explanation').replaceChildren();text('h3','Deterministic review · AI unavailable',$('explanation'));for(const [k,v] of Object.entries(result.value))text('p',`${k}: ${Array.isArray(v)?v.join(' '):v}`,$('explanation'));};
$('export').onclick=()=>{try{const url=URL.createObjectURL(new Blob([journal.export()],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='forecast-journal-v1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('Export contains only the forecast journal, including your reasons.');}catch(e){say(e.message)}};
$('delete').onclick=()=>{if(!$('confirm').checked)return say('Check the journal-only deletion box first.');try{journal.delete();clock=EVENT.start;$('confirm').checked=false;render();say('Forecast journal deleted from this browser. Game saves and exported copies are unchanged.');}catch(e){say(e.message)}};
window.addEventListener('storage',e=>{if(e.key===KEY){healthy=false;render();say('Journal changed in another tab. Reload to prevent conflicting writes.')}});render();
