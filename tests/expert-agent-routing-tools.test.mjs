import test from 'node:test';
import assert from 'node:assert/strict';
import { routeTask } from '../scripts/expert-agent-routing-tools.mjs';

test('routes continuity tasks to the continuity manager', () => {
  const routed = routeTask('Investigate resume-handoff drift and repair the session working set.');

  assert.equal(routed.route, 'continuity-manager');
  assert.deepEqual(routed.categories, ['continuity']);
  assert.equal(routed.stayLocal, false);
});

test('routes parity tasks to the adapter parity auditor', () => {
  const routed = routeTask('Audit Codex CLI and OpenCode capability parity against the manifest contract.');

  assert.equal(routed.route, 'adapter-parity-auditor');
  assert.deepEqual(routed.categories, ['parity']);
});

test('routes workflow gate tasks to the workflow router auditor', () => {
  const routed = routeTask('Check whether this substantial task skipped prompt optimization, readiness, and create-plan before coding.');

  assert.equal(routed.route, 'workflow-router-auditor');
  assert.deepEqual(routed.categories, ['workflow_gating']);
});

test('routes eval tasks to the eval engineer', () => {
  const routed = routeTask('Design regression scenarios and workflow eval coverage for resume-session and resume-handoff.');

  assert.equal(routed.route, 'eval-engineer');
  assert.deepEqual(routed.categories, ['continuity', 'eval']);
});

test('routes tooling tasks to the tooling integrator', () => {
  const routed = routeTask('Clarify MCP, approvals, and sandbox boundaries for helper-script integration.');

  assert.equal(routed.route, 'tooling-integrator');
  assert.deepEqual(routed.categories, ['tooling']);
});

test('routes mixed workflow-system tasks through the expert agent router', () => {
  const routed = routeTask('Handle continuity drift, adapter parity gaps, and eval coverage together.');

  assert.equal(routed.route, 'expert-agent-router');
  assert.deepEqual(routed.categories, ['continuity', 'parity', 'eval']);
  assert.equal(routed.stayLocal, false);
});

test('stays local for narrow non-workflow requests', () => {
  const routed = routeTask('Make a small single-file wording fix in the README.');

  assert.equal(routed.route, 'stay-local');
  assert.equal(routed.stayLocal, true);
});
