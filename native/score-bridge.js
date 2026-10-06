// The native handler owns the endpoint. JavaScript cannot select a URL or headers.
async function nativeScoreFetch(url, options={}) {
  if(url!=='https://zmzzmxdwvgelsjmfihza.supabase.co/functions/v1/scores'||options.signal?.aborted)throw Error('Unavailable');
  const handler=window.webkit?.messageHandlers?.couchScores;
  if(!handler)throw Error('Unavailable');
  const body=await handler.postMessage('refresh');
  if(options.signal?.aborted||typeof body!=='string'||new TextEncoder().encode(body).length>262144)throw Error('Unavailable');
  return new Response(body,{status:200,headers:{'Content-Type':'application/json'}});
}
