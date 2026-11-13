# Readability and density audit

`scripts/audit-ui.js` measures the page as rendered: actual font sizes, composited text contrast, and per-region text/control density. It is deterministic, dependency-free, read-only, and runs synchronously in Chromium.

It is a defect detector, not a design score. A passing run means the measurable floors below were met. It cannot say the screen is clear, well grouped, or tasteful.

**Where this sits in the doctrine.** The audit is the last rung of `SKILL.md`'s
precedence order. It enforces floors; it never overrules a measured screen, and
it has explicit, documented exceptions (inactive controls, the `dense` table
tier, and the brand profile) rather than silent ones. If a rule above the audit
says something the audit cannot measure, the rule wins and the report records
the gap.

## Run it

The script defines `globalThis.auditUI`. Run it in the real page, after layout and fonts have settled.

**DevTools (same origin).** Paste the full source into the console (or a DevTools Snippet), then:

```js
auditUI({regionSelector: '.row'});  // baseline row in clarify.html
auditUI();                          // regions marked [data-ui-density]
copy(JSON.stringify(auditUI(), null, 2));
```

**Automation (`evaluate` in a real browser).** Add the file as a page script, then evaluate the call in the page:

```js
await page.addScriptTag({ path: '/Users/jeremykamber/.agents/skills/ui-design/scripts/audit-ui.js' });
const report = await page.evaluate(() => auditUI({ regionSelector: '.row' }));
```

If the page already loads the script, just call `auditUI(...)` inside `page.evaluate`. For an iframe, inject into `frame.contentWindow` and call `frame.contentWindow.auditUI()`.

**Fixture harness.** `scripts/test-audit-ui.html` drives 21 isolated iframes through the public API and prints expected versus actual. It needs a real HTTP origin (iframes and `srcdoc` script loading), no npm:

```sh
cd /Users/jeremykamber/.agents/skills/ui-design/scripts
python3 -m http.server 8765
# open http://127.0.0.1:8765/test-audit-ui.html and press "Run browser fixtures"
```

Do not edit the fixtures to make a failing case pass. Each expected failure is a regression the audit must catch.

## Interface

```js
auditUI()                             // regions = [data-ui-density]
auditUI({ regionSelector: '.row' })   // explicit regions, e.g. an unmarked baseline
auditUI({ profile: 'brand' })         // marketing surface: effects become a manual worklist
```

Regions:

- The default selector is `[data-ui-density]`. Mark each reviewable row/region with `data-ui-density="scan"` while collapsed, `"dense"` for a data table, and `"editor"` while explicitly opened by the user. A missing value means `scan`; any other value fails the region. In the `brand` profile, regions are optional: density budgets apply only where you declare them.
- `data-ui-role="primary|secondary|muted|dense"` on an element applies to all of its text unless a closer role overrides it. Unmarked text is `default`.
- The role is a declaration, not an inference. The audit does not guess which text is a record name. If a name is a primary record, mark it `primary` and it must be at least 16px.
- `dense` exists for one job: tabular cells and header cells, at 13px. Marking prose,
  a name, a label or a button `dense` is misuse, not an optimisation.

Output (abridged):

```
{ version, theme, viewport, options: {profile, …},
  limits,
  readability: { samples[], errors[], unsupported[], manual[], counts },
  density:     { budgets, regions[], errors[] },
  pass, caveats }
```

`manual` is non-empty only in the `brand` profile: runs the audit cannot
composite (gradient, image, filter, blend mode, text shadow/stroke, overlay,
gradient text, generated or SVG text). Each carries an element path and what to
measure. A brand run with manual items is a **provisional** pass: the reviewer
must record a measured worst-case ratio for each one. Nothing is assumed.

`pass` is `true` only when at least one visible text run was actually sampled, every sampled font size and contrast ratio met its floor, every region met its budget, and there are no `unsupported` entries. The exceptions are fixed and semantic — inactive controls, the `dense` role, the brand profile — not a per-project exclusion list. There is no ignore attribute and no budget override. Do not add one to make a run green. The first 5,000 samples are returned in `samples`; `errors`, `unsupported` and `manual` are never truncated.

## Font floors

| Text | Floor |
|---|---|
| Primary record name, body prose marked `primary` | **16px** |
| All other visible copy, labels, buttons, links, input values, placeholders, select values | **14px** |
| Tabular cells and headers marked `dense` | **13px** |

Sizes come from `getComputedStyle(...).fontSize` in CSS px. Placeholders use `getComputedStyle(input, '::placeholder')`, so an 11px placeholder fails even when the input is 16px. Input button labels, textarea values and the selected option of a select are measured. Hidden options, deferred content inside closed details, and screen-reader-only 1px/clipped content are not.

There is no large-text exception and no general 13px "metadata tier". `dense` is
the single opt-in exception, and it is for tabular data only (see the misuse note
above). If 14px does not fit in a label or a paragraph, delete or defer content.
The font floor is the hard stop; the density budgets are the soft stop.

