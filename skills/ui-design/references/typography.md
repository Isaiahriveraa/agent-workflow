# Typography

Type is the interface. Most screens are read before they are looked at, so type
carries the hierarchy, the grouping and most of the perceived quality. Surfaces,
borders and color are the smaller half of the job.

Two rules sit above everything here:

1. **Layout is not a formula.** Line length, rag, leading and breaks are adjusted
   after the text exists, by looking at the rendered page. Numbers in this file
   are starting points with a plausible range, not targets to hit.
2. **The text's importance decides its treatment.** A figure that answers the
   user's question outranks a label that describes it, regardless of which is
   bigger in the mockup.

## 1. Choose the face, then stop

- **One UI family, plus at most one display family.** Two sans-serifs that look
  almost the same (Inter next to system SF, Geist next to Helvetica) read as a
  mistake, not a choice. Pick one and use its whole range.
- **Choose for the job.** UI faces need a large x-height, open apertures and
  distinct `1 l I` and `0 O`. Reading faces need a comfortable rhythm at 16–18px.
  Display faces need personality at 40px and are not used below 24px.
- **Check what you actually need before committing:** the weights you will use,
  tabular figures, a real italic (not a slanted roman), and the language coverage
  of the content.
- **Pair by contrast, not by similarity.** Serif with sans, geometric with
  humanist, tight display with open text face. If both families could be swapped
  for each other without anyone noticing, one of them is unnecessary.
- **Safe defaults** when there is no brand: Inter, Geist, IBM Plex Sans, Source
  Sans, or the system stack. Verify the license before shipping anything else.
- **Brand wins for face and color.** Structure, scale and grouping rules still
  apply on top of it.

## 2. Build a scale, then use only the scale

Pick one ratio and derive every size from it. 1.2 suits dense app UI, 1.25 is a
safe general choice, 1.333 suits marketing pages with large headings.

| Role | Size | Line height | Tracking | Weight |
|---|---|---|---|---|
| Display / hero | 40–64px | 1.05–1.15 | −0.02em to −0.03em | 500–600 |
| Page title | 28–32px | 1.2 | −0.02em | 600 |
| Section heading | 20–24px | 1.25 | −0.01em | 600 |
| Record name / body | 16–17px | 1.4–1.55 | 0 | 400–600 |
| Support / label | 14px | 1.45 | 0 to +0.005em | 400–500 |
| Micro label | 14px | 1.4 | +0.01em to +0.04em | 500 |
| Table cell / header (`dense`) | 13px | 1.4 | 0 | 400–500 |

- **The 14px floor holds.** Anything smaller is either a decorative mark or
  content that should be cut. Do not open an 11px metadata tier to fit more.
- **One declared exception: tabular data.** Table cells and headers may sit at
  13px when marked `data-ui-role="dense"`. It is opt-in markup, not a general
  tier, and it never applies to names, prose, labels, buttons or form values.
  Above 14px, table cells are fine too; below 13px is not a design decision.
- **Check what the face does at size.** Prefer a variable face with an `opsz`
  axis and `font-optical-sizing: auto`: small sizes get sturdier strokes, large
  sizes get finer. Never ship `font-optical-sizing: none` by accident.

- Set the scale in `rem`; keep the root at the user's default. Scale display
  sizes with `clamp()`, never the body.
- A size that appears once is a smell. If the design needs a new step, the scale
  was wrong, not the screen.

## 3. Measure: how long a line is

- **Body and prose: 45–75 characters**, comfortably 60–70. Below 45 the eye
  jumps too often; above 75 it loses the line start.
- Implement on the text container, not the page: `max-width: 65ch`. `ch` is the
  width of `0`, which approximates average character width closely enough.
- **UI strings are not prose.** A single-line label does not need a measure, but
  a long task name, a description or a rationale does. Cap those at ~62ch so a
  two-line row stays two short lines instead of one very long one.
- **Tables and lists get column widths, not a measure.** The column boundary is
  the line length.
- Narrow columns (sidebars, cards in a grid) want 40–50 characters. A 300px card
  holding a 90-character sentence is the failure behind most "cramped card" looks.

## 4. Leading

- Unitless line height, set per role, not per element: body 1.5–1.65, UI rows
  1.35–1.45, headings 1.05–1.25.
- **Longer measure needs more leading.** 75 characters at 1.4 reads dense; 45
  characters at 1.7 reads loose. Adjust one or the other, not both.
- Fonts with a large x-height look tighter at the same ratio. Judge the rendered
  paragraph, not the number.
- Do not set leading in `px` on body text; it breaks when the text size changes.

## 5. Rag, justification, orphans and widows

These are the four things readers feel without naming, and the four things a
generated layout never checks.

**Rag** is the uneven right edge of left-aligned text.

- **Left-align by default.** Justified text needs hyphenation and careful word
  spacing to avoid rivers of white; browsers do this poorly in narrow columns.
  If you justify, you must also set `hyphens: auto` and `hyphenate-limit-chars`,
  and you must look at the result. In app UI, do not justify.
- Avoid a rag that produces a very short last line or a single word. Nothing
  worse than three full lines and one orphan.

**Orphans** are a single word left alone on its own line at the end of a
paragraph. **Widows** are a short line pushed to the top of the next column or
page. Both make a paragraph look unfinished.

- `text-wrap: pretty` on paragraphs is the cheapest fix where supported. It
  looks at the last few lines and avoids a lone word; it is worth it on blocks
  of three lines or more, and does nothing useful on a one-line label.
