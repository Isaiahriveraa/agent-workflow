# Motion and transitions

Use motion to explain cause and effect, preserve orientation, or give meaningful feedback. A static interface is better than movement without a job.

## Reuse the existing motion playbook

For motion work, read the hub's `skills/impeccable/reference/animate.md`. It owns motion planning, timing starters, implementation choices, and performance checks. Follow its existing approval and prototype gates. Do not introduce a competing timing scale or a new animation library here.

This reference adds interaction-specific acceptance checks and explicit reduced-motion alternatives. If the playbook is unavailable, report that limitation and use established project motion tokens; do not silently assume its timings.

## Choose the purpose before the effect

In current task notes, name what changed, what the movement explains, and what stays usable during it. Reuse the audience and surface context from `audience-and-wording.md`.

- **Task-focused surfaces:** prioritize quick response and repeated use. Settings and study tools should not make people wait through a performance.
- **Expressive surfaces:** a launch or portfolio may earn an authored moment, but navigation, content, and controls must remain available.
- **Continuity:** connect an opening panel to its origin, preserve item identity during reorder, and keep focus and reading context sensible. A crossfade alone does not explain every transition.
- **Interruption:** repeated activation, reversing direction, navigating away, or closing mid-transition must not queue stale effects, lose input, or leave controls stuck.
- **Duration and easing:** choose by distance, size, purpose, and frequency using existing tokens. A reference's duration or spring is not a universal rule.

## Check by interaction

| Interaction | What motion can explain | Acceptance and reduced-motion alternative |
|---|---|---|
| Button or switch | Input was received and state changed | Immediate visible state; repeated input stays correct. A static state change can replace scale or bounce. |
| Drawer or dialog | Where the surface came from and how to leave | Opening and closing can reverse safely; focus enters and returns appropriately. Remove travel under reduced motion without losing visibility or focus behavior. |
| Navigation | Relationship between destinations | Correct URL, back behavior, focus, and scroll context do not depend on choreography. Prefer an immediate change when movement is reduced. |
| Reorder | Which item moved and its destination | Keep identity clear, provide a non-drag alternative, and announce the outcome. A static position update with feedback remains usable. |
| Loading or saving | A real operation is in progress | Never invent progress or hold a completed result for animation. Provide meaningful status text; avoid unnecessary moving indicators in reduced-motion mode. |
| Success or error | Outcome of the action | Persist the information long enough to act on it; do not communicate only through a shake, flash, or disappearing celebration. |

Honor the platform's reduced-motion preference, including `prefers-reduced-motion` on the web. Remove nonessential travel, zoom, parallax, and looping movement while preserving state and feedback. Do not merely speed up a large movement. Autoplaying content has separate pause/stop requirements where applicable; reduced-motion support is not a substitute.

## Verify

Exercise the real interaction at desktop and mobile sizes, with keyboard and supported touch paths, reduced motion enabled, and rapid interruption/reversal. Inspect performance on representative hardware. Do not claim accessibility or smoothness from a recording alone. Report untested paths as unverified.

## Sources

- [Carbon motion overview](https://carbondesignsystem.com/guidelines/motion/overview/): productive versus expressive motion and context-dependent timing. IBM's brand choices are examples, not this skill's required visual identity.
- [NN/g: The Role of Animation and Motion in UX](https://www.nngroup.com/articles/animation-purpose-ux/): feedback, spatial relationships, and avoiding distraction.
- [W3C: Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html): disabling nonessential interaction-triggered motion, SC 2.3.3 at Level AAA. This skill adopts reduced motion as a design default; do not mislabel that criterion as AA.

Public text consulted 2026-10-15. Embedded demonstrations were not interactively tested.
