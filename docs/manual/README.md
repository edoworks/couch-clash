# Host-defined games — draft source for review

This branch adds one lasting football-night path after the dated fixture: **Host another football game**. Enter two team labels, confirm the game has not started, and play the existing three pregame/two halftime calls. The host records outcomes; no schedule or result is independently verified.

The change is confined to `manual/`, the picker in `index.html`, service-worker caching/routing, and related tests/docs. The October 5 fixture and October 4 legacy route remain byte-identical to main. This is separate from the scores PR and adds no backend, feed, account, shared room or player data.

Match definitions use a separate host-defined identity and no schedule/source fields. They freeze at start, stay with saved picks and recaps, and retain all five questions, overtime scopes, point values, boost and shared-rank behavior. Historical definitions remain frozen immediately when archived and after reload. The separate `couch-clash-host-defined-v1` key prevents reset/erase from touching official or legacy saves. This is UI-level immutability and courtesy pass-and-play, not protection against someone editing their own device storage.

Tests:

```sh
node --test tests/manual/definitions.test.mjs
python3 -m http.server 5212 --bind 127.0.0.1
# In another terminal, with Playwright available:
TEST_URL=http://127.0.0.1:5212/ node tests/manual/browser.mjs
TEST_URL=http://127.0.0.1:5212/ node tests/mnf/browser.mjs
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if using an existing browser binary. The test runner creates a fresh profile with synthetic names and saves. It never reads personal browser data. Loopback preview is Mac-only; it is not iPhone delivery or a published site.

Four source tests verify neutral fixture identity, unchanged rules/scoring, nested freezing/tamper rejection, and bounded distinct labels. Mobile tests at 390×844 and 320×740 cover full manual800, fictional shared tie, missing picks, reload locks, fresh kickoff acknowledgement, host-close preservation, a second matchup with historical labels intact, read-only recap, first-use offline no-slash navigation, quota failure, corrupt-definition/name recovery, reset/erase isolation, and official late-entry closure. Existing official/legacy browser regressions also pass. Evidence and screenshots are included alongside this document.

Review outcome: a separate read-only pass found an empty restored player name could crash standings; bounded nonblank player-name validation and a preserving recovery test now address it. No normal-path official cutoff bypass, team-label XSS or cross-key mutation was found. Local browser tests do not establish physical iPhone/VoiceOver or final native behavior.

No product choice blocks review of this small manual-game path. App Store completion still needs owner-approved public privacy/support URLs and actual contact details, final native link handling and packaging, physical-device/accessibility checks, and final metadata/legal/release decisions. See [native readiness](NATIVE-READINESS.md) and [draft metadata](METADATA-DRAFT.md). No merge, deployment, native upload or App Review submission is authorized by this draft.
