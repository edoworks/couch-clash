# Couch Clash — product direction and release record

## Current direction — October 6, 2026

**Each person uses their own phone, completes the base prediction card before kickoff, and can put the phone away for the game.** Later interaction is optional: absence has no penalty and participation confers no base-ranking advantage. Passing a phone and returning at halftime are constraints of the existing prototype, not the desired default. There is no required reveal timer.

The current requirements and smallest acceptance test are in [Own-phone, pregame-complete play — versioned PRD addendum](docs/product/OWN-PHONE-PREGAME-2026-10-06.md). This addendum supersedes prior recommendations for mandatory halftime handoffs and the old next-step priority of a player-performance interaction. It does not modify existing game rules or saves.

Current capability baseline: published web main `65813dde8d24f70e7743282fa3d4a2c2167d3989` provides local shared-device play, host-confirmed predictions and a separate informational online scoreboard. The scores-only backend does not own picks, rooms, identities or settlements. Native PR11 at `e38d6a3972533d3b2d1f14c23d08ec760990b478` remains a draft, not a released own-phone implementation. No Apple identity, shared rooms or synchronized personal cards are delivered.

## Historical October 5 web-release PRD

The following record describes that release's original scope and research state. Statements such as “no feed connected,” pending provider setup, Build 3 status and publication gates below are historical, not current capability claims. Use the addendum above for current direction and the [combined web release record](docs/releases/combined-web.md) for the shipped integration. Preserve this history to avoid silently redefining old games.

Owner: Tom, authorized conditional takeover on October 5, 2026 after the coordination checkpoint. This is a bounded web implementation. Native Build 3 and the separate shared-play project remain unchanged. The independent read-only Build 3 review remains separate.

## Tonight's experience

