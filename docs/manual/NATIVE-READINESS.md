# Native App Store readiness audit — local draft

Audit date: October 6, 2026. Scope: existing Couch Clash 1.0 (4), inspected read-only. This document is a factual preparation checklist, not an App Review submission, privacy attestation, or approval prediction. No native source, release package, published site, credentials, backend, or App Store Connect setting was changed.

## Observed package and release facts

| Item | Evidence / finding |
| --- | --- |
| Artifact inspected | `mnf-native/build/transport/CouchClash.ipa`, 98,033 bytes. SHA-256 `b2c621a68984a96f896efad3e8ddc5abd222bdc286b1f1775fd3ed27d334385f`; independently recomputed and matches `mnf-native/releases/release-state.json`. |
| Identity | Packaged plist: `com.foculoom.couchclash`, version `1.0`, build `4`. |
| Platform | Packaged plist: iPhone/iPad families `[1,2]`, arm64, minimum OS 18.0, Xcode 27.0 / iPhoneOS 27.0 SDK. Portrait and landscape orientations declared. |
| Privacy manifest | Present in the transport IPA: `NSPrivacyTracking=false`, empty collected-data and accessed-API arrays. Matches the source manifest. |
| SDK inventory | IPA contains no embedded `Frameworks` directory entries. Project search found no Swift package references. Direct `otool -L` inspection of the transport executable shows Apple system frameworks and Swift runtime libraries only. Weak CoreLocation runtime linkage alone is not evidence of location collection. |
| Source/package relation | All 9 packaged Web asset files match the corresponding current `mnf-native/CouchClash/Web` source bytes. |
| Native behavior | SwiftUI wrapper loads bundled assets into persistent WKWebView storage. Three explicit user-opened external links are allowlisted (team schedule/game page and football glossary). No app sign-in implementation, analytics SDK, ad SDK, direct UserDefaults call, or URLSession call found in the inspected source. |
| Storage | JavaScript uses localStorage for player names, picks, outcomes, history, and themes. Legacy October 4 saves are read-only; fixture erase intentionally preserves them. Handoff privacy is explicitly courtesy privacy on a shared device. |
| Network code | Source search found no fetch, XMLHttpRequest, WebSocket, or sendBeacon usage in the shipped Web assets. This is static inspection, not device network capture. Opening external links uses the user's browser and its separate privacy practices. |
| Permissions / encryption | Packaged plist has no camera, microphone, contacts, location, or tracking purpose strings; `ITSAppUsesNonExemptEncryption=false`. This records the existing declaration; no legal/compliance attestation was made. |
| Apple status evidence | Local `apple-readback.json`, timestamp `2026-10-06T00:03:36Z`, records build 4 Testing, binary validated, internal-only false, Demo group, App Review not submitted. This audit did not refresh authenticated Apple state. |
| Test evidence | Local release-state records simulator upgrade/full-game/icon checks. Physical installation/playtest is explicitly unverified. |

The older `APP-STORE-READINESS.md` statement that only builds 1–3 exist is superseded by the later build-4 readback above. Its metadata observations remain historical and need a fresh authorized account check. The reviewed-verify executable differs byte-for-byte from the transport executable, so the dependency audit was repeated directly on the transport executable; no identity claim relies on the earlier executable.

## Privacy/API assessment and concrete gaps

The manifest accurately records its current declarations, but an empty array is not independent proof of privacy compliance. Selected source/symbol searches found no direct use of UserDefaults, file timestamps, disk-capacity APIs, or boot-time APIs. The symbol search is only a heuristic: it does not analyze all Objective-C selectors or Apple framework internals, and a broad `stat` search also matches unrelated Swift `StaticArrayStorage`. Do not add a UserDefaults reason simply because JavaScript uses localStorage; identify any actual covered API in app/third-party code first. Re-run the inventory and Xcode privacy-report review against any new candidate. Apple's manifest and required-reason API documentation describe what must be declared when such APIs are used. [Privacy manifests](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files), [Required-reason APIs](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api).

