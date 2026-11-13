# Color systems

`type-color-space.md` states the roles and the floors. This file is the
mechanism: how a ramp is built, how a theme is chosen, and how color survives
dark mode without becoming grey soup.

## Build in a perceptual space

- **Use OKLCH.** L is perceived lightness, C is chroma, h is hue; they move
  independently, so a ramp that changes only L looks even. Hex and HSL ramps
  drift in lightness as hue changes (yellow reads far lighter than blue at the
  same value), which is why hand-picked palettes need constant patching.
- **A ramp is one hue, monotonic L.** Fix h, step L from 0.98 to 0.15, adjust C
  per step (chroma peaks in the middle, tapers at both ends). Never interpolate
  two ramps in RGB.
- **Neutrals are a hue too.** Pick one hue for the grey ramp (250 cool, 60 warm,
  30 paper) and keep it constant; a warm product with a cool grey chrome reads
  as two products. Chroma stays very low (0.002–0.012).
- **Chroma budget by hue.** Blue and purple tolerate more C at the same L than
  yellow or green, which go garish sooner. Test at the extremes, not the middle.
- **Wide gamut is a bonus, not a requirement.** `oklch()` will render in P3 on
  capable displays and clip elsewhere. Provide a fallback color first for older
  browsers (`background: #2f6ec8; background: oklch(...)`), and check the
  clipped result is still on-palette.

## The twelve-step scale

One scale per hue, each step with a fixed job. This is how a system stays
coherent as it grows: a component asks for a role, never for "a light blue".

| Step | Role |
|---|---|
| 1 | App background |
| 2 | Subtle background (cards, panels) |
| 3 | Component background (default input, chip) |
| 4 | Component hover |
| 5 | Component active / selected |
| 6 | Subtle border (decorative separators) |
| 7 | Interactive border (inputs, outline buttons) |
| 8 | Strong border, focus ring |
| 9 | Solid fill (primary button, badge, logo) — the purest chroma |
| 10 | Solid fill hover |
| 11 | Secondary text on 1–2 |
| 12 | Primary text on 1–2 |

- Steps 1–8 are surfaces and lines. Text lives at 11–12, or on 9 with a contrast-checked
  foreground.
- **A component only ever references steps, never raw values.** A token named
  `--accent-9` is a ramp token; `--button-primary-bg: var(--accent-9)` is a
  component token. Two levels; no third.
- Ramps are generated once, checked once, and then frozen. Editing a step by eye
  is how a system accumulates fourteen blues.

## Choose a strategy before choosing colors

| Strategy | Share of screen | Use when |
|---|---|---|
| **Restrained** | Neutrals + one accent on ≤10% | Product UI, dashboards, settings, most tools |
| **Committed** | One saturated field carries 30–60% | Brand-led landing, campaign, a bold brief |
| **Full palette** | 3–5 hues with clear roles | Data-dense products, category color, charts |
| **Drenched** | The surface *is* the color | A hero, a single campaign page, a launch |

- The stance sets the strategy: utilitarian → restrained; bold brand →
  committed or drenched; editorial → restrained with one accent; warm product →
  restrained, with a warm neutral ramp doing most of the work.
- **The One Voice Rule:** the primary accent appears on ≤10% of a restrained
  screen. Its rarity is what makes it readable as a signal.
- On a colored surface, tint secondary text from that hue (or use the
  foreground), never neutral grey — grey on color looks dirty.

## Semantic color

- Dedicated hues for status (`danger`, `success`, `warning`, `info`) that never
  double as decoration. One meaning per hue.
- **Glyph scale only:** a dot, a tick, a small badge, one word. Not a row tint,
  not a rail, not a card border, not a heading.
- Pair every semantic color with a shape or a word, so color is the second
  signal. Check the red/green pair with a deuteranopia simulation.
- On a tinted surface, check the mark against the tint, not against white.

## Dark mode

