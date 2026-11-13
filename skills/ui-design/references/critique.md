# Critique

Use this checklist on the rendered UI, not the code. Look at the screenshot at desktop and mobile widths, in every theme you ship. Every failing item needs a fix, not a note.

## How to run a critique

- **Fix the scope first**: one screen or flow, the mode and stance it is meant to
  serve, and the brief's acceptance criteria. A critique without a target is a
  taste argument.
- **Look before speaking.** Everyone views the same screenshots at the same
  width, in the same theme. Then go round-robin; if the group is large, quota
  each person (two things that work, one that should change) so the loudest
  voice does not set the agenda.
- **Reformulate opinions into goals.** "This is too red" becomes "Does the red
  help the reader decide faster than a neutral mark would?" A critique question
  is answerable; a preference is not.
- **Record every item** in one visible list with owner and status. Verbal-only
  critique evaporates.
- **Separate defect from taste.** A contrast failure, clipped label or missing
  state is a defect; a different radius is taste. Do not spend defect time on taste.
- **Stop at thirty minutes** on one screen. Longer sessions produce politeness,
  not quality.
- **End with the fix list, not a verdict.** "Ship / rebuild / fix these three
  things" is the useful output.

## Checklist

**Hierarchy**
- [ ] One element is clearly primary, and you can name it.
- [ ] Secondary and tertiary elements are visibly quieter, not just smaller.
- [ ] Headings, labels, and metadata do not share one weight and color.
- [ ] Only one action is primary per region.
- [ ] The common scan decision is possible without reading an inline form.
- [ ] Routine explanations, original values and advanced controls are behind a clear Edit/Details action.
- [ ] Every default-visible sentence earns its place; repeated field labels and redundant helper copy are removed.

**Structure and layout**
- [ ] Content aligns to a visible grid: shared left edges, consistent column logic.
- [ ] Content width is constrained; prose is not full-bleed.
- [ ] Not everything is centered. At most one centered moment per screen.
- [ ] Sections are separated by larger space than the gaps inside them.
- [ ] Grouping is shown by proximity first, not by boxes around everything.
- [ ] Metadata facts are separated by slots, components, or lines — never by `·`, `•`, or `|`.

**Spacing and rhythm**
- [ ] Every gap comes from the product's spacing scale.
- [ ] Spacing differs between groups and sections, so the page has rhythm.
- [ ] No element is jammed against an edge or a neighbor.
- [ ] Every summary cluster carries one figure and one context fact, not four fragments sharing a corner.
- [ ] No gap sits below the smallest step of the scale. If one does, the group has too many parts — cut a part instead.
- [ ] Bars and meters have a full step of space from adjacent text, so they read as graphics rather than underlines.

**Components**
- [ ] Every card earns its surface; no grid of identical cards without emphasis.
- [ ] Empty, loading, and error states exist and look designed.
- [ ] Focus rings are visible. Targets meet the minimum size.
- [ ] Decorative dividers are subtle; strong outlines are reserved for necessary indicators and focus.
- [ ] Scan rows expose at most a few controls. Opening Edit reveals the full task without losing values.

**Typography**
- [ ] One UI family (plus at most one display family); no two near-identical sans-serifs.
- [ ] Every size comes from the scale. No one-off sizes, no 11px tier.
- [ ] Prose is 45–75 characters wide; `max-width: 65ch` on the text container, not the page.
- [ ] Long records and rationales are capped near 62ch, so a second line stays short.
- [ ] Text is left-aligned. Nothing is justified without hyphenation.
- [ ] No paragraph ends in a lone word; no heading ends in a preposition on its own line. `text-wrap: pretty` / `balance` applied, then checked by eye.
- [ ] Headings tighten (`−0.01em` to `−0.03em`) as they grow; all-caps is limited to 2–3 word labels with open tracking.
- [ ] Numbers that change or stack use `tabular-nums`; precision is consistent down a column.
- [ ] Type, not surface, carries most of the hierarchy on the screen.
- [ ] 200% zoom and a 390px width do not clip, overlap or truncate a decision-critical value.

**Craft**
- [ ] One hairline weight; no 2px divider standing in for a group.
- [ ] Radius nests: inner radius = outer radius − padding.
- [ ] One shadow language, or none. No border + ring + shadow on the same edge.
- [ ] Focus ring is visible on every interactive element, including icon buttons.
- [ ] Hover/active feedback is 120–160ms on color and background only.
- [ ] Disabled is visibly non-interactive, and distinct from a quiet secondary action.
- [ ] One icon family, one stroke width, optically sized to the text.
- [ ] The stance is nameable in one sentence, and the screen follows from it.

