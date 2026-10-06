export const KEY='couch-clash-forecast-journal-v1';
export const PRODUCTION_ENABLED=false;
export const EVENT=Object.freeze({id:'synthetic-nfl-001',question:'Will Harbor beat Summit?',rules:'nfl-binary-v1',cutoff:'2030-10-06T20:00:00.000Z',start:'2030-10-06T19:00:00.000Z'});
export const RULE_TEXT='Fictional NFL-rules game. Yes only if Harbor wins, including overtime. A final tie is No. Postponement or cancellation voids this forecast; a rescheduled game requires a new event. Pending or disputed results are unscored. Local test clock, not a trusted server lock.';
export const EVIDENCE=Object.freeze([{id:'E1',event:EVENT.id,at:EVENT.start,kind:'synthetic',text:'Fictional fixture: Harbor versus Summit. No real team statistics or injuries are supplied.'}]);
const fail=m=>{throw Error(m)};
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join('|')===[...keys].sort().join('|');
const time=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
export function probability(v){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>100)fail('Enter a probability from 0 to 100.');return v;}
export function brier(p,y){probability(p);if(y!==0&&y!==1)fail('Binary outcome required');return (p/100-y)**2;}
export function evidenceValid(e,at){return Array.isArray(e)&&e.length===1&&exact(e[0],['id','event','at','kind','text'])&&JSON.stringify(e[0])===JSON.stringify(EVIDENCE[0])&&Date.parse(e[0].at)<=Date.parse(at)&&Date.parse(at)-Date.parse(e[0].at)<=3600000;}
export const empty=()=>({schema:1,clock:EVENT.start,forecasts:[],outcomes:[]});
function validateForecast(f,i,previous){
 if(!exact(f,['id','event','question','rules','probability','reason','at','cutoff','evidence'])||f.id!==`forecast-${i+1}`||f.event!==EVENT.id||f.question!==EVENT.question||f.rules!==EVENT.rules||f.cutoff!==EVENT.cutoff||!time(f.at)||Date.parse(f.at)<Date.parse(EVENT.start)||Date.parse(f.at)>=Date.parse(EVENT.cutoff)||previous&&f.at<=previous.at||typeof f.reason!=='string'||f.reason.length>500||!evidenceValid(f.evidence,f.at))fail('Invalid forecast record');probability(f.probability);
}
function validateOutcome(o,i,previous){
 if(!exact(o,['id','event','state','y','source','reason','at'])||o.id!==`outcome-${i+1}`||o.event!==EVENT.id||!['pending','resolved','disputed','void'].includes(o.state)||!time(o.at)||Date.parse(o.at)<Date.parse(EVENT.cutoff)||previous&&o.at<=previous.at||o.source!=='SYNTHETIC-DRIVER'||typeof o.reason!=='string'||!o.reason.trim()||o.reason.length>300||o.state==='resolved'&&!([0,1].includes(o.y))||o.state!=='resolved'&&o.y!==null)fail('Invalid outcome record');
}
export function validate(j){if(!exact(j,['schema','clock','forecasts','outcomes'])||j.schema!==1||!time(j.clock)||j.clock<EVENT.start||!Array.isArray(j.forecasts)||!Array.isArray(j.outcomes)||j.forecasts.length>100||j.outcomes.length>100)fail('Unsupported or damaged journal; existing bytes preserved.');j.forecasts.forEach((f,i)=>validateForecast(f,i,j.forecasts[i-1]));j.outcomes.forEach((o,i)=>validateOutcome(o,i,j.outcomes[i-1]));if(j.forecasts.some(f=>f.at>j.clock)||j.outcomes.some(o=>o.at>j.clock))fail('Clock precedes records');return j;}
export function advanceClock(j,at){validate(j);if(!time(at)||at<j.clock)fail('Clock rollback rejected');return validate({...structuredClone(j),clock:at});}
export function addForecast(j,{probability:p,reason='',at,evidence=EVIDENCE}){validate(j);const next=advanceClock(j,at);const f={id:`forecast-${j.forecasts.length+1}`,event:EVENT.id,question:EVENT.question,rules:EVENT.rules,probability:probability(p),reason:reason.trim(),at,cutoff:EVENT.cutoff,evidence:structuredClone(evidence)};if(j.outcomes.length)fail('Review has begun; forecasts closed.');if(j.forecasts.some(x=>x.at===at))fail('Duplicate submission/time; original preserved.');next.forecasts.push(f);return validate(next);}
export function addOutcome(j,{state,y=null,reason,at}){validate(j);const next=advanceClock(j,at);next.outcomes.push({id:`outcome-${j.outcomes.length+1}`,event:EVENT.id,state,y,source:'SYNTHETIC-DRIVER',reason,at});return validate(next);}
export function review(j){validate(j);const o=j.outcomes.at(-1),first=j.forecasts[0],last=j.forecasts.at(-1);const scored=o?.state==='resolved'&&!!first;return {state:o?.state??'pending',sampleSize:scored?1:0,original:scored?brier(first.probability,o.y):null,final:scored?brier(last.probability,o.y):null};}
export class Journal{
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
export const INTERPRETATION='One result cannot establish forecasting skill. A lower Brier score means a smaller probability error for this outcome.';
export function deterministic(j){const r=review(j);return {summary:'Review the recorded forecast against its stated rule.',evidenceReferences:j.forecasts.length?['E1']:[],supportedObservations:j.forecasts.length?['Only synthetic fixture evidence was available.']:[],interpretations:[INTERPRETATION],uncertainties:['The reason is your pre-event statement, not a verified causal explanation.'],limitations:['Synthetic pilot; no benchmark, real-world accuracy or profitable edge is established.']};}
// Closed vocabulary deliberately rejects unsupported prose, causes, numbers and instructions.
// A future real model adapter must be independently reviewed; reference validation alone is insufficient.
export function validateExplanation(value,j){const allowed=deterministic(j);if(!exact(value,Object.keys(allowed))||value.summary!==allowed.summary)fail('Unsupported explanation');for(const k of Object.keys(allowed).filter(k=>k!=='summary'))if(!Array.isArray(value[k])||value[k].length!==allowed[k].length||value[k].some((x,i)=>x!==allowed[k][i]))fail('Unsupported explanation');return structuredClone(value);}
export async function explain(journal,{adapter=null,signal,timeoutMs=1000}={}){
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
export const provider=Object.freeze({kind:'synthetic-only',liveEnabled:false,evidence:()=>structuredClone(EVIDENCE)});
