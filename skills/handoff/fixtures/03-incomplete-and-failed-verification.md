---
date: 2026-07-08T18:00:00-0700
author: Yonie
commit: b0b3e4f
branch: feature/voice-gateway-integration
repository: backend
topic: "Voice Gateway Backend Integration - Handoff"
tags: [handoff]
status: complete
last_updated: 2026-07-08T18:00:00-0700
last_updated_by: Yonie
type: handoff
---

# Agent Handoff: Voice Gateway Backend Integration

## Active Goal

Connect the Python voice gateway to the Rust backend so voice sessions can create jobs, receive events, and report completion. Specifically: wire `POST /jobs` from the voice gateway's `backend_job_runner_from_env()` into the existing backend job flow, with proper auth and error handling.

- Plan: `context/plans/2026-07-06_09-00-00_voice-gateway-integration.md`
- Research: `context/research/2026-07-05_14-15-27_voice-gateway-backend-contract.md`

## Current State

- **What works:** Voice gateway Python client (`koda/Server/agent/koda_backend_client.py`) can authenticate with the backend using `KODA_BACKEND_URL` + `KODA_GATEWAY_TOKEN`. The `backend_job_runner_from_env()` function connects, creates jobs, and polls for terminal status. The backend `POST /jobs` endpoint handles `engine: "opencode_acp"` and `engine: "fake"` job types.
- **What is incomplete:** The voice gateway's session token auth is not integrated (currently uses a static API token). Job creation from voice gateway does not pass `voice_session_id` — the backend accepts it but the gateway client omits the field. The voice gateway does not handle `blocked` events (prompt timeout, provider error) — it only tracks `completed` and `cancelled`. No SSE or polling loop is wired for active event streaming.
- **What is broken:** The e2e integration test fails — gateway creates a job, but the backend never emits `job_started`. The job stays in `accepted` state. Gateway polls until timeout. Root cause: the operator WebSocket connection is not pairing when the gateway triggers job creation (gateway shares the host but uses a different process context, so the operator is not running or not paired).
- **What has been verified:** Unit tests for the gateway client's `connect()` and `create_job()` pass (mock backend responses). The backend `POST /jobs` endpoint returns 200 with job ID. Manual test with a running operator + gateway in same process: job goes to `accepted` → then stuck (no `job_started` because real engine path doesn't emit it — known issue from Plan 05). `cargo test -p koda-backend` — 148 passed, 0 failed.
- **Assumed but not verified:** The e2e test would pass if the operator were running in the same process. The gateway's `KODA_OPERATOR_ID` env var points to a valid operator. The gateway token has sufficient permissions to create jobs.

## Latest User Intent

Wire the voice gateway to the backend so a voice session can create and monitor coding jobs.

- **Active intent:** End-to-end flow: voice → gateway → backend → operator → OpenCode → events back to gateway. The gateway must use the backend's job API, not call OpenCode directly. The user wants to see job progress in the voice session.
- **Original intent (superseded):** "Just have the gateway call OpenCode directly." The user corrected: "No, I want the full path through the backend — that's the whole point of the architecture."

## Locked Decisions

- **Decision:** Gateway calls backend `POST /jobs` — never calls OpenCode directly.
  - **Why:** User explicitly requires the full architecture path. Direct OpenCode calls bypass event tracking, work logs, and mobile visibility.
  - **Constraint:** If the backend is down, the gateway should not silently fall back to direct OpenCode calls.
- **Decision:** Gateway uses `KODA_GATEWAY_TOKEN` for auth (static token), not session tokens.
  - **Why:** Simpler MVP integration. Session tokens require a login flow the gateway doesn't have.
  - **Constraint:** The static token must be revocable and logged. Acceptable for dev/MVP.
- **Decision:** Gateway polls for terminal status (no SSE yet).
  - **Why:** SSE endpoint requires backend streaming which is planned but not implemented. Polling is simpler and works with the existing `GET /jobs/:id`.
  - **Constraint:** Polling interval must be configurable. Default 2s.
- **Decision:** `voice_session_id` is required in job creation for MVP.
  - **Why:** The frontend and mobile need to correlate jobs to voice sessions. Without it, there's no way to list "jobs for this call."
  - **Constraint:** Gateway must pass the field. Backend must reject jobs without it (currently accepts optional).

## Do Not Repeat

