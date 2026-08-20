---
date: 2026-07-08T16:45:00-0700
author: Yonie
commit: f0e1d2c
branch: feature/user-auth-redesign
repository: backend
topic: "User Auth Redesign - Handoff"
tags: [handoff]
status: complete
last_updated: 2026-07-08T16:45:00-0700
last_updated_by: Yonie
type: handoff
---

# Agent Handoff: User Auth Redesign — Switch from JWT to Session Tokens

## Active Goal

Replace the existing JWT-based authentication backend with server-managed session tokens. The backend issues a `session_token` on login, stores it in a `sessions` table, and validates it on each request. The `/connect/start` and `/jobs/*` routes must use the new session middleware.

- FRD: `~/Documents/Github/plan-server/projects/KodaProject/frd/2026-07-06_10-00-00_user-auth-redesign.md`
- Plan: `~/Documents/Github/plan-server/projects/KodaProject/plans/2026-07-07_14-00-00_session-auth-plan.mdx`
- ADR: `~/Documents/Github/plan-server/projects/KodaProject/adr/2026-07-08_16-30-00_Session-token-over-JWT.md`

## Current State

- **What works:** Session token generation on `POST /connect/start` returns `{session_token}`. Session validation middleware on `/jobs/*` rejects unauthenticated requests with 401. `sessions` table in Postgres created with `(id UUID PK, user_id UUID FK, token_hash TEXT NOT NULL, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ)`.
- **What is incomplete:** Session rotation on logout is stubbed (returns 200 but does not invalidate). Session expiry cron job is not implemented. The middleware does not refresh expiry on use (sessions expire at fixed time regardless of activity).
- **What is broken:** `/connect/start` returns 500 when the Supabase connection is slow (timeout during token hash insert). No retry or timeout handling.
- **What has been verified:** `cargo test -p koda-backend` — 156 passed, 1 known failure (session rotation test is stubbed). Manual auth flow verified: login returns session token, subsequent requests with the token pass middleware, requests without token return 401.
- **Assumed but not verified:** Session expiry cron works (not implemented). Token hash is collision-resistant (uses SHA-256; no collision test written).

## Latest User Intent

The user originally asked to "fix auth" — the first assumption was JWT refresh token rotation. After discussion, the user corrected:

- **Original intent (superseded):** "Fix JWT token refresh — add refresh tokens and rotation."
- **User correction:** "No, I want to move away from JWT entirely. Use server-side session tokens like a standard web app. JWTs are overcomplicated for our use case and we can't revoke them."
- **Active intent:** Replace JWT auth with server-managed session tokens. Backend issues opaque tokens, stores salted hash in Postgres, validates on each request. No JWT in the new auth path. The old JWT code should be removed, not left as a fallback.

## Locked Decisions

- **Decision:** Opaque session tokens (UUIDv4 + SHA-256 hash in DB), not JWTs.
  - **Why:** User explicitly overruled JWT. Opaque tokens are revocable, simpler, and don't need key rotation.
  - **Constraint:** Remove all JWT code from the auth path. Do not keep JWT as a fallback.
- **Decision:** Store `token_hash` (SHA-256 of the raw token), never the raw token.
  - **Why:** DB leak does not expose active sessions.
  - **Constraint:** Hash comparison must be constant-time (`subtle` crate or manual comparison).
- **Decision:** Sessions expire after 24h fixed window, sliding expiry deferred.
  - **Why:** Simpler implementation; the user accepted that sessions expire regardless of activity for the MVP.
  - **Constraint:** Must implement the expiry cron before shipping.
- **Decision:** Session table uses `(id, user_id, token_hash, expires_at, created_at)` — no `last_used_at` or device metadata.
  - **Why:** Minimum viable session for the backend. Mobile-specific fields can be added later.
  - **Constraint:** The session middleware must not add latency for unused fields.

## Do Not Repeat

- **JWT refresh token rotation** — The user explicitly rejected JWT. Do not add refresh tokens, rotate keys, or keep JWT code.
- **JWT-as-fallback auth** — The user said "remove the old JWT code, don't leave it inactive." Do not keep `#[allow(dead_code)]` JWT functions.
- **Device metadata in sessions table** — The user wants sessions minimal. Not rejected permanently, but defer.
- **Redis session store** — The user confirmed Postgres is fine for MVP traffic. Revisit only if latency becomes a problem.
- **Session token in URL query params** — The user said header-only (`Authorization: Session <token>`), never in URLs.
- **Self-invalidating tokens on logout without DB write** — Not possible with opaque tokens. Must hit the DB.

## Work Completed

### Session token generation endpoint

**What changed:** Replaced JWT generation in `POST /connect/start` with `POST /auth/session` that creates a session row and returns `{session_token}`.
**Why:** Core session auth flow.
**Files:** `backend/src/auth/session.rs` (new), `backend/src/routes/auth.rs:24-45` (modified)
**Verification:** Manual test: `curl -X POST /auth/session` returns 200 with `session_token`. Invalid credentials return 401.

### Session validation middleware

**What changed:** Created `SessionAuthLayer` that reads `Authorization: Session <token>` header, hashes it, looks up in DB, and rejects if missing/expired. Applied to `/jobs/*` routes.
**Why:** Protected routes need session check.
**Files:** `backend/src/middleware/session_auth.rs` (new)
**Verification:** `cargo test` — middleware rejects unauthenticated requests. Authenticated requests with valid token pass through.

### `sessions` table migration

**What changed:** Created SQL migration `20260706_create_sessions.sql` with `sessions(id UUID PK, user_id UUID FK, token_hash TEXT, expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ)`. Added unique index on `token_hash`.
**Why:** Session persistence.
**Files:** `backend/migrations/20260706_create_sessions.sql` (new)
**Verification:** `cargo test` — migration applies cleanly, rollback works.

