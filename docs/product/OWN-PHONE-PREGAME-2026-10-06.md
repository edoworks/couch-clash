# Own-phone, pregame-complete play — PRD addendum v1

Status: proposed product requirements, October 6, 2026. Documentation only; no auth, shared service, gameplay, deployment or release is implemented or authorized by this document. Native context: [draft PR11](https://github.com/edoworks/couch-clash/pull/11), head `e38d6a3972533d3b2d1f14c23d08ec760990b478`. Published web baseline: `65813dde8d24f70e7743282fa3d4a2c2167d3989`.

## Problem and decision

Latest explicit user feedback: “Why does a phone needs to be passed around? Why are players required to make updates after the game starts? It should be optional.” The intended default is each person on their own phone, with a complete base card before kickoff and no required return during play. The existing shared-device implementation is a prototype constraint, not a preference to preserve in a new product.

Rubber-duck scope: the next useful proof is two people submitting independent private cards to one authoritative contest, then obtaining the correct shared result even when one phone stays offline until the next day. More prompts, mandatory halftime picks, reveal timers, player cards and larger team hierarchies do not solve that first problem. Do not call an unsynchronized local preview a shared room.

“More fun, less screen” means a participant can finish the base card once, see that the server locked it, and watch the game. They may check the board or return for the recap whenever they choose. Optional interactions must not increase base points, improve tie position, alter the denominator, affect eligibility, or penalize an absent player. No attendance bonus, streak, timed reveal, forced acknowledgement or compulsory halftime handoff. No money, prizes or betting.

## Current capability versus planned capability

| Area | Current capability | Planned boundary |
|---|---|---|
| Entry | One local installation, editable names, no account | Each participant opens a contest entry on their own phone and establishes authorized ownership; a shared URL alone is not identity |
| Picks | Local three-pregame/two-halftime flow, courtesy locks | Complete new-ruleset base card accepted before kickoff, owned and locked by the server |
| Storage | Local web/native stores are separate; no app-operated cross-device save/restore | Authoritative contest/card records; reconnect returns the same accepted receipt and result |
| Results | Host confirms predictions; online scoreboard is informational | Automatic settlement only from verified evidence sufficient for that exact question |
| Infrastructure | Deployed scores-only function/cache; no participant identity, rooms, pick ownership or rankings | Small reviewed authenticated contest service, explicitly approved before implementation/deployment |
| Native | PR11 is a draft; the earlier signed build 5 is superseded as release candidate | Separately reviewed native artifact and release; no new Apple capabilities implied |

Sign in with Apple is a possible future identity route, not a delivered feature or a configured provider. Game Center is not the cross-platform identity or group store. The existing scores endpoint is public display infrastructure, not authority to accept or expose participant data. No calibrated win probabilities, live player statistics or fantasy grading are delivered.

## New ruleset; preserve every old game

All five existing football questions can be predicted before kickoff. Moving the two after-halftime picks to pregame changes information available to the player and therefore requires a new ruleset/contest version; it is not a copy edit or a migration of old records. Do not silently reuse `couch-football-five-v1` with different deadlines or rounds.

Freeze each new contest's fixture identity, question IDs and meanings, options, points, any boost rule, overtime scope, pick deadline, eligible roster, reveal policy and settlement-source requirements before accepting cards. The exact new full-card scoring/slate remains subject to contract review. Historical 100/200-point rules, 800 maximum, question bands, reveals and timing remain exactly as saved.

Preserve the October 4 catalogue, October 5 official definition, host-defined definitions, native/web storage namespaces, existing drafts/locks, private reveal controls and final recaps. New shared contests use a separate versioned identity/store. No reinterpretation of positional answers or silently rescoring a manual game. Current manual, demo and historical contests remain unranked in any future verified standings.

## Participant flow and authoritative boundaries

1. Open the contest on one's own phone. Show fixture, scheduled deadline/timezone, ruleset, slate and current source status. Entry/invite and identity ownership are distinct checks. Use an approved authentication/session design; no mock token may be presented as real authentication.
2. Complete the whole base card before kickoff. Draft editing is allowed until submission/deadline; the proposed minimal contract locks the complete card on acceptance. Do not display “locked” merely because a local save or queued request succeeded.
3. Receive a server receipt containing contest/ruleset identity, accepted card revision or digest, server acceptance timestamp and lock state. Server time enforces the frozen deadline; at or after the deadline, reject a new card. A forged device clock, host role or client-provided score cannot bypass it.
4. Put the phone away. No player or host action after kickoff is necessary for a verified, supported contest to finish. Optional board visits/reactions are outside base scoring and cannot reveal private picks early. Notifications, if ever added, are opt-in and not a completion requirement.
5. On return, read the authoritative result or an honest pending state. No countdown or timed attendance requirement gates the result. A delayed reconnect must not create a second submission, lose an accepted card or forfeit earned points.

An offline/failed submission without a server acknowledgement remains unconfirmed. Retrying an accepted request returns its same receipt; a reused idempotency key with a different payload rejects. If the original acceptance is unknown, reconnect queries authoritative status. No late backdating of an unsent card. A verified earlier actual start must close entry; unknown start/deadline evidence must not be disguised as fair server-enforced eligibility. Postponements/cancellations and deadline changes need a reviewed, versioned policy rather than host edits to locked contests.

Private cards are readable only by the owner and authorized settlement service before the defined reveal. A room captain cannot alter someone else's picks, membership after roster lock, scoring, source evidence or settlement. A participant cannot select another owner ID in a request. Invite links and screenshots should not expose private cards. Exact release/consent policy needs review before deployment.

## Supported automatic settlement, not inferred outcomes

A prediction being answerable pregame does not mean the available feed can settle it. The existing scores contract provides final-score evidence, not verified first scoring team/play or a first-half split. It can support final winner when a trusted final result is available. Final score alone cannot determine either first-score call or the two after-halftime calls. Do not replace their meaning with a heuristic or infer the second half from the final total.

For the first end-to-end proof, use an explicitly synthetic, separate test contest with one final-winner question (home/away/tie, includes overtime), 100 points correct, 0 otherwise, no boost. This is a technical acceptance fixture, not a decision to replace the five-call product. A full five-question automatic experience requires verified suitable evidence for every question or a separately reviewed new supported slate before anyone locks picks.

For each settlement, retain source fixture identity, evidence/source timestamps, fetch time, verification status and a server settlement revision. Scheduled, in-progress, stale, unavailable or ambiguous evidence leaves affected outcomes pending. Never guess, mark pending as a loss, or show a final winner from incomplete evidence. Do not silently drop an unresolved question from the frozen denominator. The core automatically settled contest must not depend on host data entry; a manual experience remains explicitly separate and unranked.

A verified correction creates a new auditable settlement revision, recalculates from unchanged accepted picks and shows what changed. Duplicate events are idempotent; older evidence cannot overwrite a newer accepted revision. Reconnect reads the latest revision, even after an earlier final was seen. Corrections do not unlock or rewrite cards. Existing local host-confirmed historical outcomes must never be changed by this new service.

## Smallest two-phone end-to-end acceptance test

This test is not yet run. A UI mock or two tabs with one local store is not proof. Use two physical phones with distinct authorized test identities against the same isolated, approved authoritative test service. Deterministic synthetic provider fixtures must stay labeled test data; perform a separate authorized real-source read/contract check before claiming provider-backed automation.

| Step | Required evidence |
|---|---|
| Prepare | Freeze the separate one-question test contest, fixture, future deadline, roster and 100-point rule. Two distinct participant sessions join the same contest; no personal saved data is used. |
| Submit | Both pick the same eventual winner before cutoff and receive distinct owner-bound server receipts. Interrupt one response after server acceptance, retry the same key, and obtain the original receipt without a duplicate card. Different payload under that key rejects. |
| Leave | Phone B goes offline immediately after its receipt and remains offline until the next day. Phone A may open the board and use optional interactions. Neither host nor participant must supply an outcome. |
| Lock and privacy | At and after the deadline reject edits, new cards, forged timestamps, another owner's ID and captain/host overrides. Before reveal, deny cross-player and anonymous card reads. Revoked sessions cannot mutate or retrieve private cards. |
| Pending | Deliver stale/in-progress/unavailable evidence, including a stale “final” payload. Show pending/stale truthfully; no guessed result, zero-loss settlement or premature winner. |
| Settle | Deliver verified fresh final evidence for the correct fixture. The service settles both accepted cards once, even while B is offline. Both earn 100/100 and share rank; A's optional activity gives no advantage. |
| Correct | Deliver a verified corrected final result with a later settlement revision. Recompute both consistently (for example both 0/100 and still tied), retain prior provenance, and expose the correction. Replay duplicate and older evidence; no extra points or rollback. |
| Reconnect | On the next day B sees its original lock receipt, unchanged picks and latest corrected result without new picks, an attendance check or reveal timer. Relaunch on both phones yields the same final revision. |
| Accessibility | Complete entry, picks, lock receipt, pending/result/correction and reconnect with VoiceOver and keyboard where supported; verify meaningful focus/status announcements, largest text, narrow-phone layout, reduced motion, non-color-only states and usable targets. No forced timed interaction. |

Also cover missing/unacknowledged pregame cards separately: show unconfirmed/not entered rather than fabricating a lock. Eligibility for a never-submitted card is a distinct pregame policy; it must not be confused with absence after an accepted lock. Zero scores, ties, cancellations, abandoned fixtures, timeout/retry, duplicate membership and concurrent submissions need explicit contract tests. The server must not trust host-supplied outcomes or client-computed scores.

## Gates and open decisions

| Gate | Needed before proceeding |
|---|---|
| Rules and identity design | Review frozen slate/scoring/deadline/reveal/correction contract, ownership and session revocation, invite access, roster uniqueness and abuse boundaries. No claim that one account proves one human. |
| Authentication and Apple configuration | Explicit approval for provider enablement, app/Services IDs, capabilities, keys/profiles or credential changes. Keep existing native configuration unchanged until approved. |
| Backend | Independent access-control/privacy/schema review and explicit approval for participant tables, APIs and deployment in the chosen environment. Scores-only authorization does not cover a shared-player service. |
| Privacy | Confirm actual logging fields, purposes, retention, destinations, linkage and deletion; finalize app-specific policy/support access and appropriate declarations. No invented retention, “not linked” or “Data Not Collected” claim. |
| Data | Verify rights, entitlements, field semantics, fixture identity, freshness and corrections for each selected question. Unsupported questions are not auto-settleable merely because a scoreboard exists. |
| Test and release | Pass the isolated two-phone test plus legacy regression and device accessibility; review exact source/artifact, then obtain separate production/deployment/TestFlight/App Review authorization. A draft PR is not release approval. |

Groups of groups (players → groups → larger teams) and fantasy/player-performance features follow the core test. Potential aggregate scoring should use earned/max eligible points over distinct frozen players, not sums rewarding larger rosters or averages that double-count groups. Minimum group/team eligibility, membership policy and privacy/visibility remain unresolved; no hidden default or public enrollment. Private groups are the default proposal, and captains cannot consent on behalf of every member. Fantasy requires separately approved data rights, eligibility, scoring and corrections. No money/prizes/betting.

## Acceptance for this documentation update

Current capabilities and future requirements are separated; the old mandatory halftime/handoff recommendation is superseded for the planned ruleset, not erased from release history. Existing gameplay/source and native PR11 are untouched. This document does not claim that own-phone play, Apple identity, shared rooms, optional-round ranking behavior or automatic prediction settlement has shipped.
