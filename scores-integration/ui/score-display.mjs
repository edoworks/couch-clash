import { scoreConfig } from './config.mjs';
import { boundedJSON } from '../src/transport.mjs';
import { sanitizePublicScore } from '../src/dto.mjs';
// Display only. This module never reads/writes picks, outcomes, storage or points.
export function mountScores(root, { config = scoreConfig, fetcher = fetch, timeoutMs = 10000 } = {}) {
  let last = null, busy = false, freshnessTimer;
  root.setAttribute('aria-label', 'Game score display');
  const title = document.createElement('strong'), detail = document.createElement('p'), games = document.createElement('div'), refresh = document.createElement('button');
  refresh.type = 'button'; refresh.textContent = 'Refresh scores';
  detail.setAttribute('role', 'status'); detail.setAttribute('aria-live', 'polite');
  root.replaceChildren(title, detail, games, refresh);
  function render(data) {
    const mock = data.source?.kind === 'mock';
    title.textContent = data.mode === 'manual' ? 'Host scorekeeping' : data.mode === 'unavailable' ? 'Scores unavailable' : mock ? `Test scores${data.mode === 'stale' ? ' · stale' : ''}` : data.mode === 'stale' ? 'Saved scores · stale' : 'Scores · BALLDONTLIE';
    detail.textContent = 'Display only. Your host still confirms prediction outcomes.' + (data.fetchedAt ? ` Fetched ${new Date(data.fetchedAt).toLocaleTimeString()}.` : '');
    games.replaceChildren();
    for (const g of data.games ?? []) {
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
