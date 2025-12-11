# Bug Notes

# Ticket Coverage Summary

| Ticket ID | Category      | Priority   | Status   |
|-----------|---------------|------------|----------|
| UI-101    | UI            | Medium     | Fixed    |
| VAL-201   | Validation    | High       | Fixed    |
| VAL-202   | Validation    | Critical   | Fixed    |
| VAL-203   | Validation    | Medium     | Fixed    |
| VAL-204   | Validation    | Medium     | Fixed    |
| VAL-205   | Validation    | High       | Fixed    |
| VAL-206   | Validation    | Critical   | Fixed    |
| VAL-207   | Validation    | High       | Fixed    |
| VAL-208   | Validation    | Critical   | Fixed    |
| VAL-209   | Validation    | Medium     | Fixed    |
| VAL-210   | Validation    | High       | Fixed    |
| SEC-301   | Security      | Critical   | Fixed    |
| SEC-302   | Security      | High       | Fixed    |
| SEC-303   | Security      | Critical   | Fixed    |
| SEC-304   | Security      | High       | Fixed    |
| PERF-401  | Logic         | Critical   | Fixed    |
| PERF-402  | Logic         | Medium     | Fixed    |
| PERF-403  | Security      | High       | Fixed    |
| PERF-404  | Logic         | Medium     | Fixed    |
| PERF-405  | Logic         | Critical   | Fixed    |
| PERF-406  | Logic         | Critical   | Fixed    |
| PERF-407  | Performance   | High       | Fixed    |
| PERF-408  | Performance   | Critical   | Fixed    |

**Total Tickets Fixed: 22 / 22**

Format: Ticket — Cause / Fix / Prevention.

## UI
- UI-101 (Dark Mode Text Visibility)
  - Cause: Inputs/backgrounds were hard-coded for light mode, producing white-on-white text in dark mode.
  - Fix: Centralized light/dark CSS variables in `app/globals.css` (page bg/text, control bg/text/border/placeholder), applied them to all form controls, and synced the selected theme in `app/layout.tsx` so inputs inherit the correct palette.
  - Prevention: Keep colors in variables, avoid hard-coded theme values, and verify both themes when changing shared styles.

## Validation
- VAL-201 (Email Validation Problems)
  - Cause: Basic regex/Zod `.email()` plus server lowercasing let `.con` typos through and silently mutated addresses; uniqueness was case-sensitive against lowercased storage.
  - Fix: `validateEmailFormat` (format + `.con` detection) on client/server; server performs case-insensitive lookup via SQL lower(...) but stores/preserves original casing (no silent lowercasing).
  - Prevention: Centralize validators across tiers; add negative typo cases; avoid mutating user data—normalize only for comparisons.
- VAL-202 (Date of Birth Validation)
  - Cause: Accepted arbitrary strings, including future dates and under-18 ages.
  - Fix: `validateDateOfBirth` enforces strict YYYY-MM-DD parsing, rejects future dates, requires age ≥ 18, and caps unrealistic ages; used identically in client/server schemas.
  - Prevention: Enforce format + business rules; share validators; add boundary tests (future, minor, extreme past).
- VAL-203 (State Code Validation)
  - Cause: Length-only check allowed invalid codes (e.g., "XX").
  - Fix: `validateStateCode` against US state/DC whitelist; still uppercases for storage.
  - Prevention: Use whitelists for constrained enums; avoid length-only checks; keep lists centralized.
- VAL-204 (Phone Number Format)
  - Cause: Loose regex accepted arbitrary digits; no E.164 guidance or leading-zero checks.
  - Fix: `validatePhoneNumber` normalizes whitespace/punctuation then enforces E.164-style pattern (8–15 digits, leading digit 1–9, optional +) on client/server.
  - Prevention: Normalize then validate; align to E.164; add regression cases for short/non-digit/leading-zero inputs.
- VAL-205 (Zero Amount Funding)
  - Cause: Client min check allowed 0.00; server parsing accepted borderline positives.
  - Fix: `validateAmount` enforces $0.01–$10,000 on client/server for funding with numeric and string-format checks.
  - Prevention: Shared validators for numeric ranges; boundary tests for 0 and max.
- VAL-206 (Card Number Validation)
  - Cause: Only length/prefix checks; invalid PANs passed.
  - Fix: Luhn-based `validateCardNumber` (13–19 digits) on client/server with whitespace-tolerant parsing.
  - Prevention: Use checksum validation for PANs; centralize helper + tests.
- VAL-207 (Routing Number Optional)
  - Cause: Server allowed missing routing for bank transfers.
  - Fix: Funding validator requires routing and validates exactly 9 digits when type is bank (conditional Zod refinement).
  - Prevention: Conditional validation per funding type; regression for missing routing.
