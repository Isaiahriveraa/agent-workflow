# Software Design

Working rules from *A Philosophy of Software Design* (Ousterhout), written for agents who write and review code. Apply them every time you write code, not only during reviews. The goal is code a teammate understands on the first read and can change safely.

## The one idea

Complexity is anything that makes code hard to understand or change. It shows up as **change amplification** (one change touches many places), **cognitive load** (a lot to learn before you can act), and **unknown unknowns** (it isn't clear what you need to know). It comes from **dependencies** and **obscurity**, and it builds up in small steps. Every change should leave the design a little cleaner. Working code is not enough.

## Rules

1. **Make modules deep.** A module is worth its interface when it hides much more than it asks callers to learn. Prefer a few powerful operations over many thin ones. Interface size counts everything a caller must know: signature, side effects, ordering, error behavior.
2. **Hide each design decision in one place.** A file format, protocol, retry policy or data layout should live in one module. If changing it means editing two modules, the knowledge has leaked. Merge them, or move the knowledge into one owner.
3. **Split by knowledge, not by steps.** Don't make one module per execution step ("read, then parse, then save") when the steps share knowledge, such as the format. Group code by the secret it protects.
4. **Make the common case trivial.** Give defaults so a caller does the usual thing with no setup. Rare options must not show up in the common path.
5. **Pull complexity down.** When the module or its caller has to deal with something, the module should. A simple interface matters more than a simple implementation. Don't push decisions onto callers through config knobs, flags or exceptions the module could settle itself.
6. **Give each layer its own abstraction.** If a method only forwards its arguments to a method with a similar signature, or a variable only passes through layers to reach one deep function, the layering is wrong. Remove the layer, merge it, or give it real responsibility.
7. **Define errors and special cases out of existence.** Design the semantics so the edge case is ordinary behavior. For example, deleting a missing key is a no-op, and a range past the end gets clamped. Handle the errors that remain in one place, low in the stack, instead of throwing them at every caller. Never hide errors a caller really needs to act on.
8. **Design it twice.** Before you settle a non-trivial interface, sketch at least two meaningfully different shapes. Compare them on what callers must learn and on how changes would spread. Pick one, or combine them.
9. **Write for the reader, not the writer.** See [Obvious code](#obvious-code).

## Generalize or specialize?

The default is a **somewhat general-purpose interface with a present-day implementation**. Shape the interface around the concept the module owns, not around today's caller. Then build only the behavior today's callers need.

- Good: `text.delete(start, end)` serves the backspace key, the delete key and deleting a selection.
- Bad: `backspace(cursor)`, `deleteKey(cursor)` and `deleteSelection(sel)`. That's three shallow methods, and each one leaks UI ideas into the text module.

Ask these questions in order:

1. **What is the simplest interface that covers every current need?** If fewer methods give the same capability, they are more general. This stops being true once each method needs extra flags or arguments to make up for it.
2. **How many situations will this method be used in?** If the answer is one, the method is probably too specialized. Look for the general operation underneath it.
3. **Is it easy to use for today's caller?** If the caller needs loops or glue code to do the common thing, you went too general. Move up a level (ranges, not single characters).
4. **Does the name mention a caller, screen, feature or user action?** Then special-purpose knowledge has leaked downward. Name the operation after what the module owns.

Push special-purpose code **up** into the caller, or **down** into thin adapters. Keep the general module free of feature-specific branches. This differs from speculative generality, which YAGNI forbids. A general *shape* doesn't add features, options or extension points. It replaces several narrow methods with one clear one. Add a new capability only when a present requirement needs it.

## Together or apart?

Put code together when the pieces share knowledge, when combining them simplifies the interface, or when it removes duplication. Split it when one part is general-purpose and the other is special-purpose. Don't split a method just because it is long. Split it only when each piece makes sense on its own and the caller doesn't have to understand both halves. Two methods you can only understand by reading each other (conjoined methods) should be merged.

## Obvious code

Clever code is a defect. A reader should understand the behavior and meaning from a quick read, without opening other files.

- Use precise names that make a picture in the reader's mind. Use one name per concept everywhere. If a name is hard to pick, the design is probably unclear.
- Use straightforward control flow over compact tricks: no dense one-liners, nested ternaries, or chains that hide side effects.
- Do similar things the same way the codebase already does them, so readers can rely on familiar patterns.
- Prefer named records to generic tuples, pairs or maps that carry structured data.
- Don't make readers guess hidden control flow. When you use events, callbacks or reflection, document when the code is invoked.
- Use blank lines to separate the logical steps inside a function.

## Comments

Comments carry what the code can't say: intent, constraints, units, invariants, why one approach beat another. An interface comment describes what the caller gets and must provide, not how the module works. Implementation comments explain what a block achieves and why, not how. Write the interface comment before the body. If it's hard to write briefly, redesign the interface. Keep comments next to the code they describe, not in commit messages.

## Red flags

Stop and redesign when you see any of these in code you write or review:

| Red flag | Looks like |
| --- | --- |
| Shallow module | The interface is barely simpler than the implementation |
| Information leakage | Changing one decision means editing several modules |
| Temporal decomposition | Modules map to execution steps instead of hidden knowledge |
| Overexposure | Callers must learn rare options to do the common thing |
| Pass-through method or variable | A method only forwards its arguments, or a value is threaded through layers that ignore it |
| Repetition | The same non-trivial logic appears in several places |
| Special-general mixture | Feature-specific branches inside a general module |
| Conjoined methods | Neither method can be understood without reading the other |
| Comment repeats code | The comment adds nothing the line doesn't already say |
| Implementation in interface docs | Caller-facing docs describe internals |
| Vague or hard-to-pick name | `data`, `handle`, `manager`, or a name you struggled to choose |
| Hard to describe | Complete documentation for the thing would be long |
| Nonobvious code | Meaning or behavior isn't clear from a quick read |

## Don't overdo it

Each rule has a limit. Don't hide information callers really need. A detail callers care about should be explicit at the call site. Don't merge unrelated code to make one "deep" module. Don't generalize to the point where today's caller struggles. Don't define away an error the caller must handle. When two rules conflict, pick the design that minimizes what a future reader must learn.