No privacy-policy URL or support URL/contact was found in the shipped source or the inspected readiness documents. The in-app “How scoring & privacy work” explanation is useful, but is not a linked full privacy policy. The Swift navigation allowlist currently contains only the three sports-reference links: adding policy/support links later also requires verifying that the wrapper actually opens them. Apple requires an accessible privacy-policy link both in metadata and in the app. [App Review guideline 5.1.1](https://developer.apple.com/app-store/review/guidelines/#privacy).

Public support/privacy availability is therefore **unverified**, not a reported 404: no approved URLs were available to test. An attempted read of the known product homepage through the web tool returned an internal retrieval error; that does not establish that the site is down. Do not invent policy/support paths or substitute the homepage for a policy/contact page.

Privacy draft inputs for owner review: local-only names/game records; no observed developer-operated collection or advertising/tracking in build 4; browser-opened third-party reference links; fixture-specific deletion and preserved legacy records; local data loss/reset limitations; no cloud account/sync. “Data Not Collected” is a candidate answer supported by current static inspection, not a submitted/verified App Store privacy label. Owner must confirm complete app/SDK behavior and actual support-site practices; do not promise device backups are disabled without testing. Apple's privacy fields must also be completed in App Store Connect. [App privacy](https://developer.apple.com/help/app-store-connect/reference/app-information/app-privacy).

## Submission checklist — requirements versus present evidence

| Gate | Current evidence / remaining work |
| --- | --- |
| Evergreen functionality | Build 4 opens a fixed October 5 fixture with cutoff `2026-10-06T00:15:00Z`. Fictional demo and saved recaps remain available, but lasting usefulness and review suitability are unproven. A new local evergreen candidate does not change the shipped native build until separately packaged/tested. Apple assesses lasting utility and functionality beyond a repackaged website. [Guideline 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality). |
| Build selection | Later readback establishes App Store-capable build 4; the earlier draft had no selected build. Current selected build is unverified. Do not infer selection from upload/Testing status. |
| Listing | Earlier account audit reported blank description, keywords, support URL, copyright and review contact. Complete/verify these using accurate final-build copy; do not publish the fixed-event draft as an evergreen live-data product. |
| Support | Owner-approved HTTPS support page with actual contact information and a successful public read. No contact details were invented. |
| Privacy | Owner-approved publicly reachable privacy policy, accessible in-app link, confirmed privacy answers, and final-package manifest/API review. |
| Review contact/sign-in | Owner supplies review name/email/phone privately. Existing source requires no sign-in; the earlier account draft's sign-in-required checkbox is inconsistent and needs authorized correction. |
| Screenshots | Final-build iPhone/iPad screenshots meeting Apple's current size rules. Existing test screenshots are evidence, not automatically approved listing assets. No screenshots were uploaded. |
| Age rating/content rights | Complete the current age-rating questionnaire and verify rights for displayed sports/team content. No age, Kids-category, gambling, or rights declaration guessed from the absence of money/prizes. |
| Release control | Earlier account draft used automatic release. Owner must choose the release method; neither App Review submission nor public release follows from this audit. |
| Real-device quality | Test build 4 (or replacement candidate) on supported iPhone/iPad, landscape, offline first launch/relaunch, storage recovery/deletion, external links, VoiceOver and larger text. Do not claim accessibility-label support without the required testing. |
| Agreements/compliance | Owner/account reviewer verifies current agreements, territories, pricing, encryption answers and applicable distribution declarations. Existing encryption flag alone does not settle all account questions. |

Apple's platform-version reference identifies required screenshots, description, keywords, support URL and copyright, plus review-contact/sign-in information and release options. [Platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/). Age rating and privacy-policy URL are app-level requirements. [App information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information). The current submission page recommends Xcode 27 and announces iOS/iPadOS 27 SDK minimums from April 2027; this package already identifies SDK 27, but final upload validation is still a distinct gate. [Submitting apps](https://developer.apple.com/app-store/submitting/).

## Draft review-note inputs for the unchanged build 4

No sign-in is required. Use “Try the fictional demo,” enter two or more player names, and start the demo. Pass the device between named players; choose or explicitly skip each call, then lock. Use Advance demo to progress and confirm fictional outcomes, then save/open the recap. Data stays in this app installation; website saves are separate. Scores are host-entered, with no live scores, player fantasy grading, accounts, cross-device sync, money or prizes. The scheduled fixture cannot be restarted after its cutoff. These facts must be rechecked and rewritten if the final candidate changes.

**Concrete blockers:** approved public support/privacy pages and in-app policy access; useful final evergreen native experience; completed/freshly verified metadata, privacy/age/compliance/contact/release inputs; final screenshot set; physical-device and accessibility verification. TestFlight validation does not resolve these gates. This draft contains no private contact details, account identifiers, credential paths or absolute local filesystem paths for reuse in a public issue.
