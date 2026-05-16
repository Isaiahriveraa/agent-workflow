import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { buildMemorySyncStatus } from '../scripts/memory-sync-bridge.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);

test('shared memory-sync status exposes preferred and compatibility commands', () => {
  const status = buildMemorySyncStatus();

  assert.equal(status.bridge, 'memory-sync');
  assert.equal(status.diagnostics.contract_version, 'memory-sync-bridge.v1');
  assert.deepEqual(status.diagnostics.explicit_parity_operations, ['status', 'recall', 'flush']);
  assert.ok(status.projectRoot);
  assert.ok(status.projectSlug);
  assert.ok(status.continuity.statePath.endsWith(path.join('.omx', 'state', 'contexts', 'state.md')));
  assert.deepEqual(status.recommendedCommands.preferred, [
    'node ~/.agents/scripts/memory-sync-bridge.mjs status',
    'node ~/.agents/scripts/memory-sync-bridge.mjs recall --workflow-stage create-plan',
    'node ~/.agents/scripts/memory-sync-bridge.mjs recall --workflow-stage implement-plan',
    'node ~/.agents/scripts/memory-sync-bridge.mjs flush'
  ]);
  assert.deepEqual(status.recommendedCommands.compatibility, [
    'node ~/.agents/scripts/codex-memory-bridge.mjs status',
    'node ~/.agents/scripts/codex-memory-bridge.mjs recall --workflow-stage create-plan',
    'node ~/.agents/scripts/codex-memory-bridge.mjs recall --workflow-stage implement-plan',
    'node ~/.agents/scripts/codex-memory-bridge.mjs flush'
  ]);
});

test('codex memory bridge wrapper forwards to the shared bridge', () => {
  const shared = spawnSync('node', ['./scripts/memory-sync-bridge.mjs', 'status'], {
    cwd: root,
    encoding: 'utf8'
  });
  const codex = spawnSync('node', ['./scripts/codex-memory-bridge.mjs', 'status'], {
    cwd: root,
    encoding: 'utf8'
  });

  assert.equal(shared.status, 0, shared.stderr);
  assert.equal(codex.status, 0, codex.stderr);
  assert.deepEqual(JSON.parse(codex.stdout), JSON.parse(shared.stdout));
});

test('codex memory bridge wrapper forwards recall to the shared bridge', () => {
  const shared = spawnSync('node', ['./scripts/memory-sync-bridge.mjs', 'recall', '--workflow-stage', 'implement-plan'], {
    cwd: root,
    encoding: 'utf8'
  });
  const codex = spawnSync('node', ['./scripts/codex-memory-bridge.mjs', 'recall', '--workflow-stage', 'implement-plan'], {
    cwd: root,
    encoding: 'utf8'
  });

  assert.equal(shared.status, 0, shared.stderr);
  assert.equal(codex.status, 0, codex.stderr);
  assert.deepEqual(JSON.parse(codex.stdout), JSON.parse(shared.stdout));
});

test('memory-sync bridge recall and flush expose bounded machine-readable diagnostics', () => {
  const recall = spawnSync('node', ['./scripts/memory-sync-bridge.mjs', 'recall', '--workflow-stage', 'create-plan'], {
    cwd: root,
    encoding: 'utf8'
  });
  const flush = spawnSync('node', ['./scripts/memory-sync-bridge.mjs', 'flush'], {
    cwd: root,
    encoding: 'utf8'
  });

  assert.equal(recall.status, 0, recall.stderr);
  assert.equal(flush.status, 0, flush.stderr);

  const recallPayload = JSON.parse(recall.stdout);
  const flushPayload = JSON.parse(flush.stdout);

  assert.equal(recallPayload.diagnostics.contract_version, 'memory-sync-bridge.v1');
  assert.equal(recallPayload.diagnostics.operation, 'recall');
  assert.equal(recallPayload.diagnostics.workflow_stage, 'create-plan');
  assert.equal(flushPayload.diagnostics.contract_version, 'memory-sync-bridge.v1');
  assert.equal(flushPayload.diagnostics.operation, 'flush');
});
