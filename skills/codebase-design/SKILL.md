---
name: codebase-design
description: "Use when a change needs a module, schema, or dependency boundary. Designs that interface; a local fix stays on implement."
---

# Codebase Design

Make the requested behavior easy to use, understand, change, and verify. Start with [Software Design](../../references/software-design.md) if you have not read it. A **deep module** does useful work behind a contract that hides decisions callers need not learn.

This is technical design guidance, not permission to implement, bypass plan approval, or choose unresolved product policy. Follow the active workflow's approval gates. Reuse its plan or decision note rather than creating another artifact.

## Choose the depth of the pass

- **Routine local change:** confirm the existing owner, preserved guarantee, and behavior test. Stop the design pass there. Skip the guides and alternatives when reusing an established contract, such as adding a page size with the existing limits and default.
- **Meaningful design change:** use the loop below when ownership, invariants, persisted facts, caller obligations, or dependency direction change. Read only the guides that match a decision or risk you face.

### Guides

- **Shared knowledge or an ownership choice:** read [information hiding](references/information-hiding.md) when modules repeat a rule, format, or sequence, or when deciding where it belongs. A shared contract alone is not a leak.
- **New or materially changed contract:** read [interface design](references/interface-design.md) when callers get a new promise or must learn something new to use the module safely. Skip it when reusing an established contract.
- **Failure handling:** read [failure design](references/failure-design.md) for repeated handling, an avoidable special case, or a partial or uncertain outcome. An ordinary propagated error needs no separate design pass.
- **Backend or persisted-data work:** read [backend and schema checks](references/backend-and-schema.md) for the actual risks. Even a small migration needs a historical-data and deployment-compatibility check.
- **Legacy code or external effects:** read [legacy and integration checks](references/legacy-and-integration.md) when safe change or test isolation is difficult.
- **Rationale and attribution:** consult [sources](references/sources.md) when explaining or revisiting a principle, not as part of each task.

## Design loop

1. **State the behavior.** Name the caller's observable outcome, the invariant that must survive, and a reachable failure. Separate verified facts from assumptions. Missing business policy goes back to the human, not into a convenient default.
2. **Find the owner and hidden decisions.** Read the existing modules, callers, tests, and data writers. Name the rule, representation, or other change-prone decision and who knows it today.
3. **Design it twice.** Sketch two materially different designs for the same caller action, such as extending the existing owner versus moving the decision. Show what each promises and hides and what the caller must do. Renaming a method is not another design.
4. **Probe change and failure.** Walk the same plausible change and reachable failure through each option. Name what the caller must learn, which modules would change, and who can uphold the invariant or report the failure. Use the probe to compare designs, not to build a future feature.
5. **Choose and prove the smallest sound design.** State the choice, why the alternative lost, the accepted tradeoff, and the test that will prove the guarantee. Follow local TDD: observe a failing behavior test, implement the smallest slice, inspect it, and adjust. Keep preparatory refactoring separate from the behavior change.

Keep the result proportional: a few sentences for a small responsibility choice; a short decision note in the existing plan for a consequential one. Report the outcome/invariant, owner/hidden decision, choice/tradeoff, and proof. Do not repeat the entire checklist in the answer.

## Choose the data shape before the logic

For meaningful design changes, start from one caller action and sketch the facts, valid states, and operations it needs before implementing branching logic. Trace the dominant reads, lookups, updates, and lifecycle transitions; choose types and collections that support those paths and prevent contradictory states. Reuse authoritative models rather than introducing another representation of the same facts.

Show the caller usage, proposed shape, rule owner, and one failure example in the existing plan or discussion. Explain why the shape fits those operations so the user can connect requirements to implementation. This is a small design sketch, not a requirement to design the entire database or build scaffolding before a working slice. Routine changes can retain the existing shape.

Adapted from pstack's [Foundational Thinking](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-foundational-thinking/SKILL.md).

## Designing a new module

Sketch a real use, then write the signature and the caller-facing contract comment before the body. Preserve facts the caller needs, including any required transaction, streaming, or resource lifecycles. Use [interface design](references/interface-design.md) to compare new or materially changed contracts.

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
- **Locality:** related knowledge, changes, and verification concentrated with their owner.

The design loop and checklists are a local synthesis of the [cited practitioner guidance](references/sources.md), not a universal formula or a claim that every author endorses every rule.
