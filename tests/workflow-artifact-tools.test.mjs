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
- workflow-router-tools.mjs was removed (keyword-based classifier was unreliable).

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

## Original Prompt Alignment
- The user wants deeper planning that ties directly back to the original request instead of a minimum implementation interpretation.

## Research Sufficiency
- The research is sufficient because it identifies the current gating seams, the missing enforcement, and the test surface that must change.

## Phase Plan Index
- Phase 1 detail plan: /tmp/plan-phase-1.md
- Phase 2 detail plan: /tmp/plan-phase-2.md

## Phase 1
- Add parser utilities.

## Phase 2
- Wire command gates and tests.

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

test('workflow artifact grading fails substantial plans that omit critique evidence entirely', () => {
  const critiqueSparsePlan = `---
artifact_type: plan
substantial: true
critique_completed: false
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

# Critique-Sparse Plan

## Implementation Phases
- Phase 1 adds the parser.

## Original Prompt Alignment
- The plan stays aligned with the request.

## Research Sufficiency
- The research is sufficient for implementation.

## Phase Plan Index
- Phase 1 detail plan: /tmp/critique-sparse-phase-1.md

## Phase 1
- Add parser utilities.

## Dependencies and Sequencing
- Parser before command integration.

## Failure Modes and Edge Cases
- Missing frontmatter should fail.

## Automated Verification
- Run parser tests.

## Manual Verification
- Review refusal behavior.

## Rollout and Compatibility
- Preserve the existing workflow shape.

## Blocker Resolution
- No blockers remain.
`;

  const grade = gradePlanArtifact({ content: critiqueSparsePlan });

  assert.equal(grade.passes, false);
  assert.ok(grade.blockers.some((blocker) => /critique evidence/.test(blocker.message)));
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

## Phase Plan Index
- Phase 1 detail plan: /tmp/weak-phase-1.md

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

test('workflow artifact grading fails substantial plans that do not prove prompt alignment, research sufficiency, and child phase coverage', () => {
  const shallowPlan = `---
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

# Shallow Plan

## Implementation Phases
- Phase 1 updates the UI.
- Phase 2 ships the redesign.

## Phase 1
- Do UI updates.

## Phase 2
- Finish redesign.

## Dependencies and Sequencing
- Phase 1 before Phase 2.

## Failure Modes and Edge Cases
- Regressions are possible.

## Automated Verification
- Run tests.

## Manual Verification
- Review UI manually.

## Rollout and Compatibility
- Roll out normally.

## Critique
- The draft needs more depth.

## Blocker Resolution
- No blockers remain.
`;

  const grade = gradePlanArtifact({ content: shallowPlan });

  assert.equal(grade.passes, false);
  assert.ok(grade.blockers.some((blocker) => /Original Prompt Alignment/.test(blocker.message)));
  assert.ok(grade.blockers.some((blocker) => /Research Sufficiency/.test(blocker.message)));
  assert.ok(grade.blockers.some((blocker) => /Phase Plan Index/.test(blocker.message)));
});

test('workflow artifact grading blocks creative plans that omit the required redesign packet', () => {
  const creativePlan = `---
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

# Frontend Redesign Plan

## Original Prompt Alignment
- The user wants a frontend redesign that feels materially different from the current output.

## Research Sufficiency
- The research covers the existing component seams and known weak output patterns.

## Implementation Phases
- Phase 1 sets the design direction.

## Phase Plan Index
- Phase 1 detail plan: /tmp/creative-phase-1.md

## Phase 1
- Redesign the landing page UI.

## Dependencies and Sequencing
- Phase 1 is the only phase.

## Failure Modes and Edge Cases
- Generic output is a failure mode.

## Automated Verification
- Run tests.

## Manual Verification
- Review the redesign.

## Rollout and Compatibility
- Roll out normally.

## Critique
- The draft is visually weak.

## Blocker Resolution
- Planning blockers resolved.
`;

  const grade = gradePlanArtifact({ content: creativePlan });

  assert.equal(grade.passes, false);
  assert.ok(grade.blockers.some((blocker) => /creative packet/.test(blocker.message)));
});

test('workflow artifact grading accepts creative plans only when the packet is substantive', () => {
  const creativePlan = `---
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

# Frontend Redesign Plan

## Original Prompt Alignment
- The user wants a frontend redesign that feels materially different from the current output.

## Research Sufficiency
- The research covers the existing component seams and known weak output patterns.

## Intent
- Rebuild the workflow dashboard so the critique state is obvious at a glance.

## Audience
- Workflow maintainers who need to see readiness, failures, and next actions immediately.

## Visual Direction
- Dense editorial layout with deliberate hierarchy, sharp contrast, and a more assertive information architecture than the current baseline.

## Constraints
- Preserve keyboard reachability, keep the layout responsive, and avoid introducing fragile interactions.

## References
- Existing workflow dashboards, command surfaces, and the current prompt/status presentation.

## Banned Patterns
- Generic SaaS cards, default spacing rhythm, and empty decorative motion.

## Differentiation Target
- The design should feel decisively more editorial and operational than a template status page.

## Required States
- loading
- error
- empty
- long-content
- accessible keyboard and focus states
- responsive mobile and desktop layouts

## Selected Skill
- frontend-design

## Selected Capsule
- creative-redesign

## Implementation Phases
- Phase 1 sets the design direction.

## Phase Plan Index
- Phase 1 detail plan: /tmp/creative-phase-1.md

## Phase 1
- Redesign the landing page UI.

## Dependencies and Sequencing
- Phase 1 is the only phase.

## Failure Modes and Edge Cases
- Generic output is a failure mode.

## Automated Verification
- Run tests.

## Manual Verification
- Review the redesign.

## Rollout and Compatibility
- Roll out normally.

## Critique
- The draft is visually weak.

## Blocker Resolution
- Planning blockers resolved.
`;

  const grade = gradePlanArtifact({ content: creativePlan });

  assert.equal(grade.passes, true);
  assert.equal(grade.blockers.length, 0);
});

test('workflow artifact grading accepts legacy planning structure as a phase plan index alias', () => {
  const legacyParentPlan = `---
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

# Legacy Parent Plan

## Original Prompt Alignment
- The parent plan still targets the original request.

## Research Sufficiency
- The research is sufficient for implementation.

## Implementation Phases
- Phase 1 adds the helper.

## Planning Structure
- Phase 1 detail plan: /tmp/legacy-phase-1.md

## Phase 1: Add the helper
- Add the helper.

## Dependencies and Sequencing
- Phase 1 is the only phase.

## Failure Modes and Edge Cases
- Missing child plans should fail closed.

## Automated Verification
- Run tests.

## Manual Verification
- Review the generated packet.

## Rollout and Compatibility
- Preserve legacy readability during migration.

## Critique
- Legacy plans need compatibility.

## Blocker Resolution
- Compatibility path defined.
`;

  const grade = gradePlanArtifact({ content: legacyParentPlan });

  assert.equal(grade.passes, true);
  assert.ok(grade.blockers.every((blocker) => !/Phase Plan Index/.test(blocker.message)));
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
