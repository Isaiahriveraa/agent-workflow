---
name: writing
description: Write and edit anything a person reads — answers, docs, commit messages, design notes, error text — in plain English that leads with the answer and gives a next step when needed. Use for any reply longer than a sentence, and before writing or editing documentation.
---

# Writing

> Say the thing. Then stop.

The reader has a task and a short attention span. Plain English is not shallow
thinking; it is thinking the reader can check.

## Shape of an answer

1. **Outcome first.** The first line answers "what happened" or "what do I do".
   Not context, not a plan, not "Let me…".
2. **Why second.** One or two sentences on what it means for the reader.
3. **Detail third.** As much as the task needs, in the order the reader acts on
   it. Headings only if the reader will skim back.
4. **Next action, if needed.** Give one concrete next step if the reader needs
   to act: the command to run, the file to open, or the question to answer.
   Otherwise, stop at the answer.

Never open with "Great question", "Let me", "I'll", "Sure". Never close with
"Let me know if…", "Hope this helps", or a recap of what the reader just read.

## Orwell's six rules

From "Politics and the English Language". They apply to code writing as much as
to prose, and each one has a lazy version and a live one.

1. **No familiar metaphor.** A worn figure of speech says less than the reader
   thinks it does.
   Bad: "Let's hit the ground running." Good: "Let's start."
2. **No long word where a short one will do.**
   Bad: "We need to facilitate communication." Good: "We need to help people
   talk to each other."
3. **Cut every word that can go.** Filler, repetition, qualifiers.
   Bad: "I just wanted to reach out to ask whether you might be able to help."
   Good: "Can you help?"
4. **Active, not passive, when the actor matters.**
   Bad: "The report was written by Sarah." Good: "Sarah wrote the report."
5. **No jargon or foreign word when an everyday one will do.**
   Bad: "We need to operationalise this initiative." Good: "We need to put this
   plan into action."
6. **Break rules 1 to 5 rather than write something absurd.** The longer word is
   sometimes the precise one, the passive sometimes puts the point where the
   reader needs it, and a metaphor sometimes carries what plain prose cannot.

Name the concrete thing: the file, the function, the flag, the number.

## Rewriting

Preserve the source's facts, conditions, and uncertainty. Keep requirements,
recommendations, and permissions distinct. "You may retry once" does not mean
"Retry."

## ASD-STE100

Issue 9 (2025) contributes the rules that hold in technical prose. They are the
same discipline, tightened:

- One instruction or one idea per sentence.
- 20 words a sentence; 25 when describing. Six sentences a paragraph.
- One term for one thing, every time. Repetition beats a synonym.
- Use `must` for a requirement and `can` for a possibility. Do not substitute
  either if it changes the meaning.
- Keep noun groups to three words: "the design of the parser", not "the parser
  design process improvement initiative".
- A procedure is commands in run order: condition, action, result.
- Code, identifiers, commands, paths and quoted text stay verbatim.

Do not claim STE conformance. It needs the controlled dictionary; use the
discipline and say that is what you did.

## Instructions a machine follows

A skill, a prompt or a runbook is read by an agent that cannot ask what you
meant. Five habits keep it unambiguous:

- **One action per step.** If a step contains two verbs joined by "and", it is
  two steps.
- **Name the artifact.** The file, the command, the exit code, the field. "Check
  the result" is not an instruction; "run `gates`, exit 0 is green" is.
- **Say what stops the work.** A condition the agent cannot detect is a wish.
- **One example beats a paragraph of adjectives**, and a pair is better than
  one: the wrong version names the trap, the right version names the fix.
- **Put the principle in the instruction.** "The interface stays deep: one call,
  not three" is a step. A list of principles above the steps is a poster.

## Documentation

A document earns its place by being re-read. Write for the reader who has the
code and not the conversation.

- The title says what the thing is; the first line says what it does.
- State the contract: inputs, outputs, errors, what null means.
- Show the command and its output instead of describing them.
- Record the decision and the trade-off it bought, not the meeting that made it.
- Delete the draft's history. A doc that narrates its own revisions is a
  transcript.
- A table when the reader compares rows; prose when the reader follows one
  argument; neither for two facts.

## Bad news and limits

Name the failure and what you observed. If the cause or fix is unknown, say so
instead of guessing. No alarm, no apology theater. A hedge that carries real
uncertainty stays ("I could not run the iOS build"); one that does not goes
("perhaps", "might possibly"). State what you did not verify in the same breath
as what you did.

## Break these rules when

- The reader asks for an explanation, a walkthrough or creative work. The body
  runs as long as the topic needs, and voice, rhythm and imagery stay.
- The words are the answer: options, trade-offs and evidence, when the reader is
  choosing.
- Safety or an irreversible action is ahead. State the risk plainly. Wait for
  any required approval before acting.

## Pre-send check

Delete the first sentence if it announces what you are about to do, the last if
it asks whether anything else is wanted, and every "by the way", empty hedge and
idiom. Then check: does the answer lead with what the reader needs to know?
Does it preserve meaning and uncertainty? If the reader needs to act, is the
next step clear?
