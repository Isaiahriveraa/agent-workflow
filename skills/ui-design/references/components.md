# Components

A component is a small interface over a repeated visual and behavioral pattern. Design it from its anatomy and its states, not from its default look.

## Method

1. **Anatomy.** List the parts: label, icon, value, description, action, meta. Mark which parts are optional.
2. **Level.** Decide whether it is primary, secondary, or tertiary in its context (see `hierarchy.md`). The same button can be primary on one screen and secondary on another.
3. **States.** Define the applicable states before styling: default, hover, focus-visible, active, disabled, loading, empty, error. A static content block does not need every interactive state.
4. **Density.** Reuse consistent density patterns suited to each surface. A compact data table and a comfortable onboarding form can belong to the same product.
5. **Content.** Test with the longest realistic label, the shortest, and an empty value.

## Buttons

- Use `hierarchy.md` to set action priority. A focused flow usually has one emphasized action; peer choices may deserve equal emphasis. Reuse the product's secondary and tertiary button treatments.
- Label with a verb and the object: "Save changes", not "OK".
- Make destructive consequences explicit in the label and surrounding context. Use the product's destructive treatment; color alone must not carry the warning. See `familiar-interactions.md` for risk-based safeguards.
- Loading keeps the label width stable, so the layout does not shift.

## Cards

- A card is for a group that is a unit: one product, one event, one person. Do not wrap every piece of content in a card.
- Try proximity and alignment before adding surfaces. Keep a card when it clarifies containment, interaction, or separation; see `layout.md` for grouping.
- Equal-weight cards suit peer items. Vary emphasis only when one item genuinely deserves priority; do not invent a featured item for visual variety.

## Forms

- Start with a single column and persistent labels above fields. Group related short fields on one row only when their relationship and reading order remain clear at narrow widths.
- Field width signals expected input length: short fields for short values, wide for free text.
- Show errors next to the field, in plain language, with the fix stated.
- Explain format and eligibility constraints before submission where useful. Preserve input after failure; do not require people to re-enter unchanged information.
- Group fields with headings or space, not with boxes.
- Mark optional fields only when most fields are required. Otherwise mark required ones.

## Navigation

- The current location must be obvious: active state, not only color.
- Keep common destinations discoverable. Group less frequent options where people can find them; do not hide essential destinations solely to make the navigation smaller.
- Keep navigation predictable across comparable pages; responsive or task-focused variants should preserve orientation and a clear way back.

## Tables and lists

- Left-align text, right-align numbers, and keep the decimal count consistent.
- Make the sort column and row identity obvious. Keep identification easy even when selection or expansion controls precede it.
- Use row height and zebra only when rows are hard to track. Divider lines plus space often work better.
- Empty table, loading table, and error table are states, not afterthoughts.

## Metadata rows

Parts: an identity (who), a time, a count, a state. Anatomy decisions:

- Give structured facts their own elements and predictable slots. For compact inline metadata, a separator may be appropriate if wrapping, reading order, and accessible output remain clear. See `layout.md`.
- Add an icon or avatar when it helps identification or scanning. Do not assume an unlabeled icon names a fact for every audience or assistive technology.
- The same fact keeps the same slot on every row, so a column of rows becomes scannable instead of merely aligned.
- Rank counts and timestamps by the task using `hierarchy.md`; a deadline may deserve more emphasis than the record title.
- Decide how absence is represented. Stable slots help repeated-row comparisons; a standalone record may omit a nonessential missing value. Distinguish unknown, unavailable, and not applicable where it matters.

## Empty, loading, and error states

- Empty: say what belongs here and the next action. Do not show a blank panel.
- Loading: show meaningful pending feedback without implying completion. Skeletons suit a predictable layout; a brief operation may need only an inline status. Avoid distracting flashes and unnecessary moving placeholders.
- Error: say what failed, what the user can do, and keep the user's input.

## Touch and pointer targets

- Target 24×24 CSS px or larger under WCAG 2.2 AA SC 2.5.8, which includes spacing and other exceptions; 44×44 CSS px is the enhanced AAA SC 2.5.5 target, also with exceptions. Prefer generous hit areas and follow platform guidance in its own units. Padding can expand a hit area without enlarging the visible icon.
- Space adjacent targets to reduce accidental activation, using the product's tokens and applicable target-size or spacing requirements; one fixed gap does not prove conformance.
- Focus must be visible: a ring or outline, never removed.

## Motion

- When adding or changing movement, read `motion-and-transitions.md`. Use the existing Impeccable playbook for timing and implementation; this skill adds purpose, interruption, and reduced-motion checks.
- When writing labels, instructions, or state messages, read `audience-and-wording.md` rather than filling the component with generic copy.
