# Code Clarity

Examples behind AGENTS.md **Code explains itself**. One test decides the rule: cover the comments and read the names as an English sentence. If you cannot say what a name means without opening another file, the name is unfinished.

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
