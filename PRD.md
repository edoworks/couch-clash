# Couch Clash — Monday Night Football web release

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
