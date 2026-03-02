import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const readJson = (relativePath) => JSON.parse(read(relativePath));

test('AGENTS declares contexts, rules, and adapters as canonical layers', () => {
  const content = read('AGENTS.md');
  assert.match(content, /Contexts:/);
  assert.match(content, /Rules:/);
  assert.match(content, /Adapters:/);
});

test('system prompt documents context discipline and ui routing', () => {
  const content = read('prompts/system.md');
  assert.match(content, /## Canonical Workflow Layers/);
  assert.match(content, /## Context Discipline/);
  assert.match(content, /## UI\/UX Routing/);
  assert.match(content, /## Tooling Automation/);
  assert.match(content, /## Verification Automation/);
  assert.match(content, /## Artifact Retrieval/);
});

test('workflow state includes artifact working set headings', () => {
  const content = read('contexts/state.md');
  assert.match(content, /## Active Artifact Working Set/);
  assert.match(content, /### Selected By Category/);
  assert.match(content, /### Ordered Artifacts/);
});

test('workflow commands reference explicit context files', () => {
  const createPlan = read('commands/create-plan.md');
  const implementPlan = read('commands/implement_plan.md');
  const validatePlan = read('commands/validate_plan.md');
  const research = read('commands/research_codebase.md');
  const sessionStart = read('commands/session-start.md');
  const pauseSession = read('commands/pause-session.md');
  const resumeSession = read('commands/resume-session.md');
  const projectTooling = read('commands/project-tooling.md');
  const projectVerification = read('commands/project-verification.md');
  const projectArtifacts = read('commands/project-artifacts.md');

  assert.match(createPlan, /contexts\/decisions\.md/);
  assert.match(createPlan, /contexts\/research-index\.md/);
  assert.match(createPlan, /contexts\/state\.md/);
  assert.match(implementPlan, /contexts\/state\.md/);
  assert.match(implementPlan, /contexts\/decisions\.md/);
  assert.match(validatePlan, /contexts\/state\.md/);
  assert.match(research, /contexts\/research-index\.md/);
  assert.match(sessionStart, /contexts\/session-index\.md/);
  assert.match(pauseSession, /contexts\/session-index\.md/);
  assert.match(resumeSession, /contexts\/session-index\.md/);
  assert.match(projectTooling, /contexts\/tooling\.md/);
  assert.match(projectVerification, /contexts\/verification\.md/);
  assert.match(projectArtifacts, /contexts\/artifacts\.md/);
});

test('manifest points Codex CLI at the shared AGENTS contract', () => {
  const manifest = readJson('manifest.json');
  const codexLink = manifest.symlinks.find((entry) => entry.tool === 'codex-cli');

  assert.ok(codexLink);
  assert.equal(codexLink.source, '~/.codex/AGENTS.md');
  assert.equal(codexLink.target, '~/.agents/AGENTS.md');
});
