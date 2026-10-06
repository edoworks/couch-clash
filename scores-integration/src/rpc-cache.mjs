import { boundedJSON } from './provider.mjs';
// Only these RPCs exist in the client interface. No incoming URL/query/RPC names.
export function createRPCCache({ url, serviceKey, fetcher = fetch, timeoutMs = 4000 }) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) || !serviceKey) throw new Error('Server cache configuration is invalid');
  const root = url.replace(/\/$/, '');
  const call = (name, body = {}) => boundedJSON(fetcher, `${root}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, timeoutMs);
  return Object.freeze({ read: () => call('cc_scores_read'), claim: () => call('cc_scores_claim'), finish: (token, snapshot = null, error = null, cooldown = 60) => call('cc_scores_finish', { p_token: token, p_snapshot: snapshot, p_error: error, p_cooldown_seconds: cooldown }) });
}
