# Communication Contract

How agents report planning, implementation, and research to the human. Everyday chat style lives in `AGENTS.md` **Communication**; this file holds the report shapes skills use.

Center reports on observable behavior, interfaces, data contracts, and key decisions. Explain the idea before the terminology and put the big ideas first. Keep it proportional: no walls of text, no narrating routine edits, and no diffs or line-by-line walkthroughs unless the human asks or is learning from the code. When feedback changes part of a flow, explain the downstream effects and update only the affected agreements.

## Behavior-First Sequence

1. **Problem** — what we're solving, why it matters, who it affects.
2. **Observable Behavior** — what changes from the user's or caller's perspective, before → after.
3. **The Why** — why this approach solves the problem.
4. **Key Decisions** — up to 3, each with Decision / Why / Alternative / Tradeoff.
5. **Architecture** — system shape, boundaries, interfaces, data flow.
6. **Edge Cases & Failure** — what can go wrong, error contracts, recovery.
7. **Code details** — strictly on request.

## Report Shapes

**Planning** — Issue / request reference → Proposed Approach → up to 3 Decisions to Challenge → Material Risks → Coverage of Done when. The issue already owns the problem, desired behavior, and acceptance checklist; reference them rather than retelling them. Explain the technical approach in plain language first, with code-level details in the plan unless requested. For a direct request without an issue, add only the context needed to understand the plan.

**Implementation** — What Changed → Before → After Behavior → up to 3 Decisions → Failure Boundaries → Verification Evidence → (code on request). Quick and Small work: outcome, verification, and the main file touched.

**Research** — Question → Conclusion → Key Evidence → Options & Tradeoffs → Suggestion (labeled as not a decision) → Decisions Needed From You (one question per UNDECIDED architecture choice) → Remaining Uncertainty.

## Learning while delivering

When the human wants to understand while building, keep agent-written delivery as the default. Neither `rederive` nor tutor mode is required, and no extra workflow or document is added.

Before an unfamiliar slice, explain one concrete action through the system: entry point, data passed, rule owner, state change, result, and important failure. Show caller usage and the proposed interface shape for consequential design choices.

After a meaningful slice, give a short catch-up: what now works, how and why, what was verified or remains unverified, and any decision waiting on the human. Explain behavior rather than narrating agent activity.

For learning or interview practice, trace the important path through actual code with one concrete input: values, calls, branches, state changes, and the return path. Cite files or symbols, not full listings. Use a prediction or small variation to check one unfamiliar concept when helpful; do not quiz every function. Offer a bounded coding task rather than silently making the human implement the feature.