**Color and type**
- [ ] One accent. Color means something, not decoration.
- [ ] Chrome is neutral. Color appears only as a semantic glyph (flag, dot, badge, tick) at 6-10px, with a word beside it and a shape that survives colour blindness.
- [ ] No row tint, rail or card is coloured to say what a glyph could say.
- [ ] Body text meets 4.5:1; muted text meets it too.
- [ ] The dark theme meets its own targets, which are higher than the light theme's — not the light theme's ratios re-used.
- [ ] No text tier is lower-contrast in dark mode than in light mode.
- [ ] Every tinted container separates from the surface behind it, and in dark mode elevation is lighter than its parent, never darker.
- [ ] Type uses the scale; no one-off sizes.
- [ ] Supporting text is at least 14px; body/record names are at least 16px. The only 13px text is a tabular cell or header marked `data-ui-role="dense"`. Nothing was shrunk to satisfy a density target.
- [ ] No gradient, glow, or colored border on every element.
- [ ] The reusable rendered-DOM audit was run in each viewport/theme and in scan/edit/error states, with the right profile (product or brand) and the `dense` role on tabular cells; unresolved contrast sampling is reported, never passed.
- [ ] Inactive controls are visibly inactive and were not "fixed" to pass contrast.
- [ ] Text coverage, visible character/control counts and padding budgets are reported as local density heuristics, not a scientific crampedness score.
- [ ] A confirmed action shows success where it happened: a green tick on the control, plus a brief flush, suppressed under `prefers-reduced-motion`.
- [ ] A passing audit has not overruled the actual screenshot or the user's judgment.

**Motion and interaction**
- [ ] No entrance animations on page load; motion answers a state change.
- [ ] `prefers-reduced-motion` yields fewer and gentler transitions, not a broken page.
- [ ] Pressed, loading, success and failure states of the primary action exist.
- [ ] Focus moves with the change (dialog, delete, add) and returns to its trigger.
- [ ] Nothing is revealed on hover only; keyboard and touch can reach it.
- [ ] Modals are justified; inline expansion or a panel was considered first.

**Resilience**
- [ ] 200% zoom and 320px width reflow without clipping or horizontal scroll.
- [ ] A 40% longer language does not break a button, tab or header.
- [ ] The longest real string, the empty value and the hostile value are rendered.
- [ ] Dialog, error, offline and no-permission states were looked at, not assumed.

**Browser surfaces**
- [ ] Selection color, caret, scrollbar, placeholder and underline offset are themed.
- [ ] Tabular figures are used wherever numbers can change.
- [ ] Reduced motion, dark mode and forced colors do not lose information.

**Generic-AI tells** (any one present means the design is default, fix it)
- [ ] Three equal feature cards: icon, bold title, two lines of text.
- [ ] Purple-to-blue gradient hero with centered headline and two pill buttons.
- [ ] Identical radius, shadow, and border on every surface.
- [ ] Stat row of equal-size numbers with no explanation of which matters.
- [ ] Placeholder-like copy: "Lorem", "Your awesome product", "Transform your workflow".
- [ ] Facts joined by a centered dot: "Maya Okafor · 3 comments · 2 days ago", or a title built the same way from two fragments.
- [ ] The direction sits inside one of the five clusters in `craft.md` §6 (cream+terracotta serif, near-black+neon, broadsheet hairlines, SaaS card kit, template chrome).
- [ ] A different designer given the same brief would have produced a near-identical page (the unique test).
- [ ] A summary corner holding a figure, a meter, and two more facts, spaced with gaps below the smallest step of the scale.

## Fix moves

| Symptom | Fix |
|---|---|
| Nothing stands out | Pick the primary; quiet the others (lighter color, smaller, less space-stuffing) |
| Looks like a list of boxes | Remove surfaces; group with proximity; keep only the one card that is a real unit |
| Looks centered and generic | Left-align the body; keep one centered moment; add asymmetry on a grid |
| Feels cramped | Remove or defer copy and controls first, then add comfortable row spacing. Do not shrink text. |
| A corner is cramped | Cut a part from the cluster; return every gap to the scale; give bars their own step of space |
| Facts strung together with dots | Give each fact a slot (a column, an icon, a labelled pair) or delete it |
| Dark mode looks flatter than light | Raise the dark floors per tier, flip inset surfaces to lighter-than-parent, and re-check every container against its parent |
| Feels empty | Check whether the space is grouping anything; add content to the focal region, not the edges |
| Colors fight | Return routine metadata, labels, toggles and rails to neutral; keep accent mostly on the primary action. |
| Looks inconsistent | Replace one-off values with tokens; check radius and shadow language |
| Borders shout | Remove decorative boxes or use subtle hairlines; preserve legible inputs and a clear keyboard focus indicator. |
| Small copy strains | Raise supporting copy to 14px or more; delete/defer content instead of squeezing the layout. |

## Output

When reporting a critique, list each failing checklist item with the screenshot region it applies to, and the fix applied. Mark each item pass or fail after the fix, based on a new render.
