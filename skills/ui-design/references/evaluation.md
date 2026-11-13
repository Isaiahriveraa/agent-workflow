# Evaluating a design (and this skill)

A design skill is a prompt artifact. Its effect is a difference in output, so it
is only meaningful to measure the difference. Two evaluations matter: **the
screen in front of you** (is it good?) and **the skill against a baseline** (does
it make output better?).

## The screen: rubric

Score a rendered screen, not a description. Six axes, each 0–2. Total 12.

| Axis | 0 | 1 | 2 |
|---|---|---|---|
| **Job** | Cannot say what the screen is for | Purpose clear, primary unclear | Primary obvious in under a second; one job |
| **Stance** | No stance; default kit | Stance stated, only partly followed | Stance nameable and visible in type, density, color |
| **Hierarchy** | Everything competes | Two or three levels, inconsistent | One dominant element; each level clearly quieter than the last |
| **Type** | Sizes off-scale, measure wrong, rag poor | Mostly on scale, one or two slips | Scale, measure, leading, numerals and rag all hold with real content |
| **Color** | Accent everywhere; no palette logic | Accent restrained, semantics fuzzy | Accent ≤10%, semantic at glyph scale, both themes measured |
| **States** | Default only | Some states designed | Default, hover, focus, disabled, loading, empty, error all exist; motion explains change |

Add two half-axes, each worth ±1: **ruts** (−1 if the direction sits inside one of
the five clusters in `craft.md` §6) and **originality** (+1 if the one deliberate
move is unmistakable and defensible).

- 10–13: ship.
- 7–9: ship after the named fixes.
- ≤6: the direction is wrong; go back to the two-direction step.

The rubric is for comparison between versions of the same brief. It is not an
absolute grade, and a high score on a screen with a broken state is a failed score.

## The skill: blind comparison

Run this when the skill changes, not on every design.

1. **Scenarios.** Twelve prompts, one per row of the table below. Keep them
   fixed, short, and content-bearing (real domain, real content volume).
2. **Conditions.** Run each scenario twice in fresh sessions: once with the
   skill available, once without (or with the previous version). Same model,
   same tool access, no other design skill in context.
3. **Judge blind.** A fresh session with no knowledge of the conditions scores
   the rubric above plus one binary: *would you ship this to a paying customer?*
   Randomize order between judges.
4. **Record the delta**, not the absolute. The skill earns its context cost when
   it raises the median rubric score and the ship rate, not when one anecdote
   looks better.
5. **Read the failures.** A rubric point that never moves is either untestable
   or not actually in the skill. Add or delete accordingly.

| # | Scenario | Tests |
|---|---|---|
| 1 | Dense admin table, 11 columns, 400 rows | Dense tier, scan budget, numerals, states |
| 2 | Single-record review screen with an edit form | Progressive disclosure, states, one action |
| 3 | Marketing launch page for a developer tool | Persuade mode, boldness, one idea, ruts |
| 4 | Long-form essay with a 2,000-word body | Read mode, measure, rag, rhythm |
| 5 | Warm consumer habit app onboarding | Warm neutrals, restraint, warmth without cliché |
| 6 | Dark-mode settings page | Re-picked ramp, elevation, floors |
| 7 | Pricing page with three tiers | Persuade + comparison, hierarchy, honest copy |
| 8 | Mobile checkout with an error state | Flow, error recovery, targets, zoom |
| 9 | Documentation index with search | Read + IA, metadata slots, filters |
| 10 | Empty first-run dashboard | Empty states that teach, one action |
| 11 | Arabic (RTL) version of #2 | Logical properties, mirroring, expansion |
| 12 | Medical records tool, high-stakes | Consent, density, no gamification, error clarity |

## Deterministic layers

- **Contrast, font size, density:** `audit-ui.js`, in every theme and viewport,
  with the right profile. Deterministic and cheap; run it always.
- **Screenshot baselines:** capture at 390 and 1440 per theme; keep the baselines
  in version control. Mask volatile content (dates, avatars, charts) with an
  injected stylesheet, not by cropping. Compare per browser and platform; font
  rendering differs by OS.
- **Diff review:** a visual diff is a prompt to look, not a verdict. A 0.2%
  pixel change can be a correct fix or a shifted baseline.
- **State coverage:** a capture of the error, empty and opened-editor states is
  part of the definition of done. A viewport or state nobody captured is one
  nobody inspected.

## When the skill should abstain

If the brief is genuinely outside the skill's competence — 3D scenes, brand
identity systems, print layout, native platform code — say so and hand off. An
answer produced by stretching a UI skill over an illustration problem is worse
than a clearly labelled "not this skill", because it looks finished.
