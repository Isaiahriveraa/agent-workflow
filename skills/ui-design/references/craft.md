# Craft, stance, and a point of view

A clean screen is not the same as a designed one. Clean is the absence of noise;
designed is the presence of decisions that hold together. This file is the part
that turns a correct layout into something that looks made by a person with
taste, and it is deliberately **not tied to one visual style**.

## 1. Pick a stance before you style anything

A screen with no stance drifts to the default: centered stack, equal cards,
one radius, one shadow, gray-blue accent. Choosing a stance first makes every
later decision follow from something.

| Stance | Reads as | Consequences |
|---|---|---|
| **Utilitarian** (Linear, Stripe dashboard, shadcn blocks) | Competent, fast, precise | Dense rows, 1px hairlines, small radii, neutral surfaces, one accent at icon scale, weight contrast instead of color, inverted-neutral primary button |
| **Editorial** (docs, magazines, case studies) | Considered, human, authoritative | Large display type with a narrow body measure, asymmetry on a grid, ruled lines instead of cards, serif or high-contrast display face, generous margins |
| **Warm product** (calm consumer apps, wellness, notes) | Soft, unhurried, trustworthy | Larger radii, one warm accent, muted tinted surfaces, more air, fewer borders, rounder type |
| **Technical** (consoles, logs, devtools) | Exact, unsentimental | Monospace for identifiers and values, tight rows, tabular figures, minimal decoration, density over air |
| **Bold brand** (launch pages, culture pieces) | Confident, memorable | Saturated fields, oversized type, hard contrast, one strong graphic idea |

- **Say the stance in one sentence before the first commit.** "Utilitarian, dark,
  dense list, one neutral primary" is a stance. "Modern and clean" is not.
- **The stance is chosen from the brief, the audience and the content.** A review
  queue that is read 20 times a day should not be editorial; a personal essay
  should not be a dashboard.
- **Bold is allowed, but only when the brief asks for it, and then commit.**
  Half-bold is the worst outcome: a saturated accent on a timid layout, or a
  giant headline over pale gray cards. If the brief says bold, use the color
  field and the oversized type; if it does not, stay neutral.
- **Structure rules never bend.** Hierarchy, scale, measure, grouping, contrast
  floors and target sizes hold in every stance. Stance changes surfaces, color
  volume and type personality, not legibility.

## 2. What "professional" actually is

It is not decoration. It is a short list of precision habits applied without
exception. Auditors and users read these as competence even when they cannot
name them.

- **One radius token, derived.** Set the base once and derive the rest as
  multipliers (`sm 0.6×`, `md 0.8×`, `lg 1×`, `xl 1.4×`). Changing one value
  rescales the product instead of leaving a mix of 6/8/10/12px that nobody chose.
- **Radius encodes elevation.** Controls sit at the smaller derived radius inside
  a larger container; menus and dialogs take the largest. A compact control must
  never out-round its own height.
- **Border colors come from one token in two strengths.** Separators use the
  quieter one, form controls the stronger. In dark mode both are better as a
  translucent white (8–15%) than as a solid grey: they adapt to whatever surface
  sits under them.
- **Hover is a tint of an existing surface token**, or the same token at lower
  alpha, never a new hue. Pressed is a one-step darker surface or a 1px shift.
- **Draw each border once.** Two alpha borders meeting at a corner double up and
  the intersection darker than the edges; overlapping borders on a card's header
  and body is the usual cause.
- **Shadows stay translucent.** An opaque shadow leaves a grey halo on any
  background that is not white.
- **Weight range is 400, 500, 600.** Anything heavier in UI copy reads as a
  different typeface. 500 labels, 600 titles and figures, 400 body.
- **One hairline weight.** 1px at consistent opacity, used for separators, and
  **0.5px on 2× DPR** so a retina line is not twice as heavy as it looked in the
  mockup. Never a 2px divider to make a group "clearer"; use space instead.
- **Structure should be felt, not seen.** Outer frame lines are quieter than
  inner ones; the further a line is from content, the fainter it gets.
- **Shadows belong to overlays only.** Menus, popovers, dialogs and toasts may
  float. Cards, rows, sections and buttons separate by a surface step and a
  hairline; a shadow on a card is the generated-UI default.
- **Radius nests.** Inner radius = outer radius − padding. A 12px card with 12px
  padding holds an 0px inner element or a rounded 2px one, not another 12px.
