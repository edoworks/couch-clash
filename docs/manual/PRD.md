# Host-defined football night — local review candidate

Problem: the delivered build's verified fixture has a fixed kickoff. Reopening that official fixture would permit late competitive picks; a fictional demo alone does not establish lasting usefulness.

Smallest change: add a separate “Host another football game” route with two host-entered team labels. No calendar, invented fixture list, feed, account, room backend or new scoring. A host attests the game has not started, makes the existing three pregame calls with the group, closes remaining cards when play starts, and confirms broadcast outcomes at the breaks. The five questions, 100/200 points, optional pregame boost, 800 maximum, tie handling and overtime scope remain identical.

Rubber-duck review: a custom game is not a verified schedule. Never borrow the official fixture ID, source, kickoff or result labels. Team labels become a frozen per-match definition at start and are persisted with the picks. New setup cannot reinterpret historical option indices. Use a separate storage key; original official and legacy routes remain byte-identical. This is courtesy pass-and-play, not server-enforced anti-cheat; the host must close cards promptly. A separate local route cannot unlock the existing scheduled fixture.

“More fun, less screen” acceptance:

- Two team labels, existing player names, one clear before-kickoff acknowledgement; no date/time entry, account or tutorial wall.
- Three quick pregame calls, two halftime calls, one group recap; no new interaction while watching play.
- Everywhere: Host-defined / schedule unverified / host-reported. Demo remains explicitly fictional.
- Team/question definitions cannot change after starting, including reload, saved recap and a second custom match.
- Missing calls cannot lock; host close turns unfinished cards into skips without changing locked cards. Shared ranks, voids and OT rules stay intact.
- Complete manual game, reload, offline navigation, lock preservation, historical identity, escaped team labels, keyboard/mobile targets, storage failure and reset isolation are tested. Official kickoff closure remains tested.

Delivery boundary: isolated draft branch `feature/host-defined-games` derived from PR5 `be642f6`; no merge, deployment, build or native upload authorized yet. It includes the original official/legacy routes unchanged. Native packaging, privacy/support links and store metadata remain separate gates. See `NATIVE-READINESS.md`. Score integration stays separate and disabled; no dependency on it.
