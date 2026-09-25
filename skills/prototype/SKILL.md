---
name: prototype
description: "Build a throwaway, true-scale UI in the target project's own front-end stack that shows two or more complete options with one toggle to switch between them, so the user can see which direction fits before it is written into the app. Use when a visual, interaction, or motion direction has not been seen yet and a verbal decision would be slow or lossy, or when another frontend skill's prototype gate fires."
---

# Prototype

A prototype is **throwaway UI that puts real options in front of the user and lets them toggle between them**. It runs at true scale in the target project's own front-end stack — real components, real tokens, real content — so the decision is made by looking and flipping, not by reading prose.

Two things make it a prototype rather than a mock:

1. **Two or more genuinely different, fully built options.** One option is a mock; several turn it into a decision.
2. **One visible toggle that switches between them in seconds.** The user flips back and forth and feels the difference, then says which fits.

This is the *pre-implementation* gate for frontend work. The main agent builds the prototype and then builds the production change; sub-agents research, they never write UI code.

Not to be confused with `/skill:explain`, which is the hub's reusable browser workspace (Excalidraw whiteboard + live previews) for explaining a design, logic, or schema question that is *not* your app's UI.

## When to run it

Run before implementing when the direction is unproven — anything the user has not seen yet. Skip when the direction is already fixed by an existing design system, or the change is non-visual.

## Flow

1. **Name the question and the options.** Write down the choice that matters and the two or three real options. If you can only think of one, the direction isn't a decision yet — find the alternatives before building.
2. **Decide where it lives — in place or isolated.** Default to **in place on the current branch** when the direction has to be judged with the rest of the app: you are actively iterating, and seeing a version work inside the real app is the point. Expose it through one clearly marked surface (a route, a dev-only flag, or a query parameter) so normal navigation is untouched until you opt in. Choose a **throwaway branch or worktree** (`~/.agents/scripts/new-worktree.sh <branch>`) only when the change is large or risky, it would touch shared or production paths, or the user asks for isolation.
3. **Record its footprint as you build.** Keep a short list of every file, route, flag, and toggle the prototype adds. Cleanup must be a deterministic removal of that list, in either mode.
4. **Build every option for real, at true scale.** Use the project's own front-end language and existing components, tokens, and patterns. Not a scaled-down mock, not a screenshot, not a wireframe. Each option must run and be complete enough to judge.
5. **Hold everything constant except the thing being decided.** Same content, same data, same surrounding context across options, so the comparison is fair and the only difference is the choice itself.
6. **Add one visible toggle.** A segmented control, tabs, a toolbar switch, or a query parameter — one obvious control that flips between options and shows which is active. It must be findable without instructions and switch in seconds.
7. **Announce it first, in one line** — "before I write components, here's a prototype so you can pick the direction."
8. **Let the user toggle and choose.** Record which option won and why, then fold the choice back into the plan.
9. **Implement only after explicit approval.** The approved direction becomes production code written in the normal way (see `/skill:frontend-implement`).
10. **Clean up on the user's word.** When the user says to clean up the prototype — or once the chosen option is folded in — remove everything in the footprint in one pass and confirm the app's normal paths are unchanged. Keep the chosen option only if the user says to promote it; otherwise the prototype leaves no trace.

## Boundaries

- **Throwaway, not production.** No production integrations, persistence, backend bridges, auth, or data wiring unless the question is specifically about one of those. Even built in place, it must be deletable without touching real code — it lives behind one marked surface, not woven through the app.
- **In place still means removable, not entangled.** The in-place prototype must not change normal app behavior: gate it behind a single route, flag, or query parameter, keep its footprint recorded, and never edit production code paths just to make it render.
- **Main agent writes it.** Sub-agents may research the codebase, find patterns, or propose a plan — they do not write the prototype. Same rule as `/skill:frontend-implement`.
- **Match conventions.** Reuse the design system and component patterns that already exist; the point is to test the direction, not to start a parallel style.
- **Still honest.** Keep the project's lint and typecheck green so a broken prototype does not get mistaken for a rejected direction, and do not hide state or fake the parts the question depends on.
- **Approval is the gate.** Never fold a prototype into production work before the user has chosen.

## Success criteria

- [ ] The question and two or more real options were stated before building.
- [ ] Every option was built complete and ran at true scale in the project's own stack, placed in place or isolated as chosen and announced.
- [ ] The prototype's full footprint was recorded, so cleanup removed it in one pass and left normal app behavior unchanged.
- [ ] A single visible toggle switched between the options and showed which was active.
- [ ] Everything except the decided thing was held constant across options.
- [ ] The user toggled between options and picked one, and it was folded back into the plan before implementation.
- [ ] The prototype was cleaned up on request (or promoted) after the decision, leaving no trace.
