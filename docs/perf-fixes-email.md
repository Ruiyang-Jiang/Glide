PERF-401 – Account Creation Error
- Cause: Account creation returned a fallback stub (balance $100) when a DB fetch failed.
- Fix: Creation now errors if the record cannot be read, eliminating the fake balance; successful accounts return the persisted row.
- Prevention: Avoid fallback objects for critical financial data; require read-after-write checks in code review.

PERF-402 – Logout Issues
- Cause: Logout always returned success regardless of whether a session row was deleted.
- Fix: Logout now checks deletion results and reports "No active session" when nothing was removed.
- Prevention: Use affected-row checks for state-changing operations; add tests that cover both success and no-op cases.

PERF-403 – Session Expiry
- Cause: Sessions remained valid until the exact expiry time, leaving a risk window near expiration.
- Fix: Context validation now treats sessions expiring within 2 minutes as expired and deletes them.
- Prevention: Apply expiry buffers for authentication tokens; add monitoring for near-expiry reuse attempts.

PERF-404 – Transaction Sorting
- Cause: Transactions were returned without deterministic ordering, leading to seemingly random lists.
- Fix: Transactions are now ordered by newest first (createdAt + id).
- Prevention: Require explicit ordering on list endpoints; add tests asserting ordering.

PERF-405 – Missing Transactions
- Cause: Retrieval omitted ordering and used per-row enrichment, which could skip/obscure newer rows.
- Fix: Single ordered query returns all transactions without N+1 lookups.
- Prevention: Prefer single-pass queries for lists; avoid N+1 patterns that can hide results.

PERF-406 – Balance Calculation
- Cause: Balance updates used iterative float math that drifted from the true sum.
- Fix: Deterministic balance update based on the exact deposit amount (no incremental loop).
- Prevention: Use single arithmetic updates; forbid artificial iteration for currency math.

PERF-407 – Performance Degradation
- Cause: N+1 queries in transaction enrichment plus unnecessary loops.
- Fix: Removed N+1 enrichment and redundant loops; queries now fetch ordered results in one call.
- Prevention: Add perf linting/checks for N+1; profile list endpoints with realistic volumes.

PERF-408 – Resource Leak
- Cause: SQLite connections opened but never closed.
- Fix: Track and close all DB connections on exit/SIGINT/SIGTERM via `closeDbConnections`.
- Prevention: Standardize connection lifecycle helpers and require shutdown hooks in DB modules.

