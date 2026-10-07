const KEY='couch-clash-ios-forecast-journal-v1';
const PRODUCTION_ENABLED=false;
const EVENT=Object.freeze({id:'synthetic-nfl-001',question:'Will Harbor beat Summit?',rules:'nfl-binary-v1',cutoff:'2030-10-06T20:00:00.000Z',start:'2030-10-06T19:00:00.000Z'});
const RULE_TEXT='Fictional NFL-rules game. Yes only if Harbor wins, including overtime. A final tie is No. Postponement or cancellation voids this forecast; a rescheduled game requires a new event. Pending or disputed results are unscored. Local test clock, not a trusted server lock.';
const EVIDENCE=Object.freeze([{id:'E1',event:EVENT.id,at:EVENT.start,kind:'synthetic',text:'Fictional fixture: Harbor versus Summit. No real team statistics or injuries are supplied.'}]);
const fail=m=>{throw Error(m)};
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join('|')===[...keys].sort().join('|');
const time=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
function probability(v){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>100)fail('Enter a probability from 0 to 100.');return v;}
function brier(p,y){probability(p);if(y!==0&&y!==1)fail('Binary outcome required');return (p/100-y)**2;}
function evidenceValid(e,at){return Array.isArray(e)&&e.length===1&&exact(e[0],['id','event','at','kind','text'])&&JSON.stringify(e[0])===JSON.stringify(EVIDENCE[0])&&Date.parse(e[0].at)<=Date.parse(at)&&Date.parse(at)-Date.parse(e[0].at)<=3600000;}
const empty=()=>({schema:1,clock:EVENT.start,forecasts:[],outcomes:[]});
function validateForecast(f,i,previous){
 if(!exact(f,['id','event','question','rules','probability','reason','at','cutoff','evidence'])||f.id!==`forecast-${i+1}`||f.event!==EVENT.id||f.question!==EVENT.question||f.rules!==EVENT.rules||f.cutoff!==EVENT.cutoff||!time(f.at)||Date.parse(f.at)<Date.parse(EVENT.start)||Date.parse(f.at)>=Date.parse(EVENT.cutoff)||previous&&f.at<=previous.at||typeof f.reason!=='string'||f.reason.length>500||!evidenceValid(f.evidence,f.at))fail('Invalid forecast record');probability(f.probability);
}
function validateOutcome(o,i,previous){
 if(!exact(o,['id','event','state','y','source','reason','at'])||o.id!==`outcome-${i+1}`||o.event!==EVENT.id||!['pending','resolved','disputed','void'].includes(o.state)||!time(o.at)||Date.parse(o.at)<Date.parse(EVENT.cutoff)||previous&&o.at<=previous.at||o.source!=='SYNTHETIC-DRIVER'||typeof o.reason!=='string'||!o.reason.trim()||o.reason.length>300||o.state==='resolved'&&!([0,1].includes(o.y))||o.state!=='resolved'&&o.y!==null)fail('Invalid outcome record');
}
function validate(j){if(!exact(j,['schema','clock','forecasts','outcomes'])||j.schema!==1||!time(j.clock)||j.clock<EVENT.start||!Array.isArray(j.forecasts)||!Array.isArray(j.outcomes)||j.forecasts.length>100||j.outcomes.length>100)fail('Unsupported or damaged journal; existing bytes preserved.');j.forecasts.forEach((f,i)=>validateForecast(f,i,j.forecasts[i-1]));j.outcomes.forEach((o,i)=>validateOutcome(o,i,j.outcomes[i-1]));if(j.forecasts.some(f=>f.at>j.clock)||j.outcomes.some(o=>o.at>j.clock))fail('Clock precedes records');return j;}
function advanceClock(j,at){validate(j);if(!time(at)||at<j.clock)fail('Clock rollback rejected');return validate({...structuredClone(j),clock:at});}
function addForecast(j,{probability:p,reason='',at,evidence=EVIDENCE}){validate(j);const next=advanceClock(j,at);const f={id:`forecast-${j.forecasts.length+1}`,event:EVENT.id,question:EVENT.question,rules:EVENT.rules,probability:probability(p),reason:reason.trim(),at,cutoff:EVENT.cutoff,evidence:structuredClone(evidence)};if(j.outcomes.length)fail('Review has begun; forecasts closed.');if(j.forecasts.some(x=>x.at===at))fail('Duplicate submission/time; original preserved.');next.forecasts.push(f);return validate(next);}
function addOutcome(j,{state,y=null,reason,at}){validate(j);const next=advanceClock(j,at);next.outcomes.push({id:`outcome-${j.outcomes.length+1}`,event:EVENT.id,state,y,source:'SYNTHETIC-DRIVER',reason,at});return validate(next);}
function review(j){validate(j);const o=j.outcomes.at(-1),first=j.forecasts[0],last=j.forecasts.at(-1);const scored=o?.state==='resolved'&&!!first;return {state:o?.state??'pending',sampleSize:scored?1:0,original:scored?brier(first.probability,o.y):null,final:scored?brier(last.probability,o.y):null};}
class Journal{
 #storage;#raw=null;#value=empty();
 constructor(storage){this.#storage=storage;}
 get value(){return structuredClone(this.#value);}
 load(){const raw=this.#storage.getItem(KEY);if(raw&&raw.length>250000)fail('Journal too large; bytes preserved.');const value=raw===null?empty():validate(JSON.parse(raw));this.#raw=raw;this.#value=structuredClone(value);return this.value;}
 save(next){
  validate(next);if(this.#storage.getItem(KEY)!==this.#raw)fail('Journal changed in another tab. Reload before saving.');
  const old=this.#value;
  if(next.clock<old.clock)fail('Clock rollback rejected');
  for(const key of ['forecasts','outcomes'])if(next[key].length<old[key].length||old[key].some((record,i)=>JSON.stringify(record)!==JSON.stringify(next[key][i])))fail('Existing journal records cannot be rewritten or removed');
  if(old.outcomes.length&&next.forecasts.length!==old.forecasts.length)fail('Review has begun; forecasts closed.');
  if(next.forecasts.slice(old.forecasts.length).some(f=>f.at<old.clock)||next.outcomes.slice(old.outcomes.length).some(o=>o.at<old.clock))fail('Record precedes durable clock');
  const raw=JSON.stringify(next);if(raw.length>250000)fail('Journal full. Export before deleting.');
  const committed=JSON.parse(raw);this.#storage.setItem(KEY,raw);this.#raw=raw;this.#value=committed;return this.value;
 }
 snapshotForExplanation(){if(this.#storage.getItem(KEY)!==this.#raw||!this.#value.forecasts.length)fail('Save a forecast before commentary.');return this.value;}
 export(){return JSON.stringify(validate(this.#value),null,2);}
 delete(){if(this.#storage.getItem(KEY)!==this.#raw)fail('Journal changed; reload before deleting.');this.#storage.removeItem(KEY);this.#raw=null;this.#value=empty();}
}
const INTERPRETATION='One result cannot establish forecasting skill. A lower Brier score means a smaller probability error for this outcome.';
function deterministic(j){const r=review(j);return {summary:'Review the recorded forecast against its stated rule.',evidenceReferences:j.forecasts.length?['E1']:[],supportedObservations:j.forecasts.length?['Only synthetic fixture evidence was available.']:[],interpretations:[INTERPRETATION],uncertainties:['The reason is your pre-event statement, not a verified causal explanation.'],limitations:['Synthetic pilot; no benchmark, real-world accuracy or profitable edge is established.']};}
// Closed vocabulary deliberately rejects unsupported prose, causes, numbers and instructions.
// A future real model adapter must be independently reviewed; reference validation alone is insufficient.
function validateExplanation(value,j){const allowed=deterministic(j);if(!exact(value,Object.keys(allowed))||value.summary!==allowed.summary)fail('Unsupported explanation');for(const k of Object.keys(allowed).filter(k=>k!=='summary'))if(!Array.isArray(value[k])||value[k].length!==allowed[k].length||value[k].some((x,i)=>x!==allowed[k][i]))fail('Unsupported explanation');return structuredClone(value);}
async function explain(journal,{adapter=null,signal,timeoutMs=1000}={}){
 let snapshot;try{if(!(journal instanceof Journal))fail('Saved journal required');snapshot=journal.snapshotForExplanation();}catch{return {mode:'deterministic',status:'not-saved',value:null};}
 const baseline=deterministic(snapshot);
 const fallback=status=>({mode:'deterministic',status,value:structuredClone(baseline)});
 if(!adapter)return fallback('unavailable');
 let timer,onAbort;const stop=new AbortController();try{
 if(signal?.aborted)throw Error('cancelled');
 const abort=new Promise((_,reject)=>{onAbort=()=>{stop.abort();reject(Error('cancelled'))};signal?.addEventListener('abort',onAbort,{once:true});});
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{stop.abort();reject(Error('timeout'))},timeoutMs);});
 const result=await Promise.race([Promise.resolve().then(()=>adapter({evidence:structuredClone(EVIDENCE),forecast:structuredClone(snapshot.forecasts.at(-1)??null),allowed:structuredClone(baseline),signal:stop.signal})),abort,timeout]);
 return {mode:'validated-test-adapter',status:'ok',value:validateExplanation(result,snapshot)};
 }catch(e){let status='rejected';try{if(e&&['cancelled','timeout','refused'].includes(e.message))status=e.message;}catch{}return fallback(status);}
 finally{clearTimeout(timer);stop.abort();signal?.removeEventListener('abort',onAbort);}
}
const provider=Object.freeze({kind:'synthetic-only',liveEnabled:false,evidence:()=>structuredClone(EVIDENCE)});

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
$('explain').onclick=async()=>{const result=await explain(journal);if(result.status==='not-saved'){say('Save a forecast before commentary. Reload if another tab changed the journal.');return;}$('explanation').replaceChildren();text('h3','Deterministic review',$('explanation'));for(const [k,v] of Object.entries(result.value))text('p',`${k}: ${Array.isArray(v)?v.join(' '):v}`,$('explanation'));};
$('export').onclick=()=>{try{const url=URL.createObjectURL(new Blob([journal.export()],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='forecast-journal-v1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('Export contains only the forecast journal, including your reasons.');}catch(e){say(e.message)}};
$('delete').onclick=()=>{if(!$('confirm').checked)return say('Check the journal-only deletion box first.');try{journal.delete();clock=EVENT.start;$('confirm').checked=false;render();say('Forecast journal deleted from this app. Game saves and exported copies are unchanged.');}catch(e){say(e.message)}};
window.addEventListener('storage',e=>{if(e.key===KEY){healthy=false;render();say('Journal changed in another tab. Reload to prevent conflicting writes.')}});render();

// iOS-only bundle. Default web and social game do not load this file.
const nativePanel=document.createElement('section');
nativePanel.innerHTML='<h2>Optional on-device highlight</h2><p>Optional Apple Intelligence on eligible devices. Only a fixed synthetic example is used; your probability and reason are never sent to the model. If unavailable, the deterministic review still works.</p><button id="native-select" disabled>Ask on-device model</button><button id="native-cancel" disabled>Cancel highlight</button><p id="native-status" role="status" aria-live="polite"></p>';
document.querySelector('footer').before(nativePanel);
const nativeButton=document.getElementById('native-select'),nativeCancel=document.getElementById('native-cancel'),nativeStatus=document.getElementById('native-status');
let nativeRequest=null,nativeGeneration=0,nativeJournalGeneration=0;
const packet=(id,operation)=>({version:1,requestID:id,operation,packet:'synthetic-one-event-v1',evidenceIDs:['E1']});
const bridge=body=>window.webkit.messageHandlers.forecastSelection.postMessage(body);
const journalChanged=()=>{++nativeJournalGeneration;++nativeGeneration;const id=nativeRequest;nativeRequest=null;nativeCancel.disabled=true;if(id){nativeStatus.textContent='Journal changed · request result discarded.';bridge(packet(id,'cancel')).catch(()=>{});}else nativeStatus.textContent='';nativeReady();};
for(const method of ['save','delete','load']){const original=journal[method].bind(journal);journal[method]=(...args)=>{const result=original(...args);journalChanged();return result;};}

const nativeReady=()=>{nativeButton.disabled=!healthy||!journal?.value.forecasts.length||nativeRequest!==null;};
new MutationObserver(nativeReady).observe(document.getElementById('explain'),{attributes:true,attributeFilter:['disabled']});
nativeButton.onclick=async()=>{
 const before=journal.export(),journalGeneration=nativeJournalGeneration,id=crypto.randomUUID(),generation=++nativeGeneration;nativeRequest=id;nativeReady();nativeCancel.disabled=false;nativeStatus.textContent='Selecting an approved highlight on this device…';
 let selected=null;
 const result=await explain(journal,{timeoutMs:17000,adapter:async({allowed,signal})=>{
  signal.addEventListener('abort',()=>{bridge(packet(id,'cancel')).catch(()=>{});},{once:true});
  const reply=await bridge(packet(id,'select'));
  if(!reply||reply.version!==1||reply.requestID!==id||reply.status!=='ok'||!['oneEventNotSkill','noBenchmarkAvailable'].includes(reply.selection)||Object.keys(reply).sort().join('|')!=='requestID|selection|status|version')throw Error('rejected');
  selected=reply.selection;return allowed;
 }});
 if(generation!==nativeGeneration)return;
 nativeRequest=null;nativeCancel.disabled=true;nativeReady();
 if(!healthy||nativeJournalGeneration!==journalGeneration||journal.export()!==before){nativeStatus.textContent='Journal changed · request result discarded.';return;}
 if(result.status==='not-saved')nativeStatus.textContent='Save a forecast before commentary.';
 else if(result.status==='ok'&&selected)nativeStatus.textContent=(window.FORECAST_FAKE?'FAKE adapter selection · ':'On-device selection · ')+(selected==='oneEventNotSkill'?INTERPRETATION:'No benchmark is supplied; this synthetic review does not establish an advantage.');
 else nativeStatus.textContent='Deterministic fallback · '+INTERPRETATION;
};
nativeCancel.onclick=()=>{const id=nativeRequest;++nativeGeneration;nativeRequest=null;nativeCancel.disabled=true;nativeReady();nativeStatus.textContent='Cancelled · deterministic fallback · '+INTERPRETATION;if(id)bridge(packet(id,'cancel')).catch(()=>{});};
window.addEventListener('pagehide',()=>{++nativeGeneration;if(nativeRequest)bridge(packet(nativeRequest,'cancel')).catch(()=>{});nativeRequest=null;});nativeReady();

// Separate local-only export handler; journal JSON never enters forecastSelection/model.
$('export').onclick=async()=>{
 const json=journal.export(),id=crypto.randomUUID();$('export').disabled=true;say('Choose a destination in Files. Export is pending.');
 try{
  const reply=await window.webkit.messageHandlers.forecastJournalExport.postMessage({version:1,requestID:id,operation:'saveJournalJSON',json});
  if(!reply||reply.version!==1||reply.requestID!==id||Object.keys(reply).sort().join('|')!=='requestID|status|version')throw Error('invalid export reply');
  if(reply.status==='saved')say(journal.export()===json?'Exported journal JSON to your chosen destination. Exported copies remain after journal deletion.':'Saved the earlier journal snapshot. Export again to retain your newer changes.');
  else if(reply.status==='cancelled')say('Export cancelled. Your journal remains saved in this app.');
  else say('Export failed. Your journal remains saved. Try exporting again.');
 }catch{say('Export failed. Your journal remains saved. Try exporting again.');}
 finally{$('export').disabled=!healthy;}
};
