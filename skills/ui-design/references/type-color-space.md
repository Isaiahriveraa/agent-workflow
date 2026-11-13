# Type, color, and space

These three are tokens. Define each as a small named scale, then use only the scale. A value that appears once in the code is a smell.

## Type

The full treatment is in `typography.md`. The short version:

- **Pick one family for UI, one for display if needed, and stop.** Two families is usually enough. Choose for the personality the product needs, then check it at small sizes.
- **Scale.** Derive from one ratio (1.2 dense app UI, 1.25 general, 1.333 marketing). Supporting UI copy has a 14px floor; body copy and record names start at 16px. Do not invent an 11px metadata tier to fit more content. Tabular cells and headers may opt into 13px with `data-ui-role="dense"`; nothing else may.
- **Delete before shrinking.** Cut labels and explanations, or reveal them on demand. Font size is not a density control. Check actual computed sizes, including placeholders and form controls.
- **Line height.** Body 1.5–1.65. Headings 1.05–1.25. Longer measure needs more leading.
- **Measure.** 45–75 characters per line, `max-width: 65ch` on the prose container (see `typography.md`).
- **Weight contrast** builds hierarchy cheaply, and beats size. Pair a heavy heading with a regular body. Avoid many weights.
- **Tracking.** Tighten large headings (−0.02em above 32px). Open only short all-caps labels (+0.04–0.08em).
- **Rag, orphans, widows.** Left-align; `text-wrap: pretty` on paragraphs, `balance` on headings. A one-word last line is a defect, fixed by wording or measure.
- **Numbers.** Tabular numerals in tables and any column of figures.

## Color

Build color in roles, not in hues. The mechanism — perceptual ramps, the
12-step scale, strategies and dark mode — is in `color-system.md`; this section
is the short version.

- **Neutrals.** Build a gray scale of 9–11 steps. Most of the UI uses neutrals: backgrounds, surfaces, borders, text tiers.
- **One accent.** Mostly reserve it for the primary action and keyboard focus. Selected routine metadata can use neutral weight or shape instead of another colored pill.
- **A neutral inverted primary is often better than a saturated one.** Near-black on light (near-white on dark) competes with nothing, and leaves the accent free for focus and state. Choose a brand-filled primary when the brand is the point, not by default.
- **Spend color at the smallest useful scale.** A dot, a delta, an icon or a single word carries meaning without tinting a whole row. A tinted row has to be re-read; a colored dot is understood at a glance.
- **Semantic colors.** A small fixed palette for graded attributes: priority (red / orange / blue / gray), confidence or certainty (red / amber / green), attention, success, danger. Reserve each hue for one meaning and keep a text label beside every use.
- **Glyph scale only.** 6-10px marks, badges and ticks. Not row backgrounds, not rails, not card borders, not headings. If deleting the color removes the meaning, the label was missing.
- **Dark mode retunes each hue**, not just the neutral ramp: lift saturation for reds and ambers, keep greens pale. Check every semantic mark against its actual background, not against white.
- **Roles, not hex codes.** Name tokens by role: `text-primary`, `text-muted`, `surface`, `surface-raised`, `border`, `accent`, `accent-hover`, `danger`. Components reference roles only.
- **Restraint.** Most visible area should be neutral. Do not treat a 10% accent allocation as space to fill; on a restrained screen the accent stays under it (the One Voice Rule). More independently colored states mean more things the reader must decode.
- **Strategy before hues.** Restrained (≤10% accent) for product UI, committed (one field carries 30–60%) for a brand-led surface, full palette for data, drenched for a single campaign. The stance chooses the rung.
- **Gradients and glows.** Use only when they carry meaning or mark a hero. A gradient on every card is a default-AI tell.

## Contrast

