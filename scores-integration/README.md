# Local score integration — not deployed

This isolated candidate adds a provider-neutral score display, a BALLDONTLIE Games adapter, and a private serialized cache. It does not grade predictions, change confirmed outcomes, add shared rooms or player data, or modify the published web/native release. The separately approved frontend candidate enables the public browser display; the database schema still seeds its switch false. The Edge entrypoint checks that switch only when required server configuration exists. The owner reports entering the provider key directly in encrypted project secrets; this code has not read or used it. Scores-only deployment is authorized but held for independent review.

The browser preview is copied from reviewed source `be642f6059312e4fb2bbfd4ce861a0ff03b734ca`, with a separate local test storage key, no service worker, and a labeled score panel. It is a test fixture, not another released app. Run using the installed Node executable:

```sh
node scores-integration/serve.mjs --mock
```

Open `http://127.0.0.1:5210/` on this Mac. Omit `--mock` to exercise the disabled/manual default. This loopback preview is not iPhone delivery. The published game remains https://edoworks.com/couch-clash/.

The fixed upstream is `https://api.balldontlie.io/nfl/v1/games`, restricted by server configuration to a season and regular-season week. No request parameters can choose URLs, seasons, paths or RPCs. The API key is sent only server-side to that fixed host; redirects are refused. Complete-response timeout is four seconds, maximum body 256 KiB, maximum 100 games. Incomplete pagination, malformed fields and out-of-scope games are rejected. Zero scores remain zero; absent scores remain unknown. Provider status enums are used without guessing from prose. Fetch time is separate from optional provider update time.

The singleton PostgreSQL lease permits one upstream attempt globally per 60 seconds, including failures. A 15-second completion lease prevents late writes. Failures retain the last good result and a sanitized persisted error; rate-limit cooldown is at least 60 seconds and never shortened below Retry-After. Delays outside the PostgreSQL integer range become an indefinite hold. Scope changes invalidate old data without resetting the throttle. The seeded-false database switch is the sole runtime enable/kill control; changing it fences outstanding leases and clears cached results. Public responses never contain lease tokens or credentials. Stale data is labeled; synthetic fixtures always say Test scores. UI refresh failure retains a visibly stale last-good panel. CORS restricts browser origins but is not authentication or protection from public endpoint traffic.

Validation:

- Sixteen Node contract tests passed: zero/null/statuses, fixed authorization/field allowlist, malformed/paginated input, 401/403/429/5xx, full-body deadline/limits, disabled/request-scope rejection, concurrency/stale data, late lease, fixed RPC transport.
- 50 actual PostgreSQL 17.11 policy/cache checks passed, including 12 concurrent connections. Disposable container removed; no network or remote DB.
- Actual handler + provider adapter + real PostgreSQL RPC integration passed with 20 concurrent HTTP-handler calls and exactly one mocked upstream attempt. This uses a test-only psql transport, not PostgREST.
- Playwright at 390×844 (2× pixels) and 320×740 passed a full manual game to 800 points, final-score correction, 429/stale persistence, reload, offline existing-page fallback, keyboard refresh, kill switch and disabled default. Confirmed outcomes/picks/history remained byte-identical. Two screenshots are in `evidence/`.

Commands: `node --test scores-integration/tests/contracts.test.mjs`; `python3 scores-integration/tests/db-cache.py`; `node scores-integration/tests/postgres-handler.mjs`; `node scores-integration/tests/browser.mjs`. Docker tests require the installed Docker daemon and existing postgres:17-alpine image; they pull nothing and expose no ports.

Still required before production:

1. Owner reports account creation and direct secret entry. Confirm applicable plan/usage terms. Verify the real response contract and entitlement; fixtures are not evidence of provider availability.
2. Scores-only deployment to the existing Free project is approved; complete independent security review before acting. `edge/index.ts` is a proposal only. Login-free access is explicitly approved for the scores endpoint only; no gateway setting has changed. Test-only role bootstrap must never deploy.
3. Apply the reviewed schema through a named Supabase migration (no locally invented timestamp; CLI is unavailable here), run advisors, verify grants and fixed RPC transport through deployed PostgREST, and test durable cooldown/kill switch using the actual Edge service role. Review endpoint abuse/resource controls independently of the upstream throttle.
4. Configure the actual browser endpoint/CORS and enable the feature only after a reviewed release. Current client config `/scores` is a same-origin local stub; Pages cannot itself run this server. Native integration would need a new reviewed build and approved endpoint allowlist.
5. Physical iPhone/VoiceOver and real-provider network testing remain unverified. Scores do not establish the first scoring team/play; host confirmation remains necessary. No calibrated probabilities, automatic settlement, player fantasy data, identity or shared-phone synchronization is implemented.

Primary contracts consulted: [BALLDONTLIE NFL Games](https://nfl.balldontlie.io/#games), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Edge secrets](https://supabase.com/docs/guides/functions/secrets). Current grants changes were reviewed; SQL uses explicit grants and forced RLS. Local tests are useful preparation, not proof that only a key remains.

## Review status

See SECURITY-REVIEW.md for the historical exact-hash findings and REVIEW-RESPONSE.md for changes since that review. Do not deploy or merge before an independent exact-head GO. Claims use a nonlocking disabled/cooldown path and SKIP LOCKED for refresh contention. Public Edge/read quota exhaustion remains a disclosed Free-service availability risk. The frontend candidate loads only read-only browser modules on the picker; prediction logic remains unchanged.

Timing contract: server work has an overall eight-second deadline, with cancellation propagated through provider/RPC transport and a check before every subsequent write/read. The browser allows ten seconds. Expired work cannot submit a late provider result; the database lease expires after 15 seconds and the durable minimum 60-second retry fence remains. Four successful 1.8-second operations were tested within the server budget.
