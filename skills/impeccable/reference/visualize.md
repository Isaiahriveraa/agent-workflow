# Visualize: Direction Comps & Asset Production

Load this from [new-work.md](new-work.md) only when image generation is available
and comparison will resolve a named visual uncertainty. Follow the shared
workflow: skip this comparison for an agreed direction without such uncertainty.
PRODUCT.md and DESIGN.md are preconditions for this comparison.
New-work has already resolved the visual world;
this file must not reopen it.

The purpose of a probe is to test composition, narrative, hierarchy, density, focal moment, signature use, and image requirements. It is not a second identity workshop. Keep DESIGN.md's palette, typography direction, material language, component character, imagery stance, and motion grammar fixed.

## Compare the unresolved composition

Name the choice the comparison will settle. Render two or more distinct
high-fidelity comps, only as many as needed to show the real alternatives, saved
under `.impeccable/mocks/` so they survive the session. Record the approved comp's
path in the surface brief. Base them on real content and the surface concepts
already developed with the user. Do not invent forks merely to fill a quota.

- When the user shortlisted multiple concepts, compare the relevant concepts.
- When one direction is committed, vary the structural uncertainty an image can resolve: topology, sequence, density, hierarchy, focal composition, or interaction framing.
- Show enough beyond the opening moment to prove the concept can govern the whole requested surface.
- Do not generate a palette artifact, ask new atmosphere questions, introduce a different type voice, or invent a new motif. If the committed world cannot support the concept, return to the concept shortlist rather than changing the world.

Treat each comp as a direction test, not a screenshot specification. Core UI text, responsive behavior, accessibility, semantics, and interaction states remain implementation responsibilities.

## One approval point

Show the alternatives together: in chat when images can be displayed,
otherwise on the decision page (`serve-question.mjs`, one option per comp with the
comp as its hero). Ask the user which resolves the named choice and what should
carry forward, then stop and wait. Simulated feedback may inform a proposal but
does not count as the user's approval or a human walkthrough.

Do not begin code until the user approves a direction or explicitly delegates the choice. If they delegate, choose using the task brief, PRODUCT.md, and DESIGN.md, and state the evidence. Approval refines the task concept; it does not modify DESIGN.md.

After approval, summarize the composition and the parts of the comp that must not be literalized. Return to new-work.md, record the direction contract from the approved surface concept, then build.

## Inventory implementation fidelity

Before building, inventory the approved comp's major visible ingredients in writing (a short table in the surface brief or working notes; the finish reviewer audits shipped assets against it) and choose an implementation medium for each: semantic HTML/CSS/SVG, existing project asset, generated raster, sourced raster, icon library, canvas/WebGL, or accepted omission. Textures, portraits, and scenes are raster-by-default; a CSS gradient is not a texture medium. Every `produce` entry is produced before the build ships, through the asset producer or in the current thread; an inventory with unproduced entries is an unfinished build, and this gate is where imagery-free pages come from when it is skipped.

Pay special attention to the dominant composition, signature use, image-native content, second-fold system, and any interaction the still image only implies. If the concept depends on a photograph, architectural scene, product object, portrait, or other raster-native material, do not silently replace it with generic CSS scenery.

Treat the comp as a north star, not something to trace. Do not rasterize core UI text or controls. Do not substitute a different visual driver after approval without asking.

## Produce only the assets the build needs

When clean raster ingredients are required and the harness runs subagents, use the shipped asset producer, `impeccable-asset-producer` (`impeccable_asset_producer` in codex): give it the approved comp, output paths, required dimensions and formats, transparency needs, crop notes, and what must remain semantic code. Otherwise produce the minimum required assets in the current thread by the book: load [degraded/asset-producer.md](degraded/asset-producer.md) and follow it inline, with whatever generation exists, the native tool or generate-image.mjs.

Return to [new-work.md](new-work.md) for the direction contract, implementation, and the finishing pass.
