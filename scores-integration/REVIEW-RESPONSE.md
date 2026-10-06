# Response to initial local review

The initial review is preserved with its original hashes. Current source differs; a separate reviewer must evaluate the final PR head. The original SQL author also reviewed SQL, so that section was not an independent database audit.

- R1 remains a deployment gate. Optimized non-refresh requests from three RPCs to one fixed claim RPC; this reduces amplification but is not inbound admission control. Public no-Origin access is intentionally authorized. Numeric admission/resource controls and Free-plan operational caps require review before deployment; CORS is not authentication. No deployment has occurred.
- R2 fixed locally: use the atomic claim state directly, return manual immediately for observed disablement, and fail closed on cache transport failures. Never fall back to a prior state across disable/scope transitions. Kill switch stops new responses/work; it cannot retract a score already on an offline device. Disable/re-enable lease semantics still need explicit review.
- R3 fixed locally: shared complete DTO validation reconstructs nested fields, validates source/game shape/count/timestamps and drops extras. Shared bounded transport limits browser bytes and full-body time before replacing last-good data. Malformed/oversized browser responses retain the prior result as stale. Tests cover these regressions.
- R4 fixed for numeric and HTTP-date Retry-After. Both use a 60–3600-second clamp. The one-hour maximum can be shorter than an unusually long provider Retry-After; decide whether a longer response should force a kill switch before deployment.

Final local checks: 12 Node contracts; 44 real PostgreSQL policy/cache tests; actual handler/provider/SQL integration with 20 concurrent requests and one mocked upstream call; mobile browser complete manual800 and correction/429/stale/malformed/oversized/reload/offline/disabled/keyboard tests. No real provider, Edge runtime, PostgREST or deployment test is represented as passed.

Remaining timing issue: per-operation server deadlines can exceed the browser deadline. Define a whole-request budget or asynchronous refresh strategy before activation. No account/player data or shared-play schema is in this PR.
