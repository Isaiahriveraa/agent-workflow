import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const workflowExperts = [
  'continuity-manager',
  'workflow-router-auditor',
  'adapter-parity-auditor',
  'eval-engineer',
  'failure-analyst',
  'tooling-integrator',
  'expert-agent-router'
];

test('agent catalog defines workflow expert routing defaults', () => {
  const content = read('contexts/agent-catalog.md');

  assert.match(content, /## Agent Classes/);
  assert.match(content, /## Workflow Experts/);
  assert.match(content, /## Routing Defaults/);
  assert.match(content, /## Constraints/);

  for (const expert of workflowExperts) {
    assert.match(content, new RegExp(`\`${expert.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\``));
  }
});

test('workflow expert agents declare mission trigger scope deliverable and constraints', () => {
  for (const expert of workflowExperts) {
    const content = read(`agents/${expert}.md`);

    assert.match(content, /^---\nname: /);
    assert.match(content, /## Mission/);
    assert.match(content, /## Trigger/);
    assert.match(content, /## Scope/);
    assert.match(content, /## Deliverable/);
    assert.match(content, /## Constraints/);
  }
});

test('expert agent routing rule points to the workflow expert catalog', () => {
  const content = read('rules/common/expert-agent-routing.md');

  assert.match(content, /contexts\/agent-catalog\.md/);
  assert.match(content, /expert-agent-routing-tools\.mjs route/);
  assert.match(content, /stay local/i);
  assert.match(content, /continuity-manager/);
  assert.match(content, /adapter-parity-auditor/);
  assert.match(content, /workflow-router-auditor/);
  assert.match(content, /eval-engineer/);
  assert.match(content, /tooling-integrator/);
  assert.match(content, /expert-agent-router/);
});
