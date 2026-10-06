# Forecast Review: repository resume handoff

This branch publishes a sanitized iOS source snapshot of tested local commit
`475113417d27fa548b44b86ce694683c43749c4b`, based on public native PR11 head
`e38d6a3972533d3b2d1f14c23d08ec760990b478`. It does not publish the local commit
history or build artifacts. `source-provenance.json` maps every copied file to its
tested SHA-256. All Swift app/UI-test files and bundled runtime resources are
byte-identical. Only three preparation/audit tools changed for portable access:
preparation reads hash-verified frozen pilot files rather than an unpublished Git
object; verification uses the public base and provenance; archive audit accepts
app/output paths as arguments. These changes are not a new native build claim.

## Scope and ownership

Synthetic, isolated persistent forecast journal with original/revised probabilities,
cutoff/Brier review, scoped deletion, Files JSON export and optional user-triggered
on-device approved-highlight selection. No live predictions or calibrated model
probability. No accounts or cross-device sync. Existing social game and score
transport/gate are unchanged. Saved-first gating and supported-device fallback
remain; cancellation does not attest that physical model computation stopped.

Tom retains integration until Sam verifies this exact published source, claims a
bounded branch/task and explicitly accepts the outgoing handoff. No implementation
edits are in progress for this snapshot. Sam's repository-only readiness review can
continue now. This PR targets PR11's branch, not production main. Review and merge
authority do not waive privacy, device, security or upload gates. No source ownership
transfer is implied by opening or reading this PR.

## Resume from repository

1. Record the exact checked-out commit and clean/dirty state. Inspect this file,
   `source-provenance.json`, source and PR11's release/readiness records. The tested
   commit is a provenance reference, not a requirement to fetch private history.
2. Run `python3 native/forecast/verify-bundle.py`,
   `python3 native/tests/verify-source.py`, and
   `node --test forecast-review-pilot/model.test.mjs forecast-review-pilot/server.test.mjs`.
3. Run `python3 native/forecast/prepare.py`; generated resources and bundle manifest
   must remain identical. Use existing authorized Python/Node/Xcode tools only.
4. For browser checks, set PLAYWRIGHT_MODULE_PATH and
   PLAYWRIGHT_CHROMIUM_EXECUTABLE to your existing tools; create
   `native/forecast/evidence` locally, then run `bridge.test.mjs` and `layout.test.mjs`.
5. Generate the Xcode project from `native/project.yml`. Build with
   CODE_SIGNING_ALLOWED=NO. For device artifact audit run
   `python3 native/forecast/audit-build.py APP_PATH OUTPUT_JSON`.
   Do not introduce signing or new credentials to obtain a source review.

Use only an explicitly owned disposable simulator for fixture tests. Dedicated
DEBUG QA store UUID ends0099; production journal UUID ends0001. Never run destructive
QA tests on a personal device. Seed/production tests are stateful: refuse existing
journals, run an explicit sequence and document cleanup; do not claim the full suite
is order-independent. Probe-only launch requires both the QA flag and QA store
before destructive fixtures. Standard native game data lives separately.

## Recorded tests and limitations

The tested local source passed baseline37 Node checks,33 native fake assertions,
eight JS lifecycle cases and320/390/768px browser checks. Final four focused Debug
native tests passed: explicit Files same-name replacement;15 probe assertions plus
durable relaunch/export/cancel/unavailable fallback; probe-only refusal preserving
production bytes; QA deletion/relaunch. QA journal removed; synthetic production
fixture and social saves unchanged. Native UI evidence is simulator Debug, not
physical or Release UI proof. Earlier combined runs had failures corrected in
focused reruns; no wholly green historical full-suite claim.

Release device and simulator artifacts were rebuilt from4751134 using existing
caches: resources match, FoundationModels weak-linked, DEBUG hooks absent, iOS18
minimum. Device binary SHA256:
`935ed3505960c2e6cf5f3a1bb4490fa3e21062308861442ffe0aa8a7d5d37974`.
Simulator binary SHA256:
`2c1673c622f02be8b6927f8228ec0a0ed6493389ba76ae2671b7196e59b17da0`.
Device unsigned; simulator linker ad-hoc without identity/team; no profiles.
Inherited1.0/build5 is not an allocated or cleared upload number. The new pending
export status passed browser checks and the final native sequence. An earlier Files
replacement stall did not reproduce; same-snapshot local simulator replacement is
not different-content/cloud-provider/physical-device proof. No real iOS model call.

## Remaining release gates and owner facts

- Independent exact-source review and explicit Sam access/ownership acceptance.
- Owner's actual scores-log purposes/access; whether exported/shared, recipients,
  fields and retained copies; verified retention/drains/deletion. Do not invent
  these answers. Existing empty privacy manifest is not Data Not Collected proof.
- App-specific privacy text/URL and Apple classifications grounded in those facts;
  existing support/readiness records are inputs, not completed disclosure approval.
- Current authenticated App Store build/group metadata; historical build4 receipt
  does not prove current highest build. Supported authentication route is missing;
  do not read credentials or change permissions to bypass that gap.
- Physical iPhone/iPad, VoiceOver/larger text, airplane-mode cold launch, eligible
  on-device model success and iOS18 runtime validation remain unverified.
- Final exact distribution-signed candidate audit using existing authorized signing
  material, then only the bounded internal Demo upload after gates clear. No App
  Review, new capabilities, paid services, credential changes or public web change.

Frozen pilot sources are included only to reproduce this iOS bundle. Historical Mac
harness experiments, machine-local logs/screenshots/receipts and release artifacts
are excluded. Request authorized evidence access when needed; do not substitute
this summary for inspecting the source. Keep public handoffs free of private data.
