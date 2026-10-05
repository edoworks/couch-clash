# Isolated MNF checks

Run from the repository root using existing Node/Playwright and Python. These tests use synthetic browser storage, never an existing user browser profile. They write evidence to `/tmp/couch-mnf-evidence` by default; override `TEST_OUTPUT` if needed. No credentials or real saved games are inputs.

1. `node tests/mnf/logic.mjs`
2. Start `python3 -m http.server 5195 --bind 127.0.0.1` in this repository.
3. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an existing compatible Chromium binary; run `node tests/mnf/browser.mjs`.
4. In a separate shell start `python3 tests/mnf/upgrade-server.py --baseline <clean-public-v4-directory> --candidate . --port 5196`.
5. Run `node tests/mnf/upgrade.mjs`. Restart the fixture server before repeating; its switch state is intentionally in memory.

The upgrade server is a loopback test fixture and is not a production server. GitHub Pages serves static assets only. Browser tests emulate phone sizes; they do not establish physical Safari or native-app behavior.