### JWT code removal

**What changed:** Deleted `backend/src/auth/jwt.rs`. Removed `jsonwebtoken` crate dependency. Removed `JWT_SECRET` env var. Removed all `use` statements referencing JWT types. Removed JWT generation from auth routes.
**Why:** User explicitly rejected JWT; dead code would confuse future maintenance.
**Files:** `backend/src/auth/jwt.rs` (deleted), `backend/Cargo.toml` (modified), `backend/src/auth/mod.rs` (modified), `backend/src/routes/auth.rs` (modified)
**Verification:** `cargo build` succeeds. `cargo test` — no references to JWT. `grep -r "jsonwebtoken" backend/` returns nothing.

## Relevant Files

### `backend/src/auth/session.rs`
**Status:** Created
**Role:** Session token generation, hashing, and DB persistence.
**Changes:** New file — `create_session()`, `validate_session()`, `hash_token()`.
**Next use:** Add session rotation on logout.

### `backend/src/middleware/session_auth.rs`
**Status:** Created
**Role:** Tower middleware extracting and validating `Authorization: Session <token>` header.
**Changes:** New file.
**Next use:** No further changes expected.

### `backend/src/routes/auth.rs:24-45`
**Status:** Modified
**Role:** Auth route handlers — login, logout, session creation.
**Changes:** Replaced JWT generation with `create_session()` call.
**Next use:** Add `POST /auth/logout` body that calls `invalidate_session()`.

### `backend/src/auth/jwt.rs`
**Status:** Deleted
**Role:** Former JWT generation and validation (removed).
**Changes:** Entire file removed.
**Next use:** None — do not recreate.

### `backend/Cargo.toml`
**Status:** Modified
**Role:** Dependencies.
**Changes:** Removed `jsonwebtoken` crate.
**Next use:** No further changes expected.

### `backend/migrations/20260706_create_sessions.sql`
**Status:** Created
**Role:** Database migration.
**Changes:** New file.
**Next use:** No further changes expected.

## Remaining Work

### Task 1: Implement session rotation on logout

**Objective:** `POST /auth/logout` reads the session token from the `Authorization` header, deletes the session row from DB, and returns 200. Must be idempotent (already-invalidated session returns 200).
**Files:** `backend/src/auth/session.rs`, `backend/src/routes/auth.rs`
**Depends on:** None
**Notes:** Use `DELETE FROM sessions WHERE token_hash = $1`. Return 200 regardless of whether a row was deleted. Add test: logout then request with same token returns 401.
**Verify:** `cargo test -p koda-backend` — new test `logout_invalidates_session` passes.
**Done when:** Known-failing test `session_rotation_on_logout` passes.

### Task 2: Implement session expiry cron

**Objective:** Background task that runs every 5 minutes and `DELETE FROM sessions WHERE expires_at < NOW()`. Wire into the tokio runtime in `main.rs`.
**Files:** `backend/src/main.rs`, `backend/src/auth/session.rs`
**Depends on:** None
**Notes:** Use `tokio::spawn` with `tokio::time::interval`. Log count of expired sessions deleted. Add integration test that creates an expired session and confirms it's cleaned up.
**Verify:** `cargo test -p koda-backend` — new cron test passes. Running server logs cleanup counts.
**Done when:** Expired sessions are removed within 5 minutes of expiry.

### Task 3: Fix `/connect/start` timeout-on-slow-DB

**Objective:** Add a 5s timeout to the session token hash insert. If the DB is slow, return 503 instead of 500. Use `tokio::time::timeout`.
**Files:** `backend/src/auth/session.rs:create_session()`
**Depends on:** None
**Notes:** Wrap the DB insert in `tokio::time::timeout(Duration::from_secs(5), …)`. On timeout, log warning and return `AuthError::DbTimeout`.
**Verify:** Manual test with slow DB or unit test with mocked delay confirms 503.
**Done when:** Timeout returns 503 instead of hanging or raw 500.

## Resume Here

> Open `backend/src/auth/session.rs` and implement `invalidate_session(token_hash)` (Task 1). Then add the `POST /auth/logout` route handler in `backend/src/routes/auth.rs`. After implementing, run `cargo test -p koda-backend` and verify the previously-failing `session_rotation_on_logout` test passes. Then proceed to Task 2 (expiry cron).

## Open Questions or Blockers

- **Question:** Should the session token be a raw UUIDv4 or a base64-encoded 256-bit random value?
- **Why it matters:** UUIDv4 is 128 bits (easier to guess), base64-256 is stronger. User preference unknown.
- **Default:** Use UUIDv4 (simpler, matches existing ID patterns in the codebase). Upgrade to 256-bit if security review requires it.
- **Blocked:** No — UUIDv4 is acceptable for MVP.

## Verification Status

- Tests passed: 156 passed (`cargo test -p koda-backend`). Session generation, validation, middleware rejection, migration apply/rollback.
- Tests failed: 1 — `session_rotation_on_logout` is stubbed and expects `DELETE` behavior.
- Commands run: `cargo build`, `cargo test`, `cargo clippy`. Manual curl tests against local backend.
- Manual checks: Login → receive session token. Authenticated request → 200. No-token request → 401.
- Unverified: Session rotation (not implemented). Expiry cron (not implemented). Timeout behavior (not implemented).

## Success Criteria

- [ ] `POST /auth/logout` invalidates the session token (known-failing test passes).
- [ ] Expired sessions are cleaned up by the cron task.
- [ ] Slow DB returns 503 instead of 500.
- [ ] All JWT code is removed — no references remain.
- [ ] All unit tests pass (159/159).
- [ ] Manual e2e: login → use → logout → use (gets 401).