- **Do not invert.** Re-pick the ramp against the dark ground; keep the same hue
  families so the product is recognizable.
- Base surface is a near-black with a hint of the neutral hue, not `#000`
  (pure black amplifies halation and smears on OLED scroll). Panels step
  *lighter*: elevation goes up, never down.
- **Material's overlay ladder** is a usable default for elevation: each level
  adds white at 5 / 7 / 8 / 9 / 11 / 12 / 14 / 15 / 16% over the base. The point
  is a monotonic ladder, not the exact numbers.
- **Desaturate saturated fills**: a chroma that looks confident on white
  vibrates on near-black. Lower C for large areas, raise L for accents that must
  stay legible as text.
- **Compensate light-on-dark on three axes**: one step more line height, a touch
  more tracking, and sometimes one weight step. Halation makes dark-theme text
  look tighter than it measures.
- Soften bright images with a slight darkening so they do not glow out of the page.
- No product-level light/dark toggle that diverges from the system setting;
  follow `prefers-color-scheme` and offer a matching override only when the
  product has a real reason (a media app, a kiosk).
- Mirroring tokens is where dark mode dies: re-run the contrast table after the
  conversion, container by container.

## Contrast: two layers

- **The gate is WCAG 2.x** (4.5:1 text, 3:1 large and necessary indicators), with
  the audit's higher dark floors. It is what the automated check enforces.
- **APCA is the judgement layer.** WCAG's ratio overstates contrast for dark
  colors and cannot guide dark mode well. APCA's Lc ladder is size- and
  weight-aware: ~Lc 90 for body at 400 weight, ~Lc 75 minimum body, ~Lc 60 for
  non-body text, ~Lc 45 for headlines, ~Lc 30 for placeholders and disabled,
  ~Lc 15 as the non-text floor. Use it when a ratio passes but the text still
  reads weak, and when choosing between two greys.
- **Text over imagery:** measure the worst pixel, not the average. A 30% black
  box still fails on many photographs; 50% passes. Prefer text beside the image,
  then a directional scrim with a floor fade, then a solid band. Design against
  the busiest image in the set, not the calmest.
- **Colored surfaces:** check text against the tint, and tint the secondary text
  from the same hue. A 10% accent allocation is not an invitation to fill it.

## Gradients

- Interpolate in OKLCH so the midpoint does not go grey or muddy. Two stops is
  usually enough; three needs a reason.
- A gradient is legitimate as a field, a light source, or a scrim. It is a tell
  when it sits on every card, behind every heading, or inside the text itself.
- Never gradient text. Never a gradient as the only signal of state.

## Tokens

- Name by **role**, not by appearance: `--surface`, `--surface-raised`,
  `--border-subtle`, `--border-control`, `--text`, `--text-muted`, `--accent`,
  `--danger`. A token called `--blue-500` will be misused the moment the design
  changes.
- Two levels only: ramp tokens and component tokens. A component that references
  a ramp step directly is acceptable; a component that references a raw hex is a bug.
- The palette is normative and lives in one file (`scripts/tokens.css` is a
  working starter with measured ratios). Prose describes it; code decides it.
- Write the tokens down *after* the design settles, from the built world — a
  rulebook written before the build gets defended instead of describing reality.

## Tells

| Tell | Fix |
|---|---|
| Purple-blue gradient hero | Choose a stance; commit to one color or none |
| Every label, badge, rail and icon tinted with the accent | Return chrome to neutral; keep the accent for one action and focus |
| A gray-on-color surface | Tint the secondary text from the surface hue |
| Light theme with the hex values inverted for dark | Re-pick the ramp; step elevation lighter; re-measure |
| Colored border on every card | Surface step or hairline; color only where it means something |
| Status conveyed only by hue | Add shape and a word |
| Fourteen slightly different blues | One 12-step ramp, role names, frozen |
| Pure `#000` dark canvas with pure `#fff` text | Near-black with a hue, off-white text, compensated leading |
