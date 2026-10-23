---
name: codebase-design
description: Design readable modules that hide complexity and keep change local. Use for new backend capabilities, schema or data-model changes, ownership and invariant decisions, architectural dependencies, interface design, and testability seams, even when the user does not say architecture. Also supplies deep-module vocabulary to other skills. Use only a quick existing-owner check for routine CRUD or local fixes that preserve existing guarantees.
---

# Codebase Design

Make the requested behavior easy to use, understand, change, and verify. Prefer **deep modules**: a small, understandable contract hiding decisions callers should not have to learn. Depth is cognitive leverage, not implementation size, method count, or number of layers.

This is technical design guidance, not permission to implement, bypass plan approval, or choose unresolved product policy. Follow the active workflow's approval gates. Reuse its plan or decision note rather than creating another artifact.

## Choose the depth of the pass

- **Routine local change:** confirm the existing owner, unchanged guarantees, and behavior test; continue in place. Do not manufacture alternatives or an architecture document for a pagination parameter or ordinary CRUD using established patterns.
- **Meaningful design change:** use the five-step loop below when ownership, invariants, persisted facts, caller obligations, or dependency direction change.
- **Backend or persisted-data work:** read [backend and schema checks](references/backend-and-schema.md), selecting only questions relevant to the actual risk. Even an apparently small migration needs a historical-data and deployment-compatibility check.
- **Legacy code or external effects:** read [legacy and integration checks](references/legacy-and-integration.md) when safe change or test isolation is difficult.
- **Rationale and attribution:** consult [sources](references/sources.md) when explaining or revisiting a principle; it is not a mandatory reading list for each task.

## Design loop

1. **State the behavior.** Name the caller's observable outcome, the invariant that must survive, and a reachable failure. Separate verified facts from assumptions. Missing business policy goes back to the human, not into a convenient default.
2. **Find the owner and hidden decisions.** Read existing modules, callers, tests, and data writers. Identify the difficult or change-prone knowledge: business rule, representation, protocol, transaction, lifecycle, or ordering. Put each decision with its owner; do not split by processing step merely because the steps run in sequence.
3. **Design it twice.** Compare two materially different allocations of responsibility, often extending the existing owner versus adding a module. Sketch the caller contract and what each option hides. Renaming the same methods is not a second design. Choose based on caller knowledge, locality, dependencies, and testability—not pattern names or file counts.
4. **Probe change and failure.** Walk one plausible change and one real failure through each option. What must the reader understand? Which owners change together? Can the invariant still hold? Use this as a thought experiment, not authorization to build the future feature.
5. **Choose and prove the smallest sound design.** State the choice, why the alternative lost, the accepted tradeoff, and the test that will prove the guarantee. Follow local TDD: observe a failing behavior test, implement the smallest slice, inspect it, and adjust. Keep preparatory refactoring separate from the behavior change.

Keep the result proportional: a few sentences for a small responsibility choice; a short decision note in the existing plan for a consequential one. Report the outcome/invariant, owner/hidden decision, choice/tradeoff, and proof. Do not repeat the entire checklist in the answer.

## Choose the data shape before the logic

For meaningful design changes, start from one caller action and sketch the facts, valid states, and operations it needs before implementing branching logic. Trace the dominant reads, lookups, updates, and lifecycle transitions; choose types and collections that support those paths and prevent contradictory states. Reuse authoritative models rather than introducing another representation of the same facts.

Show the caller usage, proposed shape, rule owner, and one failure example in the existing plan or discussion. Explain why the shape fits those operations so the user can connect requirements to implementation. This is a small design sketch, not a requirement to design the entire database or build scaffolding before a working slice. Routine changes can retain the existing shape.

Adapted from pstack's [Foundational Thinking](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-foundational-thinking/SKILL.md).

## Complexity and information hiding

Look for Ousterhout's three symptoms: **change amplification** (one change touches many places), **cognitive load** (too much must be learned), and **unknown unknowns** (it is unclear what must be known or changed). Use them to compare concrete designs, not as numeric scores.

