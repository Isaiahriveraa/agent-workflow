---
description: Run the Ping-Pong debate technique — two AI models take turns proposing and critiquing a plan across three rounds to stress-test thinking before implementation.
---

# Ping-Pong Technique

Run the three-round adversarial debate on a plan or idea to catch edge cases, false assumptions, and direction errors before any code is written.

## Invocation

```
/ping-pong [artifact-path | "freeform description"]
```

If no path or description is provided, respond with:

```
Ping-Pong needs something to debate.

Give me:
- An absolute path to an existing plan/research artifact, OR
- A freeform description of what you want to stress-test

I'll then ask you to pick the model pairing and start Round 1.
```

## How It Works

Three rounds. Two models alternate:
- **Model A** (proposer) → presents the plan
- **Model B** (critic) → attacks it

After Round 3, a **Ping-Pong Debrief** is printed summarizing what's solid, what's unresolved, and what proof conditions would verify or falsify the plan.

The goal is **adversarial stress-testing**, not consensus. Stopping early defeats the purpose.

## Model Pairing

Ask the user to pick:

```
Which model pairing for Ping-Pong?

A) Current model (proposer) + GPT-5.4 (critic)
B) GPT-5.4 (proposer) + Current model (critic)
C) GPT-5.4 (proposer) + Gemini-3.1-Pro (critic)
D) Custom pairing — specify both models
```

Use `codex exec` to invoke the second model when it's a different provider. See `skills/ping-pong/SKILL.md` for the full round protocol and model invocation recipes.

## Workflow

1. Collect artifact path or freeform description
2. Confirm model pairing
3. Load the skill: `skill(name="ping-pong")`
4. Execute all 3 rounds per the skill protocol
5. Print the Ping-Pong Debrief to the user
6. Do not modify the original artifact unless the user asks

## Workflow Integration

Ping-Pong fits naturally into Tier 3 planning before `create-plan` runs:

```
User request → /rpi → [if plan is soft] → /ping-pong → /create-plan → /implement_plan
```

It can also be invoked standalone anytime a plan or idea needs hardening before commitment.

## Constraints

- Do not stop before Round 3 "if it looks good enough"
- The proposer must actually respond to critiques — repetition is not refinement
- Three rounds minimum, no exceptions
- This is a pre-implementation ritual only — once code is written, the technique has done its job

## Skill Reference

Full protocol: `skills/ping-pong/SKILL.md`
