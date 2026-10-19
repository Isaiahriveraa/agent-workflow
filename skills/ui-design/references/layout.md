# Layout

Layout is how content relates across space. Make relationships, reading order, and actions clear. Centered stacks, symmetry, and equal-width sections can work when they support the task; visual tension is not a usability requirement.

## Grid first

- Reuse the product's grid and gutters. For a new layout, choose a structure suited to its content; a simple stack may not need a column grid.
- Use shared edges and alignment to communicate relationships. Choose leading, centered, or other alignment by content and reading direction.
- Use the grid for structural alignment. Allow optical adjustments where they improve perceived alignment without breaking the structure.
- Use a few widths, not many. Pick a small set of spans (e.g. 1/3, 1/2, 2/3, full) and reuse them.

### Proportion systems (optional, taste-driven)

Ratio systems give an unforced set of relationships. They are a starting point, not a law.

- **Fibonacci spans**: a 13 | 8 | 5 | 3 column split gives a clear dominant region and supporting regions. Use it when one area should clearly lead.
- **Modular type and space**: a ratio such as 1.25 or 1.333 between steps, rounded to the grid.
- **Golden ratio (~1.618)**: useful for a hero image against a text column. It is one ratio among many. Judge the result by how it reads, not by the ratio.

Use a ratio system only when it helps the composition. Do not add one or require a written ratio rationale for a routine layout change.

## Balance and intentional imbalance

- **Symmetry** reads formal and stable. It suits pricing pages, auth screens, and anything asking for calm trust.
- **Asymmetry** reads active and editorial. Offset a large element against a small one with generous space between. The Swiss tradition (Müller-Brockmann) uses asymmetry on a strict grid to keep it from looking random.
- **Intentional imbalance**: one heavy element on one side, balanced by several light elements or a large empty area on the other. Balance is about visual weight, not about equal sides.
- Use alignment to support the content. Left alignment often helps scanning; centered layouts may suit a short focused flow or an approved visual direction. Do not impose a one-centered-moment quota.

## Closure and grouping (Gestalt)

Use these to show structure with less ink.

- **Proximity**: items close together read as one group. Make the gap between groups larger than the gap inside them, and most grouping needs no border. A label sits closer to its own field than to the next label; a control far from its related content gets overlooked (NN/g, "Proximity Principle in Visual Design"; "Group Form Elements Effectively Using White Space"). Apple's HIG says the same: alignment reads as relation, indentation reads as subordinate (Layout, "Visual hierarchy").
- **Similarity**: items that share color, shape, or size are read as one set. Use it to make a set obvious, and break it deliberately to mark an exception.
- **Closure**: the eye completes shapes and groups that are implied but not drawn. You can often remove a border or a card background and the group still reads.
- **Common region**: a shared background or border groups items. Start with proximity; use a surface when it clarifies containment, interaction, or separation from neighboring content.
- **Continuity**: items aligned along a line read as a sequence. Use it for steps, timelines, and nav.

## Rhythm and spacing

- Reuse the spacing tokens in `type-color-space.md`; do not introduce a competing scale here.
- Vertical rhythm: sections separated by a larger step than the gaps inside them. If section gaps and inner gaps match, the page reads as one undifferentiated list.
- Start with more space than you think you need, then remove space where it is not grouping anything.
- Make grouping legible through relative spacing. Interior padding, sibling gaps, and section spacing depend on density and containment, not a fixed inequality.

## Clusters and micro-layouts

A cluster is a small group with a single job: a status readout, a figure with a meter, a metadata row, a user chip. It fails in the opposite direction from a page — an under-designed page looks empty, an over-stuffed cluster looks cramped, because every part was added and none were removed.

- **Budget content by the decision.** Keep the figures, units, and context needed to understand the summary; remove unrelated duplication. Use `hierarchy.md` to decide emphasis.
- **Keep meaning intact.** A localized phrase or value may belong in one text unit. Split elements only when separate semantics or layout behavior helps; do not break a meaningful phrase to style every fragment independently.
- **Keep relationships clear.** Use the existing spacing scale and appropriate density. If a group feels cramped, inspect content, width, wrapping, and grouping before shrinking text or adding tiny gaps.
- **Separate graphics from text.** Give bars and meters enough space to remain distinct from underlines and labels, using the product's tokens.
- **Allow content to grow.** Wrapping, text enlargement, and translations may need more lines. Reflow or regroup rather than clipping essential information to satisfy a line-count limit.

## Metadata rows

A metadata row answers small questions about one thing: who, when, how many, what state. Choose its structure by scanning, wrapping, and reading order rather than banning punctuation.

- **Prefer structured facts.** For repeated records or interactive metadata, give each fact its own semantic element and predictable slot. Compact inline separators can work when they do not create confusing announcements, awkward wrapping, or ambiguous targets. Inspect the actual result.
- **Choose a layout appropriate to the task.** Useful options include:
  - **Aligned slots.** One fact per column, separated by alignment, with edges shared down the page. Best for lists and tables where many rows carry the same facts.
  - **A component per fact.** An avatar with a name, an icon with a value, a badge with a count. The shape does the separating, and each fact keeps its own target and state.
  - **Labelled pairs.** Labels in a left column, values in a right column, one fact per line. Best in a detail panel where the facts are peer data.
  - **Omit unnecessary facts.** Keep information that helps identification, interpretation, or action; do not delete useful context merely to make the row sparse.
- **In running prose, use prose.** A sentence that genuinely joins two facts uses a comma, a conjunction, or a line break — all of which read.
- **Show meaningful relationships.** A parent and child name may need a heading, colon, or second line. Choose what communicates that relationship; a glyph alone is not a hierarchy.

## Container and measure

- Limit reading text to about 45–75 characters per line. Longer lines make reading tiring.
- Constrain prose by readable line length in the actual typeface and size, not a universal container width. Tables, editors, and comparison tools may need wider regions.
- Use full-width regions when the content or task benefits, while keeping individual text blocks readable.

## Negative space

- Empty space is a design element. It isolates the focal point and signals confidence.
- Do not fill every gap with a card, icon, or stat. A sparse region next to a dense one creates contrast.
- Check whether each element helps meaning, navigation, trust, or the approved visual character. Decoration can contribute to the experience without earning the emphasis of essential content.

## Responsive

- Decide reflow and reading order before styling. Keep essential actions and information reachable; collapsing a region must not silently remove functionality.
- Prioritize the task at narrow widths without breaking a meaningful sequence or separating instructions from their controls. Keep visual, keyboard, and assistive-technology reading order coherent.
- Exercise browser zoom and enlarged text, long labels, large values, and supported translations. Avoid clipping or forced line limits that conceal meaning; contain necessary horizontal scrolling for data-heavy regions rather than making the whole page overflow.
- For supported right-to-left languages, use the appropriate reading direction and directional layout. Mirror directional controls where meaningful, not logos, media, or every icon indiscriminately.
