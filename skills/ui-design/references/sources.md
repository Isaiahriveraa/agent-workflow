# Sources

Where the principles in this skill come from. Each entry states what was read and what was not. "Read in full" means the fetched text was checked end to end. "Partial" means the rest was not read. "Not read" means the entry is named but its content is not relied on here.

The reading-status entries below are preserved from upstream, not claims of a fresh local review. Sources researched for the local familiar-behavior extension are documented with their uses and access date in `familiar-interactions.md`.

## Read in full (primary, design-relevant)

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

## How the skill uses these

- The rules in the references are our own statements, not quotes from any source above, except where a sentence names its source.
- Accessibility requirements, truthful content, and correct interaction behavior are not taste options. Visual defaults, including hierarchy tactics, grouping treatments, and scales, yield to the task, audience evidence, and approved design system. Explain the concrete tradeoff rather than treating a visual recipe as a universal rule.
