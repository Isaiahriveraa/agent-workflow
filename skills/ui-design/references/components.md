# Components

A component is a small interface over a repeated visual and behavioral pattern. Design it from its anatomy and its states, not from its default look.

## Method

0. **Signifier.** Ask what tells the user this is interactive and what it will do. Affordances are invisible; the visible cue is the signifier, and a control without one is a puzzle. A row that opens, a chip that removes, a field that is editable — each needs a visible difference from its neighbours.
1. **Anatomy.** List the parts: label, icon, value, description, action, meta. Mark which parts are optional.
2. **Level.** Decide whether it is primary, secondary, or tertiary in its context (see `hierarchy.md`). The same button can be primary on one screen and secondary on another.
3. **States.** Define every state before styling. Default, hover, focus-visible, active, disabled, loading, empty, error. Missing states are the most common shipped bug.
4. **Density.** Comfortable by default. In a review list, show a readable title, a short proposal summary and one Edit action; put its full form behind that action. Do not expose every available field to every row.
5. **Content.** Test with the longest realistic label, the shortest, and an empty value.

## Buttons

- One primary button per view. Repeated rows use a quiet Edit action and, when needed, Skip. Text/ghost actions are preferable to a grid of outlined buttons.
- Label with a verb and the object: "Save changes", not "OK".
- Destructive actions use the error color and are not the primary in a dialog unless the dialog is about that action.
- Loading keeps the label width stable, so the layout does not shift.

## Cards

- A card is for a group that is a unit: one product, one event, one person. Do not wrap every piece of content in a card.
- Remove the card and rely on proximity and alignment first. Add the surface only if the group still reads poorly.
- Repeated records normally form a quiet list with whitespace and optional hairlines. Do not manufacture a featured record in an approval queue: all records may be peers without being boxes.

## Forms

- One column. Label above the field.
- Field width signals expected input length: short fields for short values, wide for free text.
- Show errors next to the field, in plain language, with the fix stated.
- Group fields with headings or space, not with boxes.
- Mark optional fields only when most fields are required. Otherwise mark required ones.
- A **scan view** shows the proposed result, not the full editor. Keep all values reachable in one clearly labelled Edit/Details panel. Do not duplicate a field's label, selected value and explanation in the collapsed row.
- Keep required questions visible or show an unmistakable Answer action. Do not hide uncertainty or approvals to make density numbers look better.
- Original titles, confidence explanations and rationales belong in Details unless they change the immediate decision. Preserve all values and feedback across opening, closing and refresh.

## Navigation

- The current location must be obvious: active state, not only color.
- Limit top-level items to what the user needs most often. Move the rest into a menu.
- Keep nav in the same place on every page.

## Tables and lists

- Left-align text, right-align numbers, and keep the decimal count consistent.
- Make the sort column and the row identity obvious. The first column names the row.
- Use row height and zebra only when rows are hard to track. Divider lines plus space often work better.
- **Dense tables** are a real job: 36px rows, 13px cells and headers marked
  `data-ui-role="dense"`, 12–16px side padding, numerals tabular and
  right-aligned, one hairline per row. Never reach 12px to fit a column; drop a
  column, or wrap the value to a second line in its own slot.
- The header cell describes its column, and the sort state is visible as text,
  not only as a tinted background.
- Empty table, loading table, and error table are states, not afterthoughts.

## Metadata rows

Parts: an identity (who), a time, a count, a state. Anatomy decisions:

- Each fact is its own element in its own slot, never a string joined by glyphs. For the layout choices, see `layout.md`; `·`, `•`, and `|` are never the answer.
- Separate with a component where one exists: a clock with a date, a speech bubble with a comment count, an avatar with a name. The icon separates and names the fact at the same time.
- The same fact keeps the same slot on every row, so a column of rows becomes scannable instead of merely aligned.
- Counts and timestamps are tertiary wherever they appear; they never outrank the record they describe.
- Decide the empty value, and keep the slot. A missing date is "no date", not a collapsed gap that drags the rest of the row out of alignment.

## Empty, loading, and error states

- Empty: say what belongs here and the next action. Do not show a blank panel.
- Loading: match the final layout's shape with skeletons when it takes more than about a second.
- Error: say what failed, what the user can do, and keep the user's input.

Choose the loading treatment by expected duration:

| Expected wait | Treatment |
|---|---|
| <1s | Nothing. A flash of spinner reads as instability. |
| 1–2s | Busy state on the control that acted; keep its width stable. |
| 2–10s | Skeleton matching the real layout (rows, not grey blocks) or a scoped spinner for one module. |
| 10s+ | Determinate progress with an estimate; let the user leave and come back. |

- A skeleton is the shape of the *content*, not a generic grey card. Frame-only
  skeletons and shimmer on large areas are worse than a quiet placeholder.
- Skeletons animate only under `prefers-reduced-motion: no-preference`; a
  shimmer is a distraction for users who asked for less motion.

## Overlays and focus

- A dialog traps focus, moves focus to its first meaningful control, closes on
  Escape, and returns focus to the trigger. It has an accessible name from its
  heading.
- A popover is anchored and dismisses on outside click and Escape; it is not a
  modal imitation.
- A sheet is dismissible by a visible control *and* by drag; the page behind does
  not scroll.
- **A modal is usually laziness.** Prefer inline expansion, a popover, or a side
  panel. Modal is correct when the underlying screen is invalid until the task
  is closed (payment, destructive confirm, required consent).
- A toast is `role="status"`, transient, and never the only record of an error.

## Touch and pointer targets

- Minimum interactive target: 24×24 CSS px (WCAG 2.2 AA, SC 2.5.8), 44×44 px recommended (WCAG 2.5.5 AAA, Apple HIG). Use padding, not visible size, to meet it.
- Keep at least 8 px between adjacent targets.
- Focus must be visible: a ring or outline, never removed.

## Motion

- Motion explains a state change: a panel opening, an item arriving. It should not decorate.
- Keep most transitions short. Respect the user's reduced-motion setting.
