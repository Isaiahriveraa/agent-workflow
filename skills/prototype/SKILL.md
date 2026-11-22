---
name: prototype
description: Experiment with several variants of a UI piece or screen in a throwaway worktree. Each variant is shippable and built from patterns this product already uses. The user picks by opening URLs; the pick is then ported into a fresh worktree off the base branch, and the throwaway is deleted after the PR. Use when seeing alternatives will settle a visual or flow question.
---

# Prototype

Read `~/.agents/references/workflow.md` as the authoritative workflow contract.

A prototype is throwaway code that answers one question by showing it. It has three phases: variants built in a throwaway worktree, a pick made by opening URLs, and a port of the chosen variant into a fresh production worktree. The port is the point, so the throwaway code is written to move easily.

## Modes

- **Variants** (the main path): the behavior is understood, and appearance, layout, density, or motion must be chosen.
- **Discovery**: the flow itself is unclear. Sketch first. Build one small flow only when trying it answers the question.

State the mode and the question. Infer the mode; ask only when the scope changes materially.

## Rules

1. **Throwaway lives in its own worktree.** Create it with `~/.agents/scripts/new-worktree.sh prototype/<name> <base>`, where `<base>` is the branch the change will land on. Never build in the user's working tree or in the production worktree.
2. **Every variant is shippable.** Each one meets the craft bar below and could ship tomorrow.
3. **Variants come from what the product already proves.** Each direction names its proven source: an existing component, pattern, token set, or screen in this codebase or its design system. Diversity comes from layout, density, interaction model, and motion inside that vocabulary. Do not invent a new theme unless the request is a redesign.
4. **No chrome.** No toggle bar, picker, option labels, or the words prototype, preview, demo, variant, or draft anywhere in the UI. Versions are chosen only by URL.
5. **Mark everything the prototype adds.** Every file, component, class, function, and test id it adds contains the word `prototype`. The version switch is the one exception: it stays `v`. This makes the port and any leftovers easy to find.
6. **Production stays untouched until the user picks.**
7. **The main agent writes UI.** Sub-agents may research but never write it.

## Craft bar

The craft bar is `emil-design-eng`. Read it before building motion or press states; its rules apply to every variant.

Every variant also needs real interactions, realistic copy and numbers, and no lorem ipsum or dead buttons. The version switch is instant: a page load with no transition.

Load `ui-design` during recon and again for the rendered review, to check layout, states, and stability when content changes.

## Variants mode

### 1. Scope

One question, one piece or one surface. If the request covers a whole app, narrow it to the highest-leverage surface and say which one. Restate the brief in one sentence.

### 2. Recon

Identify the stack, styling system, tokens, and personality (playful consumer app or crisp dashboard). List the existing patterns for this piece in the codebase and its design system before choosing directions. Those patterns are the proven sources.

### 3. Directions

Default to 3 variants; up to 5 when the user asks or the design space is wide. Before writing code, list each one with:

- **Name** that describes the direction ("Quiet", "Editorial", "Dense").
- **Axis**: one phrase, such as "minimal motion, borders over shadows".
- **Proven source**: where in this product the pattern already works.
- **Tradeoff**: what it costs.

No two directions may share an axis. Differences in accent color or copy alone count as one direction.

### 4. Build in the throwaway worktree

- Create it with `new-worktree.sh prototype/<name> <base>`.
- Build each variant in place in the real app. One switch reads `v` and renders the matching variant over the current page, so the surrounding app is the context. Do not build a separate route. Without `v`, the page behaves exactly as before.
- Render at full size with real surrounding content. A toast needs a page behind it; a card needs siblings.
- Keep `VARIANTS.md` at the worktree root with one entry per variant: name, axis, proven source, its `?v=N` URL, and every file it touches. Also list every route, flag, and parameter the prototype adds. This file is the map the port uses.
- With no project (an empty directory or exploring), build one self-contained HTML file that reads `?v=N` to choose its variant, with a restrained default look: neutral grays, one accent, system font stack.

### 5. Verify

Open each `?v=N` URL. Confirm each variant renders, every interaction responds, the console is clean, lint and typecheck pass, and the page without `v` is unchanged. Take screenshots if browser tooling is available.

### 6. Present and stop

Present a table of the variants with name, axis, when it is the right choice, and its cost. Give each variant's full URL, including the `?v=N` string, so the user can open them side by side.

Never pre-pick a favorite in the table. If the user asks which one you would choose, give a reason rooted in the product's personality and how often it's used. If two variants converged while you built them, cut one and say so.

**Stop.** The choice belongs to the user.

### 7. Port on pick

When the user picks a variant:

1. Create the production worktree from the base: `new-worktree.sh feat/<name> <base>`.
2. Rewrite the chosen variant there in the production codebase's conventions: real names, existing tokens, existing components. Use `VARIANTS.md` and the throwaway files as the reference. Do not copy the switch or any prototype-named artifact.
3. Confirm no `v` switch and no `prototype` name survives.
4. Run the project's checks, then open the PR.
5. Keep the throwaway worktree and branch until the PR exists. Then remove them with explicit approval, naming what will be lost first: `cleanup-worktree.sh --force prototype/<name>`.

If the change belongs to a tracked issue, the plan and implement gates in the workflow contract still apply before this step. Otherwise, the user's pick approves the build.

## Discovery mode

1. Frame one task: who, starting point, intended outcome, and the assumption being tested.
2. Sketch the steps and visible feedback first.
3. Build a focused, throwaway flow in its own worktree only if trying it answers the question. Note fixture data and simulated effects in the handoff.
4. Observe one person completing the task without being told which control to use. If nobody tried it, say `not tested`.
5. Record the observations and the chosen behavior in the owning design card, then stop. Discovery approval does not authorize production work. Keep the worktree until cleanup is explicitly approved.

## Success criteria

- [ ] Question, mode, and directions with proven sources were stated before building.
- [ ] Each variant is shippable, complete, and runs in the real app's stack.
- [ ] Each variant has its own `?v=N` URL. The page without `v` is unchanged. No chrome or prototype labels appear.
- [ ] `VARIANTS.md` lists every variant's files and URL.
- [ ] After the pick, the production worktree came from the base, the chosen variant was rewritten in production conventions, and no `v` switch or prototype name survives.
- [ ] The throwaway worktree was removed only after the PR was created and cleanup was approved.

## Invocation

| Invocation | Behavior |
| --- | --- |
| `<description>` | Variants flow: scope, recon, 3 directions, URLs, wait for the pick |
| `<description> x5` | Same, with up to 5 variants |
| `riff <variant>` | New round in the same throwaway worktree, diverging around that direction |
| `keep <variant>` | Port that variant (step 7) into a fresh worktree |