- **Direct OpenCode call from gateway** — User explicitly rejected this. Gateway must route through the backend.
- **WebSocket from gateway to operator** — Gateway talks to backend HTTP only. The operator WebSocket path is backend→operator, not gateway→operator.
- **Skip `voice_session_id`** — Currently missing from gateway client. Must add; backend already supports it.
- **SSE as replacement for polling in MVP** — SSE is approved for later but polling is the MVP path. Don't block on SSE.
- **Job creation without operator pairing check** — The current e2e failure shows the gateway creates jobs without ensuring an operator is connected. Must check operator status first or handle `accepted` timeout gracefully.

## Work Completed

### Gateway client auth

**What changed:** `koda_backend_client.py:get_client()` reads `KODA_BACKEND_URL`, `KODA_GATEWAY_TOKEN` and passes the token as `Authorization: Bearer <token>` on all requests. Token validation on backend side accepts the gateway token for `POST /jobs`.
**Why:** Auth wiring between gateway and backend.
**Files:** `koda/Server/agent/koda_backend_client.py:40-55`
**Verification:** Unit test `test_gateway_auth` passes — mock backend validates token.

### Gateway job creation

**What changed:** `backend_job_runner_from_env()` creates jobs via `POST /jobs` with `engine=opencode_acp`, polls `GET /jobs/:id` until terminal status, returns job result.
**Why:** Core integration — gateway creates backend jobs.
**Files:** `koda/Server/agent/koda_backend_client.py:640-687`
**Verification:** Unit test `test_create_and_poll_job` passes with mock backend responses.

### Backend `voice_session_id` field

**What changed:** Added `voice_session_id` (UUID, optional) to the job creation schema and `jobs` table. Accepted in `POST /jobs` payload. Stored in DB.
**Why:** Voice sessions must correlate to jobs.
**Files:** `backend/src/jobs.rs:85` (schema), `backend/migrations/20260706_add_voice_session_id.sql` (new)
**Verification:** `cargo test` — job creation with `voice_session_id` stores and retrieves it correctly. Missing field defaults to `null`.

### E2e integration test (failing)

**What changed:** Created `scripts/voice-gateway-e2e.mjs` that starts backend, simulates gateway client calls, creates a job, and waits for terminal status.
**Why:** E2e verification of the full path.
**Files:** `scripts/voice-gateway-e2e.mjs` (new)
**Verification:** FAILED — job stuck in `accepted`. Operator not paired. Output captured at `/tmp/voice-gateway-e2e-output.log`.

## Relevant Files

### `koda/Server/agent/koda_backend_client.py:40-55`
**Status:** Modified
**Role:** Gateway HTTP client — auth headers, request signing.
**Changes:** Added `KODA_GATEWAY_TOKEN` auth header injection.
**Next use:** Add `voice_session_id` to job creation payload.

### `koda/Server/agent/koda_backend_client.py:640-687`
**Status:** Modified
**Role:** `backend_job_runner_from_env()` — job creation and polling.
**Changes:** Replaced direct OpenCode call with backend `POST /jobs` + `GET /jobs/:id` polling.
**Next use:** Add `blocked` event handling (currently only checks `completed`/`cancelled`).

### `backend/src/jobs.rs:85`
**Status:** Modified
**Role:** Job creation schema and handler.
**Changes:** Added optional `voice_session_id` field.
**Next use:** Make `voice_session_id` required (not optional) — add validation.

### `backend/migrations/20260706_add_voice_session_id.sql`
**Status:** Created
**Role:** DB migration.
**Changes:** New file — adds `voice_session_id` column.
**Next use:** No further changes expected.

### `scripts/voice-gateway-e2e.mjs`
**Status:** Created
**Role:** E2e integration test.
**Changes:** New file.
**Next use:** Fix the operator pairing issue so test passes. Then add `voice_session_id` to test payload. Then add `blocked` event handling assertion.

### `scripts/voice-gateway-e2e-output.log`
**Status:** Created (outside repo)
**Role:** Captured output from the failed e2e run.
**Changes:** Located at `/tmp/voice-gateway-e2e-output.log`.
**Next use:** Read to confirm failure mode before fixing.

## Remaining Work

### Task 1: Fix e2e test — ensure operator is paired before job creation

