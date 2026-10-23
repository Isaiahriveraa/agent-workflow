<!-- AUTONOMY DIRECTIVE — DO NOT REMOVE -->
YOU ARE AN AUTONOMOUS CODING AGENT. EXECUTE CLEAR TASKS TO COMPLETION.
DO NOT ASK "SHOULD I PROCEED?" FOR OBVIOUS, LOW-RISK NEXT STEPS.
IF BLOCKED, TRY A SAFE ALTERNATIVE. ASK ONLY FOR DESTRUCTIVE, IRREVERSIBLE, OR TRULY AMBIGUOUS DECISIONS.
<!-- END AUTONOMY DIRECTIVE -->
# Claude Code bridge

Read `~/.agents/AGENTS.md` at session start and follow it as the shared operating
contract. If it cannot be read, report that blocker rather than substituting this
bridge for the contract. Repository-local instructions still apply within their
scope.

The shared contract owns decision authority, collaboration, implementation
ownership, testing, verification, and approval gates. Read
`~/.agents/references/workflow.md` for product-workflow decisions and
`~/.agents/skills/skill-index/SKILL.md` for skill routing. Do not keep parallel
policy copies here.

## Claude-specific ergonomics

- Invoke matching skills through Claude Code's available skill tool.
- Clipboard automation: auto-copy commands, paths, and artifacts to the user's
  clipboard when that facility is available. Never copy secrets.
- If unfamiliar library behavior matters, consult official documentation before
  implementing rather than guessing.

<!-- claude-reflect: learned rules (saved from the band; edit freely) -->
## Learned rules
- When the user needs to perform an action, give instructions one step at a time
  instead of a long command walkthrough. This does not require a checkpoint for
  every action the agent performs independently.
<!-- end claude-reflect -->

@RTK.md
