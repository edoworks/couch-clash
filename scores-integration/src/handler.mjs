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
export function createScoreHandler({ enabled = false, cache, provider, now = () => Date.now(), allowedOrigins = [] } = {}) {
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
    let state;
    try {
      const claim = await cache.claim();
      if (!claim?.enabled) return respond(base('manual', 'disabled'));
      // Non-refresh requests need one RPC, not a read/claim/read cycle.
      if (!claim.acquired) return respond(publicState(claim, now()));
      if (claim.acquired) {
        try { await cache.finish(claim.token, await provider({ season: claim.season, week: claim.week }), null, 60); }
        catch (e) { await cache.finish(claim.token, null, ERRORS.has(e.code) ? e.code : 'unavailable', e.cooldown ?? 60); }
      }
      // Read the committed snapshot: an expired lease must never serve its result.
      state = await cache.read();
      return respond(publicState(state, now()));
    } catch { return respond(base('unavailable', 'unavailable')); }
  };
}
