# Product and platform boundaries

## Scope and current limits

Existing web product and separately referenced native Build 3. This repository audit does not establish the current native submission state or inspect its separate source.

Versioned fixture definitions and scoring semantics are authoritative for each match. Browser UI/storage and provider observation transport are adapters. Preserve immutable saved definition snapshots, explicit outcome confirmation and legacy store bytes.

## Review gaps

The guard covers fixture definitions only. App orchestration still mixes behavior and browser effects; native source parity is unverified. Live provider observations must not silently rewrite confirmed local outcomes.

## Shared workflow and automated check

Use the [platform-boundaries skill](https://github.com/foculoom/aiartifacts/blob/98b08b84c1c807277be67f2f8ab28aefc7658b23/plugins/engineering/skills/platform-boundaries/SKILL.md) at source revision `98b08b84c1c807277be67f2f8ab28aefc7658b23`. It defines inward dependencies, stable behavior, versioned saves, adapter failure tests, packaging evidence and reviewed PRs. Keep product-specific decisions here. This source adoption does not change release tags or store submissions.

From a local checkout of that pinned shared repository, run:

```sh
python3 /path/to/aiartifacts/plugins/engineering/skills/platform-boundaries/scripts/check_boundaries.py --root . --profile architecture.json
```

Replace `/path/to/aiartifacts` with the actual checkout path. The command requires Python 3.10+ and no network or product imports. It is suitable for local agent automation and existing authorized CI. No hosted workflow or paid runner is added here. The profile is deliberately bounded; `review_only` means no source files were checked. A lexical pass is not a dependency-graph, security, device or store-readiness certification.

Use the repository manual, MNF, scoreboard and release tests for affected behavior. Verify offline service-worker upgrade, saved snapshots and legacy preservation when changing delivery; native packaging needs its own exact-source evidence.

## Change and submission review

For each platform change, identify the core behavior that must remain stable and the adapter differences that are intentional. Add contract/failure tests where behavior changes. Keep secrets and store-specific identifiers outside domain rules. Preserve legitimate native UI, accessibility and lifecycle differences. A port can justify a core change, but that change needs an explicit product decision and regression evidence.

Use a feature branch and PR for every source change. Review the complete current diff and relevant evidence; record whether review is independent. Resolve major issues and required checks/reviews before merging the exact reviewed head. New commits require renewed review. Do not bypass protection or push directly to the default branch. Existing stricter release/ownership rules remain in force.

At submission or resubmission, record source revision, package identity/hash, platform-specific verification, unresolved limitations and the owning release decision. A submission, approval and public release are separate states. Existing submitted builds retain their evidence; this policy alone is not a reason to replace them.
