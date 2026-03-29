---
name: gsd:doctor
description: Run workflow diagnostics and summarize continuity, execution, router, adapter, and memory health
allowed-tools:
  - Read
  - Bash
---
<objective>
Inspect the current repo through the shared doctor surface and report the real operational state before more workflow work continues.
</objective>

<process>
1. Resolve the current project context with `node ~/.agents/scripts/project-context.mjs current`.
2. Run `node ~/.agents/scripts/doctor.mjs report`.
3. Summarize:
   - workflow and continuity status
   - active execution status
   - verification availability
   - router/provider resolution
   - adapter capability gaps
   - memory health
4. If warnings exist, recommend the most relevant next command to stabilize the workflow state.
</process>

<output>
Return:
- overall status
- warnings
- next recommended command
</output>
