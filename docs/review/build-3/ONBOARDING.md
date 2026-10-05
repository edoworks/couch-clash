# Fresh-machine and multi-assistant onboarding

This guide assumes no prior checkout, login, local files, credentials or configured machine. Each assistant must establish its own available tools and accessible revision. It is not permission to publish, provision accounts or access another person's machine.

## 1. Identify the repository and exact task revision

Public repository: https://github.com/edoworks/couch-clash

The read-only inspection on 2026-10-05 observed `main` at `2ddd9f3a55809c786e6970a3d3bc180826267cbe`. Root entries were `.nojekyll`, `app.js`, `icons/`, `index.html`, `manifest.webmanifest`, `style.css` and `sw.js`. `index.html` references local CSS, JavaScript, manifest and icons. There was no root README, package manifest, test directory, native project or backend source in that inspected tree. This is the public static-web baseline, not a proven build-3 native snapshot. Recheck the current revision; do not assume that `main` has remained unchanged.

Read these review documents on the assigned review branch. They may not be on `main`. Obtain the exact branch and commit from the task owner or verified pull request, then record them in your task claim. Do not guess a branch name or silently substitute a different revision.

## 2. Establish local prerequisites

For static-web inspection, use a machine with Git, Python 3 and a browser. No Node package installation, Apple login, backend login, Docker, signing material or environment secrets are required by the inspected static tree. Install missing tools only through an authorized official route; do not assume package managers or administrator access.

Inspect the versions actually available:

```sh
git --version
python3 --version
```

These commands and Python's `http.server --bind` option were checked in the preparation environment with Git 2.52.0 and Python 3.12.14. Those observations are not minimum-version requirements or a guarantee about another machine. A full fresh-machine clone/browser run was not performed while preparing this document.

Use a new directory under your own chosen workspace:

```sh
git clone https://github.com/edoworks/couch-clash.git
cd couch-clash
git remote -v
git fetch origin
git status --short
git log -1 --format=%H
```

The public repository URL and baseline were verified through a read-only repository API. The clone sequence uses standard Git commands; network access and transport behavior must be verified on the executing machine. Public reads should not require a personal access token. If a login is requested, verify the destination and access policy rather than copying credentials from another assistant.

After obtaining the assigned branch and commit, check out that exact branch and verify `git log -1 --format=%H` against the task record. Read any repository instructions present at that revision. Inspect tracked files with:

```sh
git ls-files
```

If the intended revision cannot be fetched or its SHA differs, stop dependent work and report the discrepancy. Do not reset or overwrite a checkout containing someone else's changes.

## 3. Preview the verified static-web baseline

From the repository root, after confirming that the expected static files are present:

```sh
python3 -m http.server 5195 --bind 127.0.0.1
```

Open `http://127.0.0.1:5195/` in a browser on that same machine. Stop the server with Ctrl+C when done. Binding to loopback avoids exposing the working directory to the local network. A remote/cloud machine may require an already authorized preview route; its loopback address is not automatically reachable from your own phone or browser.

This is a standard-library static preview, not a build/test command. Do not claim that serving files proves gameplay, native equivalence or acceptance. No `npm install`, `npm test`, Xcode build or Docker command is specified because an applicable manifest/project/configuration was not present in the inspected baseline. If later revisions include them, inspect their actual instructions and dependency declarations before selecting commands.

Use a fresh browser profile or isolated test origin for validation; existing service-worker caches and saved games can affect results. Never erase personal browser data to make a test pass. Record browser/version, revision, test data and cache/storage conditions. Browser emulation is not physical-device acceptance.

## 4. Claim work before editing

Maintain one shared task record per task in the repository's agreed issue/PR/task-tracking location. If none exists or you cannot write it, have the task owner record the claim before overlapping edits begin. A private local note is not a shared lock.

Required claim fields:

- Task identifier and concrete outcome
- Owner: one responsible assistant/person identifier
- Branch and base commit SHA
- Allowed scope: files/components and actions
- Status: proposed, claimed, active, blocked, review, done or handed off
- Last checkpoint: timestamp, commit SHA, completed checks and next step
- Lease: explicit UTC expiry agreed with the task owner, plus renewal/checkpoint time
- Dependencies and known conflicting tasks
- Handover recipient and acknowledgement, when applicable

One writer owns a task at a time. Separate assistants may work concurrently on independent tasks using separate branches and checkouts. Agree on ownership before two tasks touch shared files. A branch name alone is not a lock. Before claiming or resuming, reread the current record and acknowledge the existing owner; racing claims must be resolved by the task owner before edits continue.

Update the checkpoint before going offline or handing off. Lease expiry signals a need to reconcile ownership; it does not authorize deleting work, force-pushing or automatically taking over. Preserve the last commit and uncommitted-change summary. A successor explicitly accepts the handover, verifies the revision and receives the scope and test state before writing. The former owner stops writing once the handover is accepted. Without an available shared coordination channel, restrict activity to non-overlapping read-only inspection.

An engagement/product review is already being handled separately. Do not restart it, replace its conclusions or overwrite its task claim. Documentation recovery, source recovery, implementation and independent review are distinct scopes; coordinate their dependencies without duplicating the existing review.

## 5. Missing-source and environment gates

Native build-3 review remains blocked on the exact source snapshot, release state/upload receipt, verification/readback records, submitted IPA and native test bundles described in `EVIDENCE-STATUS.md`. Do not copy prototype or public-web assets over a native project to manufacture a matching build.

Native work requires the actual native project, its supported macOS/Xcode/SDK versions, simulator/device targets and documented build steps. Those prerequisites and versions have not been verified from the available public baseline. Signing and distribution additionally require specifically authorized accounts, certificates/profiles and permissions; never commit or circulate them in this public repository.

Backend/shared-room work requires the actual backend source, dependency declarations, schema/migrations, configuration contract and test instructions. Whether Docker, a backend CLI or other runtime is required, and their supported versions, remains unverified. Do not invent a Docker setup, create a service project, generate credentials, or treat placeholder identities as production authentication.

For any missing prerequisite, record the exact missing artifact/tool/permission and continue only work that does not depend on it. Another assistant's configured machine is not evidence that yours is ready.

## 6. Review and release checkpoints

Before declaring a task ready, record the exact commit, changed-file scope, checks run with results, checks not run and why, remaining evidence gaps, and the next owner/action. A documentation-only change has no app test pass by implication. Compare runtime file changes against the claimed scope.

Repository write identity and destination must be explicitly authorized. An approved documentation review branch does not authorize merging, modifying deployment settings, publishing web changes, backend deployment or another native upload. Keep the work reviewable and do not force-push over another owner. After an authorized push, verify the remote commit and link that exact revision. Hand off with the shared task record and a concise evidence summary, without private machine paths, credentials or personal data.
