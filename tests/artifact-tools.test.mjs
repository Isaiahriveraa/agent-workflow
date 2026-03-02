import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

const root = '/Users/isaiahrivera/.agents';
const read = (relativePath) => fs.readFileSync(`${root}/${relativePath}`, 'utf8');

test('artifact retrieval context exists with required sections', () => {
  const content = read('contexts/artifacts.md');
  assert.match(content, /## Sources/);
  assert.match(content, /## Preferred Retrieval Order/);
});

test('artifact suggestion returns known categories', () => {
  const output = execFileSync('node', ['scripts/artifact-tools.mjs', 'suggest'], {
    cwd: root,
    encoding: 'utf8'
  });
  const parsed = JSON.parse(output);

  assert.ok(Object.hasOwn(parsed, 'plan'));
  assert.ok(Object.hasOwn(parsed, 'research'));
  assert.ok(Object.hasOwn(parsed, 'session'));
  assert.ok(Object.hasOwn(parsed, 'handoff'));
  assert.ok(Object.hasOwn(parsed, 'active'));
  assert.ok(Object.hasOwn(parsed, 'suggested'));
});

test('artifact related command returns latest matching markdown artifacts', () => {
  const output = execFileSync('node', ['scripts/artifact-tools.mjs', 'related'], {
    cwd: root,
    encoding: 'utf8'
  });
  const parsed = JSON.parse(output);

  assert.match(parsed.plans ?? '', /thoughts\/plans\//);
  assert.match(parsed.research ?? '', /thoughts\/research\//);
  assert.match(parsed.handoffs ?? '', /thoughts\/handoffs\//);
});

test('artifact state exposes an active working set section', () => {
  const content = read('contexts/state.md');
  assert.match(content, /## Active Artifact Working Set/);
  assert.match(content, /### Selected By Category/);
  assert.match(content, /### Ordered Artifacts/);
});

test('artifact persistence writes and reads the active working set', () => {
  const originalState = read('contexts/state.md');
  const planPath = `${root}/thoughts/plans/2026-02-24-interfaceview-border-fix.md`;
  const researchPath = `${root}/thoughts/research/2026-02-26-interface-trigger-recording-flow.md`;
  const handoffPath = `${root}/thoughts/handoffs/general/2026-02-17_13-28-30_rpi-workflow-integration.md`;

  try {
    const output = execFileSync('node', [
      'scripts/artifact-tools.mjs',
      'persist',
      '--plan',
      planPath,
      '--research',
      researchPath,
      '--handoff',
      handoffPath,
      '--source',
      'test-suite',
      '--focus',
      'artifact continuity'
    ], {
      cwd: root,
      encoding: 'utf8'
    });

    const persisted = JSON.parse(output);
    assert.equal(persisted.source, 'test-suite');
    assert.equal(persisted.focus, 'artifact continuity');
    assert.equal(persisted.selected.plan, planPath);
    assert.equal(persisted.selected.research, researchPath);
    assert.equal(persisted.selected.handoff, handoffPath);
    assert.ok(Array.isArray(persisted.ordered));
    assert.ok(persisted.ordered.includes(planPath));

    const active = JSON.parse(execFileSync('node', ['scripts/artifact-tools.mjs', 'active'], {
      cwd: root,
      encoding: 'utf8'
    }));

    assert.equal(active.source, 'test-suite');
    assert.equal(active.focus, 'artifact continuity');
    assert.equal(active.selected.plan, planPath);

    const stateContent = read('contexts/state.md');
    assert.match(stateContent, /- Source: test-suite/);
    assert.match(stateContent, /- Focus: artifact continuity/);
    assert.match(stateContent, new RegExp(`- plan: ${planPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.writeFileSync(`${root}/contexts/state.md`, originalState);
  }
});

test('artifact tools reject duplicate working set sections in state', () => {
  const originalState = read('contexts/state.md');
  const duplicatedState = `${originalState.trimEnd()}\n\n## Active Artifact Working Set\n- Last updated: none\n- Source: none\n- Focus: none\n\n### Selected By Category\n- plan: none\n- research: none\n- session: none\n- handoff: none\n\n### Ordered Artifacts\n1. none\n`;

  try {
    fs.writeFileSync(`${root}/contexts/state.md`, duplicatedState);

    const result = spawnSync('node', ['scripts/artifact-tools.mjs', 'active'], {
      cwd: root,
      encoding: 'utf8'
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Duplicate "## Active Artifact Working Set" sections found in contexts\/state\.md/);
  } finally {
    fs.writeFileSync(`${root}/contexts/state.md`, originalState);
  }
});
