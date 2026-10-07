(()=>{
"use strict";

// The native handler owns the endpoint. JavaScript cannot select a URL or headers.
async function nativeScoreFetch(url, options={}) {
  if(url!=='https://zmzzmxdwvgelsjmfihza.supabase.co/functions/v1/scores'||options.signal?.aborted)throw Error('Unavailable');
  const handler=window.webkit?.messageHandlers?.couchScores;
  if(!handler)throw Error('Unavailable');
  const body=await handler.postMessage('refresh');
  if(options.signal?.aborted||typeof body!=='string'||new TextEncoder().encode(body).length>262144)throw Error('Unavailable');
  return new Response(body,{status:200,headers:{'Content-Type':'application/json'}});
}

// Approved public web display. No provider key, URL parameters, or browser credential.
const scoreConfig = Object.freeze({ enabled: true, endpoint: 'https://zmzzmxdwvgelsjmfihza.supabase.co/functions/v1/scores' });

// Shared bounded transport. Contains no credentials or endpoint configuration.
const MAX_BYTES = 262144;
class ScoreError extends Error {
  constructor(code, cooldown = 60) { super(code); this.code = code; this.cooldown = cooldown; }
}
// Deadline covers fetch AND the entire body. Redirects never forward credentials.
async function boundedJSON(fetcher, url, options = {}, timeoutMs = 4000) {
  if (options.signal?.aborted) throw new ScoreError('timeout');
  const controller = new AbortController(); let reader, timer, onAbort;
  const cancelled = new Promise((_, reject) => { onAbort = () => { controller.abort(); reader?.cancel().catch(() => {}); reject(new ScoreError('timeout')); }; options.signal?.addEventListener('abort', onAbort, { once: true }); });
  const deadline = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reader?.cancel().catch(() => {}); reject(new ScoreError('timeout')); }, timeoutMs); });
  const work = (async () => {
    const response = await fetcher(url, { ...options, redirect: 'error', signal: controller.signal });
    if (!response.ok) {
      const rawRetry = response.headers.get('retry-after')?.trim() ?? '';
      const retry = /^\d+$/.test(rawRetry) ? Number(rawRetry) : (Date.parse(rawRetry) - Date.now()) / 1000;
      // PostgreSQL int ceiling is a permanent-hold sentinel, never an earlier retry.
      const cooldown = retry >= 2147483647 ? 2147483647 : Number.isFinite(retry) ? Math.max(60, Math.ceil(retry)) : 60;
      response.body?.cancel().catch(() => {});
      throw new ScoreError(response.status === 401 || response.status === 403 ? 'unauthorized' : response.status === 429 ? 'rate_limited' : 'upstream', cooldown);
    }
    if (Number(response.headers.get('content-length')) > MAX_BYTES) { response.body?.cancel().catch(() => {}); throw new ScoreError('oversized'); }
    if (!response.body) throw new ScoreError('invalid_response');
    reader = response.body.getReader(); const chunks = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { reader.cancel().catch(() => {}); throw new ScoreError('oversized'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let pos = 0;
    for (const c of chunks) { bytes.set(c, pos); pos += c.byteLength; }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw new ScoreError('invalid_response'); }
  })();
  try { return await Promise.race([work, deadline, cancelled]); }
  catch (e) { throw e instanceof ScoreError ? e : new ScoreError('unavailable'); }
  finally { clearTimeout(timer); options.signal?.removeEventListener('abort', onAbort); controller.abort(); }
}

// Pure shared boundary validation. No storage, credentials or network configuration.
const states=new Set(['scheduled','in_progress','final','postponed','canceled','delayed','suspended','abandoned','unknown']);
const reasons=new Set(['unauthorized','rate_limited','upstream','timeout','invalid_response','oversized','unavailable','disabled','age']);
const timestamp=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v));
const fail=()=>{throw Error('Invalid score data');};
function team(t){
 if(!t||typeof t.id!=='string'||!/^\d{1,16}$/.test(t.id)||typeof t.name!=='string'||!t.name.trim()||t.name.length>80||typeof t.abbreviation!=='string'||!/^[A-Z0-9]{2,5}$/.test(t.abbreviation)||!(t.score===null||Number.isInteger(t.score)&&t.score>=0&&t.score<=1000))fail();
 return {id:t.id,name:t.name,abbreviation:t.abbreviation,score:t.score};
}
function games(list){
 if(!Array.isArray(list)||list.length>100)fail();const ids=new Set();
 return list.map(g=>{if(!g||typeof g.id!=='string'||!/^bdl:nfl:\d{1,16}$/.test(g.id)||ids.has(g.id)||!timestamp(g.startTime)||!states.has(g.state)||typeof g.statusText!=='string'||g.statusText.length>80||!(g.providerUpdatedAt===null||timestamp(g.providerUpdatedAt)))fail();ids.add(g.id);return {id:g.id,startTime:g.startTime,home:team(g.home),away:team(g.away),state:g.state,statusText:g.statusText,providerUpdatedAt:g.providerUpdatedAt};});
}
function source(s){if(!s||s.provider!=='balldontlie'||!['mock','live'].includes(s.kind)||!timestamp(s.fetchedAt))fail();return {provider:s.provider,kind:s.kind,fetchedAt:s.fetchedAt};}
function sanitizeSnapshot(s,scope){
 if(!s||s.schema!==1||s.scope?.season!==scope.season||s.scope?.week!==scope.week)fail();
 return {schema:1,scope:{season:scope.season,week:scope.week},source:source(s.source),games:games(s.games)};
}
function sanitizePublicScore(s){
 if(!s||s.schema!==1||s.automaticSettlement!==false||!['manual','unavailable','live','mock','stale'].includes(s.mode)||!(s.reason===null||reasons.has(s.reason)))fail();
 if(['manual','unavailable'].includes(s.mode)){if(!Array.isArray(s.games)||s.games.length||s.source!==null||s.fetchedAt!==null)fail();return {schema:1,mode:s.mode,reason:s.reason,games:[],source:null,fetchedAt:null,automaticSettlement:false};}
 if(!timestamp(s.fetchedAt))fail();const src=source(s.source);
 if(s.mode==='live'&&src.kind!=='live'||s.mode==='mock'&&src.kind!=='mock')fail();
 return {schema:1,mode:s.mode,reason:s.reason,games:games(s.games),source:src,fetchedAt:s.fetchedAt,automaticSettlement:false};
}

