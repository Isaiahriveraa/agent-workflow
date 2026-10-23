# Agent handoffs

Give a delegated agent a bounded assignment, not merely an identity such as
"you are a subagent." Explain why this work matters, what it supports, and what
evidence will establish completion. Use the brief below for ordinary delegation;
keep it short for small tasks and expand only the context needed to work safely.
Do not assume access to the parent conversation.

## Shared brief

```markdown
## TASK
Stage and purpose: <discovery, research, planning, implementation, or verification;
why this assignment is needed now and which decision or outcome it supports>.
Goal: <one bounded, observable outcome and who benefits>.
Scope: <owned files or question; repository/worktree; read-only or edit authority>.

## EXPECTED OUTPUT
<Artifact, answer, or code contract; destination; required report format>.

## CONTEXT
<Relevant user intent, verified facts, approved decisions, unresolved assumptions,
dependencies, and exact source paths or excerpts needed for this assignment>.
<For product work: chosen flow or prototype, required data and actions, important
states, and known technical risks. Say what is mocked or unverified>.

## CODEBASE CONVENTIONS
<Applicable repository instructions and concrete patterns to reuse>.

## MUST DO
<Required behavior, edge cases, evidence, and validation commands>.
<Report blockers and unresolved decisions instead of silently choosing policy>.

## MUST NOT DO
<Non-goals, protected files, forbidden actions, and approval boundaries>.
<Do not start another stage or expand the assignment without authorization>.

## DONE WHEN
<Observable acceptance criteria and evidence required for each>.
<Return the result, changed paths if any, checks run with outcomes, checks not run
and why, and remaining uncertainty, unless the role specifies another format>.
```

Send all relevant context, not the entire transcript. Distinguish requirements
from suggestions and assumptions. Include source excerpts when the agent cannot
access them; otherwise provide precise paths and enough orientation to read them.
Never include secrets or unrelated sensitive material.

## Role-specific boundaries

A role's restricted inputs and required output format take precedence over this
template. Do not add product rationale, author reasoning, other reviewers'
findings, or conversation history to a blind review. For example, the behavioral
reviewer receives only the patch, changed-file list, and baseline-check output;
the commit/PR reviewer receives only its mode, plan, and repository reference.
Keep the task and completion contract within those permitted inputs. Do not
wrap a fixed-format reviewer response in the ordinary completion report.

## Product discovery handoffs

Follow [the shared workflow](workflow.md#experience-first-risk-aware-development)
when the experience is uncertain. A discovery agent tests a flow, not a production
architecture. Its handoff should state what the user saw or tried, which data and
actions the flow needs, what was mocked, and what remains undecided. A backend
assignment should connect each required capability to that flow and explain why
the server owns its rules. Do not treat a prototype as an approved API or schema.
