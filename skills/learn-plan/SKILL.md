---
name: learn-plan
description: >-
  Planning protocol for learning sessions. Produces architecture plans that maximize what the learner understands: prove the riskiest behavior with a small implementation FIRST, explain the big picture before the details, keep the learner coding the backend while the AI explains the why, delegate frontend work, anchor every design decision to its pattern family (concurrency, security, contracts, data, process) so each build session reinforces learning, and end with a plan file that makes production easy. Use when planning backend work in tutor mode, when the user wants to learn while building, when a feature's feasibility is unproven (external APIs, email, auth, payments), when the user says "prove we can do it first" or "explain it simply", or before writing an implementation plan.
---

# Learn-Plan

A planning protocol that treats **learning** and **proving** as first-class parts of producing a plan. Born from the IUGA feedback→discount→email session: the user learns the backend by coding it themselves, and the plan is built on evidence, not assumptions.

## The core loop

```
check what exists → prove the behavior → explain the big picture → plan the layers → user codes backend / AI delegates frontend → verify
```

## 1. Prove the behavior FIRST (spike before plan)

Before planning any backend feature: **first check what already exists, then run the smallest implementation that proves the riskiest assumption end-to-end.** Evidence > confidence.

- Check what exists FIRST — an npm package, a brew formula, a service (UW SMTP, Stripe), a UW-provided tool, or code already in the repo (controllers, models, mounted routes). Never plan to build what already exists; find it and reuse it.
- Real examples from the IUGA session: `qrcode` + `html5-qrcode` existed as packages (no custom QR code); `nodemailer` replaced `@sendgrid/mail` (installed but useless for @uw.edu); mongodb-community via brew; and the feedback controller was already 60% written but never mounted.

- Pick the single riskiest unknown (SMTP auth? a vendor API? Discord DM deliverability? a Mongo atomic op?).
- Prove it with the cheapest tool available (swaks, curl, openssl, a 20-line node script — no app code yet).
- Capture the evidence verbatim (e.g. `235 2.0.0 OK Authenticated`, `250 Message accepted`).
- Put that evidence in the plan's "Proven foundations" section — the plan is built on what actually works.
- If the proof fails, the plan changes before any real code is written.

> Real example: before planning email delivery, we ran one authenticated SMTP send from `iuga@uw.edu` via `smtp.uw.edu:587` and watched it land in an inbox. The plan then treated email as solved — "the terminal test proved the hardest part; everything else is UX around it."
>
> This mirrors the `prototype` skill (throwaway code that answers a question), but earlier and lighter: you spike to *prove feasibility*, not to *answer a design question*.

## 2. Explain the big picture, then the layers

Teaching order — never start with files:

1. **One-sentence story** of the whole feature ("student submits feedback → board approves → code lands in their inbox").
2. **Proven capabilities table** — what already works, with the evidence from step 1.
3. **Architecture diagram** — frontend → backend → database → external services.
4. **Per-layer plain-language explanation** — each layer's job in one breath.
5. **File-level mapping** — only at the end, tied back to the layers.

Rules: no jargon without a definition; mirror the user's own words back; every answer ends with the next concrete action.

## 3. Tutor-mode division of labor (AI-assisted development)

- **User codes the backend incrementally** — the AI explains the *why* (session auth, atomic status flips, token generation) and the user writes it, one concept at a time.
- **AI delegates frontend** to visual-engineering agents; user reviews the result.
- Use the DRIVE/DELEGATE vocabulary: **DRIVE** (user does the work) vs **DELEGATE** (AI may write, user explains it back before keeping).
- Guidance fading: patterns the user masters move from DELEGATE to DRIVE.

## 4. Plan file structure (makes production easy)

Every plan gets these sections, in this order:

1. **Goal** — one sentence + core-loop diagram
2. **Scope** — explicit in/out; out = "future, researched not built"
3. **Rationale** — why these choices over the alternatives
4. **Proven foundations** — evidence table (from step 1)
5. **Database** — schema changes, indexes, TTL (and where TTL does NOT apply)
6. **API design** — route map with auth per route, status-code contract (200/201/400/401/403/404/409/500), row-level security
7. **If-conditions** — every branch as pseudocode, incl. atomic/idempotent paths
8. **Error handling** — helpers, central middleware, what never leaks
9. **Security checklist** — PII/consent, session hardening, CSRF, rate limiting, auth middleware
10. **Optimization** — indexes, lean(), atomic ops, no N+1, transport reuse
11. **Prerequisites (Phase 0)** — checkbox list
12. **Git workflow** — one worktree = one concern = one PR, with dependency column + parallelization notes
13. **Implementation phases** — table with Depends-on column
14. **Open decisions** — locked before/while building; strike through when resolved
15. **Pattern anchors** — which pattern families this plan instantiates (see §6), so every build session reinforces them

