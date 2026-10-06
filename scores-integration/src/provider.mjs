// Server adapter: configured key remains in this closure only.
import { boundedJSON, ScoreError } from './transport.mjs';
export { boundedJSON, ScoreError, MAX_BYTES } from './transport.mjs';
export const STATES = new Set(['scheduled','in_progress','final','postponed','canceled','delayed','suspended','abandoned','unknown']);
export function scopeURL({ season, week }) {
  if (!Number.isInteger(season) || season < 2000 || season > 2200 || !Number.isInteger(week) || week < 1 || week > 22) throw new ScoreError('invalid_response');
  const u = new URL('https://api.balldontlie.io/nfl/v1/games');
  u.search = new URLSearchParams({ 'seasons[]': String(season), 'weeks[]': String(week), 'season_types[]': '2', per_page: '100' });
  return u.href;
}
const integer = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const iso = v => typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : null;
function team(t, score) {
  if (!t || !integer(t.id, 1, Number.MAX_SAFE_INTEGER) || typeof t.full_name !== 'string' || !t.full_name.trim() || t.full_name.length > 80 || typeof t.abbreviation !== 'string' || !/^[A-Z0-9]{2,5}$/.test(t.abbreviation) || !(score == null || integer(score, 0, 1000))) throw new ScoreError('invalid_response');
  return { id: String(t.id), name: t.full_name, abbreviation: t.abbreviation, score: score ?? null };
}
export function normalizeGames(raw, scope, fetchedAt, kind = 'live') {
  scopeURL(scope);
  if (!raw || !Array.isArray(raw.data) || raw.data.length > 100 || !raw.meta || raw.meta.next_cursor != null || !iso(fetchedAt) || !['live','mock'].includes(kind)) throw new ScoreError('invalid_response');
  const seen = new Set();
  const games = raw.data.map(g => {
    if (!g || !integer(g.id, 1, Number.MAX_SAFE_INTEGER) || seen.has(g.id) || g.season !== scope.season || g.week !== scope.week || g.postseason !== false || !iso(g.date)) throw new ScoreError('invalid_response');
    seen.add(g.id);
    return { id: `bdl:nfl:${g.id}`, startTime: iso(g.date), home: team(g.home_team, g.home_team_score), away: team(g.visitor_team, g.visitor_team_score), state: STATES.has(g.status_state) ? g.status_state : 'unknown', statusText: typeof g.status === 'string' ? g.status.slice(0, 80) : '', providerUpdatedAt: iso(g.updated_at) };
  });
  return { schema: 1, source: { provider: 'balldontlie', kind, fetchedAt: iso(fetchedAt) }, scope: { season: scope.season, week: scope.week }, games };
}
export function createProvider({ key, fetcher = fetch, now = () => new Date(), timeoutMs = 4000, kind = 'live' }) {
  if (typeof key !== 'string' || !key.trim()) throw new Error('Server provider credential is missing');
  return async (scope, { signal } = {}) => normalizeGames(await boundedJSON(fetcher, scopeURL(scope), { signal, headers: { Authorization: key, Accept: 'application/json' } }, timeoutMs), scope, now().toISOString(), kind);
}
