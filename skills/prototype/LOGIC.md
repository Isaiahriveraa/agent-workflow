# Logic Prototype

Use this shape when the question is about business logic, state transitions, schemas, or data shape: the cases that look reasonable on paper but become clear when someone can map and drive them. The shared browser workspace combines an editable Excalidraw whiteboard with controls and a live state inspector.

## When this is the right shape

- An edge case occurs after a particular sequence of actions.
- A state machine, schema, or data model may not represent a required case.
- The user wants to inspect entity relationships, constraints, or a proposed migration before implementation.
- The user wants to press controls and watch state change.
- An API shape needs to be explored before production implementation.

If the question is primarily visual, use [UI.md](UI.md).

## Process

### 1. State the question

Write the question, initial state or schema, proposed changes, and observation that would answer it in the prototype source. A logic prototype that answers the wrong question is wasted effort.

### 2. Isolate a portable model

Put the behavior behind a small pure interface that could be lifted into the real code later:

- a reducer `(state, action) => state` for discrete events;
- an explicit state machine when legal actions depend on the current state; or
- a small set of pure functions over a plain data type.

Keep I/O, rendering, and browser event handling outside the model. Do not add a backend bridge merely to make a simulation look real.

### 3. Diagram the model

Use the Excalidraw whiteboard to make the model explainable: map entities or states, their fields and valid values, relationships, constraints, and the before/after shape for a schema change. Label assumptions and unanswered questions. The diagram is a decision aid, not a generated source of truth; changing it must never silently change the simulation.

### 4. Build browser controls

Author one or more local preview variants with meaningful buttons, inputs, and reset controls. Use `Panel` for focused sections and `StateInspector` to render the complete relevant state after each action. Make illegal or unavailable transitions visibly disabled or explain why they are unavailable.

The browser model is a simulation. When the real system is a non-JavaScript backend, it demonstrates the proposed state transitions only; it is **not proof that the backend executes them**, and its result must not be presented as backend equivalence. Capture any backend verification separately.

### 5. Drive the cases

Start the attached prototype with the documented `init` and `dev` commands. Exercise the intended happy path, boundary cases, reset behavior, and at least one surprising sequence. Observe the rendered state rather than relying on implementation details. Keep state in memory unless persistence is specifically the question; use the explicit diagram Save/Load controls for whiteboard files.

### 6. Capture the answer

Record the observed behavior and the decision with `new-artifact.py` before deleting or absorbing the prototype. A negative result is useful evidence. Never create a placeholder finding or claim a conclusion without runtime or user evidence.


## Anti-patterns

- Do not bind the model to React, Excalidraw, a database, or network I/O.
- Do not translate a browser simulation into a claim about a non-JavaScript backend.
- Do not hide state changes, rely on global keyboard handlers, or let canvas shortcuts be intercepted by prototype controls.
- Do not generalize beyond the single question or add persistence that the question does not require.
