import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { gradePlanArtifact } from '../scripts/workflow-artifact-tools.mjs';
import { syncChildPlans } from '../scripts/workflow-plan-tools.mjs';

const makeParentPlan = (dir) => path.join(dir, '2026-03-13-child-plan-sync.md');

const parentPlanTemplate = `---
artifact_type: plan
substantial: true
critique_completed: true
critique_cycles: 1
refinement_cycles: 1
critique_artifacts: ["/tmp/plan-critique.md"]
blocking_unknown_count: 0
dependency_map_present: true
verification_defined: true
rollout_defined: true
plan_ready_for_implementation: true
related_research: /tmp/research.md
last_validated: 2026-03-13T12:00:00.000Z
---

# Parent Plan

## Original Prompt Alignment
- The user wants a substantial workflow plan that is implementation-ready phase by phase.

## Research Sufficiency
- The research identifies the workflow seams, grading constraints, and implementation entry rules that the plan must satisfy.

## Implementation Phases
- Phase 1 creates the helper-backed child plan sync.
- Phase 2 wires the command contract and verification.

## Dependencies and Sequencing
- Phase 1 must land before the command docs and tests can depend on the helper.

## Failure Modes and Edge Cases
- Shallow child plans would cause implementation entry to fail.
- Legacy parent plans should remain gradeable during migration.

## Automated Verification
- Run node tests for workflow helpers and contracts.
- Run \`node ./scripts/validate-ssot.mjs\`.

## Manual Verification
- Confirm the generated parent packet includes absolute child-plan paths.

## Rollout and Compatibility
- Keep legacy multi-file parent plans readable while the canonical heading becomes \`Phase Plan Index\`.

## Critique
- Earlier drafts only enforced child plans without generating them.

## Blocker Resolution
- The plan now includes a helper-backed generation path.

## Phase 1: Add helper-backed child plan sync

Goal: create the helper that parses explicit parent phases, rewrites the phase index, and emits deterministic sibling child plans.

- Add \`scripts/workflow-plan-tools.mjs\`.
- Emit implementation-ready child plans with Summary, Surgical Changes, Tests, and Assumptions.
- Keep naming deterministic with sibling \`-phase-N.md\` files.

## Phase 2: Wire command and tests

Goal: require the helper-backed packet before critique and parser-backed plan readiness.

- Update \`commands/create-plan.md\` to run the helper before critique.
- Extend verification so SSOT and workflow tests cover the helper reference.
`;

test('sync-child-plans creates deterministic child plans and a canonical phase index that passes grading', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-plan-tools-'));
  const parentPath = makeParentPlan(tempDir);
  fs.writeFileSync(parentPath, parentPlanTemplate);

  try {
    const result = syncChildPlans({ parentPath });
    assert.equal(result.childPlans.length, 2);

    const parentContent = fs.readFileSync(parentPath, 'utf8');
    assert.match(parentContent, /## Phase Plan Index/);
    assert.match(parentContent, new RegExp(result.childPlans[0].filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(parentContent, new RegExp(result.childPlans[1].filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    for (const childPlan of result.childPlans) {
      const childContent = fs.readFileSync(childPlan.filePath, 'utf8');
      assert.match(childContent, /## Summary/);
      assert.match(childContent, /## Surgical Changes/);
      assert.match(childContent, /## Tests/);
      assert.match(childContent, /## Assumptions/);
      assert.match(childContent, new RegExp(`parent_plan: ${parentPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    }

    const grade = gradePlanArtifact({
      filePath: parentPath,
      content: parentContent
    });

    assert.equal(grade.passes, true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('sync-child-plans is idempotent and removes managed stale child plans', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-plan-tools-'));
  const parentPath = makeParentPlan(tempDir);
  fs.writeFileSync(parentPath, parentPlanTemplate);

  try {
    syncChildPlans({ parentPath });
    const staleChildPath = parentPath.replace(/\.md$/, '-phase-3.md');
    fs.writeFileSync(staleChildPath, `---
artifact_type: plan
substantial: true
parent_plan: ${parentPath}
phase: 3
---

# Phase 3 Plan: Stale

## Summary

Stale.

## Surgical Changes

- Stale.

## Tests

- Stale.

## Assumptions

- Stale.
`);

    const before = fs.readFileSync(parentPath, 'utf8');
    const rerun = syncChildPlans({ parentPath });
    const after = fs.readFileSync(parentPath, 'utf8');

    assert.equal(rerun.childPlans.length, 2);
    assert.equal(after, before);
    assert.equal(fs.existsSync(staleChildPath), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