- VAL-208 (Weak Password Requirements)
  - Cause: Server enforced length only; client checks minimal.
  - Fix: `validatePassword` requires ≥12 chars with upper/lower/number/symbol; trims and validates identically on client/server.
  - Prevention: Centralize password rules; test length and character-class failures.
- VAL-209 (Amount Input Issues)
  - Cause: Leading-zero formats accepted, causing confusing displays.
  - Fix: `validateAmount` rejects leading-zero formats (e.g., 0001.00) and enforces $0.01–$10,000 on client/server.
  - Prevention: Validate string formats as well as ranges; add boundary/format tests.
- VAL-210 (Card Type Detection)
  - Cause: Basic prefix checks rejected valid ranges.
  - Fix: Card validation detects major brands (Visa/MC/Amex/Discover/JCB/Diners) with length/prefix + Luhn, accepting spaces while rejecting invalid BINs.
  - Prevention: Maintain shared brand detector with checksum; test representative BINs.

## Security
- SEC-301 (SSN Storage)
  - Cause: SSNs stored in plaintext and returned to clients.
  - Fix: Encrypt SSNs with AES-256-GCM (`encryptSensitive`) before persistence; strip SSN/password from responses; enforce key via env.
  - Prevention: Enforce PII-at-rest encryption; block schemas/PRs that store identifiers unencrypted.
- SEC-302 (Insecure Random Numbers)
  - Cause: Account numbers used `Math.random()` (predictable, low entropy).
  - Fix: Crypto RNG generator (`generateSecureAccountNumber`) with collision checks and bounded retries; removed `Math.random()` usage.
  - Prevention: Ban `Math.random()` for IDs/tokens; lint/review for crypto RNG.
- SEC-303 (XSS Vulnerability)
  - Cause: Transaction descriptions rendered via `dangerouslySetInnerHTML`.
  - Fix: Sanitize descriptions on write and render as text (`sanitizeTransactionDescription`); removed `dangerouslySetInnerHTML` in UI.
  - Prevention: Disallow raw HTML rendering; funnel user strings through a sanitizer.
- SEC-304 (Session Management)
  - Cause: Logins added sessions without invalidating prior tokens.
  - Fix: Delete existing user sessions before issuing a new one (single active session) in login/signup flows.
  - Prevention: Centralize session issuance with revocation; test single-session enforcement.

## Performance / Logic
- PERF-401 (Account Creation Error)
  - Cause: Returned fallback stub ($100 balance) when DB fetch failed.
  - Fix: Error on fetch failure; return persisted account (balance = 0) after read-after-write.
  - Prevention: No fake data for financial flows; enforce read-after-write checks.
- PERF-402 (Logout Issues)
  - Cause: Reported success regardless of deletion.
  - Fix: Delete by token and report based on affected rows; return “No active session” when nothing removed.
  - Prevention: Require affected-row checks; test success vs no-op.
- PERF-403 (Session Expiry)
  - Cause: Sessions valid until exact expiry.
  - Fix: Treat <2 minutes to expiry as expired and delete session during context creation; also delete on token decode failure.
  - Prevention: Add expiry buffers; monitor near-expiry reuse.
- PERF-404 (Transaction Sorting)
  - Cause: No deterministic ordering.
  - Fix: Order by `createdAt DESC, id DESC` for single fetch and list endpoints.
  - Prevention: Require explicit ordering on list endpoints.
- PERF-405 (Missing Transactions)
  - Cause: Retrieval used per-row enrichment/N+1.
  - Fix: Single ordered query returns all transactions (no per-row enrichment/N+1).
  - Prevention: Prefer single-pass queries; avoid N+1 that can hide data.
- PERF-406 (Balance Calculation)
  - Cause: Iterative float loop drifted from true sum.
  - Fix: Deterministic update `balance + amount` (no iterative float loop).
  - Prevention: Avoid iterative/float loops for currency; use deterministic math.
- PERF-407 (Performance Degradation)
  - Cause: N+1 queries and extra loops.
  - Fix: Removed N+1 enrichment and redundant loops; single ordered query for transactions.
  - Prevention: Perf checks for N+1/unnecessary iterations.
- PERF-408 (Resource Leak)
  - Cause: SQLite connections not closed.
  - Fix: Track and close DB connections on exit/SIGINT/SIGTERM via `closeDbConnections`; connections array includes initial handle.
  - Prevention: Standardize connection lifecycle and shutdown hooks.

## How to Test
- Automated: `npm run test` (runs validators, security, and performance suites) or `npm run test:validators` for validation-only.
- Manual UI sanity: toggle light/dark; verify inputs remain readable; try invalid inputs (`person@example.con`, DOB `2025-01-01`, state `XX`, phone `12345`) to confirm rejection.