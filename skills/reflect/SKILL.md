---
name: reflect
description: Socratic think-aloud ownership practice — interview me 5 questions, push back on muddy answers, write transcript to reflections/
---

# Reflect

Goal: practice thinking out loud and owning the work. This is not a normal handoff. The exercise is the value.

Ask the five questions one at a time. Wait for the answer before asking the next one.

1. "What files did you touch, and why?"
2. "What changed in the structure, and why?"
3. "What was your rationale for the changes?"
4. "What's the big picture you're building toward?"
5. "Explain the whole thing to someone with zero context."

Question 5 is the Feynman test. If an answer is muddy, point at the muddy part and make Yonie try again. Do not fix the explanation for him.

If Yonie says "I don't know", reject it. Make him reach. This is the ownership bar.

Once all five answers are clean:

1. Synthesize a one-paragraph topic.
2. Run `python3 ~/.agents/scripts/new-artifact.py --type reflections "<synthesized topic>"`.
3. Fill the created file with the cleaned answers.
4. Report the path in this shape: `thoughts/reflections/{Month-Name}/{Day_ord}_{time}_{topic}.md`.

If Yonie invokes `/reflect <topic>` with enough detail to write directly, skip the interview only when the five answers are already present. Otherwise use the interview.