## 5. Layered delivery design

Never make the fun channel the only channel. Design guarantees in tiers:

- **Tier 1 — always works:** in-app display (code saved in DB, shown on login)
- **Tier 2 — reliable:** email (proven channel)
- **Tier 3 — bonus/advocacy:** Discord DM (fun, but silently fails without mutual guild + DMs on)

Each tier is independent; a failure in a bonus tier never blocks the guarantee.

## 6. Pattern anchors (every plan names its patterns)

Engineers don't memorize solutions — they **recognize pattern families**, recall the rules, and adapt. Every piece of a build is an instance of a named pattern used by Stripe, GitHub, Rails, Discord. The plan lists which families it instantiates; during the build, the AI narrates each piece as its pattern ("this login is the session-auth pattern — you'll see it again in every framework"). Each build session becomes a reinforcement session by default.

**The five families:**

1. **Correctness under concurrency** ("race" family) — CAS/atomic updates (`findOneAndUpdate({_id, status: "pending"}, ...)`), idempotency (409 on double-click; Stripe Idempotency-Key), state machines (pending → approved → denied; Shopify orders), single-document atomicity. Triggers: "two people at once?", "retry or double-click?", "a lifecycle with steps?"
2. **Security boundaries** ("who are you" family) — middleware authorization gates (requireAuth/requireAdmin), server-side identity never client-supplied (fUID from session), RBAC (uType → Admin/Member), informed consent for PII, attack-surface hardening (CSRF, rate limiting, secrets in env). Triggers: "could the user edit the URL?", "different users should see different things?"
3. **Communication contracts** ("talking to the browser" family) — semantic status codes (200/201/400/401/403/404/409/500), consistent response envelope, expected rejections ≠ failures (409 is a business "no", not an error toast), fail loudly server-side / generically client-side. Trigger: "what does the frontend see on failure?"
4. **Data design** ("storing it well" family) — indexes trade storage for speed, lean()/projection = don't over-fetch, know what data dies vs must live (TTL on ephemeral data, never on codes/audit trails), schema-as-source-of-truth (submodule schemas). Trigger: "will this get slow with data?"
5. **Delivery & process** ("how we build" family) — prove the riskiest assumption first, layered redundancy (Tier 1 in-app / Tier 2 email / Tier 3 Discord), small vertical slices (worktree = concern = PR), core action independent of fragile side effects (email failure never rolls back approval). Trigger: "what's the riskiest assumption?"

**The on-the-spot thinking loop** (ask these when designing any new endpoint):

"Does this already exist (package, service, brew, code)?" → check first · "Could two of these happen at once?" → CAS/atomic · "Could this happen twice?" → idempotency · "Who is allowed to do this?" → middleware + RBAC · "Could the user see someone else's data?" → session-scoped query · "What does the frontend see on failure?" → status-code contract · "Will this get slow with data?" → index + lean · "What if the delivery channel dies?" → layered fallback · "What's the riskiest assumption?" → prove it first.

## 7. Rules that apply throughout

1. Read the actual code before planning — verify what exists (controllers, models, mounts, auth) instead of assuming.
2. Cite real line numbers and file paths as evidence.
3. Flag existing dead code (unmounted routers, empty middleware files) as opportunities, not fixtures.
4. Prefer free/proven paths over shiny ones (UW SMTP over SendGrid; session-derived identity over client-supplied ids).
5. Keep the plan file in the workspace-root `.omo/plans/` (outside any git worktree) so it survives worktree deletion — `docs/` documents what exists; `.omo/plans/` holds what's planned.
6. When done, verify the plan file is consistent (headings, cross-references, no stale §numbers).
7. Check what already exists before planning to build it — npm package, brew formula, service, UW-provided tool, or code already in the repo. Reuse beats rebuild.
