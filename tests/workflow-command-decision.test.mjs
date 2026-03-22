import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { gradeResearchArtifact } from '../scripts/workflow-artifact-tools.mjs';
import {
  deriveWorkflowCommandDecision,
  evaluateWorkflowCommandDecision
} from '../scripts/workflow-command-decision.mjs';
import { getProjectContext } from '../scripts/project-context.mjs';

const fixtureRoot = path.resolve(new URL('./fixtures/workflow-command-decisions', import.meta.url).pathname);

const readFixture = (name) =>
  JSON.parse(fs.readFileSync(path.join(fixtureRoot, name), 'utf8'));

test('fixture corpus covers the expected non-continue workflow command actions', () => {
  const cases = [
    ['create-plan-weak-research.json', 'do_more_research'],
    ['implement-plan-malformed-plan.json', 'replan'],
    ['implement-plan-verification-failure.json', 'capture_lesson'],
    ['validate-plan-missing-manual-verification.json', 'request_user_decision']
  ];

  for (const [fixtureName, expectedAction] of cases) {
    const payload = readFixture(fixtureName);
    const result = deriveWorkflowCommandDecision(payload);
    assert.equal(result.strategyDecision.action, expectedAction, fixtureName);
  }
});

test('disabled advisory memory remains a successful non-blocking implementation input', () => {
  const payload = readFixture('create-plan-weak-research.json');
  const result = deriveWorkflowCommandDecision(payload);

  assert.equal(result.memoryRecall.status, 'disabled');
  assert.equal(result.strategyDecision.action, 'do_more_research');
  assert.ok(result.evalVerdict.findings.includes('memory_recall:disabled'));
});

test('parser-backed weak research artifacts recommend more research instead of continue', () => {
  const weakResearch = `---
artifact_type: research
substantial: true
critique_completed: true
critique_cycles: 1
refinement_cycles: 1
critique_artifacts: ["/tmp/research-critique.md"]
blocking_unknown_count: 0
evidence_level: weak
research_ready_for_planning: false
related_intake: /tmp/intake.md
last_validated: 2026-03-12T18:10:00.000Z
---

# Weak Research

## Findings
- Evidence is shallow.

## Implementation Implications
- More codebase analysis is needed.

## Interfaces and Contracts
- No contract is ready yet.

## Verification Implications
- Verification is not grounded yet.

## Critique
- The draft is not ready.

## Blocker Resolution
- Remaining uncertainty is documented.
`;

  const researchGrade = gradeResearchArtifact({ content: weakResearch });
  const result = deriveWorkflowCommandDecision({
    workflowStage: 'create-plan',
    commandName: 'create-plan',
    artifactGrades: { research: researchGrade },
    routerScore: {
      passes: true,
      total: 74,
      clarity: 18,
      codebaseCoverage: 17
    },
    memoryRecallAttempt: {
      attempted: true,
      enabled: false,
      source: 'mem0',
      items: [],
      warnings: []
    },
    verificationSummary: {}
  });

  assert.equal(researchGrade.passes, false);
  assert.equal(result.strategyDecision.action, 'do_more_research');
});

test('helper routes through autonomy dispatcher and emits machine-readable artifacts', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-command-decision-'));
  const repoRoot = path.join(tmpDir, 'repo');
  fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
  const projectContext = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });

  try {
    const result = await evaluateWorkflowCommandDecision({
      ...readFixture('implement-plan-verification-failure.json'),
      sessionId: 'session-1',
      turnId: 'turn-1',
      turnIndex: 7
    }, { projectContext });

    assert.equal(result.status, 'processed');
    assert.equal(result.strategyDecision.action, 'capture_lesson');
    assert.equal(fs.existsSync(result.tracePath), true);
    assert.equal(fs.existsSync(result.evalPath), true);
    assert.equal(fs.existsSync(result.strategyPath), true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
