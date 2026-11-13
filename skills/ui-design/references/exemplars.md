# Exemplars

Rules tell you what a designed screen is not. These tell you what one is.
Open `scripts/exemplars.html` in a browser: four pairs holding the content
constant, one defaulted, one designed, with the deltas written underneath.

Use them three ways:

1. **Before a build.** Find the pair whose stance matches the brief. Copy the
   *structure*, not the colors: the number of signals, where the accent went,
   what was deleted, how many rows are exposed.
2. **When stuck.** A screen that feels generic is usually one pair away: it has
   a card where a row belongs, or three equal peers where one should lead.
3. **In review.** Name the delta you failed. "This is the review-row pair with
   the card surface still on" is a reviewable sentence; "needs more polish" is not.

## The four pairs, in one line each

| Pair | Stance | The move that carries it |
|---|---|---|
| Review queue row | Utilitarian | Delete the card and three of the four controls; meta gets slots, status gets a dot and a word |
| Article index | Editorial | One lead item and a ruled index; the type jump does the work a gradient was doing |
| Launch hero | Bold brand | Spend the whole field, one 54px display, one graphic idea, one action |
| Habit settings | Warm product | One warm surface with rows instead of six tiles; accent only where state changes |

## What transfers and what does not

Transfers: the count of signals per meaning, the number of exposed controls,
which element leads, whether grouping is space or chrome, the accent's share of
the screen, the type-scale jump, the copy's specificity.

Does not transfer: the exact hex values, the typeface, the copy, the row height.
Those belong to the product. A pair copied exactly is a template; a pair read as
a *decision set* is a method.

## The three questions to ask of any pair

- **What was deleted?** Almost every designed panel has fewer elements than its
  defaulted twin. Deletion, not styling, is the difference.
- **What carries the hierarchy?** Type size, weight, space, position — in that
  order. If the answer is color or a card, the panel is relying on its weakest
  lever.
- **How many signals for one meaning?** One: a dot plus a word, a figure plus a
  unit, a rule plus space. Two signals for one meaning is decoration.

## Using a pair as an acceptance test

When you ship, put the screenshot next to the pair and answer:

- [ ] The primary element is the same *kind* of element as in the pair (a figure,
      a name, a lead line), not a decorative container.
- [ ] The accent appears in no place the pair would not put it.
- [ ] Every gap belongs to the spacing scale; no gap needed a value below the
      smallest step.
- [ ] Deleting any single remaining element would cost meaning.
