# Accessibility and locale

Accessibility is a design constraint, not an audit phase. Most failures are
decided in the markup and the layout: the control that was a `div`, the label
that was a placeholder, the 200% zoom that clips the toolbar, the error that
lives only in color. Build it correctly the first time; a retrofit always costs
more than it looks.

`type-color-space.md` owns contrast; `interaction.md` owns focus and keyboard
flow; `components.md` owns target sizes. This file covers the rest.

## Use the platform element

- A button is `<button>`, a link is `<a href>`, a checkbox is `<input
  type="checkbox">`. A `div` with a click handler needs a role, a tabindex, key
  handling, and a disabled story — four things to get wrong.
- **Heading order is the page's outline.** One `h1`, nested headings without
  skipped levels, and no heading chosen for its size. Style with a class, not
  with `h6`.
- **Landmarks**: `header`, `nav`, `main`, `aside`, `footer`. A skip link to
  `#main` is the cheapest navigation improvement that exists.
- Lists are lists. Tables that are tables use `<table>` with `<th scope>`;
  layout tables are not tables.
- Native semantics give you keyboard, focus, touch, and assistive tech for
  free. Reach for ARIA only to fill a gap, and never to override a working
  element: the first rule of ARIA is not to use it.

## Names and descriptions

- Every control has an accessible name: visible label, `aria-label`, or
  `aria-labelledby`. An icon button without one is a mystery.
- Labels are visible. A placeholder is an example; a tooltip is not a label.
- Associate help text and errors with `aria-describedby`; mark invalid fields
  with `aria-invalid` and a message in the DOM, not only a red border.
- Images: meaningful → alt describing purpose; decorative → `alt=""`. Icons
  rendered as SVG get `aria-hidden="true"` when a text label sits beside them.
- Live regions (`role="status"`, `aria-live="polite"`) for results that appear
  without a focus change: saved, sent, 3 results, error. Announce once, not on
  every keystroke.
- The document has a `lang`. Content in another language is marked inline.

## Not only color, not only hover

- State is never color alone: pair with shape, icon, text, position, or weight.
  A red border on an invalid field needs a message; a green dot needs a word.
- Anything revealed on hover must also be reachable by keyboard and touch, and
  must not disappear before it can be used.
- Auto-playing motion, carousels, and timed content need pause and stop.
- No time limit on a task that can be interrupted; if there is one, warn and
  allow extension.

## Zoom, reflow, and text scaling

- Test 200% browser zoom and a 320px-wide viewport. Content reflows; it does
  not clip. No horizontal scroll for prose.
- Use `rem` for type and spacing so the user's font-size preference scales the
  page. Fixed `px` heights on text containers break at 200%.
- Line height survives text scaling: no `height` on a paragraph, no
  `overflow: hidden` truncating a wrapped label.
- A sticky header or toolbar must not eat the viewport at 200%; cap its height
  or let it scroll away.
- Touch targets stay ≥24px even when text is scaled down by the user.

## Motion and vestibular safety

- Respect `prefers-reduced-motion`: fewer and gentler, not zero (see
  `motion.md`).
- No parallax, no large background movement, no autoplay video behind content.
- Nothing flashes more than three times per second. Ever.

## Cognitive load

- One idea per screen; short sentences; active voice; a specific noun instead of
  "item". Plain language is an accessibility feature and a design one.
- Do not rely on memory across steps: keep the answer visible, or offer a
  summary before commit.
- Errors state the fix, not the rule ("Use a date after today", not "Invalid
  date").
- Consistent placement: the same action in the same corner on every screen.

## Locale and internationalization

- **Translation expands.** Budget 30–40% more width for German, Finnish and
  Russian; assume buttons, tabs and table headers will grow. Never size a
  control to its English label.
- **No concatenated sentences.** "3 items left" built from `count + " items
  left"` breaks in languages with plural categories and reordered grammar. Use
  full message strings with placeholders.
- **No text in images.** It cannot be translated, scaled, or read.
- **RTL:** use logical properties (`margin-inline-start`, `inset-inline`,
  `text-align: start`). Mirror layout, not icons: chevrons flip, clocks and
  media controls do not. Numbers stay LTR inside RTL text.
- Dates, times, numbers, currency, and names have locale rules. Use `Intl`
  formatters; never hand-build `"$" + price`.
- Names are not first/last. Honorifics, order, and scripts vary; one `name`
  field is often the correct design.
- Assume a longer word can be a name, a city, or an email; test with a long
  unbroken string (a URL, a German compound) before shipping.

## The five-minute check

1. Tab through the whole screen. Can you see where you are, and reach every action?
2. Turn on a screen reader for one form: does every field announce its label and error?
3. Zoom to 200%. Does anything clip, overlap, or hide the primary action?
4. Read the longest error message as a first-time user. Does it say what to do?
5. Set the page to a 40% longer language. Does anything break?
