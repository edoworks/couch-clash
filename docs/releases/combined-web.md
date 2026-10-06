# Combined web release — 2026-10-06

Approved source heads: PR6 `4b54622e91036bd5636fce9d5a8ddd17f885041d`, PR7 `a2d6d65fc4e93158c451fc17bfd17ca6d75d4e86`, PR8 `c7b211e1e78f5f4a0ac10b89ca72b124c27d0cec`.

The landing page includes both the host-defined game entry and read-only scoreboard. The service worker caches the union of their assets, retains manual route canonicalization, and uses a new combined cache version. Cross-origin score requests remain outside its cache. Those are the only conflict resolutions; approved manual runtime, official fixture, legacy runtime and six deployed backend files remain byte-identical to their reviewed heads.

Combined checks passed: four definition tests; complete manual browser suite; 320px long-label/erase acknowledgement checks; original official/legacy full browser regression; scoreboard mock browser regression. Mobile 390×844 and 320×740, reduced motion, keyboard, full scoring, shared ties, save isolation, reload, missing picks, locks, quota failure, tamper recovery and offline routes are covered by those suites. Candidate provider/CORS evidence remains in the PR8 review record; production verification is a separate release step.

This release contains no player-context cards and does not change native build 4. No backend migration or test bootstrap is executed by this web publication. The existing deployed scores function remains owned by the connected-Supabase operator.

## Existing-worker correction

Production upgrade testing found a real browser HTTP-cache interaction: installing the new CacheStorage namespace could reuse still-fresh old landing HTML, and the network-first fetch could also return HTTP-cached HTML. The v2 worker uses `cache: reload` during asset installation and `cache: no-store` for runtime network attempts, falling back to its versioned CacheStorage only on network failure. It does not clear localStorage or old cache namespaces.

A deterministic regression seeds the previously released worker and old HTML with a one-hour HTTP cache lifetime, switches to the candidate, waits for installation/control, and verifies the new landing and manual route offline with saved storage preserved. This passes, as do both complete official/legacy and host-defined gameplay browser suites after the worker change. No application/backend runtime is changed by this correction.
