#if DEBUG
import WebKit

@MainActor
func addScoreProbe(to config: WKWebViewConfiguration) {
    guard ProcessInfo.processInfo.arguments.contains("--score-test-bridge-probe") else { return }
    let script = #"""
    (()=>{
      const output=text=>{const p=document.createElement('p');p.textContent=text;document.body.prepend(p);};
      if(window!==window.top){window.webkit.messageHandlers.couchScores.postMessage('refresh').then(()=>parent.postMessage('Subframe incorrectly accepted','*'),()=>parent.postMessage('Subframe rejected','*'));return;}
      if(!location.pathname.endsWith('/Web/index.html'))return;
      window.webkit.messageHandlers.couchScores.postMessage({url:'https://example.invalid/'}).then(()=>output('Payload incorrectly accepted'),()=>output('Arbitrary payload rejected'));
      window.addEventListener('message',e=>{if(e.source===frame.contentWindow)output(e.data);});
      const frame=document.createElement('iframe');frame.hidden=true;frame.src='legacy/index.html';document.body.append(frame);
      fetch('https://zmzzmxdwvgelsjmfihza.supabase.co/functions/v1/scores',{cache:'no-store'}).then(r=>output('Direct file fetch status '+r.status)).catch(()=>output('Direct file-origin fetch blocked'));
    })();
    """#
    config.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: false))
}
#endif
