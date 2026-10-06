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
