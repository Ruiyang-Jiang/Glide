To: security-team@example.com
Subject: Resolution summary for SEC-301, SEC-302, SEC-303, SEC-304

SEC-301 – SSN Storage
- Cause: SSNs were written to SQLite in plaintext and returned to clients unchanged.
- Fix: Added AES-256-GCM encryption for SSNs (`encryptSensitive`) before persistence and removed SSN/password from API responses.
- Prevention: Require encryption for all PII-at-rest using env-provisioned keys; add schema reviews that block storing sensitive identifiers without encryption.

SEC-302 – Insecure Random Numbers
- Cause: Account numbers relied on `Math.random()`, which is predictable and low-entropy.
- Fix: Swapped to a crypto-secure generator (`generateSecureAccountNumber`) with collision checks and bounded retries.
- Prevention: Use vetted cryptographic RNGs for identifiers; lint/block usage of `Math.random()` in security-sensitive contexts.

SEC-303 – XSS Vulnerability
- Cause: Transaction descriptions rendered with `dangerouslySetInnerHTML`, allowing stored XSS if HTML reached the UI.
- Fix: Removed raw HTML rendering and sanitize descriptions before storage/display (`sanitizeTransactionDescription`).
- Prevention: Disallow `dangerouslySetInnerHTML` in reviews; funnel user-supplied display strings through a sanitizer utility.

SEC-304 – Session Management
- Cause: Logins created additional session records without invalidating previous tokens, enabling multiple valid sessions.
- Fix: Login/signup now clear existing sessions for the user before issuing a single new session token.
- Prevention: Standardize session issuance via a helper that revokes prior tokens; add automated checks for single-session enforcement.

