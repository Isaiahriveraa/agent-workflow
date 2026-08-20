---
date: 2026-07-08T14:30:00-0700
author: Yonie
commit: a1b2c3d
branch: feature/add-rate-limiting
repository: backend
topic: "Add Rate Limiting Middleware - Handoff"
tags: [handoff]
status: complete
last_updated: 2026-07-08T14:30:00-0700
last_updated_by: Yonie
type: handoff
---

# Agent Handoff: Add Rate Limiting Middleware

## Active Goal

Implement an IP-based rate limiter middleware for the Rust backend's HTTP routes. The middleware should apply a default 100 req/min limit and support per-route overrides via an attribute-like annotation.

- Plan: `~/Documents/Github/plan-server/projects/KodaProject/plans/2026-07-07_09-00-00_rate-limiting.mdx`

## Current State

- **What works:** Middleware skeleton compiles. In-memory sliding-window counter stores state in a `HashMap<SocketAddr, Vec<Instant>>`. The `RateLimit` derive macro parses `#[rate_limit(max = N, window_secs = M)]` on route handlers. Request pipeline integration is complete: `RateLimiterLayer` composes with existing `tower::ServiceBuilder`.
- **What is incomplete:** Cleanup task to evict stale entries from the counter map (currently grows unbounded). No e2e smoke test against the running server.
- **What is broken:** None known.
- **What has been verified:** Unit tests pass for:
  - Under-limit requests proceed (200).
  - Over-limit requests return 429.
  - Per-route override via attribute picks the right limit.
  - `cargo test -p koda-backend` — 142 passed, 0 failed.
- **Assumed but not verified:** The eviction task is not yet implemented; production run over hours will leak memory.

## Latest User Intent

Add rate limiting to the public API routes to prevent abuse before the mobile launch.

- **Active intent:** Ship rate limiting with in-memory state, deferring Redis until traffic proves the need. Use a tower-based middleware approach, not a reverse-proxy add-on.
- **Earlier idea rejected:** Putting rate limiting in nginx/Caddy was considered. Rejected because we need per-route awareness in code (some routes like `/connect/start` need different limits than `/jobs/{id}`). The annotation approach was confirmed.

## Locked Decisions

- **Decision:** Use `tower::Layer` + `tower::Service` middleware rather than a reverse-proxy.
  - **Why:** Per-route awareness in Rust code; limits vary by route semantics; nginx would need to parse our paths.
  - **Constraint:** Middleware must be tested with `tower::ServiceBuilder` in unit tests, not only integration tests.
- **Decision:** In-memory sliding window, not Redis or external store.
  - **Why:** No Redis in dev, mobile launch traffic is low, avoids infra dependency.
  - **Constraint:** Must add stale-entry eviction before shipping.
- **Decision:** Derive-macro annotation `#[rate_limit(max = 100, window_secs = 60)]` on handler functions.
  - **Why:** Keeps the limit declaration next to the route; no separate config file to drift.
  - **Constraint:** The macro emits a constant; the middleware reads it at layer construction time.

## Do Not Repeat

- **Reverse-proxy rate limiting** — Does not give per-route control in code. Our routes have different sensitivity; a global nginx limit would be too restrictive for `/jobs/{id}` and too permissive for `/connect/start`.
- **Redis-backed limiter** — Premature for current traffic. Not rejected permanently, but don't implement now.
- **Global middleware with one limit for all routes** — The user specifically wants per-route annotations.

## Work Completed

### RateLimiter middleware struct

**What changed:** Created `RateLimiter<S>` implementing `tower::Service`, backed by `SharedSlidingWindow` (Arc<RwLock<HashMap<SocketAddr, SlidingWindow>>>).
**Why:** Core rate-limiting logic.
**Files:** `backend/src/middleware/rate_limiter.rs`
**Verification:** Unit tests passing — 3 test cases for under/over/per-route.

### RateLimit derive macro

