// Test-only cache, clock and fictional upstream fixture. Not a production store.
export function fixture(state = 'in_progress', score = 0) {
  return { data: [{ id: 1, season: 2026, week: 4, postseason: false, date: '2026-10-06T00:15:00Z', status_state: state, status: state, home_team: { id: 1, full_name: 'New Orleans Saints', abbreviation: 'NO' }, visitor_team: { id: 2, full_name: 'Atlanta Falcons', abbreviation: 'ATL' }, home_team_score: score, visitor_team_score: 0 }], meta: { next_cursor: null } };
}
export class TestCache {
  constructor(now = () => Date.now()) { this.now = now; this.state = { enabled: true, season: 2026, week: 4, snapshot: null, fetchedAt: null, nextAttemptAt: null, lastError: null }; this.token = null; this.until = 0; this.claims = 0; }
  async read() { return structuredClone(this.state); }
  async claim() {
    if (!this.state.enabled || Date.parse(this.state.nextAttemptAt) > this.now() || this.until > this.now()) return { ...await this.read(), acquired: false };
    this.token = `test-lease-${++this.claims}`; this.until = this.now() + 15000; this.state.nextAttemptAt = new Date(this.now() + 60000).toISOString();
    return { ...await this.read(), acquired: true, token: this.token };
  }
  async finish(token, snapshot, error, cooldown) {
    if (!this.state.enabled || token !== this.token || this.until <= this.now()) return false;
    if (error) { this.state.lastError = error; this.state.nextAttemptAt = new Date(this.now() + Math.min(3600, Math.max(60, cooldown)) * 1000).toISOString(); }
    else { this.state.snapshot = structuredClone(snapshot); this.state.fetchedAt = new Date(this.now()).toISOString(); this.state.lastError = null; }
    this.token = null; this.until = 0; return true;
  }
}
