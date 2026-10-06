# Score integration pre-deployment review

Date: October 6, 2026. **Not approved for public deployment.** Reviewed the local `src`, `edge`, `ui`, and `db` implementation identified by the hashes below. No real provider key was supplied or used; signup is user-reported only. No remote reads requiring credentials, writes, secret binding, gateway change, deployment, or reviewed-code edits were performed. This reviewer previously authored the SQL proposal and its local tests; the SQL section is a self-review, not a separate independent database audit.

## Findings requiring resolution

### R1 — High deployment gate: upstream throttle does not bound public Edge/database load

Location: `src/handler.mjs:15`, `:24–32`; `edge/index.ts`.

The handler intentionally accepts requests without Origin, and a caller outside a browser can also supply an allowed Origin. There is no request authentication, per-client admission limit, global inbound limit, or concurrency bound in this code. Even a denied refresh lease costs two reads and a locking claim RPC. A local probe issuing 20 no-Origin GETs against a non-acquiring fake cache produced **40 reads and 20 claims**. The PostgreSQL throttle protects provider-call frequency, not function invocations, database connections, row-lock queues, transfer, or billable traffic. This is an availability/cost exposure if the proposed handler is opened publicly, not evidence that keys are exposed.

Required before public enablement: approve the actual public versus authenticated access model and an effective admission/resource-control design; specify numeric limits, enforcement location, trusted client-address handling, rejection behavior, and operational caps. Demonstrate that rejected traffic does not reach the score RPCs, including no-Origin/spoofed-Origin requests. Do not treat CORS, a browser-distributed anon key, or the one-minute upstream cooldown as abuse controls. Platform limits outside this source are currently unverified. Supabase documents anonymous Edge access as a deliberate gateway/auth configuration decision. [Securing Edge Functions](https://supabase.com/docs/guides/functions/auth).

### R2 — Medium correctness: observed database disable can be discarded during failure fallback

Location: `src/handler.mjs:24–34`.

Reproducible sequence: initial read returns an enabled last-good snapshot; an administrator disables scores; `claim()` returns `{acquired:false, enabled:false, ...}`; final `read()` fails. The handler ignores the claim state and the catch block serves the initial snapshot with `mode:stale`. A local fake-cache probe confirmed the stale response. The SQL correctly refused a new lease, but the HTTP response still displays scores after this very request observed disablement. The same stale-state fallback can expose an old scope after a claim observes changed season/week.

Required fix: honor the most recent validated claim state immediately, especially disablement and scope change; never fall back across an observed disable/scope boundary. Add tests for disabled claim plus failed reread, and changed scope plus failed reread. Define the distinction between “stop new provider work” and “remove previously displayed data”: a kill switch cannot retract snapshots already delivered to a browser, and this UI retains last-good data while offline. If strict shutdown on unknown database state is required, fail closed rather than serving a previous state. Also decide whether a disable/re-enable cycle must permanently invalidate an outstanding lease: SQL currently only checks enabled at completion and does not invalidate the token on an enabled-only update.

### R3 — Medium robustness: incomplete DTO checks can break both server and UI fallbacks

Locations: `src/handler.mjs:6–8`, `:34`; `ui/score-display.mjs:28–31`; `db/schema.sql` snapshot constraint and finish validation.

The SQL accepts an object with a games array; it does not require `source`, scope, schema, or per-game shape. A matching-scope snapshot with no source passes `publicState`'s initial guard but throws at `s.source.kind`. The catch block invokes the same converter again and can throw outside its own protection. A direct handler probe reproduced `Cannot read properties of undefined (reading 'kind')`. This requires malformed trusted-cache data (for example an administrative edit or later writer); normal current provider normalization produces source metadata. It is not an anonymous table-write exploit.

The browser accepts `{schema:1,mode:'live',automaticSettlement:false,games:[null]}`, sets `last` before rendering, then throws while accessing `g.state`. Its fallback re-renders the same invalid last value and throws again, destroying reliable last-good recovery. A DOM-stub probe reproduced `Cannot read properties of null (reading 'state')`. Its `response.json()` also has no byte/count bound; the timer does not bound synchronous parse/DOM work for a response that arrives in time.

Required fix: validate and reconstruct the complete public DTO at the server boundary, including source/game shape and count; make fallback conversion total/non-throwing. Validate/bound browser input before replacing last-good data, and only commit `last` after safe rendering. Test missing source, null/malformed games, extra fields, excessive counts/bytes, invalid timestamps, and recovery after a valid prior response. Explicit output reconstruction also prevents future extra trusted-cache fields from being passed through wholesale in `source` or `games`.

### R4 — Medium provider-contract correctness: HTTP-date Retry-After is ignored

Location: `src/provider.mjs:20–21`.

The parser uses `Number(header)` only. A mocked 429 with a Retry-After HTTP-date five minutes in the future produced `cooldown:60`, allowing retries before the advertised delay. HTTP permits both delay-seconds and HTTP-date. [RFC 9110 section 10.2.3](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after).

Required fix: parse both formats using an injected clock, then apply the documented 60–3600 policy. Test numeric, future/past date, invalid, missing, and excessive values. Explicitly document that the one-hour upper cap can retry earlier than a longer provider-requested delay; decide whether such a response should instead require a longer disable/backoff. Current tests cover only numeric headers.

## Controls observed in the reviewed source

- Incoming URL paths are restricted; all query strings are rejected. Provider season/week come from the database claim, not the request. Upstream host/path are fixed and scope values are range checked. Redirects use `error`, so authorization is not intentionally forwarded to a redirect target.
- Service-role key and provider key are read only in the Edge entrypoint/server modules. The browser module contains no credential and renders with textContent, not HTML injection. No secret logging appears in the reviewed code. Public conversion omits top-level lease tokens; R3 identifies the need for a stronger nested DTO boundary.
- RPC transport allows only a configured HTTPS Supabase project hostname and three fixed RPC methods. Requests cannot choose a project, RPC name, arbitrary SQL, URL, or payload selector.
- Provider and RPC responses have a 262144-byte streaming limit and four-second deadline spanning body reads. Provider normalization limits 100 games, rejects pagination/out-of-scope/duplicate IDs, preserves zero versus unknown score, and emits bounded fields. Unknown statuses become unknown rather than guessed outcomes. The official Games documentation includes the chosen scope parameters and lifecycle states; an authorized real response remains untested. [BALLDONTLIE Games](https://nfl.balldontlie.io/#games).
- SQL grants only SELECT/UPDATE on the private singleton to service_role; anon/authenticated/PUBLIC lose schema/table/RPC access. Forced RLS has no policies. RPCs are SECURITY INVOKER with empty search_path and fully qualified application objects. Standard Supabase service_role BYPASSRLS is an explicit assumption, not verified against a remote project. That project-wide service role remains a powerful credential, not a narrowly scoped score-only identity.
- Row locks serialize claims; next_attempt_at persists before upstream work, including crashes. Lease expiry is checked after lock acquisition. Finish compares token/config/expiry/enabled and preserves last-good on errors; error text is enum-normalized. Scope trigger clears old snapshot/error/lease without clearing cooldown. A success retains the claim-time throttle. These controls passed 44 local PostgreSQL checks earlier in this task; deployed PostgREST transaction/grant behavior is still unverified.
- Provider errors become bounded codes, and reads persist the error marker for stale labeling. Results do not grade or change host predictions. UI and server flags default disabled. Edge env enablement is read at module initialization: do not assume a secret/env toggle instantly updates already-running isolates; the database switch is the per-request mechanism.

## Timing, deployment, and evidence limits

The four-second bound applies per operation, not to the whole request. Two reads, claim, provider and finish can take substantially longer than the UI's five-second timeout; a failed finish may trigger an additional finish attempt. This can yield stale/unavailable UI while a request is still committing. Define/test a request budget and browser deadline or make refresh asynchronous with a safe subsequent read. This is a latency/reliability concern; no claim is made that every request takes the worst case.

The schema remains a proposal, not a generated/reviewed production migration. Local role bootstrap must never deploy. Gateway JWT configuration, actual endpoint/CORS routing, abuse controls, selected project, grants inherited through other roles/default privileges, schema exposure, PostgREST serialization, function bundling, provider entitlement, real payload semantics, and real-provider latency remain deployment gates. A successful signup or local mock suite does not establish them.

Existing browser/contracts/PostgreSQL evidence was considered. Targeted review probes ran locally with the already installed ChatGPT-bundled Node and fake fetch/cache/DOM objects; they reproduced R1–R4 without a provider request or remote database. The default shell Node was broken by a missing dylib, so no installation was attempted. No full test rerun was needed because reviewed code was not changed.

## Exact reviewed source fingerprints

SHA-256 values, paths relative to `scores-integration`:

```text
40539bd21c15759f20a3f7d14649689ef4506da68d3260a91b6c590a663c315b  src/handler.mjs
aefb2b0072a23cd590efeda2fd45605da404458cf0bd288815a6616cadda5485  src/provider.mjs
0b81ec90f05f3a56be96a72eb2e3bb6110e2a8a366de65373f5855c0a54e7e7d  src/rpc-cache.mjs
ffc0d73a3375e467f28b359b07ab62bf260c0eee20ba635b7a0ee0fc41753682  edge/index.ts
752dc2518e0cbc9052bbb10c98fd4c936211289ea41310b2dd43cfb2f29d3b0c  ui/config.mjs
1f8194d55b0b34dee4bb823257b8aaf4861cfe696cecb1cc3ba67063f75ee3fe  ui/score-display.mjs
1aea53b51248bdac073d6dbf75d5be0e4ec5599d5b2449de74711ecc506f5eb3  db/schema.sql
```

Required next state: fix and regression-test the concrete fallback/validation/retry issues, make the public admission-control and shutdown semantics reviewable, then separately review the exact deployment configuration. This document grants no permission to install secrets, change schemas/security, or deploy.