**What changed:** Created `#[rate_limit(max = N, window_secs = M)]` proc macro that emits a const `RATE_LIMIT_CONFIG` on the annotated handler.
**Why:** Per-route limit annotation without runtime config parsing.
**Files:** `backend/src/middleware/rate_limit_macro.rs`
**Verification:** Macro expansion tests pass.

### Layer integration

**What changed:** Added `RateLimiterLayer` to the `ServiceBuilder` chain in `backend/src/main.rs`.
**Why:** Wires middleware into the request pipeline.
**Files:** `backend/src/main.rs:42`
**Verification:** Server boots without error; under-limit requests return 200.

## Relevant Files

### `backend/src/middleware/rate_limiter.rs`
**Status:** Created
**Role:** Core rate limiter — `RateLimiter<T>` service, `SharedSlidingWindow`, request counting, 429 response.
**Changes:** New file.
**Next use:** Add stale-entry eviction task.

### `backend/src/middleware/rate_limit_macro.rs`
**Status:** Created
**Role:** Proc macro `#[rate_limit(...)]` emitting per-route limit constants.
**Changes:** New file.
**Next use:** No further changes expected.

### `backend/src/middleware/mod.rs`
**Status:** Modified
**Role:** Module export.
**Changes:** Added `pub mod rate_limiter; pub mod rate_limit_macro;`.
**Next use:** No further changes expected.

### `backend/src/main.rs:42`
**Status:** Modified
**Role:** Application entrypoint — wires middleware.
**Changes:** Added `.layer(RateLimiterLayer::new())` to the service builder chain.
**Next use:** Verify after eviction task is added.

## Remaining Work

### Task 1: Add stale-entry eviction

**Objective:** Spawn a background task that periodically (every 60s) removes entries from `SharedSlidingWindow` whose last request is older than `window_secs * 2`.
**Files:** `backend/src/middleware/rate_limiter.rs`
**Depends on:** None
**Notes:** Use `tokio::spawn` with a `tokio::time::interval`. The eviction loop should hold the write lock briefly, collect stale keys, then remove in bulk. Add a test that verifies eviction shrinks the map.
**Verify:** `cargo test -p koda-backend` — new test `eviction_removes_stale_entries` passes and memory does not grow after idle period.
**Done when:** `SharedSlidingWindow` internal map has bounded size after idle time.

### Task 2: Add e2e smoke test

**Objective:** Create a smoke script that sends 101 requests in 60s to a rate-limited route and confirms the 101st returns 429.
**Files:** `scripts/rate-limit-smoke.mjs`
**Depends on:** Task 1
**Notes:** Use existing `scripts/e2e-hosted-smoke.mjs` pattern with disposable Supabase user.
**Verify:** `node scripts/rate-limit-smoke.mjs` exits 0.
**Done when:** Script passes and 429 is correctly returned.

## Resume Here

> Open `backend/src/middleware/rate_limiter.rs` and add the stale-entry eviction task (Task 1). After implementing, add the eviction test and run `cargo test -p koda-backend`. Then proceed to Task 2 (e2e smoke script).

## Open Questions or Blockers

- **Question:** Should eviction use reference-counting or a simple timestamp sweep?
- **Why it matters:** RC would let us evict immediately when the last request's window expires; timestamp sweep is simpler but leaves entries up to 2x window lifetime.
- **Default:** Use timestamp sweep (simpler). Optimize only if profiling shows map growth causes contention.
- **Blocked:** No — work can continue with timestamp sweep.

## Verification Status

- Tests passed: `cargo test -p koda-backend` — 142 passed. Specific rate-limiter tests: under-limit, over-limit, per-route override.
- Tests failed: None.
- Commands run: `cargo build`, `cargo test -p koda-backend`, `cargo run` (server starts).
- Manual checks: Server responds to under-limit requests with 200.
- Unverified: Stale-entry eviction (not implemented). E2e smoke (not implemented). Long-duration memory behavior.

## Success Criteria

- [ ] Stale-entry eviction task implemented and tested.
- [ ] E2e smoke script confirms 101st request returns 429.
- [ ] All unit tests pass.
- [ ] Memory does not grow unbounded during idle periods.
