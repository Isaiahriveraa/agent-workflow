# Type, color, and space

Reuse the product's type, color, and spacing tokens. For a new system, define a small set of roles and scales that fits the content. The numeric examples below are starting points, not universal requirements. A justified optical adjustment or unique composition does not need to become a token merely because it exists.

## Type

- **Families.** Reuse the product's typography. For a new system, one UI family and an optional display family are a practical starting point. Check language coverage and legibility at real sizes before adding variety.
- **Scale.** Start with a small set of reusable sizes, e.g. 12, 14, 16, 20, 24, 32, 40, 56px, and use only the steps the content needs. Modular ratios can help but do not replace inspection at real sizes.
- **Body size.** 16px is a common web starting point, not an accessibility threshold. Judge readability by the typeface, audience, density, and actual rendering; support enlargement without loss of content or function.
- **Line height.** Body 1.5–1.6. Headings 1.1–1.25. Tighter line height for bigger type.
- **Measure.** 45–75 characters per line (see `layout.md`).
- **Weight contrast** builds hierarchy cheaply. Pair a heavy heading with a regular body. Avoid many weights.
- **Tracking.** Slightly tighten large headings. Slightly open all-caps labels.
- **Numbers.** Use tabular numerals in tables and any column of figures.

## Color

Build color in roles, not in hues.

- **Neutrals.** Reuse the existing neutral palette or define enough steps for backgrounds, surfaces, borders, and text roles. Do not add unused shades to meet a palette-size target.
- **Coherent accents.** One primary accent is a useful starting point, not a limit on an established palette. Additional hues need clear roles and must not make actions or states ambiguous.
- **Semantic colors.** Keep success, warning, error, and info treatments recognizable and consistent. A brand may share a hue; make role and context unambiguous rather than treating a hue as globally reserved.
- **Roles, not hex codes.** Name tokens by role: `text-primary`, `text-muted`, `surface`, `surface-raised`, `border`, `accent`, `accent-hover`, `danger`. Components reference roles only.
- **Proportion.** A common rough guide is 60% neutral, 30% secondary surface, 10% accent. Treat it as a check on how much color is competing for attention, not a rule.
- **Gradients and glows.** Use when they support meaning or the approved visual character. Reduce them if they obscure hierarchy, state, or contrast; their presence alone is not a defect.

## Contrast

- Body text: at least 4.5:1 against its background (WCAG AA). Large text (≥24px, or ≥18.66px bold): 3:1.
- Visual information needed to identify controls and states generally needs 3:1 against adjacent colors under WCAG 1.4.11, subject to its scope and exceptions. A visible focus indicator also needs sufficient contrast; a ratio alone does not establish complete focus accessibility.
- Check every token pair, including muted text on surfaces. Muted text is the most common failure.
- **Separate accessibility thresholds from house targets.** WCAG text-contrast thresholds do not change between light and dark themes. If a project adopts higher targets, record them in its design system rather than inventing a second default standard here. Inspect readability in both themes; ratios alone do not establish usability or conformance.
- **De-emphasise without losing readability.** Use weight and position as well as color; secondary text still needs sufficient contrast.
- Never rely on color alone to convey state. Pair it with an icon, text, or shape.

## Dark mode

- Tune dark-theme roles rather than mechanically inverting colors. Inspect large-area contrast and accent intensity; adjust them where needed without weakening text or state legibility.
- Shadows may lose effect on dark surfaces; use the product's surface, border, and elevation treatments to keep relationships clear.
- **Make surface relationships legible.** Lighter raised surfaces are a useful dark-theme convention, not a requirement for every nested region. An inset surface can be darker when its grouping and text remain clear; follow the product's elevation system.
- **Check grouping as well as contrast.** Inspect containers against their parents. Use space, surface differences, or borders where a region needs separation; a decorative container does not automatically need a contrasting outline.
- **Recheck applicable contrast pairs in every theme.** Do not assume a palette tuned against white remains readable when mirrored into dark mode.

## Space

- One scale for the product. A 4px base with steps such as 4, 8, 12, 16, 24, 32, 48, 64 works for most UI. A Fibonacci-like set (3, 5, 8, 13, 21, 34) also works if the team chooses it.
- Map spacing to roles: `space-inline-xs` for icon gaps, `space-stack-md` between related blocks, `space-section` between sections. Roles stop random values.
- Choose padding and gaps from shared tokens according to the component's density and grouping needs. See `layout.md` for relationships and reflow.
- Radius: reuse the product's roles. Subtracting padding from an outer radius can help nested rounded shapes look concentric; inspect the result rather than enforcing the formula on every container.
- Shadow and border: use a coherent elevation system. Overlays, interactive surfaces, and static content may need different treatments within it.

Source for theme-independent text thresholds: [W3C, Understanding SC 1.4.3 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), consulted 2026-10-15. Numeric scales and project-specific higher contrast targets are design choices, not WCAG mandates.
