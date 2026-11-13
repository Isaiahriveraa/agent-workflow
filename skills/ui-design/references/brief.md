# Brief, mode, and direction

Most design failures are brief failures wearing a visual costume. The page is
competent and wrong: it answers a question nobody asked, at a density nobody
needed, in a stance the audience does not trust. Spend the first ten minutes
here; it is the cheapest ten minutes in the project.

## The five answers

Write them down before opening a browser. One line each.

1. **Who, and how often?** A support agent on their fortieth ticket today and a
   person who opens this page once need opposite screens. Frequency decides
   density, disclosure, and how much the interface must explain itself.
2. **What must they decide or do?** One verb plus one object: "approve the
   leave request", "choose a plan", "find last month's invoice". If there are
   two verbs, there are two screens or two regions, and one of them leads.
3. **What content actually appears?** Real volume (0, 1, 12, 1000), longest
   realistic string, the empty value, the hostile value (a 300-character name, an
   unbroken URL, a missing date, a permission error).
4. **What already exists?** Brand assets, an existing design system, sibling
   screens, platform conventions, the codebase's tokens. Existing system wins
   over this skill's taste.
5. **What does good mean here?** "Trusted", "fast", "memorable", "calm",
   "compliant". This is the acceptance test the rest of the work is judged against.

If an answer is missing and the choice is reversible, assume, and write the
assumption in one line. If the choice is expensive to reverse (a direction, a
layout system, an audience), ask. Do not ask about anything you can read from
the code, the design system, or the content.

## Mode: what the surface is for

Choose per surface, not per product. A tool's landing page is still Persuade; a
docs page inside the product is still Read.

| Mode | Success is | Ambition | Density | Color strategy | Motion |
|---|---|---|---|---|---|
| **Operate** | The task is faster the tenth time | Earned familiarity; conventional | Medium–high | Restrained | Minimal, functional |
| **Read** | The text is finished | Invisible interface; typographic | Low–medium | Restrained | Almost none |
| **Persuade** | The action is taken | Full commitment; one strong idea | Low | Committed / drenched | One authored moment |
| **Experience** | The feel is remembered | Distinctive, but never at the cost of the job | Varies | Full or drenched | Choreographed |

Mode gates ambition and licenses the louder rungs of the color strategy. The
skill's default restraint is an **Operate** default; applying it to a Persuade
brief produces the timid page, which is the worst result in the skill.

## Stance: the texture

- **Utilitarian** — dense rows, hairlines, small radii, neutral surfaces, one
  accent at icon scale, weight instead of color, inverted-neutral primary.
- **Editorial** — display type with a narrow measure, asymmetry on a grid, rules
  instead of cards, generous margins, one reading face plus one UI face.
- **Warm product** — larger radii, one warm accent, warm neutral ramp, fewer
  borders, more air, rounder type.
- **Technical** — monospace for identifiers and values, tight rows, tabular
  figures, darkness or paper, minimal decoration.
- **Bold brand** — a saturated field, oversized type, hard contrast, one graphic
  idea, one action.

State mode and stance in one sentence, and keep it where the next reader can see
it: "Operate / utilitarian, light, dense queue, neutral primary, accent on focus
only." That sentence is a contract; every later choice either follows from it or
is a recorded departure.

**Lock the tokens to the stance.** Pick the ramp, the type family, the radius
and the spacing scale once, per direction. A hybrid of two stances reads as
indecision; if a hybrid is genuinely needed, say which stance owns which surface.

## Two directions, ten minutes each

A direction is a layout decision, not a color decision. Make both before
polishing either.

- **What counts as different:** different reading order, different number of
  exposed elements, different relationship between content and chrome (list vs
  table, lead vs grid, single column vs rail). Two shades of the same stack is
  one direction with two skins.
- **How to make it cheap:** ASCII boxes, or two rough HTML files with real
  content and no styling beyond type. Ten minutes each. Never build both.
- **What to compare:** which one answers the job with fewer visible decisions;
  which one survives the hostile content; which one has a place for the one
  deliberate move; which one you would defend in review.
- **Say why the loser lost**, in one sentence. "The table halves the height but
  loses the rationale that the decision depends on." That sentence is worth more
  than the winning mockup.

For a component, the second "direction" is the deletion test: the same component
with one part removed. If it still works, that part was decoration.

## Acceptance criteria

Write three to five observable statements before building. Not "looks modern".

- "A first-time reader names the primary action in under a second."
- "A row can be judged without opening it; the full form is one click away."
- "The longest real name wraps to two lines on mobile without clipping."
- "Empty, error and loading are designed; the error keeps the user's input."
- "Both themes pass the audit, and the accent covers <10% of the restrained screen."

These become the review checklist. A design that meets them and looks plain is
shippable; one that looks beautiful and fails them is not.

## The design note

Before handing off (or after building), write one short block:

- **Mode / stance / strategy** in one sentence.
- **The one thing** the eye reaches first, and why it is the right one.
- **What was deleted** from the default view, and where it went.
- **The defects I know about**: unrunnable states, unmeasured backgrounds,
  placeholders for assets, judgement calls the reviewer should check.

Three lines of honesty beat a paragraph of confidence. The next reader —
including a future you — needs the departures, not the summary.
