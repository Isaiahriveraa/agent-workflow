# Familiar interactions

## Principle

Build on what the intended audience already knows. A person should be able to predict what a control does, act on it, see the result, and recover from a mistake. Familiarity is a hypothesis about that audience, not a property a designer can declare.

**Skeuomorphism** uses recognizable real-world characteristics in a digital interface: a document, folder, trash bin, or a control with visible depth. It can transfer an existing mental model, but ornamental leather, bevels, and photorealistic knobs do not automatically make a UI usable. A familiar digital pattern may be clearer than a physical imitation. [1][2]

- **Mental model:** what the user believes the system does and how it works. Match their language, expectations, and task order. Familiarity varies by experience and culture. [2][3]
- **Affordance and signifier:** distinguish the available action from the cue that communicates it. A button-shaped surface promises activation; it must not be inert decoration. An invisible action is not discoverable merely because it works.
- **Natural mapping:** connect a control's position and movement to its effect. Increasing a value should follow the established direction for that control and audience; labels, values, and visible feedback remove ambiguity. [3][4]

The rules below are local applications of these principles, not a claim that every example is prescribed by the cited articles.

## Before choosing a control

Read the existing product patterns first. Name the audience, task, and familiar convention you are borrowing. If audience evidence is missing, say which assumption needs testing rather than inventing research.

For each primary interaction, write a short behavior contract in the working design notes; no new document is required:

1. **Expectation:** what people expect from the familiar pattern.
2. **Cue:** the label, shape, position, or state that makes the action recognizable.
3. **Action:** what pointer, keyboard, and touch users can do.
4. **Feedback:** what changes during and after the action, including failure.
5. **Recovery:** how to undo, cancel, correct, or safely leave when applicable.

Example: “Volume uses a labeled slider with a visible percentage. Moving right increases volume; keyboard controls work. The value updates during adjustment. A number field allows precise input.” Use a number field when precision is part of the task, not as mandatory decoration on every slider.

## Choose familiarity over imitation

| Need | Familiar behavior | Avoid |
|---|---|---|
| Run an action | A labeled button, visible focus, clear pending/success/failure state | Clickable text disguised as decoration or a fake raised surface |
| Navigate | A real link or existing navigation pattern; preserve expected browser history | A control that looks like a button but unexpectedly changes destination |
| Change an immediate on/off setting | A labeled switch reflecting the actual state; pending/error feedback when saving | A switch that silently needs an unrelated Save action |
| Edit a form saved on submission | Labeled fields or checkboxes and an explicit Save button | Immediate-looking controls with an undisclosed deferred commit |
| Adjust a continuous value | A native range control where suitable, with a label and understandable value | A drag-only rotary knob chosen solely because physical equipment has one |
| Move or reorder items | Clear destination and feedback; offer buttons or a menu as an alternative to dragging | Requiring precise dragging, hovering, or an undisclosed gesture |
| Organize documents | Recognizable files/folders if that matches the audience's task | Fake desk physics, page-turn navigation, or physical capacity limits |
| Delete or undo | Clear consequence and appropriately scoped undo or confirmation | A trash metaphor that hides whether deletion is recoverable |

These are defaults, not a ban on specialist interfaces. A professional audio audience may benefit from a knob. Keep its purpose and value clear, provide keyboard and precise-input access where needed, and validate the choice with that audience.

Prefer native semantic elements: links for navigation, buttons for actions, inputs for values. For custom widgets, implement the relevant accessibility pattern rather than assigning a role to an otherwise inert shape. For a slider, preserve its accessible name and value, arrow-key adjustment, Home/End behavior, and orientation. WAI-ARIA notes that some touch assistive technologies may not fully support custom sliders; test the actual combination before claiming support. [4]

## Use visual depth only when it helps

- Use restrained depth, borders, or state changes to clarify which surfaces are interactive and which are grouped content.
- Keep labels, contrast, focus, and selected state readable without shadows or color alone. Low-contrast neumorphism is not a substitute for recognizable controls. [1]
- Never add a physical limitation merely to maintain the metaphor. Digital search, undo, responsive layout, and keyboard access should not disappear to imitate an object.
- Keep familiar component behavior consistent across screens, themes, and input methods. Do not redesign a standard control merely to make the product look original.

## Verify behavior, not only appearance

1. **Predict:** before activation, can a representative user explain what will happen? Ask without teaching the metaphor first.
2. **Act:** complete the primary task with pointer and keyboard. Check touch on the supported device path. Verify focus, names, state, and relevant assistive-technology behavior.
3. **Understand:** inspect pending, success, empty, and failure states where applicable. The UI must show the actual result, not imply a save succeeded before it did.
4. **Recover:** try an accidental action, invalid input, cancellation, and navigation away where relevant. Confirm the user can understand the consequence and recover appropriately.
5. **Report evidence:** separate checks performed from assumptions and checks blocked by missing devices or users. Render inspection and automated checks can catch defects; they cannot establish that humans find the interface intuitive. [2]

For a novel interaction, compare the familiar alternative before adding onboarding. Explain any justified departure in the existing design notes and test the prediction with intended users.

## Reduce effort without removing control

- **Recognition over recall.** Keep relevant instructions, selections, and context available at the point of use. Do not make people remember values from another screen or discover an essential action through a gesture.
- **Prevent mistakes proportionally.** Explain constraints before commitment, make safe defaults explicit, and clarify irreversible consequences. Prefer correction or undo for recoverable actions; use confirmation when the consequence warrants interruption.
- **Preserve work.** Keep input through validation failures and request errors. Make unsaved changes and navigation consequences clear. Do not promise drafts survive a reload unless that behavior exists.
- **Expose real status.** Separate pending from saved, and distinguish stale, unavailable, or failed data when that changes interpretation. Optimistic updates need a clear failure and recovery path. Preserve enough status information for people to act; see `motion-and-transitions.md` for transient feedback.
- **Disclose detail progressively.** Keep the common path clear and advanced options findable. Costs, eligibility, consequences, and other information needed before commitment belong before the action, not behind a tooltip.
- **Respect choice.** Do not invent scarcity, preselect a consequential commitment without clear disclosure, disguise a paid action, or obstruct cancellation. Make leaving and declining understandable without deceptive visual emphasis.
- **Support repeat use.** Preserve established keyboard shortcuts, autofill, and efficient repeated actions where relevant. Keep a discoverable path for newcomers; speed must not depend on hidden gestures or inaccessible shortcuts.

## Sources

Fetched and read on 2026-10-15:

1. Nielsen Norman Group, Megan Chan, **“Skeuomorphism”** (2024-03-15). Definition, familiar real-world cues, limits of literal imitation, and flat/neumorphic tradeoffs. https://www.nngroup.com/articles/skeuomorphism/
2. Nielsen Norman Group, Megan Chan, **“Mental Models”** (2024-01-26, reviewed 2026-09-01). Expectations shaped by experience, differing user models, familiar conventions, and observing users to find mismatches. https://www.nngroup.com/articles/mental-models/
3. Nielsen Norman Group, Anna Kaley, **“Match Between the System and the Real World”** (2018-07-01). Users' language, natural mapping, cultural context, and why an inappropriate metaphor can confuse. https://www.nngroup.com/articles/match-system-real-world/
4. W3C, WAI-ARIA Authoring Practices Guide, **“Slider Pattern.”** Keyboard behavior, naming/value/orientation requirements, and touch assistive-technology warning. https://www.w3.org/WAI/ARIA/apg/patterns/slider/
