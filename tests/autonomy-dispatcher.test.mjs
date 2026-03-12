import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  AUTONOMY_LATENCY_BUDGETS_MS,
  buildAutonomyDedupeKey,
  normalizeAutonomyEvent,
  normalizeEvalVerdict,
  normalizeLearningRecord,
  normalizeStrategyDecision
} from '../scripts/autonomy-dispatcher-contract.mjs';
import {
  clearAutonomyDedupeRegistry,
  createAutonomyDispatcher
} from '../scripts/autonomy-dispatcher.mjs';
import { getProjectContext } from '../scripts/project-context.mjs';

const createRepo = (baseDir, name) => {
  const repoRoot = path.join(baseDir, name);
  fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
  return repoRoot;
};

test('autonomy event normalization enforces absolute subject paths and required ids', () => {
  const normalized = normalizeAutonomyEvent({
    event: 'lesson_flush',
    provider: 'local',
    sessionId: 'session-1',
    turnId: 'turn-1',
    runtimeMode: 'fire_and_forget',
    subject: {
      type: 'lesson_queue_item',
      path: '/tmp/queue/item.processing'
    },
    metadata: {
      taskClass: 'api-workflow'
    }
  });

  assert.equal(normalized.subject.path, '/tmp/queue/item.processing');
  assert.throws(() => normalizeAutonomyEvent({
    event: 'lesson_flush',
    provider: 'local',
    sessionId: 'session-1',
    turnId: 'turn-1',
    runtimeMode: 'fire_and_forget',
    subject: {
      path: 'relative/path.processing'
    }
  }), /subject\.path must be an absolute path/);
});

test('dedupe key contract requires tool metadata for post_tool events', () => {
  assert.throws(() => buildAutonomyDedupeKey(normalizeAutonomyEvent({
    event: 'post_tool',
    provider: 'claude',
    sessionId: 'session-1',
    turnId: 'turn-1',
    runtimeMode: 'fire_and_forget'
  })), /metadata\.toolId/);

  const key = buildAutonomyDedupeKey(normalizeAutonomyEvent({
    event: 'post_tool',
    provider: 'claude',
    sessionId: 'session-1',
    turnId: 'turn-1',
    runtimeMode: 'fire_and_forget',
    metadata: {
      toolId: 'tool-42'
    }
  }));
  assert.equal(key, 'post_tool:session-1:tool-42');
});

test('dispatcher writes trace, eval, and strategy artifacts and suppresses duplicates', async () => {
  clearAutonomyDedupeRegistry();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-autonomy-dispatcher-'));
  const repoRoot = createRepo(tmpDir, 'dispatcher');
  const projectContext = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });
  const dispatcher = createAutonomyDispatcher({
    handlers: {
      turn_complete: async () => ({
        status: 'processed',
        actionClass: 'inline_safe',
        actions: ['evaluate_trace'],
        warnings: [],
        metrics: { replayed: 1 }
      })
    }
  });

  try {
    const first = await dispatcher.dispatch({
      event: 'turn_complete',
      provider: 'codex',
      sessionId: 'session-1',
      turnId: 'turn-1',
      runtimeMode: 'wrapper_notify',
      metadata: {
        turnIndex: 7
      }
    }, { projectContext });

    assert.equal(first.status, 'processed');
    assert.equal(fs.existsSync(first.tracePath), true);
    assert.equal(fs.existsSync(first.evalPath), true);
    assert.equal(fs.existsSync(first.strategyPath), true);
    assert.equal(first.latency_budget_ms, AUTONOMY_LATENCY_BUDGETS_MS.wrapper_notify);

    const second = await dispatcher.dispatch({
      event: 'turn_complete',
      provider: 'codex',
      sessionId: 'session-1',
      turnId: 'turn-2',
      runtimeMode: 'wrapper_notify',
      metadata: {
        turnIndex: 7
      }
    }, { projectContext });

    assert.equal(second.status, 'duplicate');
    assert.equal(second.duplicate, true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    clearAutonomyDedupeRegistry();
  }
});

test('dispatcher failure stays non-fatal and returns machine-readable verdicts', async () => {
  clearAutonomyDedupeRegistry();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-autonomy-dispatcher-'));
  const repoRoot = createRepo(tmpDir, 'dispatcher-failure');
  const projectContext = getProjectContext({ cwd: repoRoot, projectRoot: repoRoot });
  const dispatcher = createAutonomyDispatcher({
    handlers: {
      memory_health_check: async () => {
        throw new Error('backend offline');
      }
    }
  });

  try {
    const result = await dispatcher.dispatch({
      event: 'memory_health_check',
      provider: 'local',
      sessionId: 'session-1',
      turnId: 'turn-1',
      runtimeMode: 'synchronous_hook'
    }, { projectContext });

    assert.equal(result.status, 'failed');
    assert.equal(result.evalVerdict.blocking, true);
    assert.equal(result.strategyDecision.action, 'request_user_decision');
    assert.match(result.evalVerdict.findings[0], /backend offline/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    clearAutonomyDedupeRegistry();
  }
});

test('eval, strategy, and learning contracts normalize into stable machine-readable shapes', () => {
  const verdict = normalizeEvalVerdict({
    subjectType: 'lesson_flush',
    subjectPath: '/tmp/artifact.json',
    score: 92,
    blocking: false,
    findings: ['memory mirror warning'],
    recommendedNextAction: 'capture_lesson'
  });
  const strategy = normalizeStrategyDecision({
    action: 'capture_lesson',
    rationale: 'Warnings were present.'
  });
  const learningRecord = normalizeLearningRecord({
    failureClass: 'edge-case miss',
    trigger: 'critic rejection',
    evidence: 'A seeded scenario failed.',
    correction: 'Add the missing branch.',
    reuseRule: 'Always test the error path.',
    sourceArtifacts: ['/tmp/source.md']
  });

  assert.equal(verdict.subjectType, 'lesson_flush');
  assert.equal(strategy.action, 'capture_lesson');
  assert.deepEqual(learningRecord.sourceArtifacts, ['/tmp/source.md']);
});
