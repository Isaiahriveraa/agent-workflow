import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const SKILL = fileURLToPath(new URL('./SKILL.md', import.meta.url));
const LENSES = fileURLToPath(new URL('./SUBAGENT_LENSES.md', import.meta.url));
const BUNDLES = fileURLToPath(new URL('./PLAN_BUNDLES.md', import.meta.url));
const EXAMPLE = fileURLToPath(new URL('./EXAMPLE.md', import.meta.url));
const content = readFileSync(SKILL, 'utf8');
const lenses = readFileSync(LENSES, 'utf8');
const bundles = readFileSync(BUNDLES, 'utf8');
const example = readFileSync(EXAMPLE, 'utf8');
const activeWorkflow = content.split('## Example Case')[0];

const requiredPlanSections = [
  '## Goal',
  '## Current State',
  '## Target State',
  '## Scope',
  '### In Scope',
  '### Out of Scope',
  '## Locked Decisions',
  '## Assumptions',
  '## Implementation Strategy',
  '## Alternatives Considered',
  '## Security Implications',
  '## Work Breakdown',
  '### Task N: {Action-oriented name}',
  '**Outcome:**',
  '**Relevant areas:**',
  '**Changes:**',
  '**Depends on:**',
  '**Verification:**',
  '**Done when:**',
  '## Dependency and Parallel Execution',
  '### Sequential',
  '### Parallel',
  '## Testing and Verification',
  '## Risks and Edge Cases',
  '## Definition of Done',
];

