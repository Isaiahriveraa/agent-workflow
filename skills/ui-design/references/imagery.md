# Imagery, icons, and the brand surface

An interface with weak imagery cannot be rescued by better CSS. Images are
content: choose the subject first, then the treatment. "Use a photo of a team at
a laptop" is not art direction; it is the absence of it.

## Choosing an image

Ask, in order:

1. **What is the subject?** One thing per image. Two subjects is a collage.
2. **Does the crop survive?** The design will use 16:9 desktop, 1:1 mobile, and
   a 3:2 thumbnail. If the subject only works in one crop, it is the wrong image.
3. **Does the light match the page?** A cool blue-grey photo on a warm paper
   ground fights. Grade toward the palette or pick another image.
4. **Does it say something specific?** A real object, a real place, a real
   person doing a real thing. Generic stock reads as filler and lowers trust.
5. **Is it licensed and honest?** Real logos, real screenshots, credited photos.
   Do not invent a company's product shot and present it as theirs.

Avoid, unless the brief is explicitly that world: glowing abstract 3D shapes,
aerial road/forest shots, purple-blue gradient orbs, "diverse team in a bright
office", and any image whose subject is a laptop screen at an angle.

## Crops, ratios, and focal points

- Set `aspect-ratio` on the container and `object-fit: cover` on the image, then
  choose `object-position` from the subject, not the center. A face sits high;
  a product sits where the detail is.
- Use two or three ratios across a product, not five. 16:9 for leads, 4:3 or 1:1
  for cards, 3:2 for editorial.
- **Never stretch.** Never use an image as a `background-image` when it carries
  meaning; it will be cropped by whatever the viewport decides.
- Reserve the box with `width`/`height` or `aspect-ratio` so nothing shifts on
  load. Layout shift is a visual defect, not only a metric.
- Serve modern formats (AVIF, then WebP) at 1× and 2×, `loading="lazy"` below
  the fold, `fetchpriority="high"` for the lead image, and a solid tone or tiny
  blurred placeholder that matches the image's average — not a grey box.

## Text over images

- **Contrast over an image must be measured at the worst pixel, not the
  average.** If you cannot guarantee it, put the text beside the image, in a
  solid band, or in a scrim you can measure.
- A scrim is a real design element: a linear gradient from the image's dark side
  to transparent, at an angle that follows the composition. Check body copy
  against the lightest region behind it.
- Avoid the "centered white headline over a photo with a global dark overlay" —
  it is the default hero of every generated page. If used, make the photograph
  do the work: subject off-center, type aligned to a stronger edge.
- In the product, prefer text off the image. Marketing may overlay; tool UI
  almost never should.
- The audit cannot composite an image background; in `profile:'brand'` it
  returns those runs as `manual`. Sample them.

## Gradients, texture, and grain

- A gradient is legitimate when it carries meaning (depth, a light source, a
  field behind one hero) and is composed from the product's own hues.
- A gradient on every card, or a purple-to-blue hero, is a tell. So is a
  gradient text fill.
- Texture (grain, paper, noise) works when it is subtle enough to be felt and
  consistent across the surface. One noisy card among flat ones reads as a bug.
- Shadows are depth, not decoration: offset, blur, translucent. A zero-offset
  colored halo is a glow, and a hard offset shadow belongs to a neobrutalist
  world, not a product UI.

## Illustration

- One illustration language: stroke weight, corner treatment, palette subset,
  perspective, and level of abstraction. A mixed set reads as clip art.
- Geometric shapes for geometric subjects; for organic subjects (people, hands,
  plants) either draw properly or use photography. A circle with two dots for a
  face is not an illustration system.
- Illustrations earn space when they explain or set tone. An illustration beside
  every empty state, at the same size, becomes wallpaper.

## Icons

- One family, one stroke weight (1.5px at 16px, 2px at 24px), one corner
  treatment, one fill convention. Mixed filled and outline icons in a set is a tell.
- Optical sizing: an icon beside 14px text is 16px; beside 20px text, 20px. It
  sits on the text's optical center, not the line box's.
- Semantic icons need a label or a tooltip; icon-only actions need an accessible
  name. Emoji are not an icon set — they render differently per platform and
  carry tone you did not choose.
- Do not draw a logo in CSS. Use the official SVG at its optical size, monochrome
  in a logo row, and keep spacing between marks consistent (`gap`, not margins).

## Avatars and identity

- Deterministic fallbacks: initials on a color derived from the identifier
  hash, so a person keeps the same color across sessions.
- Square-ish with a radius, or circular; pick one per product.
- A missing avatar is a person-shaped slot with initials, not a random face.

## Data visualization

- **Color by meaning, not by category count.** One hue family for a series; the
  accent only for the series that matters or the user's focus.
- Direct labels beat legends. A legend forces a lookup on every glance.
- Bars start at zero. Line charts may crop, but say so. No 3D, no shadows, no
  gradient fills under lines unless the area means volume.
- One axis, one unit, consistent precision. Fewer gridlines: a hairline per
  major tick, no vertical grid unless it aids reading.
- A chart in a stat tile needs its question stated: what decision does the shape
  change? If none, it is decoration.
- Never encode a value in color alone; pair with position, length, or a label.

## Video and motion media

- Autoplay only when muted, looping, and non-essential; pause under
  `prefers-reduced-motion`; always ship a poster frame.
- No background video behind text. Ever, without a measured scrim.
- A demo video should show the real product doing a real task, with the UI
  legible at the size it will be shown.

## Alt text and honesty

- Alt describes the image's purpose in context, not its pixels: "Receipt for
  order 8214" beats "image of a document".
- Decorative images get `alt=""`.
- Never claim a synthetic screenshot, mock dataset, or invented customer quote
  is real. Label it, or use the real thing.
