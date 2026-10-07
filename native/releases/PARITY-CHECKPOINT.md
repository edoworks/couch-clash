# Native parity candidate checkpoint

Base: final web main `65813dde8d24f70e7743282fa3d4a2c2167d3989`. Target candidate: 1.0 (5), not uploaded. Build4 source and release artifacts remain untouched; all25 baseline file hashes were checked.

Plan:
1. Deterministically bundle approved manual-game and score display assets, adapt only file routes/native save namespaces, and record source/native hashes.
2. Add a fixed-endpoint score transport in Swift. A nonpersistent macOS WKWebView loaded with loadFileURL reported origin `file://` and fetch `TypeError: Load failed`; an explicit `Origin: null` request to the actual endpoint returned403 origin_not_allowed. Do not expand CORS. The public handler already accepts requests without Origin; a native URLSession bridge can use that existing contract without keys or spoofed headers.
3. Restrict bridge to the bundled main document, one constant message and one fixed HTTPS endpoint; reject redirects, bound time/bytes, use ephemeral no-cookie/no-cache transport. Keep shared DTO validation and host-only settlement. Bundle ESM as a local classic script for file-origin compatibility.
4. Test fresh/upgrade/local save isolation, full manual game, real service, stale/failure/offline, bridge rejection, and privacy. Capture simulator screenshots and exact candidate artifact hashes.
5. Open a draft repository handoff for independent review. No upload, TestFlight assignment, backend changes, or App Review submission before the next release approval.

Readiness gaps remain: owner-approved public support/privacy URLs and policy/data-practice review with networking; metadata/screenshots; physical-device and VoiceOver verification; shared-room/identity requirements (current prototype remains one-device pass-and-play). Player context remains a separate local candidate, not part of this release.

Apple APIs: https://developer.apple.com/documentation/webkit/wkscriptmessagehandlerwithreply and https://developer.apple.com/documentation/foundation/urlsessionconfiguration/ephemeral .

Support contact confirmed by owner: support@foculoom.com. App-specific privacy policy is being drafted separately; existing website/upvote policies are not treated as Couch Clash coverage. Do not mark the networked candidate "Data Not Collected" without evaluating Supabase operational metadata and hosting logs. No policy publication or App Store setting change is included here.
