# Sources

Where the principles in this skill come from. Each entry states what was read and what was not. "Read in full" means the fetched text was checked end to end. "Partial" means the rest was not read. "Not read" means the entry is named but its content is not relied on here.

## Read in full (primary, design-relevant)

- **Jeremy's typography lecture slides** (five screenshots supplied 2026-10-22, not published). Relied on for: line length and measure; rag; orphans and widows; justification causing uneven word spacing; adjusting line lengths and hard breaks after the text exists while keeping the grid; the explicit statement that layout is not a formula; visual balance and rhythm; text importance driving treatment; grouping affecting clarity; the experience of reading. The slides are lecture material; no textbook is quoted from them.
- **Linear** — https://linear.app/ , the public global stylesheet at `https://static.linear.app/web/_next/static/css/layout.CGKNFvmu.css`, the design posts https://linear.app/now/how-we-redesigned-the-linear-ui and https://linear.app/now/behind-the-latest-design-refresh , and a product screenshot supplied by Jeremy 2026-10-22. Relied on for: the 1px/0.5px hairline token, translucent separators, four-step neutral ramp, one accent limited to focus/links/selection/primary, mono-only uppercase micro-labels, 510-weight display type, tabular numerals, transparent shadow tokens outside overlays, and the "structure should be felt not seen" principle. Not read: the logged-in app CSS, so in-app row heights and any post-login component spec are unverified; a third-party `DESIGN.md` analysis was treated as unreliable where it conflicted with the stylesheet.
- **shadcn/ui** — https://ui.shadcn.com/ and https://ui.shadcn.com/examples/dashboard , read as rendered. Relied on for: the CSS-variable role token set, one radius variable, low-contrast borders, focus ring via `--ring`, the dark block's eyebrow/value/delta/context card, hairline-separated tables. Component source was not read.
- **Geist design system, Typography** — https://vercel.com/geist/typography , read as rendered. Relied on for: role-named type classes (`text-16` and siblings), hairline section rules instead of cards, documentation-page measure and nav sizing.
- **Raycast** — https://www.raycast.com/ , **Notion product page** — https://www.notion.com/product , and **Stripe** — https://stripe.com/ , each read as rendered on 2026-10-22. Relied on for pattern-level observations only: one bold graphic carrying a neutral page (Raycast), oversized display type with inline emphasis and a single filled primary (Notion), editorial headline scale with two-color emphasis and one accent (Stripe). No claim is made about their internal systems or tokens.
- **Figma** — https://www.figma.com , **Superhuman** — https://superhuman.com , and **GitHub Features** — https://github.com/features , each read as rendered on 2026-10-22. Relied on for pattern-level observations only: asymmetric type block with a hard break and one dark pill (Figma); split hero plus a hairline-separated three-row toolkit list (Superhuman); a gradient hero over two identical centreed cards, recorded as a counterexample rather than a reference (GitHub).
- **Mobbin and Nicelydone screen captures** (14 screens: Linear settings and project page; Stripe transactions, dashboard home and fraud overview; Vercel project dashboard and deployment detail; Notion database table; Things 3 timeline; Raycast AI chat; Superhuman onboarding; Ramp virtual cards and reimbursements; Attio reports), each loaded and looked at on 2026-10-22. Relied on for the pattern-level observations recorded in `inspiration.md`. These are captures of shipped products; nothing is claimed about their internal tokens, and the Ramp entries come from Ramp's own hosted demo, so tour chrome is present.
- **Apple, Human Interface Guidelines: Layout** — https://developer.apple.com/design/human-interface-guidelines/layout (markdown alternate, fetched in full). Relied on for: order content by importance from top and leading side; alignment reads as relation and indentation as subordinate; use negative space, containers, or separator lines to show grouping; progressive disclosure to reduce visible choices; determine layout from size classes, not device type; keep functionality the same as layout changes. The tvOS grid spec (860/560/410 pt units) is platform-specific and not used as a general rule.
- **Nielsen Norman Group, "Proximity Principle in Visual Design"** (Aurora Harley, 2020) — https://www.nngroup.com/articles/gestalt-proximity/ . Relied on for: items near each other read as related; whitespace separates groups; far-away controls are overlooked; grouping can change in responsive layouts.
- **Nielsen Norman Group, "Form Design Quick Fix: Group Form Elements Effectively Using White Space"** (Marieke McCloskey, 2013) — https://www.nngroup.com/articles/form-design-white-space/ . Relied on for: place a label closer to its field than to the next field; group long forms into labeled chunks; prefer top-aligned labels; avoid placeholder text as a label.

## Read in part

