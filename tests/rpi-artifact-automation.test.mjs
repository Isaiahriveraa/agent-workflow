import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { scanProjectArtifacts } from '../scripts/rpi-artifact-automation.mjs';

const createTempProject = () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-rpi-automation-'));
  const projectRoot = path.join(tmpDir, 'project');
  fs.mkdirSync(path.join(projectRoot, 'thoughts', 'research'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, 'thoughts', 'plans'), { recursive: true });
  return { tmpDir, projectRoot };
};

test('artifact automation triggers a critic for changed substantial research artifacts', () => {
  const { tmpDir, projectRoot } = createTempProject();
  const logPath = path.join(tmpDir, 'critic-log.jsonl');
  const artifactPath = path.join(projectRoot, 'thoughts', 'research', '2026-04-03-rpi.md');

  try {
    fs.writeFileSync(artifactPath, `---
artifact_type: research
substantial: true
critique_completed: false
critique_cycles: 0
refinement_cycles: 0
blocking_unknown_count: 0
evidence_level: moderate
research_ready_for_planning: false
related_intake: /tmp/intake.md
last_validated: 2026-04-03T00:00:00.000Z
---

# Research

## Findings
- Current evidence exists.

## Implementation Implications
- A plan should not start until critique runs.

## Interfaces and Contracts
- No interface changes yet.

## Verification Implications
- Grade the artifact after critique.
`);

    process.env.AGENTS_RPI_CRITIC_LOG = logPath;
    process.env.AGENTS_ROOT = '/Users/isaiahrivera/.agents';

    const result = scanProjectArtifacts({ projectRoot, cooldownMs: 0 });
    const entries = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));

    assert.equal(result.triggeredCount, 1);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].artifactPath, artifactPath);
    assert.equal(entries[0].projectRoot, projectRoot);
  } finally {
    delete process.env.AGENTS_RPI_CRITIC_LOG;
    delete process.env.AGENTS_ROOT;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('artifact automation does not retrigger unchanged artifacts', () => {
  const { tmpDir, projectRoot } = createTempProject();
  const logPath = path.join(tmpDir, 'critic-log.jsonl');
  const artifactPath = path.join(projectRoot, 'thoughts', 'plans', '2026-04-03-rpi-plan.md');

  try {
    fs.writeFileSync(artifactPath, `---
artifact_type: plan
substantial: true
critique_completed: false
critique_cycles: 0
refinement_cycles: 0
blocking_unknown_count: 0
dependency_map_present: true
verification_defined: true
rollout_defined: true
plan_ready_for_implementation: false
related_research: /tmp/research.md
last_validated: 2026-04-03T00:00:00.000Z
---

# Plan

## Implementation Phases
- Phase 1

## Dependencies and Sequencing
- Phase 1 first.

## Failure Modes and Edge Cases
- Missing critique should block readiness.

## Automated Verification
- Run tests.

## Manual Verification
- Review the output.
`);

    process.env.AGENTS_RPI_CRITIC_LOG = logPath;
    process.env.AGENTS_ROOT = '/Users/isaiahrivera/.agents';

    const first = scanProjectArtifacts({ projectRoot, cooldownMs: 0 });
    const second = scanProjectArtifacts({ projectRoot, cooldownMs: 0 });
    const entries = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean);

    assert.equal(first.triggeredCount, 1);
    assert.equal(second.triggeredCount, 0);
    assert.equal(entries.length, 1);
  } finally {
    delete process.env.AGENTS_RPI_CRITIC_LOG;
    delete process.env.AGENTS_ROOT;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
