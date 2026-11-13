# Motion and state feedback

Motion is not decoration; it is the sentence that explains what just happened.
Every animation must answer "which state changed, and where did it come from?"
If you cannot name the state change, delete the animation.

## Durations by job

| Job | Duration | Easing |
|---|---|---|
| Press / tap acknowledgement | 90–130ms | ease-out |
| Hover and focus color, background | 120–160ms | ease-out |
| Small style change (border, tone) | 150–200ms | ease-out |
| Popover, menu, tooltip, disclosure | 180–240ms | ease-out in, ease-in out |
| Dialog, sheet, drawer | 240–320ms | ease-out |
| Layout reflow, list reorder | 240–360ms | ease-in-out |
| Page or route transition | 300–400ms | ease-in-out |
| Authored focal moment (once per product) | 500–700ms | custom |

- **Exit is faster than entrance.** A closing menu at 140ms, opening at 200ms.
  Leaving should feel immediate; arriving should feel placed.
- **Distance scales duration, but weakly.** A 4px nudge and a full-screen sheet
  are not 10× apart in time. Cap UI motion around 400ms.
- **Anything over ~500ms must be interruptible.** Users click during it.

## Easing

- Default: `cubic-bezier(0.2, 0, 0, 1)` (standard, decelerating).
- Entering from off-screen or after a gesture: `cubic-bezier(0.16, 1, 0.3, 1)`.
- Leaving: `cubic-bezier(0.4, 0, 1, 1)`.
- Moving or resizing something already on screen: `cubic-bezier(0.4, 0, 0.2, 1)`.
- Springs are for direct manipulation release (drag, swipe, reorder). Never for
  layout or color; a bounce on a layout change reads as a bug.
- Linear only for continuous progress (a determinate bar, a marquee is still a bug).

## What to animate

- **Transform and opacity only.** They stay on the compositor. Animating
  `top/left/width/height/margin/padding` is a layout pass per frame.
- Color and background transitions are cheap enough for hover and focus.
- Never animate `box-shadow`, `filter`, `backdrop-filter`, or `clip-path` on
  scroll or hover; they are the frame-budget killers. Swap between two
  pre-rendered shadows by opacity instead.
- `will-change` on a handful of elements, removed after the animation. On
  everything it costs memory and hurts.
- A skeleton shimmer is a gradient animation on a large area; keep it subtle,
  slow (≥1.2s), and stop it when the content arrives.

## Choreography

- **One thing moves at a time.** Parallel motion competes for attention; if two
  things must move, make one clearly lead (stagger 20–40ms per item, ≤8 items).
- **Origin is information.** A menu grows from its trigger; a sheet enters from
  the edge it belongs to; a detail view expands from the row that opened it.
- **Preserve spatial continuity.** The thing that becomes the next screen should
  feel like the same thing. Static replacement is a cut; a cut implies a new context.
- **No entrance animations on page load.** Content that fades in on load is
  slower than content that is there. This is the single most common generated-UI tell.
- **No hover lift on every card.** A 2px translate plus shadow on hover is
  decoration pretending to be feedback.

## Feedback latency

- <100ms: feels instant. Press, toggle, focus.
- 100ms–1s: acknowledged with a busy state (button label stays stable, spinner
  appears only after ~300ms so fast responses do not flash).
- >1s: progress with a shape that matches the result (skeleton of the real
  layout, not a centred spinner).
- >10s: background it, report where it landed, and let the user leave.
- **Optimistic UI** for reversible actions (a toggle, a star, a reorder). Show
  the new state immediately, reconcile on response, and roll back with a message
  that says what happened. Never optimistically confirm a destructive action.
- **The control that acted stays stable.** Width does not change when a label
  becomes "Saving…"; the row does not shift when a tick appears.

## Reduced motion

- `@media (prefers-reduced-motion: reduce)` means **fewer and gentler**, not
  none. Keep opacity and color changes; replace translation, scale, parallax,
  and auto-playing motion with an instant state swap.
- Kill anything that moves the viewport (parallax scrolling, large background
  motion). Keep small transform feedback if it clarifies a press, but halve it.
- Never gate essential information on an animation completing.

## Tells and fixes

| Tell | Fix |
|---|---|
| Everything fades or lifts on load | Delete load animations; keep only transitions that answer an interaction |
| A page transition longer than the user's patience | 300–400ms, and paint the destination before animating |
| Animating a number by counting up | Show the final value; a counter delays the answer |
| A spinner for a 200ms request | Show nothing; after 300ms, show a skeleton of the result |
| Motion with no reduced-motion path | Add the media query with an instant swap |
| Shadows or blurs animated on hover | Swap opacity between two static states |
| A list that reorders by teleporting | Animate the reorder with transform; keep the moved item's identity |
| Gesture interrupted and the UI keeps animating | Cancel on `pointercancel`, `lostpointercapture`, and `blur`; settle to the nearest state |

## Verify it, don't assume it

- Record the interaction (a screen recording, not a still) and watch it once at
  normal speed, once at 4× CPU throttle.
- Tab through the state while it animates; focus must never land on a moving target.
- Toggle reduced motion and repeat. Nothing should disappear; text should not jump.
- Check the exit: click the trigger twice quickly. A menu that closes into a
  half-open ghost, or a toast that stacks three times, is a missing interruption path.
