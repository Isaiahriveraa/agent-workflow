# Attention and momentum

People skim, get interrupted, and leave. Design so the important thing is found in seconds, progress is visible, and finishing feels worth it, without manipulating anyone. `components.md` and `interaction.md` already cover loading treatments by duration, step counters, optimistic updates, undo, and empty states; this file adds what they do not.

## The 5-second test

Show the screen for five seconds, then ask: what is this for, and what would you do next? Both answers must match the brief.

- One element is noticed first and one action is primary per screen (see `hierarchy.md`).
- The heading says what the screen is for in the user's words, not the feature's name.
- Anything that competes with the main action is quieter or moved behind Details.

## Value before effort

- Show what the product does before asking for signup, setup, or permissions. A shared event page shows the event before it asks anyone to log in.
- Ask for information at the moment it is needed, not all up front.
- Prefill and default whatever can be known; every field removed is attention returned.

## Momentum

- **Show progress as done out of total**: "2 of 5 done", with completed items kept visible as wins.
- **Start partly filled when it is true**: when an account already exists, step 1 is already done; show it as done.
- **Short onboarding checklists** (3-5 items) tied to real value, each finishable in one sitting. The list disappears when done.
- **Unfinished work invites return**: a draft or an incomplete setup is visible where the user lands next, with one action to resume.

## Point attention at change

- When something changes because of the user (a row added, a total updated, a status flipped), briefly highlight it: a background fade of about 1-2 seconds, or a short scroll into view.
- Announce the same change to assistive technology with a polite live region.
- Never highlight changes the user did not cause unless they need to act on them.

## Transitions that keep people oriented

- When an item opens into a detail view, it visibly grows from where it was; when it closes, it returns there. People keep their place.
- Lists that reorder animate items to their new position instead of jumping.
- Durations and easing follow `motion.md`. Under `prefers-reduced-motion`, replace movement with a quick crossfade; never remove the feedback entirely.

## Copy for short attention

- **Headline first**: the first words of a heading, label, or message carry the point. "Event full: join the waitlist", not "Unfortunately, this event has reached capacity".
- **Front-load labels**: "Email address", "Email notifications", "Email frequency" scan better than three labels that start differently.
- **Word budgets**: buttons 1-3 words (verb first), helper text one line, error messages state what happened and what to do in one sentence.
- Cut words before shrinking type (see `typography.md`).

## Celebrate sparingly

- Mark meaningful milestones only: the first RSVP, an event published, setup finished. Never on routine clicks.
- Keep it brief and quiet: a check animation, a short message, at most a small burst, and none under reduced motion.
- Pair it with the next useful step ("Share the event"), so the moment leads somewhere.
- Skip celebration entirely for high-stakes or sombre contexts (medical, money loss, deletions).

## Ethical guardrails

Momentum serves the user's goal, never an engagement number.

- No fake urgency or scarcity ("Only 2 left!" when false), no countdown pressure that is not real.
- No guilt-trip wording on declines ("No thanks, I don't like saving money").
- No streaks or loss-framing that punish a day away; progress never resets as a penalty.
- Leaving, cancelling, and unsubscribing are as easy as joining.
- Notifications are batched and opt-in; none interrupt for the product's benefit alone.
