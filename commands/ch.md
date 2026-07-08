---
description: Create a handoff document — shortcut for the handoff skill
---

# ch — Create Handoff

Shorthand for invoking the handoff skill.

Run it with an optional description for the handoff title:

```
/ch                        # auto-generate title from context
/ch finishing auth flow    # custom description
```

## Instructions

1. Invoke the `handoff` skill at ~/.agents/skills/handoff/SKILL.md
2. Pass any arguments after `/ch` as the description parameter
3. If invoked without arguments, let the handoff skill auto-generate the topic
