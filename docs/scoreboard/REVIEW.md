# Web scoreboard wiring — approved activation candidate

Base: reviewed/deployed backend head `4b54622e91036bd5636fce9d5a8ddd17f885041d`. This branch changes frontend wiring only. No migration, Edge source, provider credential or backend switch changes. Native build 4 remains unchanged and has no feed.

The picker gains a separate read-only score panel. It does not require a prediction card, account, or pregame entry, so a new visitor can read scores after kickoff while the dated game's pregame remains closed. Outcomes for predictions remain host-confirmed. No game saves are read or written by the panel. It refreshes on initial display and explicit Refresh; it does not poll. A displayed result ages to a visible stale label after two minutes without generating a request. Fetch failures retain the prior result as stale.

Configuration is explicit and contains no client key:

```js
{ enabled: true, endpoint: 'https://zmzzmxdwvgelsjmfihza.supabase.co/functions/v1/scores' }
```

The user approved web activation/publication at2026-10-06T01:00:37UTC. The exact enablement/cache-version change in `activation.patch` is now applied in this candidate. Publication still awaits independent final exact-head review. Database enablement belongs exclusively to the parent's connected deployment worker. Ordinary public Edge/read quota exhaustion remains a disclosed Free-service risk.

Mock browser validation uses locally fulfilled candidate assets at the authorized `https://edoworks.com` origin and intercepts the score response with explicitly fictional data. It proves: disabled means zero score requests, the panel works after kickoff without starting a card, zero remains zero, no keys/query selectors/save writes, stale aging without polling, failed-refresh fallback, and the official late-entry block. The separate real-service candidate browser check passed with16 games fetched2026-10-06T01:03:40.950374+00:00, actual CORS at the allowed origin, visible provisional/provider/freshness labels, DTO-matching score rows, no keys/save writes, client-failure stale fallback, and official pregame still closed. Candidate assets were fulfilled locally; this is not a production-site pass.

## Real-endpoint browser verification plan

1. After activation approval, coordinate a bounded enabled window with the sole deployment worker. Do not toggle the database or retrieve secrets from this executor. Use the exact reviewed frontend head and endpoint above.
2. In a fresh mobile browser context, locally fulfill candidate assets at the authorized site origin; leave the Supabase request untouched. Enable only the candidate config for this test. Verify actual CORS/HTTP success and full public DTO validation. Compare displayed scores/statuses/fetch time to the returned DTO, preserving genuine zeros and unknown values. No claim that every response contains a zero or an in-progress game.
3. Confirm a new visitor reaches the panel without a prediction card or account. At the actual post-kickoff time, verify the official host start remains disabled. Seed only synthetic local saves in another fresh context and verify byte equality across refresh; never inspect a personal browser profile.
4. Inspect request headers for absence of client API/service keys. Verify no query/RPC/URL selectors are sent and no internal lease fields are rendered. Provider credentials remain server-side; do not log any credential values.
5. After one successful response, simulate browser network failure locally and confirm stale last-good rendering; this is a client failure test, not a forced provider429. Advance the browser test clock to exercise stale aging and assert no unsolicited polling. Refresh deliberately only as coordinated with the global budget.
6. After separately approved publication, verify deployed asset hashes and a fresh production-origin mobile load. Check service-worker update/offline routing, with score unavailability honestly labeled when the network is absent. An offline score is not persisted as live data.
7. Record actual outcomes and limitations. The parent already verified provider/SQL/anon boundaries, but no real authenticated test session or forced provider429 was manufactured. Candidate asset interception does not establish production deployment, physical iPhone behavior or native support.

Future native integration requires a separate reviewed artifact and tests. Its bundled-file origin, module loading, request/CORS policy and external-link handling must be assessed explicitly; do not broaden the deployed origin policy or claim build4 gained this feed.