- `text-wrap: balance` on headings of six lines or fewer (Chromium's limit;
  Firefox allows more). It evens the rag, which is what makes a two-line heading
  look deliberate. It is expensive, so apply it to headings, never globally.
- **Rewording beats forcing.** Shortening by two words is better than a
  non-breaking space that drags a long word down. In UI, if a label wraps to a
  lone word, the column is too narrow or the label is too long.
- Never break a short label onto two lines to fit. Shorten the label.
- Manual line breaks are legitimate for a headline you have looked at, and wrong
  as a general layout tool. A hard break that survives a viewport change is a bug.

## 6. Case, tracking and emphasis

- Tighten as size grows, open as size shrinks: −0.02em above 32px, −0.01em at
  20–24px, 0 at 16px, +0.01em at 14px.
- **All caps only for short labels** (2–3 words), with +0.04em to +0.08em
  tracking in a proportional face. Mono caps keep normal tracking, because the
  face is already spaced. Sentence case reads faster for anything longer.
- **Do not set display type at bold-and-above by reflex.** Large headings at
  500–600 with tight tracking read more expensive than 700; heavy weights belong
  to small sizes that need to hold against a busy ground.
- Never letter-space lowercase body text to "look editorial".
- Emphasis: weight or a color tier, one at a time. Bold plus color plus a
  background is three signals for one meaning.
- Italic is for titles of works and genuine emphasis, not for labels.

## 7. Numerals and fine detail

- `font-variant-numeric: tabular-nums` in tables, counters, timers and any column
  of figures; `proportional-nums` in running prose.
- Same decimal precision down a column. Right-align numbers; left-align text.
- Typographic characters: `−` for minus, `–` for ranges, `’` and `“”`,
  `…` not three dots, a downward apostrophe (never a prime), straight marks only
  for feet and inches.
- **Hyphenate only justified text.** Justification without `hyphens: auto` and a
  language attribute produces rivers; app UI should not justify at all.
- **Paragraph space XOR first-line indent.** One or the other, never both. Use
  space in UI, indent in long-form editorial prose.
- `font-feature-settings` for the few that matter: `"ss01"`/`"cv05"`-style
  alternates when the face has a better `l` or `1`, never as a global toy.
- Do not build a value by concatenating strings (`"$" + price + "/mo"`). The
  figure, its unit and its label are separate elements at their own steps.
- Optical alignment: the left edge of a `T` and an `O` do not look aligned.
  Pad round letters slightly, or accept a half-pixel in exchange for not
  over-engineering.

## 8. Hierarchy through type alone

Before adding a surface, a border or a color, try type.

- Weight is the strongest cheap lever, then size, then a color tier.
- Two weights and one muted tier usually carry a whole screen. A third weight
  should be the exception.
- **Eyebrow over value** (small muted label above a larger value) labels a figure
  without a card, a border or an icon.
- **Label beside value** (a two-column labelled pair) suits detail panels.
- Do not bold everything that seems important. If everything is bold, the start
  of the screen is wherever the eye lands, which is the same as no hierarchy.

## 9. Grouping and rhythm

- **Space above a heading is larger than the space below it.** A heading belongs
  to what follows, not to what precedes.
- Pick one way to separate paragraphs: blank space in UI, first-line indent in
  long editorial prose. Never both, never a blank line plus an indent.
- Vertical rhythm comes from the spacing scale, not a strict baseline grid.
  Reserve a true baseline grid for editorial or print-like layouts.
- Adjacent text at the same size with different leading reads as misalignment.
  Keep leading per role and keep roles consistent.

## 10. Type inside components

- **Buttons:** one line, 14–16px, weight 500–600, sentence case, no all-caps, a
  stable width while loading. Minimum 44px tall on touch.
- **Inputs:** 16px on mobile so iOS does not zoom on focus. Label above at 14px
  muted (13px only if you take the `dense` tier deliberately, and labels are not
  tabular data, so do not). Placeholder is an example, never the label.
- **Tables:** 14px cells by default; 13px cells and headers with
  `data-ui-role="dense"`; 36–48px rows; tabular figures for numbers.
- **Empty states:** one sentence and one action, both readable, not a decorative
  illustration with 11px captions.
- **Truncation:** `text-overflow: ellipsis` on one line only, with the full value
  available. Never truncate a decision-critical value such as a name in a review
  queue.

## 11. Test the type

Do this on the rendered page, not the CSS.

- Read the longest realistic string, not the placeholder. Use real names.
- Look for: rivers (justified), a single-word last line, a two-line button,
  a heading that breaks at a preposition, numbers that jitter when they change,
  text that clips instead of wrapping.
- Check 390px width, 200% browser zoom, and each theme. Long names, long emails,
  long unbroken URLs.
- Check the zoom case specifically: fixed `px` heights on text containers are
  where 200% zoom breaks.

## Tells and fixes

| Tell | Fix |
|---|---|
| Every paragraph runs the page width | `max-width: 65ch` on the prose container |
| Justified body with white rivers | Left-align; hyphenate only if you must justify |
| A heading ending in one lonely word | `text-wrap: balance`, or reword |
| Paragraphs ending in a two-word orphan line | `text-wrap: pretty`, or trim a clause |
| Labels and body at the same size and weight | Give labels a quieter size/weight tier, not a new color |
| Two near-identical sans-serifs | Use one family |
| An 11px metadata tier | Cut the metadata or move it behind Details |
| Numbers shifting width as they update | `tabular-nums` |
| All-caps body copy | Sentence case, unless it is a 2-word label |
| Bold, colored and boxed for one emphasis | Keep one signal |
