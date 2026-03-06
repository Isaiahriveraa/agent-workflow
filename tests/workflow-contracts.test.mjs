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

test('global workflow state is a compatibility document with runtime-state pointer', () => {
  const content = read('contexts/state.md');
  assert.match(content, /shared compatibility document/);
  assert.match(content, /~\/\.agents\/projects\/<project-id>\/contexts\/state\.md/);
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
  assert.match(createPlan, /current project's runtime `state\.md`/);
  assert.match(implementPlan, /current project's `state\.md`/);
  assert.match(implementPlan, /contexts\/decisions\.md/);
  assert.match(validatePlan, /current project's `state\.md`/);
  assert.match(research, /contexts\/research-index\.md/);
  assert.match(research, /project-context\.mjs current/);
  assert.match(sessionStart, /current project's `session-index\.md`/);
  assert.match(pauseSession, /current project's `session-index\.md`/);
  assert.match(resumeSession, /current project's `session-index\.md`/);
  assert.match(projectTooling, /contexts\/tooling\.md/);
  assert.match(projectVerification, /contexts\/verification\.md/);
  assert.match(projectArtifacts, /current project's `artifacts\.md`/);
  assert.match(projectArtifacts, /~\/\.agents\/contexts\/research-index\.md/);
});

test('handoff commands keep handoffs global while runtime state can be project-scoped', () => {
  const createHandoff = read('commands/create-handoff.md');
  const resumeHandoff = read('commands/resume-handoff.md');

  assert.match(createHandoff, /~\/\.agents\/thoughts\/shared\/handoffs\//);
  assert.doesNotMatch(createHandoff, /~\/\.agents\/projects\/<project>\/thoughts\/handoffs\//);
  assert.match(resumeHandoff, /~\/\.agents\/thoughts\/shared\/handoffs\/ENG-XXXX/);
  assert.match(resumeHandoff, /~\/\.agents\/thoughts\/plans/);
  assert.match(resumeHandoff, /~\/\.agents\/thoughts\/research/);
  assert.doesNotMatch(resumeHandoff, /~\/\.agents\/projects\/<project>\/thoughts\/handoffs\//);
});

test('manifest points Codex CLI at the shared AGENTS contract', () => {
  const manifest = readJson('manifest.json');
  const codexLink = manifest.symlinks.find((entry) => entry.tool === 'codex-cli');

  assert.ok(codexLink);
  assert.equal(codexLink.source, '~/.codex/AGENTS.md');
  assert.equal(codexLink.target, '~/.agents/AGENTS.md');
});

test('manifest represents prompt parity and generated adapter surfaces for all supported CLIs', () => {
  const manifest = readJson('manifest.json');
  const openclawPromptLink = manifest.symlinks.find((entry) =>
    entry.tool === 'openclaw' && entry.source === '~/.openclaw/CLAUDE.md'
  );
  const generatedByTool = Object.groupBy(manifest.generated, ({ tool }) => tool);

  assert.ok(openclawPromptLink);
  assert.equal(openclawPromptLink.target, '~/.agents/prompts/system.md');

  assert.deepEqual(
    (generatedByTool.opencode ?? []).map((entry) => entry.surface).sort(),
    ['agents']
  );
  assert.deepEqual(
    (generatedByTool.antigravity ?? []).map((entry) => entry.surface).sort(),
    ['agents', 'commands', 'gsd']
  );
  assert.deepEqual(
    (generatedByTool.openclaw ?? []).map((entry) => entry.surface).sort(),
    ['workspace-wrappers']
  );

  const openclawWorkspace = (generatedByTool.openclaw ?? [])[0];
  assert.deepEqual(openclawWorkspace.outputs, ['AGENTS.md', 'SOUL.md', 'USER.md', 'TOOLS.md']);
});

test('adapter directories document non-claude parity boundaries', () => {
  const codex = read('adapters/codex-cli/README.md');
  const opencode = read('adapters/opencode/README.md');
  const antigravity = read('adapters/antigravity/README.md');
  const openclaw = read('adapters/openclaw/README.md');
  const openclawAgentsTemplate = read('adapters/openclaw/templates/AGENTS.md');

  assert.match(codex, /~\/\.codex\/AGENTS\.md/);
  assert.match(opencode, /gen-opencode-agents/);
  assert.match(antigravity, /gen-antigravity-gsd/);
  assert.match(openclaw, /Generated workspace wrappers/);
  assert.match(openclawAgentsTemplate, /\{\{HUB\}\}\/AGENTS\.md/);
});
