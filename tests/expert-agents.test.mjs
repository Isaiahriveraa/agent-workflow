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
  'tooling-integrator',
  'expert-agent-router'
];

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