test('requires an implementation-ready plan structure', () => {
  for (const section of requiredPlanSections) {
    assert.ok(content.includes(section), `missing ${section}`);
  }
});
test('serializes repeated micro-decisions into artifacts before fan-out', () => {
  assert.match(activeWorkflow, /#### Shared Convention Artifacts/);
  assert.match(activeWorkflow, /\* `## Shared Convention Artifacts`/);
  assert.match(activeWorkflow, /repeated micro-decision/);
  assert.match(activeWorkflow, /its path in the repository — it is a committed file, not plan prose/);
  assert.match(activeWorkflow, /before\*\* the work areas that consume it start/);
});

test('enumerates mechanical fan-out work by command, never by hand', () => {
  assert.match(activeWorkflow, /\*\*Fan-out \(mechanical\)\*\*/);
  assert.match(activeWorkflow, /### Fan-out \(mechanical\)/);
  assert.match(activeWorkflow, /MUST declare a `work_queue_command`/);
  assert.match(activeWorkflow, /Enumerate fan-out items by command, never by hand/);
});

test('requires fleet rules as prohibitions for multi-agent execution', () => {
  assert.match(activeWorkflow, /### Fleet Rules/);
  assert.match(activeWorkflow, /\* `## Fleet Rules`/);
  assert.match(activeWorkflow, /only when the plan will be executed by more than one concurrent agent/);
  assert.match(activeWorkflow, /State the rules as prohibitions, not preferences/);
  for (const forbidden of ['git stash', 'git reset', 'git add -A']) {
    assert.ok(activeWorkflow.includes(forbidden), `missing forbidden command ${forbidden}`);
  }
  assert.match(activeWorkflow, /stage explicitly named paths only/);
});

test('names a completion oracle no single agent can self-report', () => {
  assert.match(activeWorkflow, /\*\*completion oracle\*\*/);
  assert.match(activeWorkflow, /must not be a per-task check or an agent's own report/);
  assert.match(activeWorkflow, /Completion oracle: `\{command\}`/);
});

test('marks the critical path so execution can schedule it first', () => {
  assert.match(activeWorkflow, /Mark the \*\*critical path\*\*/);
  assert.match(activeWorkflow, /A dependency-correct graph is not automatically a fast graph/);
});

test('requires repository grounding before planning', () => {
  assert.match(content, /### 2\. Inspect the Repository/);
  assert.match(content, /verify referenced paths and components exist/);
  assert.match(content, /flag stale or conflicting architecture/);
  assert.match(content, /distinguish verified facts from assumptions/);
  assert.match(content, /path\/to\/file\.ext/);
});
test('runs specialist subagents only when selected by lens triggers', () => {
  assert.match(activeWorkflow, /## Conditional Specialist Critique/);
  assert.match(activeWorkflow, /Draft the implementation plan before deciding whether specialist critique is needed/);
  assert.match(activeWorkflow, /Read `SUBAGENT_LENSES\.md`/);
  assert.match(activeWorkflow, /select only lenses whose triggers match/i);
  assert.match(activeWorkflow, /Run selected lenses together when possible/);
  assert.match(activeWorkflow, /Include `## Planning Critique` only when lenses ran/);
  assert.doesNotMatch(activeWorkflow, /Spawn four focused subagents in parallel/);
});
test('keeps specialist lenses in a separate conditional catalog', () => {
  assert.match(activeWorkflow, /Trigger specialist critique when at least one applies/);
  assert.match(lenses, /Do not run lenses for small, local, low-risk implementation plans/);
  assert.match(lenses, /Do not spawn every lens/);
  for (const lens of [
    'Testing / Verification',
    'Implementability / Agent Handoff',
    'Data / Migration / Backward Compatibility',
    'Performance / Scale',
    'UX / Accessibility',
    'Operations / Observability',
  ]) {
    assert.ok(lenses.includes(`### ${lens}`), `missing optional lens ${lens}`);
  }

  assert.match(lenses, /the plan has 6\+ implementation tasks/);
  assert.match(lenses, /ready to execute/);
  assert.match(lenses, /revise plan: \{severity\} — \{smallest concrete plan change\}/);
});

test('writes implementation plans to plan-server as single files or bundles', () => {
  assert.match(content, /PLAN_BUNDLES\.md/);
  assert.match(content, /Every plan-server.*mdx/);
  assert.match(content, /new-artifact\.py[\s\S]*--type plans/);
  assert.doesNotMatch(content, /--topic/);
  assert.match(content, /Documents\/plan-server/);
  assert.match(content, /index\.mdx/);
  assert.match(content, /0-foundation\.mdx/);
  assert.match(content, /http:\/\/localhost:3456\/project\/\{project\}\/plan\/\{id\}/);
  assert.match(content, /pbcopy/);
});

test('defines folder bundle splitting rules for large plans', () => {
  assert.match(bundles, /Create a folder bundle when at least one is true/);
  assert.match(bundles, /the plan has 6\+ implementation tasks/);
  assert.match(bundles, /3\+ independently reviewable concerns/);
  assert.match(bundles, /one PR-sized branch/);
  assert.match(bundles, /00-foundation\.mdx/);
  assert.match(bundles, /index\.mdx/);
  assert.match(bundles, /Branch \/ PR Scope/);
  assert.match(bundles, /Dependencies must point backward only/);
  assert.match(bundles, /Every shared-file conflict must appear in the index/);
  assert.match(bundles, /Human owner/);
  assert.match(bundles, /Implementation agent/);
  assert.match(bundles, /Do not teach generic concepts/);
  assert.match(content, /repository-specific changes/);
});

test('keeps human questions conditional instead of mandatory review panels', () => {
  assert.match(activeWorkflow, /Ask or record a question only when its answer materially changes/);
  assert.match(activeWorkflow, /Do not create empty sections/);
  assert.doesNotMatch(activeWorkflow, /Plan Review \(Step 4\)/);
  assert.doesNotMatch(activeWorkflow, /artifact-code-reviewer AND artifact-coverage-reviewer/);
  assert.doesNotMatch(activeWorkflow, /Triage each row/);
});
test('keeps the realistic before-and-after example in a separate file', () => {
  assert.match(content, /Read `EXAMPLE\.md`/);
  assert.doesNotMatch(activeWorkflow, /Billing Retry Implementation Plan/);
  assert.match(example, /# Plan Calibration Example/);
  assert.match(example, /## Weak Plan/);
  assert.match(example, /This is not implementation-ready because it does not identify/);
  assert.match(example, /## Strong Single-File Plan/);
  assert.match(example, /## Dependency and Parallel Execution/);
  assert.match(example, /```mermaid/);
  assert.match(example, /\| Work area \| Responsibility \| Likely paths\/modules \| Depends on \| Can run with \| Verification gate \|/);
  assert.match(example, /### Shared Contracts/);
  assert.match(example, /\*\*Completion oracle:\*\*/);
});

test('calibrates fan-out sections separately from the sequential example', () => {
  assert.match(example, /## Fan-out Calibration/);
  assert.match(example, /correctly omits `## Shared Convention Artifacts` and `## Fleet Rules`/);
  assert.match(example, /### Shared Convention Artifacts/);
  assert.match(example, /### Fan-out \(mechanical\)/);
  assert.match(example, /\*\*Work queue:\*\*/);
  assert.match(example, /## Fleet Rules/);
  assert.match(example, /\*\*Forbidden:\*\*/);
});