- **Ken Kocienda with Frank Chen, a16z, "Inside the Apple Factory: Software Design in the Age of Steve Jobs"** (YouTube auto-generated captions, 2019) — https://www.youtube.com/watch?v=kl2Flp4oK-g . About 50 KB of an 86 KB transcript was read (about 58%). The remainder was not read. Relied on for what was read: the "Directly Responsible Individual" (DRI) role, where one person owns a feature and is the one who demos it; small teams with tight cohesion and the costs of adding people; software keyboard as a constraint-driven decision made early; copy and paste deliberately cut from the first iPhone; the demo room as a place where the person who did the work shows it. Quotes are from auto-captions and may contain transcription errors.
- **Nielsen Norman Group, "Visual Hierarchy in UX: Definition"** — https://www.nngroup.com/articles/visual-hierarchy-ux-definition/ . The fetch returned the article with a large middle section omitted, so it is not read end to end. The meta description ("variations in color and contrast, scale, and grouping") is the only text relied on here.

## Read in full (secondary, meta or unverified)

- **Ken Kocienda, a16z show page (description only)** — https://podcasts.apple.com/us/podcast/inside-apple-software-design/id842818711?i=1000558946714 . The description covers his path from photographer to Apple engineer (2001–2017) and the iPhone keyboard. Its date (28 April 2022) differs from the description's "April 2019". Audio not read.
- **Jony Ive, Vanity Fair New Establishment Summit** (Lessley Anderson, 9 Oct 2014) — https://www.vanityfair.com/news/tech/2014/10/jony-ive-lessons-from-steve-jobs . Read in full. Relied on for: focus as a daily question about the right task; "A beautiful product that doesn't work very well is ugly"; Apple's core design team was 16 people and still starts with drawings.

## Not read

