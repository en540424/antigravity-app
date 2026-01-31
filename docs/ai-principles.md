# AI Principles (E-NEXUS eBay)

These principles apply to all AI assistants (Claude, OpenAI, Copilot, others)
working on this repository.

## Core Principles
- Prefer minimal diffs. Do not refactor unrelated code.
- Explain intent before proposing changes.
- Security, data integrity, and compliance take priority over convenience.
- Treat existing behavior as correct unless explicitly changed by decision-log.

## Decision Discipline
- If rules or conventions are unclear, STOP and propose a decision-log draft first.
- Do not introduce new patterns, libraries, or workflows without approval.
- Temporary fixes must be explicitly labeled as temporary.

## Data Safety
- Never expose or log secrets, tokens, cookies, or credentials.
- Do not fabricate API responses, schema, or undocumented behavior.
- When unsure about eBay API behavior, state assumptions clearly.

## Output Discipline
When proposing edits, ALWAYS respond in this order:
1. Summary (what and why)
2. Files to edit (exact paths)
3. Diff (no full files unless requested)
4. Decision-log draft (if rules or exceptions are involved)

These principles override default AI behavior.
