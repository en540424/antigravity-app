# Design / Engineering Rules (E-NEXUS eBay)

## Global Principles (Non-negotiable)
- This project integrates with eBay APIs and must follow eBay platform constraints.
- This is a business-critical system; predictability > cleverness.
- Avoid magic numbers. All constants must be named and documented.
- Business logic must be separated from UI and external API adapters.
- Existing rules and decisions in `docs/` override any AI suggestion.

---

## eBay Integration Rules
- Treat eBay APIs as unreliable external systems.
- Always handle:
  - Network errors
  - Partial failures
  - Rate limits
- Do not assume undocumented fields or behavior.
- All eBay API calls must be isolated behind adapter functions/modules.

---

## Data / State Rules
- Database column names use `snake_case`.
- Frontend and backend types must use `snake_case` consistently.
- Never mutate API response objects directly.
- Persist operations must use partial updates.
  - Do NOT overwrite existing values with `null`, `undefined`, or empty strings
    unless explicitly confirmed by the user.

---

## SKU / Inventory Rules
- SKU is the primary identifier and must be immutable once published.
- Any SKU generation or transformation logic must be deterministic.
- Inventory updates must be idempotent.
- Never auto-correct SKU or inventory values silently.

---

## Server / Client Boundary
- eBay API calls, authentication, and validation must occur server-side.
- Client components are responsible only for:
  - User interaction
  - Local UI state
- Do not add `"use client"` unless strictly required.

---

## API / Validation Rules
- Validate all external input at the boundary.
- Validation errors return 4xx responses.
- External service failures return 5xx responses.
- API response shape must be consistent:
  - Success: `{ ok: true, data: ... }`
  - Error: `{ ok: false, error: { code, message } }`
- Do not leak raw eBay error payloads directly to the client.

---

## Logging / Auditing
- Log at minimum:
  - Who (system/user)
  - Action
  - Affected SKU / Listing ID
  - Result
- Do not log tokens, cookies, or personal buyer data.
- Logs must be sufficient for post-incident analysis.

---

## Testing / Safety
- Keep commits small and purpose-focused.
- Do not mix UI changes and logic changes in the same commit.
- Critical logic (pricing, inventory sync, fees) must be implemented as pure functions.
- Pure functions should be testable and diff-friendly.

---

## Exceptions
- Any exception to these rules must be recorded in `docs/decision-log.md`
  BEFORE implementation.
