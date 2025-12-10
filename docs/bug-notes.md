## UI-101: Dark Mode Text Visibility
- Cause: Inputs and backgrounds had hard-coded light-theme colors, so dark mode showed white text on white inputs and inconsistent backgrounds.
- Fix: Centralized light/dark CSS variables in `app/globals.css`, applied them to inputs, and added a theme-sync script in `app/layout.tsx` that respects the chosen theme.
- Prevention: Keep colors in variables, avoid hard-coded theme colors, and manually check both themes when touching shared styles.

## VAL-201: Email Validation Problems
- Cause: Basic regex/Zod `.email()` plus server `.toLowerCase()` let `.con` typos through and silently lowercased addresses; uniqueness checks were case-sensitive against lowercased storage.
- Fix: Added `validateEmailFormat` (format + `.con` detection) used on client/server; server now validates without silent lowercasing and does case-insensitive lookups while preserving original casing.
- Prevention: Centralize validators and reuse on client/server; include negative typo cases in tests; avoid silently mutating user data—normalize only for comparisons.

## VAL-202: Date of Birth Validation
- Cause: DOB accepted any string, including future dates and under-18 ages.
- Fix: Added `validateDateOfBirth` to enforce YYYY-MM-DD, reject future dates, require age ≥ 18, and cap unrealistic ages; wired into client and server schemas.
- Prevention: Validate dates with explicit format and business rules (future/age bounds); share validators across client/server; add boundary tests (future, minor, extreme past).

## VAL-203: State Code Validation
- Cause: Only a length check was used, so invalid codes like "XX" were accepted.
- Fix: Added `validateStateCode` against a vetted US state/DC whitelist and applied it in client and server; still uppercases for storage.
- Prevention: Use whitelist-based validation for constrained enums; avoid length-only checks; keep allowed lists centralized.

## VAL-204: Phone Number Format
- Cause: Loose regex accepted arbitrary digit strings; no E.164 guidance or leading-zero checks.
- Fix: Added `validatePhoneNumber` with cleaned input and E.164-style pattern (8–15 digits, leading digit 1–9, optional +) on client and server.
- Prevention: Normalize before validating; align with E.164 for international numbers; add regression tests for too-short, non-digit, and leading-zero cases.

## VAL-205: Zero Amount Funding
- Cause: Client min check allowed 0.00; server only required positive number but still accepted borderline cases from parsing.
- Fix: `validateAmount` enforces $0.01–$10,000 on client/server for funding.
- Prevention: Keep shared validators for numeric ranges; include boundary tests for 0 and max limits.

## VAL-206: Card Number Validation
- Cause: Only length/prefix checks; invalid card numbers passed.
- Fix: Added Luhn-based `validateCardNumber` (13–19 digits) on client/server.
- Prevention: Use checksum validations for PANs; centralize card validation helper and tests.

## VAL-207: Routing Number Optional
- Cause: Server schema allowed missing routing for bank transfers.
- Fix: Funding validator now requires routing number and validates it as 9 digits when type is bank.
- Prevention: Use conditional validation per funding type; add regression cases for missing routing.

## VAL-208: Weak Password Requirements
- Cause: Server only enforced length; client checks were minimal.
- Fix: `validatePassword` requires ≥12 chars with upper/lower/number/symbol; applied on client and server.
- Prevention: Keep password rules centralized; test multiple failure modes (length, character classes).

## VAL-209: Amount Input Issues
- Cause: Amounts with multiple leading zeros were accepted, creating confusing displays.
- Fix: `validateAmount` now rejects leading-zero formats and enforces $0.01–$10,000 on client/server.
- Prevention: Validate numeric strings against normalized formats in addition to numeric ranges; add boundary/format tests.

## VAL-210: Card Type Detection
- Cause: Only basic prefix checks; many valid card ranges were rejected.
- Fix: Card validation now detects major brands (Visa/MC/Amex/Discover/JCB/Diners) with length/prefix rules plus Luhn.
- Prevention: Maintain a shared card-brand detector with checksum validation; keep regression tests for representative BINs.

## How to Test
- Automated: `npm run test:validators` (email + identity + payment validators) or `npm run test:email` for email-only.
- Manual UI sanity: toggle light/dark; try invalid inputs like `person@example.con`, DOB `2025-01-01`, state `XX`, phone `12345`—all should be rejected.
