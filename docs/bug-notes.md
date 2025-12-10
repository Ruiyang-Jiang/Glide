## UI-101: Dark Mode Text Visibility
- Cause: Inputs and page backgrounds used hard-coded light-theme colors; in dark mode the inputs rendered white text on white backgrounds, and page backgrounds stayed dark regardless of the selected theme.
- Fix: Centralized theme CSS variables for light/dark in `app/globals.css`, ensured inputs use those variables, and added a theme-sync script in `app/layout.tsx` that respects the chosen theme instead of forcing system dark.
- Prevention: Keep all theme colors in variables; avoid hard-coded colors in components; add a quick manual check for both themes when touching shared styles.

## VAL-201: Email Validation Problems
- Cause: Email fields used basic regex/Zod `.email()` and server `.toLowerCase()`, allowing common typos like `.con` and silently lowercasing addresses without telling users. Uniqueness checks were case-sensitive against stored lowercased values.
- Fix: Added `validateEmailFormat` with typo detection and hooked it into signup/login forms; updated server schema to refine emails, stop unconditional lowercasing, and perform case-insensitive lookups to prevent duplicates while preserving user casing.
- Prevention: Centralize validation helpers and reuse on both client/server; include negative cases (common typos) in regression tests; avoid silent mutations of user data—normalize only for comparisons, not storage.

## How to Test
- Email validation: `npm run test:email` (runs `tests/emailValidation.test.ts` via tsx).
- Manual UI sanity: toggle light/dark and verify form fields show contrasting text/backgrounds, then attempt emails like `person@example.con` (blocked) and `User@Example.com` (allowed, preserved).***