- Body text: at least 4.5:1 against its background (WCAG AA). Large text (≥24px, or ≥18.66px bold): 3:1.
- Necessary non-text indicators and visible focus must meet 3:1 against adjacent colors (WCAG 1.4.11). This is **not a rule that every border must meet 3:1**. Decorative list separators, card edges and separators should usually be subtle or absent. Text buttons need legible labels and visible focus, not a box.
- Measure actual rendered text over its composited background, including ancestor opacity. Token checks are a preliminary check, not proof. Gradients, images and overlays that the audit cannot resolve need manual evidence, not an automatic pass.
- **WCAG is the gate; APCA is the judgement.** WCAG 2.x ratios are what the audit enforces. APCA's Lc values are size- and weight-aware and are the better second opinion when a ratio passes but the text reads weak, and for dark-mode choices: roughly Lc 90 for body, 75 minimum body, 60 non-body text, 45 headlines, 30 placeholder/disabled, 15 non-text. Do not replace the gate with an unmeasured APCA claim; do not ignore a weak screen because the ratio passed.
- **Target higher in dark mode.** Light text on a dark ground halates: strokes bloom and the eye reads the gap between glyph and background as smaller than it measures. A dark theme that reproduces its light twin's ratios still reads weaker, and the tiers that lose most are the quiet ones — secondary text, metadata, counts. Set the floor per theme, not once:

  | Tier | Light | Dark |
  |---|---|---|
  | Primary and body text | 4.5:1 | 7:1 |
  | Secondary text, labels, table headers | 4.5:1 | 6:1 |
  | Muted text: timestamps, counts, ids | 4.5:1 | 5.5:1 |
  | Necessary control indicator and focus ring, not decorative edges | 3:1 | 3:1 |

  These are floors, not ambitions. A tier that passes in light and fails in dark is a bug in the theme, not a preference of it.
- **De-emphasise by removing, deferring, positioning and changing weight, not by unreadable text.** Keep the 14px floor and the contrast floor. If that makes everything compete, fewer things belong in the default view.
- Never rely on color alone to convey state. Pair it with an icon, text, or shape.

## Dark mode

- Do not invert. Re-pick the neutral scale, lower contrast of large areas, and desaturate the accent slightly.
- Shadows lose effect on dark surfaces; use lighter surfaces for elevation instead.
- **Elevation goes up, not down.** In light mode a container that sits *inside* something — a comment bubble, a code block, a table header, a well — is usually a step darker than its parent. Re-picking the neutral scale as a straight mirror keeps that direction, and on a dark ground a darker panel reads as a hole: the text inside it loses apparent contrast and the group stops reading as a group. Map every "a step darker than the page" surface to "a step lighter than its container".
- **Check each container against its parent, not only its text against its container.** A bubble a few percent off the surface behind it disappears as a unit even when its text passes. A container that holds content needs enough separation to read as one region; lightness is the primary tool in dark mode and a border is the fallback.
- **Elevation is a ladder, not a guess.** Each raised step adds a few percent of white over the base (Material uses 5/7/8/9/11/12/14/15/16% by level). Pick a monotonic ramp and stick to it; the exact numbers matter less than the direction.
- **Compensate light-on-dark on three axes:** a touch more line height, a little more tracking, sometimes one weight step. Halation makes dark-theme text look tighter and thinner than it measures.
- **No product-level appearance toggle** that diverges from `prefers-color-scheme`, unless the product is the kind that needs it (media, kiosk). Two themes to maintain is a design system decision, not a switch.
- **Re-run the whole contrast table after converting.** Mirroring tokens is where dark mode is usually lost: the ramp was tuned against white, then flipped and never measured again.

## Space

- One scale for the product. A 4px base with steps such as 4, 8, 12, 16, 24, 32, 48, 64 works for most UI. A Fibonacci-like set (3, 5, 8, 13, 21, 34) also works if the team chooses it.
- Map spacing to roles: `space-inline-xs` for icon gaps, `space-stack-md` between related blocks, `space-section` between sections. Roles stop random values.
- Padding and gap inside a component come from the component's scale step, not the page's.
- Radius: one or two values. Match the radius to the scale: inner radius = outer radius minus padding.
- Use whitespace as the default grouping language. A soft surface can identify an editable input without a heavy outline. Low-contrast decorative hairlines are allowed. Necessary control state and focus are separate, accessible indicators.
