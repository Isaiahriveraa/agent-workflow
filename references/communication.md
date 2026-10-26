# Communication Contract

Human-agent communication centers on observable behavior, architecture, interfaces, data contracts, and key decisions. The agent implements to the highest standard; the human evaluates code at review gates or asks for details.

Keep it proportional: no walls of text, no narrating routine syntax or line-by-line edits, no premature code listings. Explain the idea before the terminology, and put the big ideas first.

Keep the user involved where understanding or a decision is needed, not only at
final review. Follow `workflow.md`: start from the frontend experience for UI
product work, then discuss new or materially changed backend needs and tradeoffs
before implementing them. Reuse settled decisions. Show the actual production
feature when useful; a separate demo, browser session, or repeated walkthrough is
not mandatory. Use disposable prototypes only when uncertainty calls for them.

Use the shared workflow's **Interaction follows the decision** rule: act on
settled, authorized work; pause for meaningful unresolved choices; show an example
only when it helps understanding. Trace backend choices through one user action.
When feedback changes part of the flow, explain the downstream effects and update
only affected agreements rather than restarting discovery or repeating approvals.

## Reply Format

Chat replies are read in a terminal, often skimmed. Shape every reply so the reader can tell what matters from the first line and the headings alone. This governs layout; Caveman still governs wording.

1. **Bottom line first** — open with the answer, result, or what changed in one or two sentences. No preamble, no restating the question.
2. **Callouts for attention** — right after the bottom line, at most one per kind:
   - `> [!ACTION]` — something the user must do or decide. Use it whenever they have a next step.
   - `> [!WARNING]` — a risk, failure, or anything that broke.
   - `> [!DONE]` — verified outcomes, when worth separating.
   - `> [!NOTE]` — context they might otherwise miss.
3. **`##` headings** — only for replies longer than about 10 lines, 2-5 words each. `###` rarely; never `#`.
4. **Bullets** — unordered facts. Start parallel items with a `**Label:**` naming the subject. One idea per bullet; nest at most two levels.
5. **Numbers** — only for sequence (steps in order) or ranking (most important first). Never for plain sets.
6. **Bold** — the one or two phrases per section the reader must not miss.
7. **Inline code** — paths, commands, identifiers, values. Fences for anything multi-line.

Important first, details after, at every level. Short conversational answers stay plain prose; never force structure onto a two-sentence reply.

## Behavior-First Sequence

1. **Problem** — what we're solving, why it matters, who it affects.
2. **Observable Behavior** — what changes from the user/caller perspective, contract and state changes, before → after.
3. **The Why** — why this approach solves the problem.
4. **Key Decisions** — up to 3, each with Decision / Why / Alternative / Tradeoff.
5. **Architecture** — system shape, boundaries, seams, interfaces, data flow.
6. **Edge Cases & Failure** — what can go wrong, error contracts, recovery.
7. **Code details** — strictly on request.

## Modes

**Planning** — Problem → Desired Behavior → System Shape & Interfaces → up to 3 Decisions to Challenge → Edge Cases → Definition of Done.

**Implementation** — What Changed → Before → After Behavior → up to 3 Decisions → Failure Boundaries → Verification Evidence → (code on request). Routine changes: Outcome, Verification, landmark file.

**Research** — Question → Conclusion → Key Evidence → Options & Tradeoffs → Suggestion (labeled as not a decision) → Decisions Needed From You (one question per UNDECIDED architecture choice) → Remaining Uncertainty.

## Learning while delivering

When the user wants to understand while building, keep agent-written delivery as the default. Neither `learn-plan` nor full hands-on tutor mode is required. Reuse the existing plan and approval gates rather than adding another workflow or document.

Before an unfamiliar slice, explain one concrete action through the system: entry point, data passed, rule owner, state change, result, and important failure. Show caller usage and the proposed data/interface shape for consequential design choices. Compare alternatives only where the existing design workflow calls for them.

After a meaningful slice, give a short catch-up: what now works, how and why it works, what was verified or remains unverified, and any decision waiting on the user. Explain behavior rather than narrating agent activity. Do not invent an approval request when none is needed.

For learning or interview practice, trace the important path through actual code with one concrete input. Follow values, calls, branches, state changes, and the return path. Cite the relevant files or symbols, not a full source listing. Use a prediction or a small variation to check one unfamiliar concept when helpful; do not quiz every function or block routine progress. Offer a bounded independent coding task rather than silently making the user implement the feature.

## Tests

- Tests that prove behavior are permanent, frontend included: durable regression coverage for business logic, API contracts, data boundaries, error states, and user-visible UI behavior.
- Tests that pin how the UI is built are scaffolding — markup shape, class names, styles, DOM snapshots, internal state. Delete them before commit unless the human asked to keep them.
- Report the tests you added and the behavior each one proves. At most one line for the overall suite ("all backend tests pass") — never a whole-suite pass count.

## Review

Autonomous implementation, zero code clutter: do not volunteer diffs or line-by-line walkthroughs during ordinary delivery. Requested learning and code-tracing sessions use the focused trace above. Code quality is evaluated at review gates (commit and PR review).