// Display only. This module never reads/writes picks, outcomes, storage or points.
function mountScores(root, { config = scoreConfig, fetcher = fetch, timeoutMs = 10000 } = {}) {
  let last = null, busy = false, freshnessTimer;
  root.setAttribute('aria-label', 'Game score display');
  const title = document.createElement('strong'), detail = document.createElement('p'), games = document.createElement('div'), refresh = document.createElement('button');
  refresh.type = 'button'; refresh.textContent = 'Refresh scores';
  detail.setAttribute('role', 'status'); detail.setAttribute('aria-live', 'polite');
  root.replaceChildren(title, detail, games, refresh);
  function render(data) {
    const mock = data.source?.kind === 'mock';
    title.textContent = data.mode === 'manual' ? 'Host scorekeeping' : data.mode === 'unavailable' ? 'Scores unavailable' : mock ? `Test scores${data.mode === 'stale' ? ' · stale' : ''}` : data.mode === 'stale' ? 'Saved scores · BALLDONTLIE · stale' : 'Scores · BALLDONTLIE';
    detail.textContent = (data.source?.kind === 'live' ? 'Provisional provider scores.' : 'Display only.') + ' Your host still confirms prediction outcomes.' + (data.fetchedAt ? ` Fetched ${new Date(data.fetchedAt).toLocaleString()}.` : '');
    games.replaceChildren();
    for (const g of [...(data.games ?? [])].sort((a,b)=>Number(b.state==='in_progress')-Number(a.state==='in_progress'))) {
      const row = document.createElement('p');
      const state = ({ in_progress: 'In progress', scheduled: 'Scheduled', final: 'Final', unknown: 'Status unknown' })[g.state] ?? g.state;
      row.textContent = `${g.away.abbreviation} ${g.away.score ?? '—'} · ${g.home.abbreviation} ${g.home.score ?? '—'} — ${state}`;
      games.append(row);
    }
    if (!data.games?.length && !['manual','unavailable'].includes(data.mode)) games.textContent = 'No games in the configured week.';
  }
  function show(data) {
    clearTimeout(freshnessTimer); render(data);
    if (['live','mock'].includes(data.mode) && data.fetchedAt) {
      const age=Math.max(0,Date.now()-Date.parse(data.fetchedAt));
      freshnessTimer=setTimeout(()=>{last={...data,mode:'stale',reason:'age'};render(last);},Math.max(0,120000-age));
    }
  }
  async function update() {
    if (!config.enabled || busy) return;
    busy = true; refresh.disabled = true;
    try {
      const data = sanitizePublicScore(await boundedJSON(fetcher, config.endpoint, { cache: 'no-store' }, timeoutMs));
      last = data; show(data);
    } catch { show(last?.games.length ? { ...last, mode: 'stale' } : { mode: 'unavailable' }); }
    finally { busy = false; refresh.disabled = false; }
  }
  refresh.hidden = !config.enabled; refresh.addEventListener('click', update);
  render({ mode: 'manual' }); if (config.enabled) void update();
  return { refresh: update };
}

const root=document.querySelector('[data-scoreboard]');
if(root && scoreConfig.enabled){
  root.hidden=false;
  const copy=document.querySelector('[data-score-copy]');
  if(copy)copy.textContent='Home fetches online scores from BALLDONTLIE automatically and when you tap Refresh scores. These scores are informational; your host confirms prediction outcomes. Phones do not sync.';
  mountScores(root,{fetcher:nativeScoreFetch});
}

})();
