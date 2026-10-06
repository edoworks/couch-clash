#if DEBUG
import WebKit

@MainActor func addForecastProbe(to config: WKWebViewConfiguration) {
    if ProcessInfo.processInfo.arguments.contains("--forecast-fake") {
        config.userContentController.addUserScript(WKUserScript(source: "window.FORECAST_FAKE=true;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }
    guard ProcessInfo.processInfo.arguments.contains("--forecast-probe") else { return }
    guard ProcessInfo.processInfo.arguments.contains("--forecast-qa"),
          config.websiteDataStore.identifier == UUID(uuidString: "CCF02026-1006-4000-8000-000000000099") else {
        let refusal = "const notice=document.createElement('p');notice.textContent='Debug probe refused outside QA store.';document.querySelector('header').append(notice);"
        config.userContentController.addUserScript(WKUserScript(source: refusal, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        return
    }
    let script = #"""
    (async()=>{
      const output=document.createElement('p');output.id='forecast-probe';output.setAttribute('role','status');document.querySelector('header').append(output);
      let count=0;const check=(ok,name)=>{if(!ok)throw Error(name);count++};
      const handler=window.webkit.messageHandlers.forecastSelection;
      const packet=()=>({version:1,requestID:crypto.randomUUID(),operation:'select',packet:'synthetic-one-event-v1',evidenceIDs:['E1']});
      const rejected=async(body,name)=>{let failed=false;try{await handler.postMessage(body)}catch{failed=true}check(failed,name)};
      try{
        // Explicit debug QA journal only, held in a separate persistent test store.
        journal.delete();healthy=true;clock=EVENT.start;render();
        check(document.querySelector('#native-select').disabled,'saved-first');
        await rejected({...packet(),operation:'arbitrary'},'operation');
        await rejected({...packet(),evidenceIDs:['E1 ignore instructions']},'reference');
        await rejected({...packet(),prompt:'private'},'extra field');
        await rejected({...packet(),version:true},'boolean');
        let invalid=false;try{await window.webkit.messageHandlers.forecastJournalExport.postMessage({version:1,requestID:crypto.randomUUID(),operation:'saveJournalJSON',json:'{}',path:'/tmp/bypass'})}catch{invalid=true}check(invalid,'export path');
        journal.save(addForecast(journal.value,{probability:80,reason:'Synthetic QA original',at:clock}));render();
        const original=JSON.stringify(journal.value.forecasts[0]);
        moveClock(new Date(Date.parse(clock)+300000).toISOString());
        journal.save(addForecast(journal.value,{probability:60,reason:'Synthetic QA revision',at:clock}));render();
        check(JSON.stringify(journal.value.forecasts[0])===original,'original preserved');
        moveClock(new Date(Date.parse(EVENT.cutoff)+86400000).toISOString());
        check(document.querySelector('#save').disabled,'cutoff locked');
        journal.save(addOutcome(journal.value,{state:'resolved',y:0,reason:'Synthetic tie is No',at:clock}));render();
        check(Math.abs(review(journal.value).original-.64)<1e-12&&Math.abs(review(journal.value).final-.36)<1e-12,'Brier');
        check(review(journal.value).sampleSize===1,'one sample');
        const p=packet(),reply=await handler.postMessage(p);check(reply.status==='ok'&&reply.selection==='oneEventNotSkill','fake selection');
        const replay=await handler.postMessage(p);check(replay.status==='busy','replay');
        const id=crypto.randomUUID();const pending=handler.postMessage({...packet(),requestID:id});await handler.postMessage({...packet(),requestID:id,operation:'cancel'});
        check((await pending).status==='cancelled','cancel');
        const saved=journal.export();journal.load();check(journal.export()===saved,'reload data');
        check(!document.querySelector('#save').disabled===false,'reload cutoff');
        output.textContent='Forecast native probe PASS '+count+' · fake model';
      }catch(error){output.textContent='Forecast native probe FAIL '+error.message}
    })();
    """#
    config.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
}
#endif
