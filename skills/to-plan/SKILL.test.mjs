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
  '### Task 1: {Action-Oriented Name}',
  '**Objective:**',
  '**Relevant areas:**',
  '**Changes:**',
  '**Dependencies:**',
  '**Verification:**',
  '**Done when:**',
  '## Execution Map',
  '### Sequential',
  '### Parallelizable',
  '## Testing and Verification',
  '## Risks and Edge Cases',
  '## Definition of Done',
];

test('requires an implementation-ready plan structure', () => {
  for (const section of requiredPlanSections) {
    assert.ok(content.includes(section), `missing ${section}`);
  }
});

test('requires repository grounding before planning', () => {
  assert.match(content, /Step 2: Inspect the Repository/);
  assert.match(content, /locate relevant files, modules, commands, config, tests, and callers/);
  assert.match(content, /distinguish verified facts from assumptions/);
  assert.match(content, /path\/to\/file\.ext:line/);
});

test('runs specialist subagents only when selected by lens triggers', () => {
  assert.match(activeWorkflow, /Step 7: Conditional Specialist Subagent Pass/);
  assert.match(activeWorkflow, /Do not spawn critique subagents by default/);
  assert.match(activeWorkflow, /Read `SUBAGENT_LENSES\.md`/);
  assert.match(activeWorkflow, /select only lenses whose triggers match/);
  assert.match(activeWorkflow, /Run selected lenses in one batch when possible/);
  assert.match(activeWorkflow, /When no specialist lens runs, omit `## Planning Critique`/);
  assert.doesNotMatch(activeWorkflow, /Spawn four focused subagents in parallel/);
});

test('keeps specialist lenses in a separate conditional catalog', () => {
  assert.match(activeWorkflow, /SUBAGENT_LENSES\.md/);
  assert.match(activeWorkflow, /Skip subagents when the plan is small, local, low-risk/);
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
  assert.match(content, /Single-file plan/);
  assert.match(content, /Folder bundle/);
  assert.match(content, /Use `\.mdx` for plan-server compatibility/);
  assert.match(content, /new-artifact\.py[\s\S]*--type plans/);
  assert.doesNotMatch(content, /--topic/);
  assert.match(content, /~\/Documents\/plan-server\/projects\/\{project\}\/plans\/\{id\}\//);
  assert.match(content, /index\.mdx/);
  assert.match(content, /00-foundation\.mdx/);
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
  assert.match(bundles, /Grill Prompts/);
  assert.match(content, /balances human and agent needs/);
  assert.match(content, /enough rationale for a human to explain the architecture/);
});

test('keeps human questions conditional instead of mandatory review panels', () => {
  assert.match(activeWorkflow, /Ask for input only when one of these is true/);
  assert.match(activeWorkflow, /Omit `## Open Questions` entirely when no implementation-changing questions remain/);
  assert.doesNotMatch(activeWorkflow, /Plan Review \(Step 4\)/);
  assert.doesNotMatch(activeWorkflow, /artifact-code-reviewer AND artifact-coverage-reviewer/);
  assert.doesNotMatch(activeWorkflow, /Triage each row/);
});

test('keeps the realistic before-and-after example in a separate file', () => {
  assert.match(content, /Read `EXAMPLE\.md`/);
  assert.doesNotMatch(activeWorkflow, /Billing Retry Implementation Plan/);
  assert.match(example, /# To-Plan Example Case/);
  assert.match(example, /## Messy user request/);
  assert.match(example, /## Old style of output/);
  assert.match(example, /Why weak:/);
  assert.match(example, /## Improved implementation-ready plan/);
});