Atlanta Falcons at New Orleans Saints, October 5, 2026 at 5:15 PM Pacific / 8:15 PM Eastern (October 6, 00:15 UTC), NFL Week 4. Schedule sources supplied and verified in the product research: [Saints](https://www.neworleanssaints.com/schedule/), [Falcons](https://www.atlantafalcons.com/schedule/), [NFL](https://www.nfl.com/schedules/2026/by-week/week-4). Scheduled time is not live game status. No statistics or probabilities are displayed.

Two to six people pass one phone. Three pregame calls, two halftime calls, one board and final group recap. Preserve optional beginner help and explicitly fictional arithmetic. Keep outcomes host-reported and the demo fictional. No accounts, money, prizes, feeds, notifications or separate-phone synchronization.

Scoring remains 100 per pregame correct call with one optional double boost; 200 per halftime correct call; maximum 800. Misses/skips/voids score zero; equal scores share rank. First-half means Q1+Q2. Both after-halftime calls **include overtime**; point bands remain 0–20 / 21–35 / 36+. Final winner includes overtime and an explicit tie option. No arbitrary replacement thresholds.

## Preserving old games

The user approved old matches becoming read-only in this web update. The legacy public key `couch-clash-public-v1` and its `:v1-backup` are never written, removed or migrated by the new routes. The reader freezes the old Seahawks/Chargers question order, labels, scopes and scoring. Old unfinished cards remain unfinished and readable behind a courtesy private-card control; reload hides them again. Final records show Winner / Shared winner / Finished, not in-progress wording. Incomplete results do not imply a final winner.

The new immutable route is `mnf-2026-10-05/`, with key `couch-clash-web-mnf-2026-10-05-v1`. Store envelope and match schema are version 3. Every current/history match includes its own definition snapshot; rendering/scoring read that snapshot. The frozen supported definition has explicit fixture/question/option IDs. Unsupported definitions/versions are rejected visibly without overwriting their stored bytes. Do not replace this route's definitions for another fixture; add a separately versioned route/store or implement a reviewed catalogue migration later.

MNF reset keeps MNF saved history; MNF erase removes only this fixture's key and same-key backup. No other fixture store is erased. Saving final recaps stays explicit, duplicate-proof and limited to 20 without automatic eviction. Storage failures must not be reported as successful saves.

Browser origin rules apply: HTTP and HTTPS stores differ, as do browser profiles. The web cannot read the native TestFlight app's storage. No cross-device or native-to-web transfer is promised.

## Start and close rules

New competitive pregame starts, edits and locks close at scheduled kickoff according to the device clock. Returning to the page refreshes the notice; each mutation checks the cutoff. This is a local courtesy safeguard, not server enforcement, broadcast synchronization or proof against clock manipulation.

The host can explicitly close remaining unsubmitted cards when kickoff or the third quarter begins. After confirmation, those cards become skips worth zero; already locked cards and confirmed outcomes remain unchanged. Closing picks never supplies game results or voids outcomes. The host must close early if actual play starts before the scheduled time. Unknown outcomes remain pending until entered or explicitly voided; no automatic final result. Consistent first-half no-score outcomes are required. Confirmation is immutable.

## Engagement and fantasy expectations

October 4 feedback asked for continued engagement and reported forgotten results. This release supplies a board, clear next host action, final read-aloud recap and saved-recap discovery. Those features do not prove improved engagement or that a group reviewed results.

The user also expects fantasy-football/FanDuel-style capability because an intended participant is a serious football fan. **The board/recap does not satisfy that expectation.** A separately versioned, unscored player-performance interaction is a potential follow-up only after the core is verified and player data/scope are agreed. It is not included in this release. Real lineups/fantasy grading need explicit eligibility and scoring rules, reliable licensed data and corrections handling; no such integration is claimed. Do not invent player statistics, availability, projections or automatic grading to fill the gap.

## Release acceptance

Use synthetic stores and fresh browser contexts. Verify unchanged legacy bytes/backup through new games, reload, read-only history, reset and erase; old drafts/locks/labels/scores; saved definition independence; manual/demo/max800/ties/skips/voids/pending/no-score consistency; private reveal timing; storage failures; pregame cutoff boundaries and host closure; keyboard/focus, reduced motion, 320/390px layout; actual old-to-new service-worker upgrade and offline routes. Review rendered screenshots. Physical iPhone/Safari/VoiceOver and real-group gameplay remain unverified unless separately observed.

Publication is authorized after passing evidence and the coordinating parent's final go/no-go. GitHub writes use hellofoculoom only. No native upload, backend deployment, permission, credential or provisioning change is included.

## Integrated scorecard iteration

October 5 owner feedback rejected the generic visual treatment and requested the visual work in this release. The bounded iteration changes the landing/setup hierarchy, numbered pick slips, original stitched couch handoff and compact board. It preserves definition/scoring/storage/lock behavior and existing theme choices. Selected picks have an explicit selected label as well as a border. Source disclosure stays visible. Validate 320/390/1180 widths, enlarged text, all themes, privacy and complete rounds before publication.

October 5 feedback also explicitly requires live data and player-oriented fantasy capability. **This candidate remains manual and does not fulfill that requirement.** Provider/licensing/data freshness and corrections research is separate; no feed or automated settlement is connected. The next technical boundary is read-only provider observations with source IDs, observed/fetched timestamps and scheduled/in-progress/final/corrected/unavailable states. Unknown or stale observations must not imply a final result. A provider correction must become an explicit proposal; confirmed local outcomes must never silently change.

Updated provider research identifies a viable free real-time scoreboard path: BALLDONTLIE NFL Free includes Games plus Teams/Players profiles at five requests/minute, with terms permitting commercial/fantasy display. Free profiles are not live player game statistics; those are paid. Tank01 free testing offers live player box scores with a 1,000-call monthly cap, but public distribution rights remain unverified. Account/key and secure proxy setup approval are pending; no provider is connected here. Sources relayed by research: https://nfl.balldontlie.io/#account-tiers, https://www.balldontlie.io/terms.html, https://www.tank01.com/. SportsDataIO remains a possible fuller play-by-play provider requiring appropriate rights. Do not substitute undocumented endpoints, client-side secrets or trial data labeled live. Preserve last-good provider snapshots and source/fetch times with explicit stale/unavailable/manual states. Final score alone cannot grade first-score/play calls.