Following Parnas, hide difficult or likely-to-change decisions behind stable contracts. Things that change for the same reason should usually live together; similar-looking code with different business meanings should not be unified just to remove repetition. A layer or folder is not information hiding by itself.

- **Deletion test:** if removing a wrapper loses no useful policy, isolation, translation, or contract and only removes indirection, it is probably unnecessary. If its knowledge spreads across callers, it was earning its keep.
- **Wrong-abstraction test:** caller-specific flags and growing special cases suggest unrelated responsibilities were combined. Keep understandable duplication rather than forcing them together. A meaningful domain option is not automatically a design defect.
- **Common-path test:** ordinary callers should not configure rare cases or manage sequencing the module can safely own. Preserve genuinely required streaming, transaction, and resource lifecycles; do not compress them into one call at the expense of correctness.
- **Human-readability test:** names describe domain intent; a newcomer can find the rule, owner, and failure behavior without tracing a chain of pass-through helpers. Small functions and fewer methods are not goals in themselves.

## Designing a new module

Sketch the interface before implementing it. Include every fact callers need: inputs, results, invariants, errors, ordering, effects, configuration, and relevant performance limits—not just the type signature.

Draft the caller-facing comment first when the contract is non-obvious. Use the repository's contract-comment format; do not restate obvious types. If describing the contract takes many caveats, try reshaping the responsibility rather than hiding the caveats. Keep storage and protocol details private unless they affect caller correctness.

Serve current needs with clear operations, not speculative knobs. Pull complexity downward when that simplifies callers without hiding failures. Empty results and already-completed deletes can be normal outcomes where the domain permits; invalid money, unauthorized access, and conflicting writes must not be silently clamped or treated as success.

One module should own a representation or rule; callers should not reconstruct it. Two modules changing together repeatedly is evidence to investigate, not an automatic order to merge them.

## Designing for testability

- **Test the contract of the module under test.** An internal module's stable interface is a valid test surface; do not force every test through HTTP or the outermost application interface. Avoid private state and incidental call sequences. Coverage follows behaviors, states, and failure modes, not method count.
- **Give seams a present purpose.** A seam is justified by a concrete need to isolate an external dependency, control time or randomness, protect ownership, or characterize legacy behavior—even with one production adapter. Do not invent interchangeable implementations just to justify a seam, or wrap every function in an interface.
- **Separate calculation from effects where useful.** Prefer explicit inputs/results for business calculations. Backend writes, messages, and payments remain necessary; assign their ownership and make their outcome, transaction scope, and failure behavior observable.
- **Accept dependencies where control matters.** Construct real dependencies at the composition point when callers or tests need substitution. Do not inject deterministic helpers or expose private internals solely to make mocking easy.
- **Verify real connections.** Use integration tests for constraints, queries, transactions, and adapter semantics; an in-memory fake cannot prove database concurrency or an external protocol. Use the smallest test boundary that proves the guarantee.

## Shared vocabulary

Use these meanings for design discussion without banning the repository's established terms such as service, API, component, or boundary.

- **Module:** code with a caller-facing contract and an implementation; a function, class, package, or cohesive capability.
- **Interface:** everything a caller must know to use that module correctly, including behavioral obligations beyond types.
- **Implementation:** how the module fulfills its contract. Internal modules can have their own contracts without becoming part of the outer module's interface.
- **Depth:** useful behavior and decisions hidden per amount a caller must learn. A short implementation can be deep; extra code does not add depth.
- **Seam (Feathers):** a place where behavior can be altered without editing the code at that place. Not every architectural boundary needs a substitution mechanism.
- **Adapter:** a concrete implementation translating an external capability to the contract used inside the application.
- **Leverage:** capability gained relative to caller knowledge.
- **Locality:** related knowledge, changes, and verification concentrated with their owner.

The design loop and checklists are a local synthesis of the [cited practitioner guidance](references/sources.md), not a universal formula or a claim that every author endorses every rule.
