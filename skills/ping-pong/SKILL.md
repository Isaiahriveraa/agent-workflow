---
name: ping-pong
description: Ping-Pong Technique — two AI models debate a plan across three rounds. Model A proposes; Model B critiques; output refines Model A. Stress-tests thinking and catches edge cases before any code is written.
---

# Ping-Pong Technique

Two different AI models take turns proposing and critiquing a plan or idea across three rounds. The goal is **adversarial stress-testing**, not consensus — each round sharpens the thinking by forcing it through a different model's lens.

## When to Use

Invoke this skill when:
- Planning a significant feature or architectural change
- A plan/idea is still soft and needs hardening before implementation
- You want to catch edge cases, false assumptions, and direction errors early
- The plan involves multiple systems, tradeoffs, or uncertain choices

**Do not** use for trivial tasks. This is a pre-implementation ritual.

## Setup

You need two different models. Ask the user to pick their preferred pairing:

```
Which model pairing for Ping-Pong?

A) Your current model (proposer) + GPT-5.4 (critic)
B) GPT-5.4 (proposer) + your current model (critic)
C) GPT-5.4 (proposer) + Gemini-3.1-Pro (critic)
D) Custom — tell me both models
```

The proposer starts. The critic attacks. Then they swap roles each round.

---

## Round Structure

Each **Round** has two halves:

| Half | Who | Action |
|------|-----|--------|
| Propose | Model A | Present the current state of the plan/idea |
| Critique | Model B | Attack weaknesses, challenge assumptions, find edge cases |

Three full rounds are executed. After Round 3, a final **Synthesis** pass extracts the hardened output.

---

## Round-by-Round Protocol

### Before Round 1

**Collect the artifact.** Ask the user for:
- An existing plan/research artifact path, OR
- A freeform description of what they want to stress-test

If no artifact exists yet, ask the proposer model to produce a working draft first before starting the critique cycle.

**Set the context for both models.** In every prompt to either model, include:
- The full current state of the plan/idea
- The round number and role (proposer/critic)
- That this is Ping-Pong Round N — not a general conversation

---

### Round 1: Orientation & Edge Cases

**Proposer (Model A) — Propose:**
> "You are Model A in Ping-Pong Round 1. Present the plan/idea as currently understood. Be specific about what's being proposed, why, and the expected outcomes. Do not soften the proposal."

**Critic (Model B) — Critique:**
> "You are Model B in Ping-Pong Round 1. Your job is to attack this proposal. Find the weakest points: unstated assumptions, edge cases not covered, failure modes, things that could go wrong, and directions that would lead to dead ends. Be direct and specific. Do not offer alternatives — tear the proposal apart."

After both halves complete, the orchestrator (you) extracts:
- ✅ What survived the critique (still valid)
- ❌ What was attacked (needs revision or abandonment)
- 🔍 New questions opened (unknowns surfaced)

---

### Round 2: Pressure & Refinement

**Proposer (Model A) — Propose (refined):**
> "You are Model A in Ping-Pong Round 2. Incorporate the Round 1 critique. Defend what survived. Fix or abandon what was attacked. Produce a refined version of the proposal."

**Critic (Model B) — Critique:**
> "You are Model B in Ping-Pong Round 2. The proposal has been refined. Attack it again from a different angle. Focus on: (1) things the proposer may have double-down on incorrectly, (2) new weaknesses introduced by the refinements, (3) anything that still feels wrong or unexamined."

After both halves complete, extract:
- ✅ What survived Round 2
- ❌ What was attacked in Round 2
- 🔍 New angles surfaced

---

### Round 3: Conviction & Proof

**Proposer (Model A) — Propose (final refined):**
> "You are Model A in Ping-Pong Round 3. This is the final round. Defend the core claim with conviction — what is the strongest version of this plan? What would have to be true for this to succeed? Where does the proposal still have soft spots?"

**Critic (Model B) — Critique (final):**
> "You are Model B in Ping-Pong Round 3. Your final pass. Give the meanest critique you can. What would prove this plan wrong? What single failure mode would collapse the whole thing? Is the proposer conflating confidence with correctness?"

