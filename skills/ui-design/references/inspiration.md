# Inspiration

References are for **mechanics**, not compositions. Take a rule (hairline
instead of card chrome, color at dot scale, one inverted primary) and apply it
to your problem. Do not clone a screenshot, and do not copy a look that belongs
to another product's brand.

Every entry below was loaded and looked at on 2026-10-22, unless marked. What is
claimed is what was visible, not what their design system contains.

**Coverage and its bias.** This catalogue is almost entirely utilitarian product
UI — Linear, shadcn, Vercel, Stripe, Attio, Ramp, Notion. That is deliberate: it
is the hardest stance to fake and the one most agent work lands in. It is also a
bias. For editorial work, read magazines and documentation sites that set type
well (independent literary magazines, Stripe Press, the FT's web app); for warm
product work, read consumer apps with a warm neutral ramp (Things, Bear, Airbnb's
guest flow); for bold brand work, read campaign pages that commit to one field
(Linear's own launch pages, Vercel's release pages, Raycast's single-graphic
pages). Take mechanics from all of them, and do not import a bare minimum
aesthetic into a product that needs warmth.

## Reference systems

### Linear — linear.app, its public CSS, and a product panel screenshot

Read from Linear's own stylesheet and marketing pages, plus a product screenshot.
The clearest example of a utilitarian stance that still looks expensive.

- **Type:** one variable family (Inter Variable with `cv01`/`ss03` features),
  `font-variation-settings: "opsz" auto` standing in for a separate display cut.
  UI weights are 300/400/510/590/680, defaulting to **510**; headings on the
  marketing pages ship at **510**, not 700. Titles tighten with size: −0.012em at
  17–24px, −0.022em at 32–72px.
- **Uppercase is mono only:** every uppercase rule is a mono micro-label at
  `letter-spacing: normal`. There are no wide-tracked Inter caps anywhere.
- **Numerals:** `lining-nums tabular-nums` for timestamps and counts at 12–14px
  in a quaternary text tier; issue IDs in mono.
- **Color:** four neutral steps are the whole ramp, generated in LCH (3 inputs:
  base, accent, contrast). One accent (`#5e6ad2` / `#7170ff`) on focus rings,
  links, text selection and the primary button. A 7-hue semantic palette is
  reserved for status dots and labels; chrome is never tinted, and badges use
  white at 10% alpha rather than a color wash.
- **Borders:** `--border-hairline` is 1px, downgraded to **0.5px at 2× DPR**.
  Separators are translucent white at 5–8%; solid borders are only for inputs.
  Outer frame lines are quieter than inner ones.
- **Shadow:** every root shadow token is `0 0 0 transparent`. Only floating
  overlays get one. Elevation is a surface step plus a hairline.
- **Density:** dense 24px rows in the mocked lists, while the panel chrome around
  them is ~2.5× looser. Comfort in navigation, density in the scanning surface.
- **Stated principle (2026):** "Structure should be felt not seen." Their refresh
  removed separators, softened contrast and dimmed the sidebar.
- **Focus stays loud:** 2px accent outline, offset 2px, and nothing for mouse
  focus (`:focus:not(:focus-visible)`).

Take: hairline layering at half a pixel on retina, dot-scale color, a neutral
ramp generated rather than hand-picked, 510-weight display type, mono for IDs,
and the discipline of never tinting chrome.

### shadcn/ui — https://ui.shadcn.com and /examples/dashboard

The clearest example of a token model that keeps generated UIs consistent.

- **Tokens over hex:** `background`, `foreground`, `card`, `muted`,
  `muted-foreground`, `border`, `input`, `ring`, `primary`, `destructive`, all as
  CSS variables. Components reference roles, so a theme swap does not touch them.
- **One radius variable** for the whole system, with derived smaller values for
  nested controls.
- **Borders at low contrast**, one 1px line, doing the separating work that cards
  would otherwise do. Focus is a separate, visible ring.
- **Dashboard blocks:** card with a 1px border; a muted 13px label; the value at
  26–32px semibold with tabular figures; a 12px colored delta; a 13px muted
  context line. Table headers 13px muted over hairline-separated rows.
- **Dark mode** is the same tokens with different values: near-black canvas, one
  step lighter for panels.

Take: the eyebrow → value → delta → context cluster, role tokens, one radius,
hairline tables, and the discipline of never styling a component with a raw hex.

### Geist — https://vercel.com/geist/typography

A documentation system rather than a product UI, useful for type discipline.

- **Role-named text classes** (`text-16` and siblings) instead of ad-hoc sizes.
- **Full-width hairline rules** between sections instead of cards.
- Measure held at roughly 65 characters in running text.
- **Mono for code, identifiers and technical microcopy**, never for body text.

Take: name the text roles, use rules rather than boxes, keep mono for machine
text.

## Product patterns

Shipped product UI, each screen loaded and looked at on 2026-10-22. The link is
the capture; the move is what is visible in it.

| Product and screen | What to take |
|---|---|
| **Linear, workspace settings** — https://mobbin.com/explore/screens/9aa1ca14-09e4-42bb-9427-8a30e0869ec3 | One narrow form column, label above field, a single filled action per section. Destructive action isolated at the bottom in its own titled block, never beside the primary. Active nav item is a full-bleed neutral pill, not a colored highlight |
| **Linear, project page** — https://mobbin.com/explore/screens/fbc90fbf-85dc-4053-8b50-ea91ecd9a908 | Metadata as a flat key/value rail with no cards. Progress as milestone rows with a numeric count chip instead of a bar |
| **Stripe, transactions** — https://mobbin.com/explore/screens/1bbafee3-44a6-4a27-81d2-dfdab7388258 | Filters as a row of removable chips plus a plain result count, no modal. Amounts right-aligned with a muted currency suffix. Status pill carries an inline tick, so state is never colour alone. Row actions are ghost icons |
| **Stripe, dashboard home** — https://mobbin.com/explore/screens/b6bcbb98-1398-4f4f-84ca-106dda66841e | Metrics as label-left, value-right rows on hairlines instead of a card grid. The greeting does the orientation work, so the body needs no hero |
| **Stripe, fraud overview** — https://mobbin.com/explore/screens/6d812512-d172-4e8d-8921-fe38ed18e434 | Three panels sharing one template: repetition reads as a system. One segmented range control reused across panels. Exactly two banner tones, each with one inline link |
| **Vercel, project dashboard** — https://mobbin.com/explore/screens/663bff42-ea0b-4316-b176-1320079a9cb3 | Cards carry identity and freshness only. Status is a dot beside the name, not a badge. Tabs and search share one bar instead of stacked headers |
| **Vercel, deployment detail** — https://mobbin.com/explore/screens/2ea0678d-60c0-4635-94ee-564cd73cb34d | Three label-over-value pairs, flat. Failure quarantined in a hairline panel with a one-line cause. Log noise collapsed behind a divider labelled with the line count |
| **Notion, database table** — https://mobbin.com/explore/screens/4f6ed519-5b04-4123-b8ce-82e225e794fc | Property headers gray, not bold black. Tint lives in the chip, never the row. Ghost toolbar actions, one filled action at the right. Hairline rows, no zebra |
| **Things 3, timeline** — https://mobbin.com/explore/screens/7acd4aba-1bfb-4af8-84b6-a0d456cdbb07 | Day headings with hairlines and generous row height: density from structure, not from lines and cards. Completed rows fade instead of vanishing |
| **Raycast, AI chat** — https://mobbin.com/explore/screens/3734e28c-fa18-4d20-9a7d-ae3bbbd7c7f1 | Asymmetric roles: one side in a soft bubble, the other as bare text. Tool steps as bordered rows so intermediate work stays legible |
| **Superhuman, onboarding** — https://nicelydone.club/examples/screens/85566716-3314-489e-9077-06f77258cf50 | One decision per screen, step counter, underline-only input, no box chrome. A deliberately quiet CTA so the question dominates |
| **Ramp, virtual cards** — https://nicelydone.club/examples/screens/fd8f1afe-689e-4e9a-b34b-185d1c0c5dde | Onboarding as a spotlight anchored to the row being explained: non-modal, page stays oriented. Metadata inline under the row name instead of a detail view |
| **Ramp, reimbursements** — https://nicelydone.club/examples/screens/b16d2500-8181-4e84-83ee-a081209d49f2 | Severity as one soft-tinted pill in its own column, so each row is readable without a dashboard. Dates, status and amount get separate columns instead of one summary cell |
| **Attio, reports** — https://nicelydone.club/examples/screens/776c370c-88a0-4f94-8702-60ea94519b64 | One header template across charts; a single hue family so reports do not fight. Creation lives in the grid as a dashed tile |

### Marketing pages

Use these for stance and proportion, not for a tool UI.

- **Raycast** — https://www.raycast.com — one saturated graphic carries a
  monochrome page; technical limits set in mono.
- **Notion product** — https://www.notion.com/product — oversized display type
  with two-tone emphasis inside one sentence, exactly one filled primary.
- **Stripe** — https://stripe.com — editorial headline scale, two-colour
  emphasis, one accent, monochrome logo row.
- **Figma** — https://www.figma.com — a hard left-aligned type block with a
  deliberate break, a large empty middle, one dark pill. Balance by weight.
- **Superhuman** — https://superhuman.com — split hero, one lilac action, and a
  hairline-separated three-row toolkit list.

## Counterexamples

Useful because they are professional sites doing things this skill tells you to
avoid. They work at marketing scale because of brand, budget and imagery. Do not
carry them into a tool UI.

- **GitHub features** — centered hero over a purple glow, then two identical dark
  cards with a centered icon, a centered title and a "Learn more" link. It reads as
  the default generated layout: gradient hero plus equal cards.
- Any hero with a purple-to-blue gradient and two pill buttons; any three-card
  feature row with icon, title and two lines of copy.

## How to translate a reference

1. **Name the mechanic**, not the vibe: "hairlines instead of card chrome",
   "the number outranks its label", "one dot instead of a tinted row".
2. **Ask what job it solves** in the reference, and whether your screen has that
   job. A dense trading table may be right to break a calm-layout rule.
3. **Rescale, don't copy.** A 56px headline on a 1280px canvas is a ratio; the
   same ratio works on a 960px canvas at ~42px.
4. **Keep your product's own color and type.** Borrowing structure is safe;
   borrowing a palette makes the product look like a clone.
5. **Write down what you took** when the decision is not obvious. "Hairlines
   rather than cards, because these rows are peers" is reviewable. "Felt Linear"
   is not.
