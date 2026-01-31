# Decision Log (E-NEXUS eBay)

## 2026-01-31: Introduce docs/ as AI-first design memory for eBay development

### Context
- eBay integration involves complex external APIs, rate limits, and partial failures.
- AI-generated suggestions tended to:
  - Assume undocumented API behavior
  - Introduce inconsistent patterns across features
  - Drift between E-STEP-TOOL and eBay projects
- Chat-based instructions alone could not preserve long-term decision context.

### Decision
- Introduce `docs/` as the permanent source of truth for AI-assisted development.
- Establish the following documents:
  - `docs/ai-principles.md` — AI behavior and decision discipline
  - `docs/design-rules.md` — eBay-specific engineering rules
  - `docs/decision-log.md` — rationale and historical decisions

### Options Considered
1) Rely on chat history and ad-hoc instructions
- Pros: Fast to start
- Cons: High drift, repeated explanations, inconsistent outputs

2) Centralize everything in README.md
- Pros: Fewer files
- Cons: Mixed concerns, unclear decision history

### Rationale
- Separating principles, rules, and decisions allows AI to:
  - Respect past decisions
  - Avoid re-litigating settled questions
  - Produce stable, predictable outputs across time

### Consequences
- Any new rule, convention, or exception must be logged here.
- Unlogged decisions are treated as non-binding.
- AI suggestions that conflict with docs must be rejected.

### Git Operation
- Changes to `docs/` must be committed separately from application code.

### Status
- Accepted