Text inside an inactive control (`:disabled`, `[aria-disabled="true"]`, or a
disabled fieldset) is exempt from contrast, because WCAG 1.4.3 exempts inactive
components and `craft.md` requires them to look inactive. Its size is still
measured. The count appears as `counts.excludedInactive`, and those samples carry
`exempt: "inactive-control"` with `contrastOk: null`.

## Contrast floors

Ratios are WCAG 2.x sRGB, computed from the effective rendered foreground over the effective ancestor-composited background, including ancestor `opacity` groups.

| Role | Light | Dark |
|---|---|---|
| Primary | 4.5:1 | 7:1 |
| Default (unmarked) | 4.5:1 | 7:1 |
| Secondary | 4.5:1 | 6:1 |
| Muted | 4.5:1 | 5.5:1 |
| Dense (tabular) | 4.5:1 | 6:1 |

The dark floors are higher because light-on-dark text halates and quiet tiers lose apparent contrast. A theme that reuses its light ratios in dark mode is a failing theme, not a preference. The theme is read from `prefers-color-scheme`; emulating the theme is the caller's job. The audit does not force a color scheme.

Large text is not relaxed to 3:1. Necessary non-text indicators and focus rings are a separate 3:1 requirement; **decorative borders and separators are not audited at all**. Do not respond to this report by darkening every hairline.

### How the background is found

For each sampled run, the audit walks the ancestor chain from the text element to `<html>`, parses every `background-color`, and composites the stack in paint order, including nested group `opacity`. It then checks base independence by compositing the same stack over black and over white. If the effective color differs between those probes, the page's color depends on the browser's canvas and the sample is `unsupported` rather than guessed. This is why a transparent row over an opaque page background still passes, while a transparent page over the unknown UA canvas fails.

The audit does **not** assume that a transparent background means white or black.

Color parsing is delegated to the browser. Each computed color is validated with `CSS.supports('color', …)` and resolved to 8-bit sRGB by drawing it into a 1×1 sRGB 2D canvas and reading the pixel. That conversion covers named, `rgb`, `hsl`, `lab`, `oklch`, `display-p3` and future spaces the browser supports, with wide-gamut values gamut-clipped by the browser. Sampling is 8-bit: sub-8-bit differences and display color management are not modelled. A color the browser rejects, or a browser that cannot provide a 2D context, is `unsupported`.

### Unsupported contrast is a failure

`unsupported` entries force `pass: false`. The audit never substitutes a token color or an assumed background. Unsupported cases include:

- a gradient, `url(...)`, or any `background-image` visible behind the text;
- `filter`, `backdrop-filter`, `mix-blend-mode` on a background ancestor;
- `text-shadow`, text stroke, or `background-clip: text` on the glyph;
- an overlay above the text found by hit testing that paints a background;
- a color value the browser rejects (`CSS.supports('color', …)` is false), the canvas does not accept it, or there is no 2D context; the sample is reported, not guessed;
- an effective color that depends on the UA canvas;
- `forced-colors: active`, open shadow roots, and rendered SVG `<text>`;
- a quoted literal `::before`/`::after` string containing letters or digits (CSS generated text is not measured; icons such as `content: "→"` are ignored);
- zero text samples (`no-text-samples`): an empty audit is not a pass.

In the **brand profile** the effect-based codes (background image, filter,
backdrop filter, blend mode, text shadow/stroke, overlay, gradient text,
generated text, SVG text) move to `manual` with an element path and a measurement
instruction instead of failing the run, and density is opt-in. Font and contrast
floors still apply to everything over a solid background. A brand `pass` with a
non-empty `manual` list is provisional: record a worst-case measured ratio for
each item, or do not ship.

In the product profile, fix the page or add manual evidence in review. Do not add
an exemption. If the design needs a gradient behind body text, contrast is not
automatable there.

## Density

Density is per region, using the region's declared profile.

| Measure | Scan budget | Dense (table) budget | Editor budget |
|---|---|---|---|
| `visibleCharacters` | ≤ 220 | ≤ 420 | ≤ 1600 |
| `visibleControls` | ≤ 4 | ≤ 6 | ≤ 24 |
| `textCoverage` | ≤ 0.35 | ≤ 0.50 | ≤ 0.50 |
| `padding` (minimum side) | ≥ 16px | ≥ 12px | ≥ 16px |

These are declared **project policy** for catching overloaded scan rows. They are not WCAG, not derived from a study, and not a validated measure of human-perceived crampedness. The editor budget exists only for a state the user explicitly opened; do not mark a collapsed row `editor`, and do not leave an editor expanded in the default view. The dense budget exists because a data table is a different job from a review row: many columns, tight cell padding, more visible text by design. It is not a way to fit an overloaded review row.

Definitions, so the numbers cannot be gamed by hiding content:

