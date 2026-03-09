import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  parseWorkflowArtifact,
  validateWorkflowArtifact,
  gradeResearchArtifact,
  gradePlanArtifact
} from '../scripts/workflow-artifact-tools.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);

const validResearchArtifact = `---
artifact_type: research
substantial: true
critique_completed: true
critique_cycles: 1
refinement_cycles: 1
critique_artifacts: ["/tmp/research-critique.md"]
blocking_unknown_count: 0
evidence_level: strong
research_ready_for_planning: true
related_intake: /tmp/intake.md
last_validated: 2026-03-09T04:00:00.000Z
---

# Research Artifact

## Findings
- Existing workflow routing is shallow.

## Implementation Implications
- We need parser-backed readiness checks before commands hand off.

## Interfaces and Contracts
- workflow-router-tools.mjs remains intake-focused.

## Verification Implications
- Add contract tests and parser unit tests.

## Critique
- Initial draft missed fail-closed enforcement.

## Blocker Resolution
- Resolved the remaining unknown by defining canonical blocker classes.
`;

const validPlanArtifact = `---
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
last_validated: 2026-03-09T04:05:00.000Z
---

# Plan Artifact

## Implementation Phases
- Phase 1 introduces the parser.
- Phase 2 wires command gates.

## Phase 1
- Add parser utilities.

## Dependencies and Sequencing
- Phase 1 must land before command docs can depend on it.

## Failure Modes and Edge Cases
- Reject missing frontmatter and spoofed readiness metadata.

## Automated Verification
- Run node tests for parser and workflow contracts.

## Manual Verification
- Review refusal messaging on malformed substantial plans.

## Rollout and Compatibility
- Start with soft warnings before hard gating legacy artifacts.

## Critique
- Earlier draft forgot rollout behavior.

## Blocker Resolution
- Removed unknowns by defining the initial schema contract.
`;

test('workflow artifact parser reads frontmatter and sections for research artifacts', () => {
  const parsed = parseWorkflowArtifact({ content: validResearchArtifact });

  assert.equal(parsed.artifactType, 'research');
  assert.equal(parsed.frontmatter.substantial, true);
  assert.equal(parsed.frontmatter.refinement_cycles, 1);
  assert.deepEqual(parsed.frontmatter.critique_artifacts, ['/tmp/research-critique.md']);
  assert.ok(parsed.headings.includes('Findings'));
  assert.ok(parsed.sections.has('Verification Implications'));
});

test('workflow artifact validator accepts a complete plan artifact', () => {
  const validation = validateWorkflowArtifact({ content: validPlanArtifact });

  assert.equal(validation.ok, true);
  assert.equal(validation.artifactType, 'plan');
  assert.deepEqual(validation.issues, []);
});

test('workflow artifact grader passes valid research and plan artifacts', () => {
  const researchGrade = gradeResearchArtifact({ content: validResearchArtifact });
  const planGrade = gradePlanArtifact({ content: validPlanArtifact });

  assert.equal(researchGrade.passes, true);
  assert.equal(researchGrade.blockers.length, 0);
  assert.equal(researchGrade.nextAction, 'create-plan');
  assert.equal(planGrade.passes, true);
  assert.equal(planGrade.blockers.length, 0);
  assert.equal(planGrade.nextAction, 'implement-plan');
  assert.equal(planGrade.needsThirdPass, false);
});

test('workflow artifact validation fails closed when frontmatter is missing', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-artifact-'));
  const filePath = path.join(tmpDir, 'missing-frontmatter.md');
  fs.writeFileSync(filePath, '# Missing frontmatter\n');

  try {
    const result = spawnSync('node', ['scripts/workflow-artifact-tools.mjs', 'validate', '--file', filePath], {
      cwd: root,
      encoding: 'utf8'
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Missing frontmatter block/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('workflow artifact grading fails closed when readiness is claimed without supporting sections', () => {
  const invalidPlan = `---
artifact_type: plan
substantial: true
critique_completed: true
critique_cycles: 1
refinement_cycles: 1
blocking_unknown_count: 0
dependency_map_present: true
verification_defined: true
rollout_defined: true
plan_ready_for_implementation: true
related_research: /tmp/research.md
last_validated: 2026-03-09T04:05:00.000Z
---

# Weak Plan

## Implementation Phases
- Parser first, then command updates.

## Phase 1
- Add parser.

## Dependencies and Sequencing
- Parser before command integration.

## Failure Modes and Edge Cases
- Missing frontmatter should fail.

## Automated Verification
- Run parser tests.

## Manual Verification
- Review refusal behavior.
`;

  const grade = gradePlanArtifact({ content: invalidPlan });

  assert.equal(grade.passes, false);
  assert.ok(grade.blockers.some((blocker) => blocker.class === 'decision_missing'));
  assert.ok(grade.blockers.some((blocker) => blocker.class === 'blocking_unknown'));
  assert.ok(grade.blockers.some((blocker) => blocker.class === 'rollout_unspecified'));
  assert.equal(grade.requiresAnotherPass, true);
  assert.equal(grade.needsThirdPass, true);
});

test('workflow artifact grading fails research readiness when evidence is weak', () => {
  const weakResearch = validResearchArtifact.replace('evidence_level: strong', 'evidence_level: weak');

  const grade = gradeResearchArtifact({ content: weakResearch });

  assert.equal(grade.passes, false);
  assert.ok(grade.blockers.some((blocker) => blocker.class === 'evidence_weak'));
  assert.equal(grade.requiresAnotherPass, true);
});

test('workflow artifact grading fails plan readiness when dependency modeling is missing', () => {
  const weakPlan = validPlanArtifact
    .replace('dependency_map_present: true', 'dependency_map_present: false')
    .replace('## Dependencies and Sequencing\n- Phase 1 must land before command docs can depend on it.\n\n', '');

  const grade = gradePlanArtifact({ content: weakPlan });

  assert.equal(grade.passes, false);
  assert.ok(grade.blockers.some((blocker) => blocker.class === 'dependency_unmodeled'));
});

test('workflow artifact grading does not require a third pass when the first refinement clears blockers', () => {
  const grade = gradeResearchArtifact({ content: validResearchArtifact });

  assert.equal(grade.requiresAnotherPass, false);
  assert.equal(grade.needsThirdPass, false);
});
