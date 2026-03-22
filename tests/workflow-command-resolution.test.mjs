import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import {
  normalizeWorkflowCommandName,
  resolveWorkflowCommand
} from '../scripts/workflow-command-resolution.mjs';

test('normalizes underscore and hyphen workflow command aliases to canonical command files', () => {
  const root = path.resolve(new URL('..', import.meta.url).pathname);
  const cases = [
    ['/implement-plan /tmp/plan.md', 'implement_plan', path.join(root, 'commands/implement_plan.md')],
    ['/implement_plan /tmp/plan.md', 'implement_plan', path.join(root, 'commands/implement_plan.md')],
    ['/research-codebase topic', 'research_codebase', path.join(root, 'commands/research_codebase.md')],
    ['/research_codebase topic', 'research_codebase', path.join(root, 'commands/research_codebase.md')],
    ['/resume-handoff /tmp/handoff.md', 'resume-handoff', path.join(root, 'commands/resume-handoff.md')],
    ['/resume_handoff /tmp/handoff.md', 'resume-handoff', path.join(root, 'commands/resume-handoff.md')]
  ];

  for (const [input, expectedName, expectedPath] of cases) {
    const resolved = resolveWorkflowCommand(input);
    assert.equal(normalizeWorkflowCommandName(input), expectedName);
    assert.equal(resolved.commandPath, expectedPath);
    assert.equal(resolved.diagnostics.contract_version, 'workflow-command-resolution.v1');
    assert.equal(resolved.diagnostics.requested, input);
  }
});

test('keeps gsd namespace routing stable across supported invocation forms', () => {
  const root = path.resolve(new URL('..', import.meta.url).pathname);
  const cases = [
    ['/gsd:help', 'gsd:help', path.join(root, 'commands/gsd/help.md')],
    ['gsd help', 'gsd:help', path.join(root, 'commands/gsd/help.md')],
    ['gsd-help', 'gsd:help', path.join(root, 'commands/gsd/help.md')],
    ['/gsd:memory-sync status', 'gsd:memory-sync', path.join(root, 'commands/gsd/memory-sync.md')]
  ];

  for (const [input, expectedName, expectedPath] of cases) {
    const resolved = resolveWorkflowCommand(input);
    assert.equal(normalizeWorkflowCommandName(input), expectedName);
    assert.equal(resolved.commandPath, expectedPath);
  }
});

test('command resolution diagnostics report when alias normalization changed the canonical command', () => {
  const resolved = resolveWorkflowCommand('/implement-plan /tmp/plan.md');

  assert.equal(resolved.diagnostics.alias_applied, true);
  assert.equal(resolved.diagnostics.canonical_changed, true);
  assert.equal(resolved.canonicalSlug, 'implement_plan');
});
