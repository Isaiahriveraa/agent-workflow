# Why the plan map looks the way it does

The page exists so a person can understand a plan an AI wrote — fast enough to keep
up, slowly enough to actually judge it. Each rule below names the human limit it
works around, the evidence, and what the page does about it. When a map feels hard
to read, find the rule it broke.

## The core idea

People don't understand a system by reading its parts in a list. They understand it
by **building it up on something they already know**: an anchor first, the whole
shape second, then one piece at a time on top of the last. The page follows that
order, top to bottom:

1. **What changes for you** — headline, analogy, today vs. after.
2. **Words you'll need** — at most three, before they appear.
3. **The whole system** — one picture, nothing hidden.
4. **Build it step by step** — the same picture assembled one step at a time, at the reader's pace.
5. **What needs your call** — decisions, only after the reader has the context to judge them; answered on the page and sent to Claude, so deciding never means writing a reply in the terminal.
6. **How you'll know it worked** — done-when, risks, one self-check.

This mirrors the user's own Planning mode in `~/.agents/references/communication.md`
(Problem → Desired Behavior → System Shape → Decisions → Edge Cases → Done) and the
workflow rule to "present one user action through the system before technical detail".

## Rules, the limit behind each, and the evidence

| Rule on the page | Human limit it works around | Evidence |
|---|---|---|
| **≤ 8 parts, ≤ 5 steps, ≤ 3 decisions, ≤ 3 risks, ≤ 3 terms.** Lanes group parts so the eye sees ~4 groups, not 8 boxes. | Working memory holds about 4 chunks at once (estimates range 4–7 by task). | Cowan 2001, "The magical number 4" |
| **Anchor first:** a one-line analogy to something familiar, and "Today / After this plan" before any system detail. | New information sticks when it attaches to an existing schema. | Ausubel's advance organizers — modest, positive effect when well structured (Mahar 1992 meta-analysis) |
| **Words you'll see** come before the map. | Learning terms *and* a system at the same time overloads the reader. | Mayer's pre-training principle (d ≈ 0.46) |
| **Build it step by step** is reader-paced: Next / Back, never auto-advancing. | Too much at once, at someone else's pace, is lost. AI makes this worse because it produces faster than people read. | Mayer's segmenting principle (d ≈ 0.70) |
| **Each step says "Stands on / Why now / Unlocks."** | Order only makes sense when the dependency is stated, not implied. | Scaffolding: each new piece is attached to the one beneath it |
| **Overview first, details on tap** (part drawer, check-yourself answer). | Showing every detail up front hides the shape. | Shneiderman 1996: "overview first, zoom and filter, then details on demand"; C4 model's zoom levels |
| **Words sit next to the thing they describe:** narration box under the map, captions synced to the highlighted hop. | Splitting attention between a picture and distant text costs effort. | Mayer's spatial and temporal contiguity principles |
| **Hue only means what something asks of you.** Gray = already exists (nothing to do); bright card with a "New"/"Changed" text badge = this plan builds it (understand it); amber = needs your decision; red = risk; blue = where to look now (selection, walkthrough, Claude's latest edits); green = decided or done. Change status is a text badge, never a hue. | Something stands out only when little else does, and a color the reader can't act on is noise. | Von Restorff isolation effect; signaling principle (d ≈ 0.46) |
| **Existing parts are gray and drawn back.** | The reader should spend attention on what this plan changes. | Signaling + coherence (d ≈ 0.70): cut or mute what doesn't serve the point |
| **No decorative text.** One sentence per field; ≤ 20 words. | Extra words compete for the same limited attention. | Mayer's coherence principle |
| **Decisions shown as Decision / Why / Instead / Cost, plus "No decisions needed" when true.** | People reviewing automated output tend to approve it without real scrutiny. | Automation bias persists in experts and isn't fixed by instructions (Parasuraman & Manzey 2010) |
| **One "Check yourself" question, answer hidden.** | Rereading feels like understanding but isn't; trying to explain it reveals the gaps. | Self-explanation rated moderate utility; rereading/highlighting low (Dunlosky et al. 2013) |
| **Guidance fades as the reader learns** (`reader.md` lists terms they already know; don't define those). | Support that helps a beginner gets in the way once they know the material. | Expertise reversal effect (Kalyuga et al. 2003) |
| **"~N min read" and "Resume where you left off".** | Knowing the cost up front makes starting easier; interruptions are normal. | Practical pacing; resume uses per-browser storage only |
| **Atkinson Hyperlegible body text, 17px, ≤ 65 characters per line, reduced motion respected.** | Reading comfort and fatigue. | Typeface built for low-vision legibility (Braille Institute) |

## What "just enough" explanation means

- **Explain the idea before the term.** Say "a code that proves you clicked the link" before "token".
- **Explain the why, not the how.** Code and file names live in the drawer, never in the main view.
- **One concrete request, not every case.** "Follow one request" walks the normal path; edge cases are risks.
- **Stop when the reader can predict the next step.** If the analogy and map already make a step obvious, its `because` can be short.

## Sources

- Cowan, N. (2001). The magical number 4 in short-term memory. *Behavioral and Brain Sciences*. https://memory.psych.missouri.edu/assets/doc/articles/2001/cowan-bbs-2001.pdf
- Mayer, R. E. (2020). *Multimedia Learning*, 3rd ed.; principle summary with effect sizes: https://ugc.futurelearn.com/uploads/files/7d/d6/7dd6188d-c343-4311-b064-ac98d2c95abc/Multimedia_Principles._R._E._Mayer__2020.pdf
- Mahar (1992). Thirty years after Ausubel: an updated meta-analysis of advance organizer research. https://www.ideals.illinois.edu/items/20405
- Shneiderman, B. (1996). The Eyes Have It. https://webspace.science.uu.nl/~telea001/uploads/VACourse/Shneiderman96.pdf
- C4 model (Simon Brown). https://en.wikipedia.org/wiki/C4_model
- Kalyuga, S. (2007). Expertise reversal effect and its implications. https://www.uky.edu/~gmswan3/EDC608/Kalyuga2007_Article_ExpertiseReversalEffectAndItsI.pdf
- Parasuraman, R. & Manzey, D. (2010). Complacency and bias in human use of automation. https://pubmed.ncbi.nlm.nih.gov/21077562/
- Dunlosky, J. et al. (2013). Improving students' learning with effective learning techniques. DOI 10.1177/1529100612453266
- Isolation effect overview: https://ui-patterns.com/patterns/isolation-effect
