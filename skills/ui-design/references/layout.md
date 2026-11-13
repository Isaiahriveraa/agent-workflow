# Layout

Layout is how content relates across space. Strong layouts have a visible structure the reader can feel without being told. Weak AI layouts are centered stacks of equal-width sections with no tension between them.

## Grid first

- Choose a column count and a gutter before placing anything. A 12-column grid is a safe default for web. A 4-column grid suits mobile.
- Align edges, not centers. Elements that share a left edge read as one group, even when their widths differ.
- Place content on the grid. Do not nudge elements between grid lines to make them "look right"; if they look wrong, the grid is wrong.
- Use a few widths, not many. Pick a small set of spans (e.g. 1/3, 1/2, 2/3, full) and reuse them.
- **Keylines** are the vertical lines things align to when they sit outside the column grid: card edges, icon rails, table start, the leading edge of an image. Choose two or three per screen, at multiples of the grid, and hold them across sections. Most "slightly off" layouts are missing a keyline, not a column.
- **Component grid vs baseline grid.** An 8px square grid governs component sizes and padding; a 4px baseline governs icon and text placement. They coexist; the type scale does not need to land on the baseline in UI work (see `typography.md`, rhythm).
- For a composed page rather than a grid, read `composition.md`.

### Proportion systems (optional, taste-driven)

Ratio systems give an unforced set of relationships. They are a starting point, not a law.

- **Fibonacci spans**: a 13 | 8 | 5 | 3 column split gives a clear dominant region and supporting regions. Use it when one area should clearly lead.
- **Modular type and space**: a ratio such as 1.25 or 1.333 between steps, rounded to the grid.
- **Golden ratio (~1.618)**: useful for a hero image against a text column. It is one ratio among many. Judge the result by how it reads, not by the ratio.

State which system you used and why. "We used it because it looked right" is not a reason; "the hero needs to dominate the sidebar" is.

## Balance and intentional imbalance

- **Symmetry** reads formal and stable. It suits pricing pages, auth screens, and anything asking for calm trust.
- **Asymmetry** reads active and editorial. Offset a large element against a small one with generous space between. The Swiss tradition (Müller-Brockmann) uses asymmetry on a strict grid to keep it from looking random.
- **Intentional imbalance**: one heavy element on one side, balanced by several light elements or a large empty area on the other. Balance is about visual weight, not about equal sides.
- Do not center everything. Centered stacks are the default AI layout. Center one moment (a hero headline, an empty state) and align the rest to the left edge.

## Closure and grouping (Gestalt)

Use these to show structure with less ink.

- **Proximity**: items close together read as one group. Make the gap between groups larger than the gap inside them, and most grouping needs no border. A label sits closer to its own field than to the next label; a control far from its related content gets overlooked (NN/g, "Proximity Principle in Visual Design"; "Group Form Elements Effectively Using White Space"). Apple's HIG says the same: alignment reads as relation, indentation reads as subordinate (Layout, "Visual hierarchy").
- **Similarity**: items that share color, shape, or size are read as one set. Use it to make a set obvious, and break it deliberately to mark an exception.
- **Closure**: the eye completes shapes and groups that are implied but not drawn. You can often remove a border or a card background and the group still reads.
- **Common region**: a shared background or border groups items. Use it only when proximity cannot show the grouping (NN/g, proximity article: "varying amounts of whitespace" is the first tool).
- **Continuity**: items aligned along a line read as a sequence. Use it for steps, timelines, and nav.

## Rhythm and spacing

- Use one spacing scale for the whole product, for example 4, 8, 12, 16, 24, 32, 48, 64. Every gap comes from the scale.
- Vertical rhythm: sections separated by a larger step than the gaps inside them. If section gaps and inner gaps match, the page reads as one undifferentiated list.
- Start with more space than you think you need, then remove space where it is not grouping anything.
- Group spacing as a relationship: inner padding < gap between siblings < gap between sections.

### Measured density

Use `scripts/audit-ui.js` and the method in `readability-density.md`. Measure
rendered text coverage, visible character/control counts and per-region padding
at the actual viewport and UI state. Review a collapsed scan row separately
from an explicitly opened editor, and a data table under the `dense` profile
separately from both. Do not declare a whole page comfortable because one large
empty margin lowers its aggregate text percentage.

