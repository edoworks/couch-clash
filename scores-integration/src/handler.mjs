import { sanitizeSnapshot } from './dto.mjs';
const ERRORS = new Set(['unauthorized','rate_limited','upstream','timeout','invalid_response','oversized','unavailable']);
const base = (mode, reason = null) => ({ schema: 1, mode, reason, games: [], source: null, fetchedAt: null, automaticSettlement: false });
export function publicState(state, now = Date.now()) {
  if (!state?.enabled) return base('manual', 'disabled');
  let s;
  try { s = sanitizeSnapshot(state.snapshot, state); }
  catch { return base('unavailable', ERRORS.has(state.lastError) ? state.lastError : 'invalid_response'); }
  const fetched = Date.parse(state.fetchedAt), stale = !Number.isFinite(fetched) || now - fetched > 120000 || now < fetched - 10000 || Boolean(state.lastError);
  return { ...base(stale ? 'stale' : s.source.kind === 'mock' ? 'mock' : 'live', ERRORS.has(state.lastError) ? state.lastError : stale ? 'age' : null), games: s.games, source: s.source, fetchedAt: state.fetchedAt };
}
export function createScoreHandler({ enabled = false, cache, provider, now = () => Date.now(), allowedOrigins = [], timeoutMs = 8000 } = {}) {
  return async request => {
    const u = new URL(request.url), origin = request.headers.get('origin');
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' };
    const respond = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
    if (origin && !allowedOrigins.includes(origin)) return respond({ error: 'origin_not_allowed' }, 403);
    if (origin) { headers['Access-Control-Allow-Origin'] = origin; headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'; }
    if (!['/scores','/functions/v1/scores'].includes(u.pathname)) return respond({ error: 'not_found' }, 404);
    if (u.search) return respond({ error: 'query_not_supported' }, 400);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') return respond({ error: 'method_not_allowed' }, 405);
    if (!enabled || !cache || !provider) return respond(base('manual', 'disabled'));
    const controller = new AbortController(), options = { signal: controller.signal };
    const active = () => { if (controller.signal.aborted) throw Error('Request expired'); };
    let timer;
    const deadline = new Promise(resolve => { timer = setTimeout(() => {
      controller.abort(); resolve(respond(base('unavailable', 'timeout')));
    }, timeoutMs); });
    const work = (async () => {
      try {
        const claim = await cache.claim(options); active();
        if (!claim?.enabled) return respond(base('manual', 'disabled'));
        if (!claim.acquired) return respond(publicState(claim, now()));
        let snapshot = null, error = null, cooldown = 60;
        try { snapshot = await provider({ season: claim.season, week: claim.week }, options); }
        catch (e) { error = ERRORS.has(e.code) ? e.code : 'unavailable'; cooldown = e.cooldown ?? 60; }
        active();
        await cache.finish(claim.token, snapshot, error, cooldown, options); active();
        const state = await cache.read(options); active();
        return respond(publicState(state, now()));
      } catch { return respond(base('unavailable', controller.signal.aborted ? 'timeout' : 'unavailable')); }
    })();
    try { return await Promise.race([work, deadline]); }
    finally { clearTimeout(timer); controller.abort(); }

  };
}
