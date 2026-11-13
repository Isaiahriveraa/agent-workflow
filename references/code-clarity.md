# Code Clarity

Practical guidance behind AGENTS.md **Code explains itself**. Clean code is code another developer on the team can understand and safely change without its original author. Readability should make change easier, not add ceremony.

The contract already owns conventions and scope (**Surgical changes**), cohesion (**Locality of behavior**), reuse (**One source of truth**), testing (**Test contracts**), and restraint (**YAGNI**). Apply those rules rather than treating this reference as a second checklist. Use the guidance relevant to the code being changed, not a mandatory audit of every category.

## Functions and control flow

- Give each function one coherent responsibility. Prefer fewer meaningful arguments and explanatory variables; extract only when the name or boundary makes the caller easier to understand. No line-count or argument-count quotas.
- Make side effects explicit. Keep calculations separate from I/O or mutation where that clarifies behavior; commands legitimately have effects. Avoid methods that silently require an unrelated method to have run first. Make required state or sequencing explicit in the interface.
- Use positive conditions and early returns when they simplify the normal path. A natural negative guard such as `if (!isAuthorized)` is fine; avoid double negatives, not every negation.
- Separate unrelated operations instead of choosing between them with a boolean flag. Keep meaningful domain options when they describe one operation rather than hiding different responsibilities.

## Design without extra machinery

- Keep deployment configuration and policy choices at the application boundary, passed to the code that needs them. Keep implementation constants local. Add configuration only for a real variation, not every value.
- Accept dependencies explicitly where ownership, isolation, or testing needs it. Dependency injection need not mean a container or an interface for every class. Depend on a collaborator's public contract rather than reaching through its internals (Law of Demeter); do not add forwarding wrappers just to shorten a call chain.
- Use polymorphism when real implementations share a stable contract and it simplifies repeated branching. A short conditional is often clearer than a class hierarchy. Base classes should not need to identify their subclasses.
- Use a value object when it owns meaningful validation, units, or behavior. Use ordinary primitives and data records when they are sufficient. Choose objects to protect invariants, records to carry data; avoid exposing mutable internals that bypass the object's guarantees. Do not impose a universal preference for objects, records, or non-static methods.
- Keep concurrency coordination separate from business decisions when practical, so locking, scheduling, and cancellation do not obscure the behavior being protected.

## Names, comments, and layout

The naming examples below extend the contract's naming rule. Use descriptive, searchable names without redundant type prefixes. Name non-obvious literals for their domain meaning; obvious literals do not all need constants.

Let the repository's formatter own line length, whitespace, and indentation. Keep variables near use and related functions together; put high-level flow before its helpers when local conventions allow. Avoid manual column alignment and arbitrary splitting that makes readers jump between tiny functions.

Comments should explain intent, constraints, or consequences the code cannot express. Do not add narration, closing-brace labels, or commented-out implementations. Remove obsolete code exposed by the change within the contract's scope and deletion-approval rules.

## Tests and maintenance

- Test one behavior per test, not one assertion. Several assertions can prove one outcome; split independently failing behaviors. Keep tests readable, independent, repeatable, and fast enough for their test boundary. Do not replace necessary integration coverage with mocks just for speed.
- Fix the demonstrated cause, not only the symptom. Investigate enough to explain the failure; do not turn a local bug fix into a speculative redesign.
- Treat rigidity (changes cascade), fragility (unrelated behavior breaks), immobility (reuse requires dragging unrelated dependencies), needless complexity, repetition, and opacity as signals to investigate, not automatic refactoring orders. Improve touched code when it directly helps the task; queue unrelated cleanup.

Before finishing, ask: can another teammate follow the normal path, see the effects and edge cases, and make the next likely change locally? If a cleanup adds indirection or more concepts than it removes, keep the simpler version.

## Naming check

Cover the comments and read the names as an English sentence. If you cannot say what a name means without opening another file, the name is unfinished.

## Where meaning hides

| Before | After | What the name was missing |
|---|---|---|
| `data`, `info`, `payload` | `unpaidInvoices` | what the thing is |
| `flag`, `isValid` | `hasUnpaidBalance` | what is true, and of what |
| `type: 2` | `plan: "annual"` | the meaning of the value |
| `handleClick` | `submitInvoice` | what the action does |
| `compact` | `view="year"` | why it looks that way |
| `isCurrent` | `isMonthOfToday` | what is current |

A comment above the function is one hiding place. A stylesheet, a storage shape, and a generic verb are the others. The rule is the same in each: move the meaning into the name, then delete whatever was carrying it.

## One worked example

From a calendar card review, where a 20-line comment and the stylesheet were the only places the names meant anything:

```jsx
// Before
<Card compact isCurrent={isCurrent} />
className={["card", compact ? "card--compact" : null, isCurrent ? "card--current" : null].filter(Boolean).join(" ")}

// After
<Card view="year" isMonthOfToday={isMonthOfToday} />
```

- `isCurrent` → `isMonthOfToday`. The file already says `isToday` for a day; the month version is that fact, not a new one. "Current" had no subject.
- `compact` → `view="year"`. The flag named the look; the reason is the year view, where many months share the page. `Card` maps `view="year"` to its class token in one place.
- The class string stays BEM. `card--compact` is the stylesheet's private language, not the name of a product state.

## A definition comment is a receipt

When a comment's job is "`compact` means the year view's variant", two things are true: the name failed, and the comment is the evidence. Move the meaning into the name, then delete the comment.

Keep the comments that explain behavior you cannot name:

```jsx
// A button cannot hold another button, so the chip sits beside the day button.
```

## Why review, not lint

No naming regex catches `isCurrent` or `data`; both pass every convention. The gate is the review question — cover the comments and read the names — and the fix is a rename plus deleting whatever carried the old meaning.

Class-name selectors in tests are the same failure one step later: once `.card--current` is asserted, the stylesheet token decides behavior, and no reader can tell what the state means without opening the stylesheet.