These measurements are repeatable warning limits, not a validated human
crampedness score. Cut/defer content before widening padding; never shrink type
or hide necessary questions to pass. Screenshot judgment and user feedback
remain the acceptance criteria for restraint and intuitive use.

## Clusters and micro-layouts

A cluster is a small group with a single job: a status readout, a figure with a meter, a metadata row, a user chip. It fails in the opposite direction from a page — an under-designed page looks empty, an over-stuffed cluster looks cramped, because every part was added and none were removed.

- **One job, one figure.** A summary cluster carries one number and at most one context fact. Two facts is two clusters; four is a report, and a report belongs in the content region, not in the corner of a header.
- **Budget the parts before styling them.** A figure, its unit, a bar, and two facts is five elements sharing the space of one sentence. Delete first: most of those facts already live elsewhere on the screen — a filter count, a group header, a row of the list itself — so repeating them crowds the one place the reader looks for the answer.
- **Never build a value by concatenating strings.** `7` joined to `/23 done` renders until it wraps or a part changes size, then breaks. The figure, its unit, and its label are separate elements at their own type step, sized by their own content.
- **Every gap comes from the scale, including the small ones.** If your smallest step feels too wide inside a cluster, the cluster has too many parts: cut a part rather than inventing a smaller gap. Sub-scale gaps are how a group comes out cramped, because nothing has room while nothing announces a boundary either. A gap you had to reach below the scale for is a message about the content.
- **Bars and meters are graphics, not text.** Give a bar a full step of space from any text above or below it. A bar tight against a label reads as an underline — a typographic accident rather than a measure.
- **Two lines is the ceiling.** If a cluster needs a third line, the extra lines belong in another region, or in the bin.

## Metadata rows

A metadata row answers small questions about one thing: who, when, how many, what state. The whole problem is how those answers relate to each other. Punctuation is not an answer to it.

- **Never glue facts with a separator glyph.** A centred dot (`·`), bullet, or pipe between fragments — `Author · 3 comments · 2 days ago` — is a single run of text pretending to be a layout. It is also a tell: it is what appears when nobody decided which fact matters, and it survives review because each individual fact seems harmless. Do not use them.
- **Choose a layout instead.** One of these covers every case:
  - **Aligned slots.** One fact per column, separated by alignment, with edges shared down the page. Best for lists and tables where many rows carry the same facts.
  - **A component per fact.** An avatar with a name, an icon with a value, a badge with a count. The shape does the separating, and each fact keeps its own target and state.
  - **Labelled pairs.** Labels in a left column, values in a right column, one fact per line. Best in a detail panel where the facts are peer data.
  - **Cut it.** Most such fragments are decoration. Keep the one that changes a decision and delete the rest.
- **In running prose, use prose.** A sentence that genuinely joins two facts uses a comma, a conjunction, or a line break — all of which read.
- **Compound names are the same problem.** When joining two name fragments feels like it needs a dot, it needs a hierarchy: one name as the heading and the other as its parent, or a colon, or a second line. The glyph avoids that decision instead of making it.

## Container and measure

- Limit reading text to about 45–75 characters per line. Longer lines make reading tiring. Mechanics, CSS and the rag/orphan rules: `typography.md`.
- Constrain the content width (for example 64–80rem for a page, 40–60rem for prose). A full-bleed text column is a common AI mistake.
- Use full-bleed only for media, dividers, and surfaces that should span the viewport.

## Negative space

- Empty space is a design element. It isolates the focal point and signals confidence.
- Do not fill every gap with a card, icon, or stat. A sparse region next to a dense one creates contrast.
- Check: if you remove an element, does the layout get worse? If not, the element is decoration.

## Media and frames

Pick two or three aspect ratios for the product and use only those: 16:9 for
leads, 4:3 or 1:1 for cards, 3:2 for editorial, plus a portrait ratio if the
content needs one. A container sets `aspect-ratio`, the image covers it, and the
focal point is chosen with `object-position`, never by stretching. Full-bleed
media owns its section; media inside a column shares the column's edges. Details
in `imagery.md`.

## Responsive

- Decide the reflow before styling: what stacks, what hides, what keeps its order. Stacking order is a hierarchy decision.
- At small widths, the primary element goes first. Do not let a sidebar or ad push the focal content below the fold.
