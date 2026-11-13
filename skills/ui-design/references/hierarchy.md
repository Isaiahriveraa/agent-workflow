# Hierarchy

Hierarchy is the order in which the eye reads a screen. Weak hierarchy is the most common AI-UI failure: every heading, card, and button competes at the same weight, so nothing wins.

## The levers

Each element has one level: primary, secondary, or tertiary. Control the level with these levers, in rough order of strength:

| Lever | Primary | Secondary | Tertiary |
|---|---|---|---|
| Size | larger, at least 16px for body/records | readable, at least 14px | at least 14px, or deferred |
| Weight | bold / semibold | regular | regular |
| Contrast (color) | full text color | muted text | faint text, still passing contrast |
| Space | isolated, more air around | normal | grouped tight to related items |
| Position | top-left in reading order, or the dominant area | after primary | footer, sidebar, meta row |
| Depth | filled surface, shadow | flat surface | no surface, text only |

Use two or three levers together. Size alone is weak. Size plus space is strong.

**In light mode, contrast barely separates the three tiers.** Every text tier has to
clear 4.5:1, which leaves very little room between "secondary" and "muted". So
hierarchy at the quiet end is carried by weight, size and position; the color tier
is the smallest nudge, not the main lever. In dark mode the floors are further
apart, so contrast can do a little more.

## Rules

- **One primary per view.** If two things need the primary level, one of them is a secondary thing you have not admitted yet.
- **One figure per region.** A summary area reports one number; give it more and the reader ranks them instead of reading them. Everything else in that region is a context fact at the next level down — or it belongs somewhere else.
- **Delete and defer before styling.** Remove redundant visible copy and defer rare controls. Then quiet the remaining metadata and decorative boundaries. Increasing whitespace around an always-open form does not make it a scan view.
- **Labels and metadata recede without becoming tiny.** Use position, weight, neutral color and fewer default-visible facts. Preserve readable text and the contrast floor.
- **Start with too little color.** Build the layout in neutral grays first, then add one accent for the single action or state that needs it. Color used on everything stops meaning anything.
- **Reduce borders before adding them.** Separate groups with space first. Add a border or surface only when space cannot carry the grouping.

## Focal point checklist

- Can you name the element the eye hits first, in under a second?
- Is that element the one the job depends on, not just the largest one?
- Does every other element clearly sit one level below it?
- If you squint or blur the screenshot, is one region clearly dominant?

## Common failures

- Headline, subhead, body, and button all in the same weight and near-same size.
- A stat grid where every number has equal size and color, so none reads as the answer.
- A summary region that reports everything it knows — a figure, a bar, two facts — instead of the one thing that decides what the reader does next. The fix is deletion, not a smaller font.
- A repeated record that exposes original text, rationale, confidence, four priority choices, labels, a toggle, destination and notes before the user has chosen Edit.
- A primary button that is the same color and size as the secondary "Cancel" beside it.