After both halves complete, extract:
- ✅ Survived all 3 critiques — what's solid
- ❌ Still attacked — unresolved issues
- 🔍 Proof conditions — how to verify claims are right vs. wrong

---

## Synthesis Pass (After Round 3)

After all three rounds, produce a **Ping-Pong Debrief** — a structured summary of what the debate surfaced:

```markdown
## Ping-Pong Debrief

**Artifact:** <path or "freeform">
**Rounds:** 3
**Proposer model:** <Model A>
**Critic model:** <Model B>

---

### What's Solid (survived all 3 critiques)
- <finding>
- <finding>

### Unresolved (attacked in Round 2 or 3)
- <issue> ← <why it's still open>
- <issue> ← <what would close it>

### Proof Conditions (how to verify the plan's bets)
- <condition> → if true, plan is sound
- <condition> → if false, plan needs redesign

### Edge Cases Caught
- <edge case discovered in Round N>
- <edge case>

### Directions Abandoned
- <direction> — abandoned in Round N because <reason>

### Directions to Double-Down On
- <direction> — defended through all 3 rounds
```

Print this debrief to the user. Do not modify the original artifact unless the user explicitly asks.

---

## Model Invocation

The two models run as **separate conversation contexts** — each sees the full debate history up to that point. Choose the invocation style that matches your current tool.

### OpenCode — Use the agent switch directly

Ask the user to switch the active model at each round boundary. OpenCode's model is set in the active session config. For each round half:

**Proposer half — Model A is active:**
- Model A (the current model or a configured agent) presents or refines the proposal
- You act as the orchestrator, passing the current plan state into the Model A prompt

**Critic half — Switch to Model B:**
OpenCode supports `--model` overrides per session. Switch to the critic model, run the critique, then switch back. Alternatively, use a configured alternate agent from `oh-my-openagent.json` (e.g., if Model A is `sisyphus`, use `oracle` or `metis` as Model B).

```
// Model B (critic) — switch session model to the critic model
// then switch back to Model A for the refinement pass
```

If OpenCode supports a command to switch model mid-session, use that. If not, run Model B's critique in a new OpenCode session (same repo context) and paste the output back into the main session.

### Claude Code — spawn the critic as a subagent

Use the `task()` tool with `category="ultrabrain"` or the `critic` agent to run the critique half in a separate subagent context that has the full debate history.

```typescript
// Spawn critic as subagent with full context
task(category="ultrabrain", session_id=None, prompt="You are Model B in Ping-Pong Round 1. [full context + plan + critique brief]", load_skills=["code-review-basics"])
```

### When models are the same provider (no external tool needed)

If Model A and Model B are different models from the same provider, just switch which model is active in the session config — no subprocess call needed.

### When using Codex CLI alongside OpenCode

If Model B is best run via Codex CLI (different provider or preferred model):
```bash
echo "You are Model B in Ping-Pong Round 1. Your job is to attack this proposal..." \
  | codex exec --skip-git-repo-check \
  --model <MODEL> \
  --config model_reasoning_effort=high \
  --sandbox read-only \
  2>/dev/null
```

---

**Model selection guidance:**
| Proposer | Critic | Notes |
|----------|--------|-------|
| Your current model (stronger reasoning) | A different model (fresh lens) | Most common setup |
| `gpt-5.4` (ultrabrain tier) | `gemini-3.1-pro-preview` (artistry tier) | Good creative tension |
| `o3` (high reasoning) | `gpt-5.4-mini` (quick tier) | Asymmetric depth |

---

## Important Constraints

- **Do not seek consensus.** The goal is adversarial pressure, not agreement.
- **Do not let the proposer slide.** If something gets attacked twice and the proposer just rewords it without fixing it, flag it as unresolved.
- **The proposer must actually respond to the critique.** Repetition is not refinement.
- **Three rounds minimum.** Do not stop at Round 1 or 2 "if it looks good enough."
- **This is pre-implementation only.** Once code is written, the technique has done its job.

---

## Degraded Mode

If one model is unavailable:
- Run with a single model alternating roles — still valuable but weaker
- Note in the debrief that the pairing was degraded

If no artifact exists:
- Produce a draft artifact first, then run Ping-Pong on it
- Do not skip the artifact step — Ping-Pong needs something concrete to attack