- **Edward Tufte, "Table and timetable design and typography"** — https://www.edwardtufte.com/notebook/table-and-timetable-design-and-typography/ . The fetched page had only a cookie banner and image references. The data-ink definition used elsewhere is from an ACM paper, not from Tufte's book: https://dl.acm.org/doi/epdf/10.1145/1362550.1362587
- **Refactoring UI** — Adam Wathan & Steve Schoger. Only the publisher's homepage was read (https://refactoringui.com/), which describes the book as "tactics explained from a developer's point-of-view". Chapter contents were not read.
- **Material Design 3, understanding layout** — the URL returned HTTP 404.
- **Grid Systems in Graphic Design** — Josef Müller-Brockmann. Only its existence was confirmed. The asymmetry-on-grid point in `layout.md` is general knowledge, not from this book.
- **Creative Selection** — Ken Kocienda. Existence confirmed by the interviews above; not read.
- **Ken Kocienda, Business Insider** (16 Sept 2018) — https://www.businessinsider.com/ken-kocienda-apple-iphone-steve-jobs-2018-9 . Only the description was read; the article body was not.
- **Jony Ive, Macworld on Jobs' "one-word advice"** (Aug 2022). The article did not load; the one word is unknown here.
- **Dieter Rams, 10 Principles for Good Design.** The Rams Foundation design-comprehension page was read (https://rams-foundation.org/foundation/design-comprehension/). It links to "10 Theses on Good Design", which returned HTTP 404. Do not quote the principles from memory.
- **Gestalt closure, similarity, common region, continuity** — named from general knowledge. The NN/g proximity article above is the only read source for Gestalt in this skill, and it covers proximity and common region.
- **Swiss International Typographic Style.** Asymmetric type on modular grids. From general knowledge; not read from a primary source here.

## Added 2026-10-31 (mechanism pass)

Read by a delegated research pass; quotes and figures below are what the fetched
pages and repository files stated.

- **Butterick, *Practical Typography*** — https://practicaltypography.com/summary-of-key-rules.html and /letterspacing.html. Relied on for: letterspacing 5–12% on caps only; kerning always on; real small caps or none; curly quotes and proper ellipsis; indent XOR paragraph space; hyphenation required with justification; tracking added below body size and removed at display sizes.
- **Björn Ottosson, "A perceptual color space for image processing"** — https://bottosson.github.io/posts/oklab/. Relied on for: OKLab/OKLCH axes are perceptually orthogonal; even blending; why HSV lightness is not usable for ramps.
- **APCA (Accessible Perceptual Contrast Algorithm)** — https://git.apcacontrast.com/documentation/APCAeasyIntro.html. Relied on for: size- and weight-aware Lc ladder (≈90 body, 75 minimum body, 60 non-body, 45 headlines, 30 placeholder/disabled, 15 non-text) and the critique of flat WCAG ratios for dark mode. Used as a judgement layer, not as the gate.
- **Radix Colors, "Understanding the scale"** — https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale. Relied on for: the 12-step role map (1–2 backgrounds, 3–5 component states, 6–8 borders, 9–10 solid, 11–12 text) and the Lc 60 / Lc 90 guarantee for text steps.
- **Tailwind CSS v4 announcement** — https://tailwindcss.com/blog/tailwindcss-v4. Relied on for: OKLCH and P3 palettes as mainstream practice; named easing tokens.
- **Material Design 2, Dark theme** — https://m2.material.io/design/color/dark-theme.html. Relied on for: base surface #121212, white overlay ladder by elevation (5–16%), desaturating saturated color, and the 15.8:1 text-on-surface ceiling so text passes at the lightest elevation.
- **Material Design 3 motion tokens** — the motion duration/easing SCSS token file. Relied on for: the duration ladder (50–1000ms) and the emphasized/standard easing curves; noted that M3 is moving toward spring physics.
- **Apple HIG, Motion** — https://developer.apple.com/design/human-interface-guidelines/motion. Relied on for: purposeful motion, never the only channel, avoid motion on frequent interactions, allow cancellation.
- **Apple HIG, Dark Mode** — https://developer.apple.com/design/human-interface-guidelines/dark-mode. Relied on for: base vs elevated background sets, no inversion, 4.5:1 minimum with 7:1 for custom colors, no app-only appearance toggle.
- **NN/g, "Response Times: The 3 Important Limits"** — https://www.nngroup.com/articles/response-times-3-important-limits/. Relied on for: 0.1s / 1s / 10s budgets and the feedback implication at each.
- **NN/g, "Skeleton Screens 101"** — https://www.nngroup.com/articles/skeleton-screens/. Relied on for: the <1s / 2–10s / >10s loading decision table.
- **NN/g, "Text Over Images"** — https://www.nngroup.com/articles/text-over-images/. Relied on for: overlay opacity failing on busy images, directional scrims, designing for the worst-case image.
- **NN/g, "Design Critiques"** — https://www.nngroup.com/articles/design-critiques/. Relied on for: round-robin or quota feedback, reformulating opinions into goals, a visible record, short sessions.
- **GitHub Primer, focus management** — https://primer.style/accessibility/design-guidance/focus-management. Relied on for: the focus contract for dialogs, deletion and insertion.
- **Chrome, improve text layout and legibility** — https://developer.chrome.com/docs/modern-web-guidance/guides/visual-design/improve-text-layout-and-legibility. Relied on for: `text-wrap: balance` limits and cost, `pretty` behaviour on blocks of three or more lines.
- **MDN, `font-optical-sizing`** — https://developer.mozilla.org/en-US/docs/Web/CSS/font-optical-sizing. Relied on for: what an `opsz` axis does at small and large sizes.
- **Emil Kowalski, animation notes** — https://emilkowal.ski/ui/7-practical-animation-tips and /ui/good-vs-great-animations. Relied on for: press scale 0.97, never entering from `scale(0)`, ease-out default, UI motion under ~300ms, moving-on-screen uses ease-in-out, springs only for direct manipulation, removing animations seen hundreds of times a day.
- **Playwright visual comparisons** — https://playwright.dev/docs/test-snapshots. Relied on for: per-browser/platform baselines, pixel threshold, masking volatile content, reviewing diffs.
- **Material Design 2, spacing methods** — https://m2.material.io/design/layout/spacing-methods.html. Relied on for: 8dp component grid and 4dp baseline, keylines, the standard aspect-ratio set, 48dp targets with 8dp gaps.

## Peer skills examined (not design sources)

Repository review, 2026-10-31. Used for mechanisms, not for doctrine:

- **pbakaus/impeccable** — `skill/SKILL.src.md`, `reference/craft-floor.md`, `typeset.md`, `animate.md`, `mode-persuade.md`, `mode-read.md`, `document.md`, `new-work.md`, `tests/skill-behavior/`. Relied on for: browser-surface details as a craft floor (selection, caret, scrollbars, underline offset); the calibration list of AI clusters; elevation declared once (border vs shadow); the "modes per surface" idea; duration and reduced-motion numbers; the DESIGN.md-at-finish idea; the screenshot-capture validity check. Rejected: its verb sprawl, on-disk build state machines, and pixel-comp pipeline as ceremony for code-first work.
- **anthropics/skills, `frontend-design`** — the five-cluster calibration list with hex values (`#F4F1EA`, `#D97757`, `rgba(0,0,0,.1)`), the unique test, and the "propose four directions, then pick" gate. Relied on for the ruts section.
- **nextlevelbuilder/ui-ux-pro-max-skill** — the abstain-and-label contract, per-domain score floors, the golden-report eval idea, and the density scale variants. Relied on for the evaluation harness shape. Its 12px type floor is rejected.
- **podo/design-agent-skills** — the "when not to use, use X" cross-reference pattern; its install trees, stub catalogue and duplicated metadata are rejected.

## How the skill uses these

- The rules in the references are our own statements, not quotes from any source above, except where a sentence names its source.
- When a product's brand conflicts with a rule, the brand wins for color and type. Structure rules (hierarchy, grouping, scale) still apply.
