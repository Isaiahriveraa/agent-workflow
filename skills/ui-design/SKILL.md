---
name: ui-design
description: Visual and interaction design craft grounded in familiar human behavior. Use when building or restyling a page, layout, component, or screen; when asked for skeuomorphism, intuitive controls, or familiar interactions; or when auditing hierarchy, spacing, type, color, and usability. Applies familiar mental models before visual styling, without forcing realistic textures or ornamental 3D controls.
---

# UI design

> Decide what matters most on the screen, then make everything else quieter.

Make appearance, wording, and behavior serve the audience's task. This skill adds craft guidance after the product's purpose is known; it does not replace product decisions.

Make the behavior familiar before making the surface distinctive. Skeuomorphism borrows recognizable real-world cues; the useful goal is that people can predict what a control does and understand what happened. Familiar digital conventions count too. Physical realism is optional, not the default aesthetic.

Follow the hub's existing product approval, prototype, and UI-writer boundaries. This skill adds craft guidance; it does not authorize implementation or replace `/design`, `/plan`, `/prototype`, or Impeccable.

When used with `/skill:prototype`, apply this guidance to each direction as a complete design. Within an existing design system, preserve its visual language. When the agreed scope is a redesign, judge consistency against that direction's proposed theme, not mandatory retention of the old aesthetic. Directions may differ from each other; screens, components, and states within each direction should belong together. Commit to the direction within the requested prototype scope, without applying it to production before the user chooses.

## Durable principles

These describe useful outcomes, not a universal visual style. Apply them to the audience's task; use the references for the corresponding design decisions.

- **Make the next step understandable.** Use recognizable controls, clear labels, and visible context rather than requiring recall or hidden gestures.
- **Make priorities clear.** Emphasize what supports the task. Comparison may require equal emphasis; hierarchy is not a quota of one large number or button.
- **Keep the UI visually consistent.** New or changed UI should belong to the product's existing theme. When a design system exists, use its components, tokens, and interaction patterns rather than inventing competing styles. Apply them where they serve the task; consistency does not mean repeating the same card, accent, or decorative treatment everywhere. Preserve appropriate hierarchy and variety without making a screen feel out of place.
- **Prevent avoidable mistakes.** Explain constraints and consequences before commitment. Use safeguards proportional to the risk, not confirmation dialogs for every action.
- **Keep people in control.** Preserve work through failures, make commitments explicit, and provide appropriate correction, cancellation, or undo.
- **Show the actual state.** Distinguish pending, saved, failed, stale, and unavailable information when those differences affect a decision.
- **Reveal complexity when needed.** Keep uncommon options reachable without crowding the main path. Do not hide requirements, costs, or consequences needed for informed choice.
- **Adapt without losing meaning or access.** Preserve essential content and actions across supported input methods, viewport sizes, text enlargement, and languages.
- **Respect attention and choice.** Avoid fake urgency, misleading defaults, and obstructive cancellation. Support efficient repeat use without making beginners depend on shortcuts.

## Steps

1. **Establish the task.** Identify the audience, required outcome, current design system, and what is changing. Distinguish supplied facts and observed needs from assumptions.
2. **Load relevant references.** Use the index below before making the corresponding decision. A new screen may need several rows; a copy-only change does not need motion or layout guidance. Follow cross-references only when their condition applies.
3. **Design the whole interaction.** Resolve the message, hierarchy, controls, relevant states, and recovery. Reuse existing patterns and tokens. Plan purposeful motion only when it helps. Details belong in the selected references, not a new checklist for every task.
4. **Verify the changed surface.** Use the relevant sections of `references/critique.md`. Inspect the real render and exercise affected paths. Compare with neighboring screens for theme and design-system consistency, checking both out-of-place styling and overused visual treatments. For research or design-only work, report proposed checks without pretending to run an app. Keep existing bounded verification limits.

## Rules

- Do not invent product facts, audience research, or approved preferences. A candidate reference is not the user's taste.
- Visual heuristics are starting points, not universal bans. Audience evidence and an approved brief may override taste defaults, not accessibility or truthful behavior.
- Report unperformed checks as unverified. Inspection and model review do not prove human understanding, intuitive behavior, or accessibility conformance.

## Reference index — load when relevant

| When building or changing… | Read before deciding… |
|---|---|
| Controls, workflows, navigation, or skeuomorphic interactions | `references/familiar-interactions.md` — mental models, cues, feedback, recovery, keyboard and touch behavior |
| Headings, labels, explanations, lessons, feedback, or audience-specific wording | `references/audience-and-wording.md` — reader knowledge, content structure, student examples, comprehension checks |
| Animation, transitions, drawers, navigation motion, or moving feedback | `references/motion-and-transitions.md` — purpose, continuity, interruption, reduced motion; links to Impeccable's motion playbook |
| A new visual direction, a taste request, or a supplied inspiration | `references/approved-examples.md` — capture the specific lesson and approval; candidates are not user preferences |
| A rejected design, conflicting preference, or exception to a visual default | `references/dislikes-and-exceptions.md` — reason for rejection, context, and justified exceptions |
| A screen's focal point, emphasis, or action priority | `references/hierarchy.md` — primary and supporting information |
| Page structure, responsive layout, grouping, metadata, or content width | `references/layout.md` — grids, rhythm, clusters, and reading measure |
| Buttons, forms, cards, navigation, lists, tables, or component states | `references/components.md` — anatomy, relevant states, targets, and semantics |
| Typography, colors, spacing tokens, contrast, or themes | `references/type-color-space.md` — scales, roles, accessibility thresholds, and house preferences |
| A critique, pre-handoff review, or verification of a changed surface | `references/critique.md` — apply only relevant checks and report missing evidence |
| Attribution, source verification, or deeper reading | `references/sources.md` — upstream sources; local research citations also live in the relevant reference |