- **`visibleCharacters`** — Unicode code points of whitespace-normalized visible text in the region. A direct text node is counted once; ancestor `textContent` is never re-counted. Hidden text, transparent text, `<option>`s not displayed, screen-reader-only content and text outside ancestor overflow clips are excluded. Emoji sequences can count as multiple code points.
- **`visibleControls`** — visible interactive elements assigned to the region: buttons, links with `href`, `input` (not hidden), `select`, `textarea`, `summary`, contenteditable hosts, and ARIA widget roles (`button`, `link`, `checkbox`, `radio`, `switch`, `combobox`, `textbox`, `searchbox`, `slider`, `spinbutton`, `tab`, `menuitem*`, `option`, `treeitem`). The row's own required answer controls count. A control with no readable text still counts.
- **`textCoverage`** — union area of text line rectangles from `Range.getClientRects()`, clipped to the region's border box, divided by the region's border-box area. Rendered control text is included. This is line-box area, not glyph ink: line-height and inline padding inflate it. Offscreen but laid-out records are measured; viewport position is not an exclusion, but ancestor `overflow` clips are honoured.
- **`padding`** — the region's own computed `padding-top/right/bottom/left`, reported per side with the minimum compared to the profile's floor (16px, or 12px for `dense`). Padding on an unrelated inner card does not satisfy it.
- **`area`, `textArea`, `visibleCharacters`, `visibleControls`** — raw numerators and denominators are in every region result.

Nested regions are assigned to the nearest (innermost) region. The outer region's character count therefore excludes text inside the inner region while its area still contains it; avoid nested density regions unless that is intended.

If `regionSelector` matches nothing, or the selector is invalid, the report gains a density error and `pass` is false — except in the brand profile, where regions are optional and only an explicitly passed selector must match. Mark at least one region in product work.

## Run matrix

A useful audit is more than one call. For each shipped theme:

1. **Light and dark.** Emulate `prefers-color-scheme: light` and `dark`. The dark floors are different; do not reuse the light result.
2. **Desktop, tablet, mobile.** For example 1440×900, 768×1024, 390×844. Let layout and fonts settle before evaluating. The audit reports the viewport it saw.
3. **Scan state.** Default collapsed rows. Expect `data-ui-density="scan"`.
4. **Editor state.** Open Edit through the real interaction, confirm the region is now `editor`, and audit again. Five exposed fields in an opened editor are not a scan-density failure.
5. **Dense state.** A data table under `data-ui-density="dense"`, with `dense` roles on its cells and headers.
6. **Error, empty, loading and long real content.** These states are part of the UI; a single passing default view is not coverage.
7. **Brand surfaces.** Run `{profile:'brand'}` and clear every `manual` item with a measured worst-case ratio.
8. **Then look at the screenshot.** The report does not replace the visual checklist in `critique.md`, and a screenshot nobody inspected is not coverage.

The fixture harness covers these measurable cases: readable scan; 11px supporting text; 14px primary; low contrast; ancestor opacity; transparent ancestors over white; closed-details content; hidden/opacity-0 tiny text; gradient background; too many controls; too much copy; insufficient padding; 11px placeholder; an explicit editor with five buttons; a zero-text page; an inactive control exempt from contrast; a 13px table under the `dense` role; the same table without the role; a dense region at 12px padding; a brand gradient producing a manual item; and a brand page that still fails tiny text. Thirteen of the twenty-one cases are expected failures.

## What the audit does not measure

- Actual glyph ink, optical grey, line length (measure), whitespace distribution, alignment, grouping, rhythm, or hierarchy.
- Color count, accent restraint, decorative-border strength, shadows, gradients as aesthetics, or focus visibility (3:1 indicators are visual review).
- Images, canvas, iframes, closed shadow roots, SVG text, CSS counters/list markers, native select popups, or UA canvas color.
- Text under `transform: scale()`, browser zoom, or page zoom as a visual size; the floor is CSS px.
- Rag quality, orphans, widows, rivers and hyphenation. `text-wrap: pretty` and `balance` are judged by eye in `typography.md`; no geometry check replaces looking at the paragraph.
- Overlays that a hit test cannot see (`pointer-events: none`), pseudo-element backgrounds, or backgrounds from non-ancestor siblings.
- Clipping by `clip-path` or `mask` (only ancestor overflow clips are honoured), offscreen image-replacement text, and touch-target sizes (use the components checklist).
- Display color management and sub-8-bit differences; colors are sampled as 8-bit sRGB via the browser's 2D canvas (wide-gamut values gamut-clipped).
- APCA, user font settings, or the reader's actual acuity. APCA is the judgement layer in `color-system.md`; the audit stays on WCAG so the gate is unambiguous.
- The stance, the mode, the ruts, and whether the direction was a decision or a reflex. That is `brief.md` and `craft.md`.
- Whether a `dense` or `brand` declaration was honest. A page can opt into the dense tier to dodge the scan budget; only review catches that.

A short, calm row can pass and still be confusing. A dense data table can exceed the scan budget and be the right design for a different job. The budgets apply to the UI under review, not to every screen.

## Why it cannot decide taste

The audit knows geometry and color ratios. It does not know what the user came to decide. It cannot see that a row says four things when the decision needs one, that a divider is shouting, that a colored confidence pill competes with the primary action, or that the "primary" element is the wrong element. Those are the failures the design skill exists to catch, and they are judged from the rendered screenshot and the user's correction.

Use the report to stop measurable regressions: tiny copy, unreadable contrast, an always-open editor, a row carrying more than it needs. Never cite a passing number to overrule a crowded screen, a failing screenshot, or user feedback. A green audit is the floor, not the verdict.
