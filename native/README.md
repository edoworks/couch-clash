# Couch Clash native candidate

This is reviewable iOS source for candidate **1.0 (5)**, based on web commit `65813dde8d24f70e7743282fa3d4a2c2167d3989`. It is **not uploaded, merged, or App Store ready**. Released build4 is unchanged.

## Fresh-machine setup

Clone this public repository and check out the PR's exact reviewed commit. No access to the original Mac, shared credentials, server keys or ZIP files is required to inspect source or run a simulator build.

Tested toolchain: Xcode27.0 (27A266a), Swift6.4, XcodeGen2.44.1, Python3, Git; iOS26.5 simulator runtime. Deployment target is iOS18.0. Other toolchain versions require a new verification pass. Install Xcode and its simulator runtime through Apple, accept its license, select it with `xcode-select`, and install XcodeGen using your preferred trusted package manager. No package installation occurs during build.

From the repository root:

```sh
python3 native/prepare.py
python3 native/tests/verify-source.py
cd native
xcodegen generate
xcrun simctl list devices available
# Set this to your own disposable simulator UUID; do not use a personal app install.
export COUCH_SIMULATOR_ID="YOUR_SIMULATOR_UUID"
xcodebuild -project CouchClash.xcodeproj -scheme CouchClash \
  -configuration Debug -destination "platform=iOS Simulator,id=$COUCH_SIMULATOR_ID" \
  -derivedDataPath build/DerivedData CODE_SIGNING_ALLOWED=NO build-for-testing
xcodebuild -project CouchClash.xcodeproj -scheme CouchClash \
  -configuration Debug -destination "platform=iOS Simulator,id=$COUCH_SIMULATOR_ID" \
  -derivedDataPath build/DerivedData CODE_SIGNING_ALLOWED=NO \
  -parallel-testing-enabled NO -collect-test-diagnostics never \
  -only-testing:CouchClashUITests/NativeParityTests/testBridgeRejectsUntrustedCallsAndFileOrigin test
```

The live-score test makes a request to the existing public scores endpoint and needs network availability. Failure-only DEBUG launch arguments are documented in `ScoreTransport.swift`; they never fabricate live scores and are excluded from Release. The full manual test expects a prepared synthetic setup; see the evidence notes. Existing legacy UI tests require synthetic old saves and must not be run against real user data. The source verification script requires no network.

## Source and storage mapping

`prepare.py` reads immutable Git blobs from the pinned web commit, copies the reviewed rules/UI, removes web installation/service-worker references, changes directory links to explicit file URLs, and maps storage keys. `releases/source-manifest.json` records each original and adapted hash. The five score modules become one local classic script; their logic is unchanged except injection of the fixed native transport. No arbitrary module resolution or remote scripts are used.

- October4: `couch-clash-native-v1` remains read-only, including existing backup behavior.
- Official MNF: `couch-clash-native-mnf-2026-10-05-v1` remains unchanged.
- Reusable games: new `couch-clash-native-host-defined-v1`, separate from both old keys.
- No Safari/native save sharing, shared rooms, accounts or cross-device synchronization.

## Networking boundary

The home screen automatically requests public scores; Refresh requests again. It is not opt-in. WKWebView file-origin fetch cannot use the web CORS allowlist. The app uses the server's existing no-Origin public HTTP contract via an ephemeral URLSession: one fixed HTTPS URL, GET only, no query/caller headers/body/credentials, no cookies or URL cache, no redirects,10-second timeout and262144-byte cap. Only the bundled main landing document can send the exact `refresh` bridge message; subframes, other documents, other payloads and concurrent bridge calls are rejected. The shared public DTO validator still runs before display. All outcomes remain host-confirmed. No backend change or Origin spoofing is involved.

## Signing and release

Simulator builds need no signing credentials. An unsigned device archive can be inspected with `CODE_SIGNING_ALLOWED=NO`; it is not installable/TestFlight-ready. A distributable archive requires your own authorized Apple Developer team access, signing identity/provisioning profile, App Store Connect role, agreements and unique build number. The project records the existing app/team identifiers, but grants no access. Never commit certificates, profiles, API keys, account credentials, user saves, DerivedData, archives or export artifacts. Open the generated Xcode project and configure signing locally only after release approval. There is no upload script in this handoff.

Before any upload: independent review of this exact source/artifact, finalized app-specific privacy/support policy and App Store answers, physical-device/accessibility validation and screenshots, owner approval. See `releases/READINESS.md`.

## Reproducing the historical upgrade

`baseline-build4/` contains the exact old application source/assets for simulator-only upgrade reproduction. Its README explains how to create a synthetic locked card using build4, snapshot the old keys to an ignored local build directory, install the candidate in place, and verify unchanged bytes. No historical binary or access to the original Mac is required. Do not upload the baseline.

## Synthetic network boundary check

On macOS, from the repository root:

```sh
mkdir -p native/build
xcrun swiftc -D DEBUG -parse-as-library -swift-version 6 \
  native/CouchClash/ScoreTransport.swift native/tests/score-network.swift \
  -o native/build/score-network-test
native/build/score-network-test
```

This uses a DEBUG-only URLProtocol injection point to inspect fixed requests and exercise malformed responses. No provider requests occur in that check; Release contains no injection hook. The real-service UI test is separate.

## Corrective review checks

The guard suite requires a successful deterministic mock transport control, a specific guard rejection and zero added transport calls for invalid payload/subframe/other main document. `tests/mutation-check.py --simulator ... --run-name guard-mutation` builds a disposable copied app without those guards and requires that exact assertion to fail after the positive control. It does not edit production source. Verbose failure diagnostics are disabled to avoid lengthy system diagnostic collection on the expected failure.

`tests/score-lifecycle.swift` exercises generation fencing against a late noncooperative completion and exactly-once cancellation/teardown replies; the synthetic network test confirms actual URLSession cancellation. Run `python3 -m unittest discover -s native/tests -p test_store_snapshot.py -v` from the repository root for the fail-closed origin/nonempty-store checker fixtures. Never run the snapshot checker with Python optimization; it refuses that mode. Navigation cancels the previous native score task; an old completion cannot clear a newer request.
