# Feedback closure and remaining work

## Current correction — October 6, 2026

The latest explicit feedback rejects passing a phone and required updates after kickoff. Target: own-phone entry, all base picks accepted before kickoff, server lock receipt, automatic settlement only where verified data supports the question, and optional later interaction with no effect on base ranking or eligibility. No required reveal timer. See the [versioned PRD addendum](product/OWN-PHONE-PREGAME-2026-10-06.md).

| Requirement | Current evidence | Next acceptance boundary |
|---|---|---|
| Own-phone participation | Not implemented; published gameplay remains local/shared-device | Two independently authenticated participants submit to one authoritative contest and receive server lock receipts |
| Put the phone away after kickoff | Existing game still has three pregame and two halftime calls; do not rewrite those saved rules | New versioned base card is fully pregame; one player can remain offline until the next day without rank/eligibility penalty |
| Online scores and less manual work | Published web includes an informational scoreboard and scores-only backend; it does not settle predictions | Verified supported outcomes settle on the server; unsupported/stale evidence remains pending, never guessed |
| Native delivery | Build 4 is the prior release in this task record; draft PR11 context is `e38d6a3972533d3b2d1f14c23d08ec760990b478` | Corrected native artifact, privacy facts, device validation and release authorization remain separate gates |
| Groups of groups / fantasy | Planned, not delivered | Follow the core two-phone test; eligibility, privacy, data rights and scoring remain unresolved |

## Historical October 4–5 feedback matrix

The matrix and analysis below are preserved as the original checkpoint. Its disconnected-feed/provider-setup/build-status claims are superseded by the current evidence above. Its proposed player-performance interaction is no longer the next product priority. Mandatory halftime handoff is not a requirement for the planned ruleset.

Source: owner feedback relayed from October 4 and October 5 conversation. Status reflects evidence, not a claim that every request is fulfilled. Build 3 references describe the installed prior release; MNF/design/native work remains a candidate until its own gate passes.

| Feedback and source | Implemented / tested | Remaining commitment |
|---|---|---|
| Manual game for the watching group (Oct 3–4) | Five calls, unchanged 800 maximum, OT included, explicit skips/voids, host confirmation; full synthetic web regression passes | Actual physical group gameplay is unverified |
| Share a host link (Oct 4 05:14 Pacific) | Generic site URL opens the local app | **Deferred:** a join link tied to one shared match is not implemented; needs a shared authoritative session service |
| Apple identity / concern about host seeing or changing cards (Oct 4 05:21 Pacific) | Courtesy handoff, irreversible locks within normal UI; no premature winner reveal | **Deferred:** no authentication, participant ownership, server authority or host-proof anti-cheat. Local data can be inspected |
| Each participant saves their game (Oct 4 05:21 Pacific) | Current game and explicit final recaps stored locally; tested reload/reset/history/quota handling | **Partial:** device-wide saves, not personal accounts or cross-device restores |
| Themes / personalization (Oct 4) | Existing Default, Seahawks and Chargers choices preserved; new presentation checks all three text/action contrasts | Personal theme per signed-in player not implemented |
| Final wording stayed in-progress (Oct 4 screenshot) | Winner / Shared winner / Finished; current and historical final records tested | Physical display confirmation pending |
| Explain football / examples / actual statistics (Oct 4) | Collapsible football help and expressly made-up arithmetic, official glossary | **Partial:** no verified real player statistics, projections or live feed |
| More teams, sports, current games (Oct 4–5) | New immutable Falcons/Saints definition and separate old Seahawks/Chargers viewer; old save meanings preserved | **Partial:** no general fixture catalogue or other sports. Future fixture requires reviewed separate definition |
| Continuous engagement / forgot results (Oct 4 18:51 Pacific) | Prediction board, next host action, read-aloud final recap, saved recap discovery | **Partial:** does not prove attention/retention improvement; no notifications or automatic results. Needs real group observation |
| PrizePicks / fantasy-football expectation (Oct 4–5) | Expectation documented explicitly; no gambling or money features | **Deferred:** no player roster, player-performance cards or fantasy grading. Provider/rights/scoring design needed; board is not a substitute |
| Human visual identity (Oct 5 23:10–23:11 UTC) | Integrated warm paper scorecard, original stitched couch, compact setup, numbered picks, private handoff, compact truthful board; web visual checks pass | Native screenshot verification and owner impression pending; no claim of human testing |
| Live data, too manual (Oct 5 23:17 UTC) | Data requirements and correction boundary documented | **Blocked:** provider/license/reliability selection remains under research; no connected feed, keys, service or automatic settlement |
| TestFlight and App Store-submittable version (Oct 5) | Isolated native preparation; upload authorized to existing app/internal Demo; next sequential build 4 verified free at 23:14 UTC | Native tests/archive/upload pending. Store metadata/privacy/support/screenshots/review scenario and evergreen utility gates remain open. No App Review submission authorized |

## Five whys for the engagement / fantasy mismatch

1. Why does the group still do manual work? Outcomes are host-entered.
2. Why are outcomes not automatic? No verified licensed provider is connected.
3. Why does a prediction board not meet the fantasy expectation? It displays five team-level calls, with no player-level participation or grading.
4. Why was the initial implementation smaller? It was explicitly scoped as a local prototype without a feed or shared backend.
5. Why is the requirement still open now? Later requests broadened the product, while provider rights, data semantics and shared-service design remain unresolved.

This explains the product gap; it does not establish a psychological cause for anyone forgetting results. PrizePicks research is a separate pending research deliverable, not implied by this analysis. Smallest next product test: one unscored player-performance interaction, with real named player eligibility only after a verified source is chosen, then observe an actual group during breaks. Do not relabel the current five team calls as fantasy.