- **One shadow language, or none.** Two shadow recipes on one screen is a tell.
  Layers separate with a surface step or a hairline first, and any shadow stays
  translucent enough to adapt to a non-white background.
- **Focus is designed.** `:focus-visible` ring, 2px, offset, visible on every
  interactive element including icon buttons. Never `outline: none` alone.
- **Hover and active are quick.** 120–160ms, ease-out, color and background
  only. Never transition layout properties.
- **Disabled is not "muted".** It must be visibly non-interactive (lower
  contrast text, no hover, no cursor affordance) and must never look like a
  quiet secondary action.
- **One icon family, one stroke width.** 16px icons at 1.5px stroke, 24px at
  2px, optically sized to the adjacent text. Emoji are not icons.
- **Text baseline, not box edge.** Align labels to the text's baseline, not the
  input's border; a 1px vertical drift is visible in a form.
- **Empty values keep their slot.** A missing date reads "no date"; it does not
  collapse the column.
- **Truncation is a promise.** One line with ellipsis only where the full value
  is reachable. Never truncate a name the user must choose between.
- **No double borders.** Border + ring + shadow on the same edge is three
  attempts at one job.
- **Numbers don't jitter.** Tabular figures wherever a value can change, right
  aligned, with the unit as a quieter suffix rather than glued into the string.
- **Destructive actions are isolated.** Their own titled block, their own colour,
  never beside the primary action and never the default focus.
- **State is never colour alone.** A pill carries a tick, a dot carries a label,
  a status carries a word. Colour is the second signal, not the only one.
- **Optical over mathematical.** A circle and a square of the same height do not
  look the same size; a 1px inset badge does not look centered. Fix the eye, not
  the grid, when they disagree.
- **Elevation is one decision, not two.** Declare a surface with a border *or* a
  shadow, not both. A 1px border under a wide soft shadow is the ghost card: two
  depth languages arguing. Overlays take the shadow; everything in the page flow
  takes the surface step and the hairline.
- **A shadow has an offset and a soft blur.** Zero-offset colored halos are
  glows; hard offset shadows (`4px 4px 0`) belong to a neobrutalist world and
  read as a costume anywhere else.
- **Own the browser surfaces.** Text selection, the caret, custom scrollbars,
  placeholder color, underline offset and the numerals in tabular data belong to
  nobody's design system, so they default to the browser's. Theme them from the
  palette. This is the cheapest signal that a page was built rather than
  assembled, and the one that gets skipped most often.
- **Underline offset.** `text-decoration-thickness: 1px; text-underline-offset:
  0.18em` keeps links from sitting on the descenders. In body prose the
  underline is the affordance; do not remove it without a replacement.

## 3. Color where it matters

"Minimal" is usually misunderstood as "low contrast". The opposite is true.

- **Decoration is quiet; text is not.** Hairlines, surfaces and borders can sit
  at a 2–8% step from their background. Body text still clears its contrast
  floor. Soft and legible are not a trade-off.
- **Color appears at the smallest useful scale:** a status dot, a delta figure,
  an icon, a single word. A colored 4px dot beside neutral text carries more
  meaning than a tinted row that has to be re-read.
- **One accent, two places.** The primary action and the focus ring. If the
  accent also marks selection, that is a third place and needs a reason.
- **The One Voice Rule.** On a restrained screen the accent covers under 10% of
  the visible area. Its rarity is what lets it mean something. A committed or
  drenched surface (a brand hero) is a deliberate exception chosen by the mode,
  not by mood; see `color-system.md` for the strategy ladder.
- **On a colored surface, tint the secondary text from that hue**, or use the
  foreground. Neutral grey text on a colored ground looks dirty.
- **Neutral primary is often the more professional choice.** A near-black button
  in light mode (near-white in dark) reads more confident than a saturated brand
  fill, because it competes with nothing. Use the brand color as the accent for
  state and focus instead.
- **No colored rails, tinted pills, or gradient cards** unless the product's
  brand is the point. Those read as generated defaults.
- **Dark UI is layered near-blacks, not one black.** Canvas, panel, raised
  surface, hairline at 8–14% white, then text. Inverting light tokens produces
  a flat gray sheet.

## 4. Originality without novelty