**Objective:** The e2e test must start an operator instance (or verify one is paired) before creating a job. Fix the test script to either: (a) spawn the operator CLI as a child process before creating jobs, or (b) check the backend's operator status endpoint before proceeding. Currently the test creates a job with no operator connected, so it stays in `accepted`.
**Files:** `scripts/voice-gateway-e2e.mjs`
**Depends on:** None
**Notes:** The existing `scripts/e2e-hosted-smoke.mjs` has an operator pairing flow that can be adapted. The operator binary is at `backend/operator/target/release/koda-operator` (or use `cargo run -p koda-operator`).
**Verify:** `node scripts/voice-gateway-e2e.mjs` exits 0. Job status reaches `running` or `completed` (not stuck at `accepted`).
**Done when:** E2e test passes end-to-end: job created → operator accepts → `job_started` emitted → terminal status reached.

### Task 2: Add `voice_session_id` to gateway client

**Objective:** `backend_job_runner_from_env()` must accept and pass `voice_session_id` to `POST /jobs`. Currently the parameter exists in the gateway but is not wired through.
**Files:** `koda/Server/agent/koda_backend_client.py`
**Depends on:** Task 1 (test needs `voice_session_id` to verify)
**Notes:** Read the current `voice_session_id` from env `KODA_VOICE_SESSION_ID` or accept as a function parameter.
**Verify:** Unit test confirms `voice_session_id` appears in the `POST /jobs` body. E2e test confirms it's stored in the DB.
**Done when:** Created jobs have `voice_session_id` populated in the `jobs` table.

### Task 3: Make `voice_session_id` required on backend

**Objective:** Change the backend schema from optional to required `voice_session_id` on `POST /jobs`. Return 422 if missing.
**Files:** `backend/src/jobs.rs:85`
**Depends on:** Task 2 (gateway must pass it first)
**Notes:** Change `Option<Uuid>` to `Uuid` in the job creation struct. Update tests.
**Verify:** `cargo test -p koda-backend` — all tests pass. `POST /jobs` without `voice_session_id` returns 422.
**Done when:** Backend requires `voice_session_id`.

### Task 4: Handle `blocked` events in gateway polling

**Objective:** `backend_job_runner_from_env()` must treat `blocked` events (prompt timeout, provider error, needs_approval) as terminal-failure states, not continue polling. Currently only checks for `completed` and `cancelled`.
**Files:** `koda/Server/agent/koda_backend_client.py:640-687`
**Depends on:** Task 1
**Notes:** The backend event types include `blocked` with a `reason` field. The gateway should surface the reason.
**Verify:** Unit test with mock `blocked` event returns failure. E2e test with provider error triggers `blocked` path.
**Done when:** Gateway correctly terminates polling on `blocked` events.

## Resume Here

> The primary blocker is the e2e test failing because no operator is paired. Open `scripts/voice-gateway-e2e.mjs` and `/tmp/voice-gateway-e2e-output.log` to understand the current failure. Then look at `scripts/e2e-hosted-smoke.mjs` (lines 60-90 have operator pairing flow) and adapt it into the voice-gateway e2e script so an operator is started and paired before job creation. Run `node scripts/voice-gateway-e2e.mjs` and confirm job status moves past `accepted`. After the e2e passes, proceed to Task 2 (wire `voice_session_id`).

## Open Questions or Blockers

- **Blocker:** E2e test cannot pass without an operator process. The gateway and operator run in separate process contexts. The test must either spawn the operator or verify it's already running.
  - **Default:** Spawn the operator as a child process in the test script (matches the existing e2e-hosted-smoke pattern).
  - **Blocked:** Yes — Task 1 must be completed before any downstream work can be verified.

## Verification Status

- Tests passed: `cargo test -p koda-backend` — 148 passed. Gateway unit tests: `test_gateway_auth`, `test_create_and_poll_job` (mock backend).
- Tests failed: `scripts/voice-gateway-e2e.mjs` — job stuck in `accepted` (no operator paired).
- Commands run: `cargo build`, `cargo test -p koda-backend`, `node scripts/voice-gateway-e2e.mjs`.
- Manual checks: `curl POST /jobs` with gateway token returns 200. `curl GET /jobs/:id` returns job with `voice_session_id`.
- Unverified: End-to-end flow with real operator. `blocked` event handling. `voice_session_id` in gateway.

## Success Criteria

- [ ] E2e test passes: `node scripts/voice-gateway-e2e.mjs` exits with 0.
- [ ] Voice gateway creates jobs that reach `completed` or `blocked` terminal state.
- [ ] `voice_session_id` is passed by the gateway and required by the backend.
- [ ] Gateway correctly handles `blocked` events as terminal failures.
- [ ] All unit tests pass (both backend and gateway).
- [ ] Manual smoke: voice session → gateway → backend → operator → OpenCode → events visible.
