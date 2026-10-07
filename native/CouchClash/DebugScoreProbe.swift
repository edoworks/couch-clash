#if DEBUG
import WebKit

@MainActor
func addScoreProbe(to config: WKWebViewConfiguration) {
    if ProcessInfo.processInfo.arguments.contains("--score-test-lifecycle") {
        let lifecycle = #"""
        (async()=>{
          if(window!==window.top||!location.pathname.endsWith('/Web/index.html'))return;
          for(let n=0;n<100;n++){
            const m=await window.webkit.messageHandlers.couchScoreTest.postMessage('snapshot');
            let text=m.attempts===1&&m.cancelled===0&&m.busy?'Delayed request active':m.attempts>=2&&m.cancelled===1&&!m.busy?'Returned home recovered after cancellation':null;
            if(text){const p=document.createElement('p');p.textContent=text;p.setAttribute('role','status');document.body.prepend(p);return;}
            await new Promise(r=>setTimeout(r,20));
          }
        })();
        """#
        config.userContentController.addUserScript(WKUserScript(source:lifecycle,injectionTime:.atDocumentEnd,forMainFrameOnly:true));return
    }
    guard ProcessInfo.processInfo.arguments.contains("--score-test-bridge-probe") else { return }
    let script = #"""
    (async()=>{
      const output=text=>{const p=document.createElement('p');p.textContent=text;p.setAttribute('role','status');document.body.prepend(p);};
      const scores=window.webkit.messageHandlers.couchScores;
      const reason=e=>e?.message||String(e);
      const rejected=async body=>{try{await scores.postMessage(body);return false;}catch(e){return reason(e)==='score_bridge_rejected';}};
      if(window!==window.top){parent.postMessage({bridgeSubframeRejected:await rejected('refresh')},'*');return;}
      const count=()=>window.webkit.messageHandlers.couchScoreTest.postMessage('count');
      if(!location.pathname.endsWith('/Web/index.html')){
        const before=await count(),blocked=await rejected('refresh'),after=await count();
        output(blocked&&after===before?'Other main document rejected before transport':'FAIL other document reached transport');return;
      }
      try{
        for(let n=0;n<100&&(!document.querySelector('[data-scoreboard]')?.textContent.includes('Test scores')||document.querySelector('[data-scoreboard] button')?.disabled);n++)await new Promise(r=>setTimeout(r,20));
        const before=await count(),positive=JSON.parse(await scores.postMessage('refresh')),after=await count();
        if(positive.mode!=='mock'||after!==before+1)throw Error('positive control did not reach deterministic transport');
        output('Positive control reached deterministic transport');
        const payloadBlocked=await rejected({url:'https://example.invalid/'});
        output(payloadBlocked&&await count()===after?'Payload rejected before transport':'FAIL invalid payload reached transport');
        const frame=document.createElement('iframe');frame.hidden=true;
        const result=new Promise(resolve=>{const timer=setTimeout(()=>resolve(false),5000);window.addEventListener('message',function receive(e){if(e.source===frame.contentWindow){clearTimeout(timer);window.removeEventListener('message',receive);resolve(e.data.bridgeSubframeRejected===true);}});});
        frame.src='legacy/index.html';document.body.append(frame);
        output(await result&&await count()===after?'Subframe rejected before transport':'FAIL subframe reached transport');
        fetch('https://zmzzmxdwvgelsjmfihza.supabase.co/functions/v1/scores',{cache:'no-store'}).then(r=>output('Direct file fetch status '+r.status)).catch(()=>output('Direct file-origin fetch blocked'));
      }catch(e){output('FAIL bridge positive control: '+reason(e));}
    })();
    """#
    config.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: false))
}
#endif
