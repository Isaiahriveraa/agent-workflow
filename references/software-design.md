# Software Design

Apply these checks from John Ousterhout’s *A Philosophy of Software Design* when you plan, write, or review code. The goal is code a teammate can understand and change safely.

Complexity makes code hard to understand or change. It comes from dependencies and obscurity. Look for **change amplification** (one change touches many places), **cognitive load** (too much to learn), and **unknown unknowns** (it is unclear what you need to know or change).

## Default checks

- **Find the owner.** Keep a rule, format, or other private decision with the module responsible for it. Group code by the knowledge it shares, not by when it runs. Keep unrelated decisions apart, even when their code looks similar.
- **Make the common case easy.** A deep module offers useful behavior without making callers learn its internals. Let the owner handle details that callers need not decide. Shape operations around the concept the module owns; build only what current callers need.
- **Make the promise clear.** Keep the inputs, ordering, effects, and other facts callers need visible. Treat a special case as an ordinary outcome only if the promised result still holds. Surface failures the caller or operator needs to act on.
- **Write obvious code.** Follow useful conventions so readers can transfer what they already know. Prefer clear names and direct control flow over clever shortcuts. Use [Code Clarity](code-clarity.md) for names and comments.
- **Improve the design in small steps.** Consider one likely change, not a list of future features. Improve the boundary you are touching when it helps the task; leave unrelated redesigns out of scope.

For a routine change on an established contract, confirm the owner, the guarantee that stays true, and a behavior test. For larger design decisions, use [the design trigger in the coding contract](coding-contract.md#design).

## Red flags

Use these questions to find a concrete cost in the work in scope. A flag is a reason to look for a better design, not a requirement to refactor.

| Signal | Question |
| --- | --- |
| Information leakage or repeated logic | If one private decision changes, who must learn about it or edit their code? |
| Modules split by execution step | Do these steps share a format or rule that could have one owner? |
| Shallow or forwarding layer | Does the layer own useful policy, translation, or isolation, or just add a stop for the reader? |
| Rare cases on the common path | Can ordinary callers act without learning options or sequencing they do not need? |
| Feature rules in a general module | Does the general module depend on a specific caller's policy? |
| Functions that only make sense together | Can someone use one safely without reading the other? |
| Hard-to-describe contract | Do callers need all those caveats, or could the owner handle some of them? |
| Obscure names, comments, or control flow | Can another reader tell what happens and what they must preserve? |