- **One deliberate move per screen.** A type-scale jump, an asymmetric split, a
  single full-bleed figure, a ruled table with no boxes, a monospace accent for
  identifiers. Everything else stays conventional.
- **Novelty belongs in the surface, not the interaction.** A new visual rhythm
  is delightful; a new way to save is a bug.
- **Copy is design material.** Real nouns, active verbs, specific quantities.
  "3 rows left" beats "Some items pending". Never "seamless", "unlock",
  "empower", "elevate", "supercharge".
- **Repetition is the style.** Establish one treatment and reuse it exactly. The
  fifth identical row is what makes the first one look intentional.
- **Remove the last decoration you added.** If a border, icon, shadow or badge
  can be deleted without losing meaning, delete it.

## 4b. Mode before ambition

The same habits serve a tool and a launch page, but not at the same volume.
**Operate** surfaces earn familiarity and density; **Read** surfaces earn
invisibility; **Persuade** surfaces earn one committed idea; **Experience**
surfaces earn a remembered feel. Pick the mode per surface, then let it set how
far the color, motion and type can go. The default restraint in this skill is an
Operate default; a Persuade brief that comes out restrained is a failed brief.
See `brief.md`.

## 5. Density is a product decision

Match the row to the job, not to a house style.

| Job | Row | Reference feel |
|---|---|---|
| Scanning many similar records | 48–64px, one line of meta, hairline separators | Linear, shadcn tables |
| Reviewing a decision one at a time | 72–96px, name plus one context line, actions right | review queues, inbox processing |
| Single decision screen | 120px+, generous margins, one question | onboarding, auth |

A dense list is not automatically professional, and an airy one is not
automatically calm. A dense list with 14px text and a hairline reads as
deliberate; an airy list with 11px gray labels reads as unfinished.

## 6. The generated-UI tells

Any one of these means the screen was defaulted, not designed.

**The five clusters.** If the whole direction sits inside one of these, the
problem is the direction, not the details. Values are the observed centres, not
fixed hexes; the point is the neighbourhood.

1. Cream ground near `#F4F1EA` with a terracotta accent near `#D97757` and a
   high-contrast serif display. Warm reading surfaces have been done to death.
2. Near-black ground with one acid or vermilion accent and a glow.
3. Broadsheet editorial: hairlines, zero radius, tracked micro-caps, no color.
4. The SaaS kit: one radius, one `rgba(0,0,0,.1)` soft shadow, three equal cards,
   a gradient wash.
5. Template chrome: ALL-CAPS eyebrow, `A · B · C` metadata, `Word — fragment`
   headlines, mono micro-labels, appended `→`.

**The unique test.** Imagine the same brief given to another designer. If you
can predict the page they would make, and yours is within a shade of it, revise
yours and say what changed. The rut and its obvious opposite — cream serif vs
near-black neon, hairline broadsheet vs card grid — are both ruts.

The individual tells:

1. Purple-to-blue gradient hero, centered headline, two pill buttons.
2. Three equal feature cards: icon, bold title, two lines of text.
3. Everything centered, including body copy.
4. Identical radius, shadow and border on every surface.
5. A stat row of equal-sized numbers with no answer to "which matters".
6. Facts joined by `·`, `•` or `|` because the layout was never decided.
7. 11–12px gray-on-gray metadata used to fit content.
8. One saturated accent applied to labels, pills, rails and icons at once.
9. Emoji standing in for an icon set.
10. Placeholder copy: "Your awesome product", "Transform your workflow".
11. Every input boxed, every group carded, every card shadowed.
12. Motion on everything: hover lifts, entrance fades, animating numbers.

Fix by deletion first, then by stance, then by typography. Color is rarely the
fix.

## 7. Using references without copying

- Borrow **mechanics** (hairline rhythm, token names, type scale, one accent),
  not compositions. Do not clone a screenshot.
- Borrow **proportion**, not pixel values: a 56px headline on a 1280px canvas is
  a ratio you can rescale, not a constant.
- When a reference and a rule disagree, ask which job the screen has. A dense
  trading table is allowed to break a calm-layout rule if density is its job.
- State which reference informed a decision, and what you took from it. "Looks
  like Linear" is not a reason; "hairlines instead of card chrome, because the
  rows are peers" is.

See `inspiration.md` for the working catalogue of products, systems and the
specific moves worth taking from each.
