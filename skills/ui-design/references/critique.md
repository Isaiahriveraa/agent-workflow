# Critique

Inspect the rendered UI and exercise the changed paths. Use supported narrow and wide layouts and shipped themes, within the hub's bounded-verification rules. For design-only work, propose checks rather than claiming a rendered result.

Apply only relevant sections. This is an outcome check, not a second styling specification; use the linked reference when diagnosing a failure. Centered layouts, peer cards, gradients, separators, and unique values are not defects by themselves. See `dislikes-and-exceptions.md` for taste conflicts.

## Task and understanding

Use `audience-and-wording.md` and `hierarchy.md`.

- [ ] The task, relevant information, and next action are understandable without hidden instructions or unnecessary recall.
- [ ] Emphasis reflects the task; peer choices remain comparable and important exceptions are noticeable.
- [ ] Wording is accurate, uses consistent terms, and explains consequences before commitment. Learning content includes necessary reasoning and actionable feedback.

## Behavior and control

Use `familiar-interactions.md` and `components.md`.

- [ ] Controls behave as promised, use appropriate semantics, and expose relevant names, values, and states.
- [ ] The primary path works with keyboard and supported pointer/touch input; focus is visible, reaches the right place, and is not trapped or obscured.
- [ ] Essential actions do not depend only on dragging, hover, color, or a hidden gesture. Applicable target-size and spacing requirements are checked.
- [ ] Pending, saved, failed, stale, and unavailable states are distinguishable where relevant; the display matches the actual result.
- [ ] Constraints and risk-appropriate safeguards prevent avoidable mistakes. Failure, correction, cancellation, and navigation preserve work or clearly explain its loss.
- [ ] Advanced options remain findable; essential costs and conditions are not hidden. Declining or leaving is not obstructed, and frequent-use paths remain efficient.

## Layout and readability

Use `layout.md` and `type-color-space.md`.

- [ ] Grouping, reading order, spacing, and line length support scanning and comprehension without clipping essential content.
- [ ] Enlarged text, browser zoom, realistic long or missing content, and supported language directions preserve meaning and access to actions.
- [ ] Text, meaningful control/state graphics, and focus indicators meet applicable contrast requirements in each shipped theme. Higher house targets are reported separately.
- [ ] Tokens and density patterns are coherent with the product. Any exception solves a concrete problem rather than introducing accidental inconsistency.

## Motion, when changed

Use `motion-and-transitions.md`.

- [ ] Movement has a purpose and does not delay work; repeated input, reversal, and interruption preserve correct state and focus.
- [ ] Reduced motion preserves meaning and feedback. Necessary status information does not depend on an animation or disappear before people can act.

## Report and recheck

Prioritize findings by their effect: blocked task or lost work, access barriers, misunderstanding, then visual refinement. For each finding, state the location, evidence, user impact, and smallest proposed fix. For behavior findings, include the action sequence and observed result, not only a screenshot region. Separate an observed failure from a preference or hypothesis needing user validation.

Apply fixes only when authorized, then rerun the affected checks. Mark results pass, fail, unverified, or not applicable. Name missing evidence; distinguish user observation from render inspection and automated checks. None alone establishes complete accessibility conformance or proves human understanding. Candidate references are not approved user preferences; use `approved-examples.md` when approval matters.
