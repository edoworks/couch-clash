# Local score-cache SQL proposal

`schema.sql` is a review proposal, not a generated migration and not remotely applied. It assumes existing Supabase `anon`, `authenticated`, and `service_role` roles; the latter uses Supabase's standard BYPASSRLS privilege. `tests/db-local-bootstrap.sql` creates test-only roles in disposable stock PostgreSQL and must never be deployed. Supabase CLI/advisors and deployed PostgREST verification were unavailable and are not represented as passed.

The private singleton table seeds disabled, season 2026, week 4. It has enabled and forced RLS with no policies; only service_role receives schema usage plus table SELECT/UPDATE. The public functions use SECURITY INVOKER, an empty search path, fully qualified application objects, and explicit EXECUTE grants only to service_role. Neither public client role can read the table or invoke any function.

RPC contract:

- `cc_scores_read()` returns `{enabled, season, week, snapshot, fetchedAt, nextAttemptAt, lastError}`.
- `cc_scores_claim()` returns the same fields plus `acquired` and, only on success, UUID `token`. Disabled/cooldown requests take no row lock. Eligible requests use FOR UPDATE SKIP LOCKED and recheck eligibility; contending requests return acquired=false without queueing. A granted row lock serializes refresh claims. A successful claim commits a 60-second global cooldown and a 15-second completion lease before the caller contacts its upstream provider.
- `cc_scores_finish(p_token uuid, p_snapshot jsonb = null, p_error text = null, p_cooldown_seconds integer = 60)` returns true when it accepts the completion, including an error completion; returns false for missing, stale, expired, disabled, or configuration-mismatched leases. Lease expiry is checked after acquiring the row lock. A success preserves the claim-time cooldown. An error preserves the last good snapshot/time and extends cooldown from completion by at least 60 seconds, preserving longer provider cooldowns; integer-max means an indefinite hold. Unknown error text becomes `upstream`; raw error bodies never persist. Accepted snapshot JSON must be an object containing a games array, at most 262144 UTF-8 bytes when serialized by PostgreSQL. Invalid/oversized payloads become error completions.

The HTTP adapter must filter internal token fields from public output, normalize individual games, and apply its own upstream response limits. Configuration and kill-switch editing are administrator operations, with no client-facing API. A private trigger automatically clears the snapshot, fetched timestamp, error, and pending lease when season/week or enabled changes. It preserves the durable cooldown, so configuration changes cannot evade the global throttle. Pending completions from the old scope are rejected automatically.

Run locally from the workspace root:

```sh
python3 scores-integration/tests/db-cache.py
```

The test script uses the existing Docker executable at `/Applications/Docker.app/Contents/Resources/bin/docker`, existing `postgres:17-alpine`, `--pull never`, `--network none`, no published ports, and a UUID-named disposable container. It removes only its own container in `finally`. Tests use 12 actual concurrent PostgreSQL connections and controlled administrator timestamp adjustments to test cooldowns without long waits; one two-second lock test checks expiry after waiting. No remote configuration is read.

Validation completed locally on PostgreSQL 17.11: **50 checks passed**, process exit 0, disposable container removed successfully. This includes client read/write/RPC denial, RLS/grants/function settings, disabled defaults, 12 simultaneous claims yielding one lease, successful writes, preserved throttles, failure retention, persisted/cleared errors, cooldown clamps, expired/crashed/stale leases, kill-switch denial, season/week invalidation, invalid/oversized snapshots, and lease expiry after waiting for a row lock. Python syntax also passed. The initial attempt was blocked by a stopped Docker daemon; the successful run followed launching the existing Docker app. See `tests/db-results.json` for the run receipt. These checks use stock local PostgreSQL, not a deployed Supabase/PostgREST instance.
