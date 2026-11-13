---
applyTo: "frontend/src/**,backend_py/**,backend_go/**,docs/WEBVIZ_CHANGELOG.md"
excludeAgent: "coding-agent"
description: "Use when reviewing a PR to check whether it needs a user-facing entry in docs/WEBVIZ_CHANGELOG.md, and whether the entry is correct."
---

# User-facing changelog

`docs/WEBVIZ_CHANGELOG.md` is shown to end users in the app (changelog modal on the start page). It is read by geoscientists and reservoir engineers, not developers.

## When an entry is required

Flag a missing entry when the PR changes something a user can see or notice, e.g.:

- New module, view, layer, setting, option, button or workflow.
- Changed behavior, defaults, layout, naming or interaction of existing UI.
- Fixed bug a user could have run into (wrong data, crash, broken loading of sessions, missing visualization, etc.).
- Backend changes that alter returned data, supported data sources or performance in a noticeable way.
- Removed or renamed functionality, or changes that affect previously saved sessions/settings.

## Do not flag

- Refactoring, internal API changes, tests, CI, tooling, dependency bumps, type fixes and code style without user-visible effect.
- Fixes of bugs that were introduced and fixed within the same unreleased month (no user saw them).
- Developer documentation.
- The `changelog_counter` / `date` metadata at the top of the file; it is maintained at release.

## Entry requirements

- **Section by month**: The entry belongs under the `## <Month YYYY>` heading of the month the PR is merged (normally the current month). If that heading does not exist, it should be added at the top, above the previous month. Flag entries added to an older month.
- **Section by type**: Under the month, use exactly one of `### Added` (new functionality), `### Changed` (changed behavior of existing functionality) or `### Fixed` (bug fixes). Flag entries in the wrong type, e.g. a bug fix under "Changed" or a new setting under "Fixed". Don't create a duplicate type heading if one exists for the month.
- **Format**: `- **<Area>**: <Description>`, where `<Area>` is the module or feature name as shown in the UI (e.g. "Simulation Time Series", "2D, 3D and Intersection viewers", "In-place volumes").
- **Short and precise**: Usually one or two sentences. Describe what the user can now do or what is different, not how it was implemented. Mention the consequence of a fix rather than its cause.
- **Comprehensible to users**: No code identifiers, class/file/function names, internal terms (e.g. "provider", "atom", "DPF", "serializer", "endpoint") or PR/issue numbers. Use the terms the UI uses. Mention required user action if any (e.g. settings in older sessions that must be re-selected).
- **One entry per change**: Don't split a single change over several bullets or merge unrelated changes into one.

## Review comment format

- Missing entry: state which user-visible change needs one, and suggest the section (month and type) and a draft entry.
- Existing entry: point to the specific problem (wrong month, wrong type, too long, too technical, unclear) and suggest a rewritten entry.
