# Logic Prototype

Use this shape when the question is about business logic, state transitions, schemas, or data shape: cases that look reasonable on paper but become clear when someone can map and drive them. The shared browser workspace combines an editable Excalidraw whiteboard with controls and a live state inspector.

## Choose the decision shape

Name one primary shape in the prototype:

- **Architectural decision:** compare ownership, boundaries, or flow alternatives and show the causal consequence of each.
- **Current → intended behavior:** reproduce the observed sequence, then exercise the smallest transition that should change it.
- **Schema change:** show existing and proposed entities/fields/relationships, constraints, migration direction, and the behavior enabled or endangered by the change.

The prototype must state the question, initial state/schema, proposed change, and observation that would answer it. Do not let a state dump stand in for an explanation: raw JSON and inspector output are supporting evidence, not the main explanation.

## Causal model and diagram

Use a readable overview before exposing detail. Follow this grammar:

- boxes represent actors, components, entities, or states;
- arrows point in event/dependency direction and are labeled with the trigger, action, or data crossing the boundary;
- state/data boxes name the relevant fields and invariant;
- consequence labels state the user-visible or operational outcome;
- `?`/dashed notes mark assumptions or unresolved questions; explicit **Current** and **Intended** headings separate the two sides.

Read the diagram as title/question, legend and current/intended boundary, trigger flow left-to-right or top-to-bottom, constraints and exception branches, then notes and implementation implications. Keep that overview readable at first view. Reveal field-level state, traces, and edge cases progressively through focused panels or inspector sections. Every important control should correspond to a labeled trigger in the diagram, and every conclusion should be traceable to a visible outcome.

The diagram is a decision aid, not a generated source of truth; changing it must never silently change the simulation.

## Process

### 1. State the question

Write the decision, expected observation, current/proposed labels, assumptions, and success criterion in the prototype source.

### 2. Isolate a portable model

Put behavior behind a small pure interface that could be lifted into real code later:

- a reducer `(state, action) => state` for discrete events;
- an explicit state machine when legal actions depend on current state; or
- a small set of pure functions over a plain data type.

Keep I/O, rendering, and browser event handling outside the model. Do not add a backend bridge merely to make a simulation look real.

### 3. Build the causal overview

Map triggers, owners, state/data changes, consequences, and exception paths. For schema work, show the before/after shape and migration implications. Label assumptions and unanswered questions rather than hiding them. Use the browser preview for the smallest useful controls and use `StateInspector` for complete relevant state after each action; progressive disclosure is preferred over one overwhelming panel.

### 4. Drive and verify the cases

Start the attached prototype with the documented `init` and `dev` commands. Exercise the happy path, boundaries, invalid/unavailable transitions, reset behavior, and at least one surprising sequence. Observe rendered state and causal outcomes in the browser, not implementation details. Verify that controls do not intercept Excalidraw shortcuts and that reset/reload behavior matches the stated persistence boundary.

The browser model is a simulation. When the real system is a non-JavaScript backend, it demonstrates proposed transitions only; it is **not proof that the backend executes them**, and its result must not be presented as backend equivalence. Capture backend verification separately.

### 5. Explain the implementation implication

Record the chosen architecture or behavior, contracts/invariants, schema/migration steps, risks, and open questions. Translate the observed causal chain into a directly actionable implementation plan. Capture the answer with `new-artifact.py` before deleting or absorbing the prototype. A negative result is useful evidence; never create a placeholder finding or claim a conclusion without runtime or user evidence.

## Restrictions

Do not bind the model to React, Excalidraw, a database, or network I/O. Do not translate a browser simulation into a claim about a non-JavaScript backend. Do not hide state changes, rely on global keyboard handlers, or let canvas shortcuts be intercepted by prototype controls. Do not generalize beyond the single question or add persistence that the question does not require. Keep the prototype disposable and use explicit diagram Save/Load controls for whiteboard files.
