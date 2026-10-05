const CACHE='couch-clash-scorecard-20261005-v2:'+self.registration.scope;
const ASSETS=["./", "./index.html", "./home.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png", "./icons/icon.svg", "./mnf-2026-10-05/", "./mnf-2026-10-05/index.html", "./mnf-2026-10-05/definitions.js", "./mnf-2026-10-05/app.js", "./mnf-2026-10-05/engagement.js", "./mnf-2026-10-05/style.css", "./legacy/", "./legacy/index.html", "./legacy/legacy.js"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
async function completeResponse(request){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3000);try{const response=await fetch(request,{signal:controller.signal});if(response.type==='opaqueredirect'||response.status===0)return response;const body=await response.arrayBuffer();return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});}finally{clearTimeout(timer);}}
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||!u.href.startsWith(self.registration.scope))return;
 e.respondWith(completeResponse(e.request).catch(async()=>{const c=await caches.open(CACHE);const direct=await c.match(e.request,{ignoreSearch:true});if(direct)return direct;
 if(e.request.mode==='navigate'){const rel=u.pathname.slice(new URL(self.registration.scope).pathname.length);return (await c.match((rel==='mnf-2026-10-05'||rel.startsWith('mnf-2026-10-05/'))?'./mnf-2026-10-05/index.html':(rel==='legacy'||rel.startsWith('legacy/'))?'./legacy/index.html':'./index.html'))||Response.error();}return Response.error();}));
});

self.addEventListener('message',e=>{if(e.data==='COUCH_CACHE_VERSION'&&e.ports[0])e.ports[0].postMessage(CACHE);});
