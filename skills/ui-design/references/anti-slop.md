# Anti-slop checks and redesign protocol

Defaults a model reaches for when it tries to "look designed". Treat each as a
ban unless the brief or the project's design system asks for it. Use this with
`critique.md` when a page reads as generic or templated, and before touching an
existing site.

## Visual and type tells

- No neon or outer glows. Use inner borders or subtle tinted shadows.
- No pure black (`#000000`). Use off-black or charcoal.
- No oversaturated accents. Desaturate to sit with the neutrals.
- No gradient text on large headings. No custom mouse cursors.
- No oversized H1s that only shout. Carry hierarchy with weight and color.
- Serif faces suit editorial and luxury work, not dashboards.
- No div-built fake screenshots, fake terminals, or fake dashboards as the hero.
  Use a real image or component preview, or nothing.
- No hand-rolled icon SVGs. Use one real icon set.

## Content and data tells

- No placeholder people or companies: "John Doe", "Acme", "Nexus", "SmartFlow".
  Use realistic, locale-appropriate names.
- No egg avatars or generic user icons.
- No tidy numbers: `99.99%`, `50%`, `1234567`. Use believable messy ones.
- No filler verbs: "Elevate", "Seamless", "Unleash", "Revolutionize". Use
  concrete verbs.
- No em dashes or en dashes as separators or style. Use a period, comma,
  colon, or hyphen.

## Page-structure tells

- No version labels, "beta" or "early access" eyebrows, or version footers on
  marketing pages.
- No section-number eyebrows (`00 / INDEX`, `Stage 1 / Stage 2`). Name the topic
  or the step in plain words.
- An eyebrow above every section header is the templated rhythm. Use at most one
  per three sections.
- No split headers (big headline left, small explainer floating right) unless
  the right column carries real content.
- No scroll cues, locale or weather strips, decorative status dots, or middle-dot
  separator chains.
- No decoration text strip at the hero bottom (`BRAND. MOTION. SPATIAL.`).
- No pills, tags, or credit captions laid over images.
- No "Quietly trusted by" or "Field notes" style poetic labels. Use plain ones.
- No three identical equal-width feature cards. Vary the composition.
- No hairlines under every row of a long list or table.
- No filled background tracks for score bars on a landing page.

## Layout rules that fail the page

- The hero fits the first viewport: headline at most two lines, subtext about
  twenty words, CTAs visible without scrolling. A four-line headline is a
  font-size error, not a copy error.
- Hero holds at most four text elements: optional eyebrow, headline, subtext,
  CTAs. Trust logos, pricing teasers, and feature bullets belong in the section
  below.
- Desktop navigation fits one line, about 64-72px tall and never above 80px.
- A bento grid has exactly as many cells as content. No blank tiles.
- A layout family appears once per page. At most two consecutive image-and-text
  splits.
- Declare the narrow-screen fallback for every multi-column section.

## Redesign protocol

Pick the mode first. If unclear, ask once whether to preserve the existing brand
or start visually from scratch.

- **Preserve:** modernize without breaking the brand. Audit, extract tokens,
  evolve.
- **Overhaul:** new visual language over existing content. Keep content and
  information architecture.
- **Greenfield:** nothing exists yet.

Audit before changing anything: brand tokens, page tree and primary navigation,
content blocks that do real work versus filler, patterns to keep, patterns to
retire, and the SEO baseline. SEO migration is the biggest redesign risk.

Apply changes in this order and stop when the brief is met: typography, spacing
and rhythm, color recalibration, motion, hero and key-section recomposition,
whole-block replacement.

Preserve unless asked:

- Information architecture, page slugs, anchor ids, navigation labels.
- Copy voice. Visual modernizing is not a rewrite.
- Existing accessibility: focus states, alt text, keyboard navigation, contrast.
- Analytics hooks: button, field, and section ids that tracking depends on.

Never change without explicit approval: URL structure, primary navigation labels,
form field names or order, the logo or wordmark, and legal, consent, or cookie
copy.
