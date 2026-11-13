---
name: jnk-ui-design
description: Design and critique user interfaces at the level of an expert designer — frame the brief, choose a mode and stance, pick between directions, delete before styling, carry hierarchy with type and space, spend color at glyph scale, design every state and motion, then verify in a real browser with a deterministic readability/density audit. Use when building, restyling or critiquing a page, component, screen or app shell; when output looks generic, flat or AI-default; when auditing hierarchy, spacing, type, color, motion or states. Branches to brief, craft, typography, composition, layout, hierarchy, components, interaction, motion, color-system, type-color-space, imagery, accessibility, critique, evaluation, exemplars, inspiration and sources references.
---

# UI design

> Decide what matters most on the screen, then make everything else quieter.

This skill is not a style. It is a way of choosing, and it has to work for a
dense dark dashboard, a calm settings page, an editorial case study and a launch
hero. What stays constant is precision: a named stance, one clear hierarchy,
readable type, structure carried by type and space, color spent where it changes
a decision, every state designed, and the result looked at in a browser.

## Precedence: when rules conflict

A skill with this many rules will contradict itself on a real screen. Resolve
conflicts in this order, highest first:

1. **The job and the brief.** What the screen must let someone decide or do.
2. **Non-negotiables.** Accessibility semantics, consent, security, no data loss.
3. **The product's existing system.** Existing tokens, components and conventions win over this skill's taste.
4. **Mode and stance.** Utilitarian, editorial, warm, technical, bold — chosen from the brief.
5. **Craft rules** in the references below.
6. **Numeric defaults** (16px padding, 120–160ms, 45–75ch). Starting points, not laws.
7. **Audit thresholds.** Local policy heuristics. They never outrank a measured screen.

**A conflict is a decision, not a licence.** Name the rule you are breaking and
why, in one line, in your hand-off. "Table headers at 13px under
`data-ui-role="dense"` because the column set is 11 wide" is reviewable.
Silently following the weaker rule is not.

## Steps

0. **Frame the brief.** Answer five things before designing: who uses this and
   how often; what they must decide or do; what content actually appears (0, 1,
   1000 items; longest real string); what brand and system already exist; what
   "good" means for this surface. Make a material assumption explicit or ask;
   never default silently. Reference: `references/brief.md`.
1. **Name the mode, then the stance.** Mode is what the surface is for:
   **Operate** (a tool read daily), **Read** (text is the product), **Persuade**
   (the action is the point), **Experience** (the feel is the product). Mode sets
   ambition; stance sets texture: utilitarian, editorial, warm product,
   technical, bold brand. Say it in one sentence. Reference: `references/craft.md`.
2. **Two directions.** For a page or screen, sketch two structurally different
   layouts in ten minutes each (ASCII or a rough HTML file), then choose one and
   say why the other loses. For a component, sketch the version with one element
   deleted. A single direction committed blind is how a default ships.
   Reference: `references/exemplars.md`.
3. **Name the one thing.** The element the eye must reach first, and the single
   job of the screen. If you cannot name it, there is no hierarchy yet.
   Reference: `references/hierarchy.md`.
4. **Budget the default view.** List what the user must read to make the common
   decision; keep that. Move original values, explanations, advanced fields and
   rare actions behind a clear Edit/Details action. Never remove
   decision-critical information, consent, or a required question.
5. **Set the structure.** Grid, spans, content width, row density, edges and
   bleeding, what leads. Group by proximity before adding a surface or divider.
   References: `references/composition.md`, `references/layout.md`.
6. **Set type, then tokens.** One scale, one measure, one leading per role; one
   radius derived from a base; one spacing scale; one shadow language. Most
   hierarchy is weight, size and space, not borders or color.
   References: `references/typography.md`, `references/type-color-space.md`.
   Start from `scripts/tokens.css`.
7. **Build from anatomy and states.** Default, hover, focus-visible, active,
   disabled, loading, empty, error. Define motion for state changes, not
   decoration. The scan view is not the edit form.
   References: `references/components.md`, `references/interaction.md`,
   `references/motion.md`.
8. **Spend color, both themes.** Pick a color strategy (restrained, committed,
   full, drenched) from the stance. One accent, glyph-scale semantics, dark mode
   re-picked rather than inverted. Reference: `references/color-system.md`.
9. **Look, then audit.** Render with real content at 390 and 1440, in every
   theme, plus an opened editor and an error state. Fix what one look shows
   before looking again. Then run `scripts/audit-ui.js`, read
   `references/readability-density.md`, and walk `references/critique.md`. Judge
   the screenshot; a passing number never overrules it.
   Imagery and asset rules: `references/imagery.md`. Semantics, zoom, RTL:
   `references/accessibility.md`.

## Rules

- **Type carries the hierarchy first.** Weight, size and space before surfaces,
  borders or color. One scale, used only at its steps.
