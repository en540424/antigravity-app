
---

# C) 共通の変更管理ルール（decision-log 追記用：E-NEXUS版）

> 目的：E-STEP / E-NEXUS どっちでも **同じ「変更の進め方」**で回し、AIのブレと混線を止める。

`docs/decision-log.md` の末尾に **このエントリを追記**してOK。

```md
## 2026-01-31: Cross-project change management rules (E-STEP + E-NEXUS)

### Context
- Multiple AI assistants (Claude, OpenAI, Copilot) are used across multiple repositories.
- Without a shared change management contract, outputs drift:
  - inconsistent conventions
  - unexpected refactors
  - accidental overwrites
  - unclear review boundaries

### Decision
Adopt a shared change management process across projects:

1) **Small commits, single purpose**
- 1 commit = 1 intent (reviewable unit)

2) **No mixing docs and app changes**
- docs-only commits are separate from application code commits

3) **Diff-first workflow**
- Always propose diff first
- Human confirms before applying changes
- No silent multi-file edits

4) **Rule/exception logging**
- New conventions or exceptions must be recorded in decision-log
  BEFORE implementation

5) **One project per VS Code window**
- Avoid opening multiple repos in the same workspace to prevent instruction mixing

### Options considered
1) Ad-hoc changes without formal process
- Pros: Fast
- Cons: Drift, hard rollback, repeated rework

2) Single global ruleset only
- Pros: Simple
- Cons: Project-specific constraints are lost

### Rationale
- Small, intentional diffs reduce risk and increase review speed.
- Separating docs and code commits preserves traceability and rollback safety.
- Logging decisions prevents repeated debates and AI drift.

### Consequences
- Any change violating these rules must be treated as invalid and redone.
- If a change requires an exception, record it first in decision-log.
- Cross-project consistency improves over time without forcing identical architectures.

### Status
- Accepted
