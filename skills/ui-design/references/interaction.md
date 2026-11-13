# Interaction, flows, and state

A screen is a snapshot of a flow. Most "UI problems" are flow problems: the
state is missing, the next step is unclear, or the system answered a question
the user did not ask.

## Affordances and signifiers

- **A control looks like what it does.** A button looks pressable; a link looks
  like text that goes somewhere; a row that opens looks different from a row
  that does not. If the user has to probe it, the signifier is missing.
- **One action per control.** A row that opens on click but also has a checkbox
  and a menu is three targets in one surface; decide which the row is.
- **Disabled needs a reason nearby.** A disabled primary with no explanation is
  a dead end. State the missing prerequisite in one line, or keep the action
  enabled and explain on press.
- **Destructive actions look destructive** and sit apart from the primary. They
  are never the default focus, never adjacent to "Save", never the Enter key's
  target in a dialog.
- **Hit areas exceed drawings.** 24×24 CSS px minimum, 44×44 recommended on
  touch, 8px between adjacent targets. Grow with padding, not with a bigger icon.

## Feedback

- Every action gets a response within 100ms: press state, then a result, then
  the new state. Silence reads as a broken button.
- **Report where it happened.** A saved field shows a tick on its own control; a
  deleted row leaves a quiet "Undo" in its place; a failed send marks the send
  control. A toast alone is not confirmation.
- **Undo beats confirmation** for reversible actions. Reserve modals for
  irreversible ones, and name the consequence in the button ("Delete 12 drafts").
- **Optimistic updates** belong to reversible, high-frequency actions (toggle,
  star, reorder, mark read). Keep the old value on failure and say it was not saved.
- **Loading is a state, not an overlay.** Keep the layout's shape (skeletons
  matching the real rows), disable only what cannot be used, and never block the
  whole screen for a partial fetch.

## Errors

- Say what failed, what the user can do, and keep their input. Never clear a form
  on error, never say "Something went wrong" alone.
- **Validate at the right time:** on blur for fields, on submit for the form,
  never on every keystroke for a value that is still being typed.
- **Errors sit next to the thing that is wrong**, in plain language, with a
  fix, and one summary at the top when there are several. Placeholder-only
  errors fail screen readers; link the message to the field.
- Distinguish *preventable* (limit the input: a real date picker, a masked
  field, a closed set of options) from *unavoidable*. Every preventable error
  that ships is missing input design.
- A failed fetch of a whole region gets its own inline retry, not a toast that
  disappears with the only copy of the message.

## Forms and input

- One column; label above; the label is never the placeholder. Inputs are 16px
  on mobile so iOS does not zoom.
- **Ask for what you need, in the order you need it.** Cut every field the
  system can infer or defer. A field you cannot justify is a field to delete.
- Group with space and headings, not boxes. Mark the minority (required *or*
  optional), not both.
- Preserve input across step navigation, failed submit, and refresh. This is a
  persistence promise, not a nicety.
- **Multi-step flows:** show progress ("Step 2 of 4"), keep each step one
  decision, allow back without losing data, and never put the commit action on a
  step that looks like a preview.
- **Autofill and paste are features.** Use the right `autocomplete` tokens, do
  not block paste in password fields, and never trim a pasted value silently.
- **Deleting is a typed confirmation only when the object is unrecoverable.**
  Otherwise, undo. Two clicks of "are you sure" train people to click through.

## Navigation and information architecture

- The current location is obvious without color alone (weight, marker, label).
- Nav order is stable across pages. Moving the nav is a bug, not a refresh.
- **Top level is what the user does most often**, not every feature the product
  has. Overflow into a menu; do not shrink labels.
- Breadcrumbs for hierarchy, tabs for peers, a sidebar for persistent sections,
  a segmented control for a view of the same content. Pick by relationship, not by looks.
- Deep links must land on a screen that makes sense when arrived at cold: the
  parent context and a way back are part of the screen.
- **Back behaviour** (browser or platform) must not lose work. A dialog opened
  from a link should close on back; a form should not vanish with its input.

## Overlays

- **Modal is usually laziness.** Reach for inline expansion, a popover, or a
  side panel first. A modal is right when the task must be completed or
  abandoned before the underlying screen is valid.
- Use `<dialog>`, the popover API, `position: fixed`, or a portal; never a
  dropdown clipped by an `overflow: hidden` ancestor.
- A dialog traps focus, restores it to the trigger on close, closes on Escape,
  and names itself with its heading. A destructive confirm does not put the
  destructive action first.
- A sheet on touch grows from the edge the user expects, is dismissible by
  drag *and* by a visible control, and never drags the page behind it.
- Toasts are transient, non-blocking, `role="status"`, and never the only record
  of an error. Stack at most three; replace oldest.

## Keyboard and focus

- Tab order follows reading order; every interactive element is reachable and
  operable by keyboard; nothing focusable is invisible.
- A visible focus ring on everything interactive, including icon buttons, with
  `:focus-visible` so pointer clicks do not ring.
- Shortcuts: one modifier family, discoverable in a menu or cheatsheet, never
  single-letter flags that fire while typing.
- **Focus follows the change**: after deleting a row, focus the next row; after
  closing a dialog, focus the trigger; after opening a menu, focus its first item.
- Skip links, landmarks, and heading order are part of the layout, not a
  post-hoc accessibility pass.

## Data surfaces

- Sorting and filtering are state: visible, resettable, encoded in the URL when
  shareable, and preserved on back.
- A filter shows its result count and a one-click clear. Filter chips are
  removable; a filter that cannot be removed is a trap.
- Bulk selection shows "N selected" with the actions that apply to that set, and
  the header checkbox has an indeterminate state.
- Tables align text left, numbers right, keep decimal count consistent, and
  state the empty, loading, and error cases.
- **A row's primary action is one action.** Everything else lives in an opened
  row or an overflow menu with labelled items, not four icons.

## First run, empty, and permission states

- An empty state teaches the interface: what belongs here, why it matters, one
  action to create the first item. "No data" is not an empty state.
- A first run is not a tour. Prefer a populated, real example, or a single
  prompt at the moment of first need.
- Permission and offline states are designed: say what is unavailable, what
  still works, and how to recover.

## Verify the flow

- Walk the primary task end to end at 390px and 1440px: open, act, succeed,
  fail, cancel, and return. A screenshot of the happy default proves nothing.
- Trigger the error state deliberately (offline, 500, validation) and read the
  message as the user.
- Use the keyboard only for one full task. Use a screen reader for one form.
- Refresh mid-flow, press back mid-flow, and open the deep link cold.
