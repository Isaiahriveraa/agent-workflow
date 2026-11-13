# Composition

`layout.md` covers grids, spacing, grouping and the mechanics. This file is
about the larger shape: what leads, what supports, where the eye goes, and how
a page earns its proportions. Composition is a decision about *weight*, not a
decision about boxes.

## Start from the job, not the grid

Write the screen as a sentence first: **"A [person] needs to [decision], so the
first thing they see is [element], and the rest answers [questions]."** If the
sentence has two decisions, the screen has two jobs and should be two screens
or two clearly separated regions.

Then place three things, in order:

1. **The focal element** — the one thing the job depends on. It is not always
   the largest; it is always the first fixated.
2. **The supporting context** — what is needed to act on the focal element, one
   level down.
3. **The exits** — navigation, secondary actions, everything else. If the exits
   are loud, the screen is a menu with a content problem.

## Weight, tension, and balance

- **Balance is visual weight, not symmetry.** A large light area can balance a
  small dense one. Check by squinting: if one corner pulls, redistribute or crop.
- **Tension comes from contrast of scale**, not from decoration. A 2× type jump
  beside small text creates it; a 1.2× jump does not.
- **Asymmetry needs a grid to be read as intentional.** Off-center without
  shared edges reads as a mistake; off-center on a 12-column grid, with the
  other edge aligned to something, reads as composed.
- **Negative space is a material.** It isolates the focal element, signals
  confidence, and lets a dense region breathe by contrast. Do not fill it with
  a card, an illustration, or a stat.
- **One dominant region per viewport.** If you cannot point at it in one second,
  the composition is flat, whatever the spacing.

## Proportions

- Pick a span set and reuse it: 1/3, 1/2, 2/3, full, or 4/8, 5/7, 3/9 on twelve.
  Two spans plus full is often enough.
- **A ratio system is a starting point, not a law.** Fibonacci or golden splits
  help when you have no instinct; judge the result by reading it, not by the ratio.
- **Ratios carry to images and type.** A hero at 1.618:1 against a text column
  reads deliberate; 50/50 reads like a template.
- **Optical over mathematical.** A circle and a square of equal height do not
  look equal; a chevron in a circle needs a nudge; an `O` needs a hair of
  padding to sit on the same left edge as a `T`. Fix the eye.

## Structures worth knowing

**Editorial**

- Masthead: a kicker, a display line, a rule. One large moment, then quiet.
- Lead + index: one item with more space and larger type, the rest in a ruled
  list. The lead answers "start here"; the index answers "what else".
- Measures: body 45–75ch, display 12–22ch, captions and standfirsts 30–45ch.
- Rules instead of cards; a rule above a section is quieter than a rule below it.
- A pull quote is an argument, not decoration: it repeats the sentence the
  reader should leave with.

**Marketing / brand**

- Type-led hero: the headline is the image. Needs a real claim, a scale jump,
  and a single action.
- Product-led hero: one real screenshot or composed detail, cropped on an edge,
  with the interface legible. A fake dashboard of grey bars is a tell.
- Proof: one quantified claim or one customer line, set at caption scale,
  placed where the reader's doubt appears — not in a logo wall at the bottom.
- One graphic idea, held. Two ideas compete; three become a mood board.

**Product / app**

- Shell: chrome (nav, toolbar, sidebar) is quieter than the canvas. A second
  neutral layer separates chrome from content without a border.
- Two-pane: list owns the left rail, detail owns the reading width. The rail is
  never wider than the content it indexes.
- Inspector: the third pane is optional and attached to a selection; it never
  steals the main measure.
- Full-page editor: one column, ~68ch, the toolbar attached to the selection
  rather than a fixed bar of forty buttons.
- Settings: one column per section, sections separated by space and headings,
  destructive actions isolated at the bottom of their own block.

## Edges and cropping

- **Edges are composition.** Full-bleed media, a rule that runs off the page, or
  an image cropped by the container tell the eye the world continues. Boxed-in
  everything tells the eye the page is a slide.
- Content that meets the viewport edge should decide deliberately: bleed, pad,
  or crop. Accidental touching is the tell.
- Reuse one radius and one edge treatment; a mix of flush, padded, and rounded
  sections reads as assembled from parts.

## Density as composition

- Place a dense region next to a sparse one; the contrast is what makes either
  read. A page that is uniformly dense is a wall; uniformly airy is a brochure.
- Group by weight: a heavy heading over light body, a dense table under a quiet
  summary. Alternating weights create rhythm without extra ink.
- **Rhythm comes from repeated intervals**, not from varied ones. One section
  gap, one heading gap, one row gap. Variation is the exception, reserved for
  the one moment you want to mark.

## Tells

| Tell | Fix |
|---|---|
| Everything centered, including body copy | Left-align; keep one centered moment at most |
| Three equal cards under a centered hero | One lead plus a list, or a real comparison |
| A page of equally-weighted sections | Choose one dominant region; demote the rest by scale or space |
| Every section boxed or carded | Replace surfaces with rules and space |
| A dashboard of equal stat tiles | One figure per region, with its unit and context |
| Content jammed against the viewport edge | Decide bleed, pad, or crop |
| Decorative blobs, glows, gradients behind everything | Delete; earn the one focal graphic |
| Two competing focal points | Demote one to secondary; a screen has one first look |

## The squint test, and the cover test

- **Squint** (or blur the screenshot): one region should dominate, and you
  should be able to name it. If the blur is even grey, hierarchy is missing.
- **Cover the logo and the copy:** could this be any other product in the
  category? If yes, the composition is the category's default, not a design.
- **Remove one element:** does the screen get worse? If not, it was decoration.