- **Delete before shrinking.** Cut or defer copy; never buy space with font size.
  The 14px floor holds, with one declared exception: `data-ui-role="dense"` at
  13px for tabular cells and headers.
- **One signal per meaning.** One accent for action and focus; one dot plus a
  word for status; one figure plus one context fact per cluster. A tinted row
  says nothing a glyph could not.
- **The One Voice Rule.** On a restrained screen the accent covers ≤10% of the
  visible surface. Its rarity is the signal.
- **One deliberate move per screen.** A type jump, an asymmetric split, a ruled
  table — one. Everything else conventional. Novel interaction is a bug.
- **Metadata is laid out, never punctuated.** No `·`, `•` or `|` between facts.
  Slots, components, or lines.
- **Structure is felt, not seen.** Hairlines before borders, borders before
  surfaces, surfaces before shadows. Shadows belong to overlays.
- **Every gap comes from the scale.** A gap below the smallest step means the
  group has too many parts — cut a part.
- **Every state is designed**, including the one nobody photographs: empty,
  loading, error, disabled, offline, no permission, 200% zoom.
- **Motion explains a change.** If you cannot name the state change, delete it.
  Respect `prefers-reduced-motion` with fewer, gentler animations — not none.
- **Own the browser surfaces.** Selection color, caret, scrollbar, focus ring,
  underline offset, placeholder, tabular figures. They are the cheapest proof a
  page was built rather than assembled.
- **Measure the rendered page.** Real font sizes, composited contrast, visible
  controls, text coverage, per-region budgets. Report what a metric means and
  where it cannot judge crampedness.
- **Every theme meets its own floors.** Dark mode is re-picked, its floors are
  higher, and elevation goes up.
- **Use real content.** Real names, real quantities, real empty values. Lorem
  ipsum and "Your awesome product" hide the layout problems you need to see.

## Ruts: do not land in any of these

AI-designed interfaces cluster. Landing in one means the direction was a reflex,
not a decision:

1. Cream ground (`#F4F1EA`-ish) + terracotta accent (`#D97757`-ish) + serif display.
2. Near-black ground + one neon accent + glow.
3. Broadsheet editorial: hairlines, zero radius, tiny tracked caps, no color.
4. The SaaS kit: one radius, one soft shadow, three equal cards, gradient wash.
5. Template chrome: ALL-CAPS eyebrow, `A · B · C` metadata, `Word — fragment`
   headlines, mono micro-labels, appended `→`.

**The unique test:** imagine the same brief given to another designer. If you can
guess the page they would produce, and yours is close, change yours and say what
you changed. The rut and its predictable opposite are both the rut.

Editorial work is not banned, and neither are hairlines. What is a rut is
arriving at the category's default look *by reflex* — or at its mirror image to
avoid it. A direction you chose, can defend, and can articulate in one sentence
is not a rut.

## Not for

- Illustration, photography direction, logo design, brand identity: use a
  design tool and a human art director. This skill can specify the treatment, not draw the asset.
- Data modeling, backend contracts, or product strategy: different skills.
- Pure accessibility audit without design changes: `references/accessibility.md`
  is a checklist, not a conformance tool.

## Pointers

- Brief, mode, stance, precision craft, color economy, originality, ruts: `references/brief.md`, `references/craft.md`
- Annotated before/after pairs (open in a browser): `references/exemplars.md`, `scripts/exemplars.html`
- Faces, scale, measure, leading, rag, numerals, punctuation: `references/typography.md`
- Grid, spacing, rhythm, clusters, metadata rows, containers: `references/layout.md`
- Larger composition: weight, tension, structures by stance, edges, cropping: `references/composition.md`
- Hierarchy, emphasis, focal point: `references/hierarchy.md`
- Buttons, cards, forms, nav, tables, states, targets: `references/components.md`
- Flows, feedback, errors, forms, overlays, keyboard, empty states: `references/interaction.md`
- Durations, easing, choreography, reduced motion: `references/motion.md`
- Ramps, 12-step roles, strategies, dark mode, gradients: `references/color-system.md`
- Type scale, spacing, color roles, contrast floors, tokens: `references/type-color-space.md`
- Imagery, icons, logos, avatars, data viz, media: `references/imagery.md`
- Semantics, names, zoom, cognitive load, i18n/RTL: `references/accessibility.md`
- Critique checklist and fix moves: `references/critique.md`
- Rubric, blind skill comparison, screenshot baselines: `references/evaluation.md`
- Deterministic audit, profiles, exemptions, limits: `references/readability-density.md`
- Working token starter: `scripts/tokens.css` (verified by `scripts/tokens-specimen.html`)
- Products and mechanics worth borrowing: `references/inspiration.md`
- Who the principles come from, and what was read: `references/sources.md`
