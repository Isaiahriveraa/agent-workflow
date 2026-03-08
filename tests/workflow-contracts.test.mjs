import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const readJson = (relativePath) => JSON.parse(read(relativePath));
const root = path.resolve(new URL('..', import.meta.url).pathname);

test('AGENTS declares contexts, rules, and adapters as canonical layers', () => {
  const content = read('AGENTS.md');
  assert.match(content, /Contexts:/);
  assert.match(content, /Rules:/);
  assert.match(content, /Adapters:/);
  assert.match(content, /contexts\/agent-catalog\.md/);
  assert.match(content, /expert-agent routing rule/);
  assert.match(content, /expert-agent-routing-tools\.mjs route/);
  assert.match(content, /project-local `\.agents\/sessions\/`/);
  assert.match(content, /thoughts\/shared\/handoffs\//);
  assert.doesNotMatch(content, /Use `thoughts\/sessions\/` for ordinary workflow continuity/);
});

test('system prompt documents context discipline and ui routing', () => {
  const content = read('prompts/system.md');
  assert.match(content, /## Canonical Workflow Layers/);
  assert.match(content, /## Context Discipline/);
  assert.match(content, /## UI\/UX Routing/);
  assert.match(content, /## Tooling Automation/);
  assert.match(content, /## Verification Automation/);
  assert.match(content, /## Artifact Retrieval/);
  assert.match(content, /## Simple Response Contract/);
  assert.match(content, /What I changed/);
  assert.match(content, /How it connects to the bigger picture/);
});

test('global workflow state is a compatibility document with runtime-state pointer', () => {
  const content = read('contexts/state.md');
  assert.match(content, /shared compatibility document/);
  assert.match(content, /\[project root\]\/\.agents\/contexts\/state\.md/);
  assert.match(content, /## Active Artifact Working Set/);
  assert.match(content, /### Selected By Category/);
  assert.match(content, /### Ordered Artifacts/);
  assert.match(content, /- intake: none/);
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
  assert.match(createPlan, /workflow-router-tools\.mjs score/);
  assert.match(implementPlan, /current project's `state\.md`/);
  assert.match(implementPlan, /contexts\/decisions\.md/);
  assert.match(implementPlan, /rules\/common\/workflow-router\.md/);
  assert.match(validatePlan, /current project's `state\.md`/);
  assert.match(research, /contexts\/research-index\.md/);
  assert.match(research, /project-context\.mjs current/);
  assert.match(research, /workflow-router-tools\.mjs capture/);
  assert.match(sessionStart, /current project's `session-index\.md`/);
  assert.match(sessionStart, /ordinary pause\/resume continuity/);
  assert.match(pauseSession, /current project's `session-index\.md`/);
  assert.match(resumeSession, /current project's `session-index\.md`/);
  assert.match(resumeSession, /project-local session artifacts/);
  assert.match(projectTooling, /contexts\/tooling\.md/);
  assert.match(projectVerification, /contexts\/verification\.md/);
  assert.match(projectArtifacts, /current project's `artifacts\.md`/);
  assert.match(projectArtifacts, /~\/\.agents\/contexts\/research-index\.md/);
  assert.match(projectArtifacts, /handoffs remain shared\/global transfer artifacts/);
});

test('handoff commands keep handoffs global while runtime state can be project-scoped', () => {
  const createHandoff = read('commands/create-handoff.md');
  const resumeHandoff = read('commands/resume-handoff.md');

  assert.match(createHandoff, /~\/\.agents\/thoughts\/shared\/handoffs\//);
  assert.match(createHandoff, /current project's `state\.md`/);
  assert.match(createHandoff, /current project's `session-index\.md`/);
  assert.match(createHandoff, /artifact-tools\.mjs persist/);
  assert.doesNotMatch(createHandoff, /~\/\.agents\/projects\/<project>\/thoughts\/handoffs\//);
  assert.match(resumeHandoff, /~\/\.agents\/thoughts\/shared\/handoffs\/ENG-XXXX/);
  assert.match(resumeHandoff, /\.planning\/plans/);
  assert.match(resumeHandoff, /\.planning\/research/);
  assert.doesNotMatch(resumeHandoff, /~\/\.agents\/projects\/<project>\/thoughts\/handoffs\//);
});

test('artifact-producing workflow docs require exact next-command output', () => {
  const research = read('commands/research_codebase.md');
  const createHandoff = read('commands/create-handoff.md');
  const implementPlan = read('commands/implement_plan.md');

  assert.match(research, /\/create-plan \/absolute\/path\/to\/research\.md/);
  assert.match(createHandoff, /Use the exact absolute handoff path written in the current run\./);
  assert.match(createHandoff, /\/resume_handoff path\/to\/handoff\.md/);
  assert.match(implementPlan, /\/validate_plan \/absolute\/path\/to\/plan\.md/);
});

test('ssot validation fails when a project-local runtime state duplicates the working-set section', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-validate-ssot-'));

  try {
    fs.cpSync(root, fixtureRoot, {
      recursive: true,
      filter: (source) => !source.includes(`${path.sep}.git${path.sep}`) && !source.includes(`${path.sep}node_modules${path.sep}`)
    });

    const projectStatePath = path.join(fixtureRoot, 'projects', 'agents-43142fc2', 'contexts', 'state.md');
    const originalState = fs.readFileSync(projectStatePath, 'utf8');
    const duplicatedState = `${originalState.trimEnd()}\n\n## Active Artifact Working Set\n- Last updated: none\n- Source: none\n- Focus: none\n\n### Selected By Category\n- intake: none\n- plan: none\n- research: none\n- session: none\n- handoff: none\n\n### Ordered Artifacts\n1. none\n`;

    fs.writeFileSync(projectStatePath, duplicatedState);

    const result = spawnSync('node', ['scripts/validate-ssot.mjs'], {
      cwd: fixtureRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        AGENTS_ROOT: fixtureRoot
      }
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Expected exactly one "## Active Artifact Working Set" section in projects\/agents-43142fc2\/contexts\/state\.md, found 2/);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
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
  const capabilities = manifest.capabilities;

  assert.ok(openclawPromptLink);
  assert.equal(openclawPromptLink.target, '~/.agents/prompts/system.md');
  assert.deepEqual(Object.keys(capabilities).sort(), ['antigravity', 'claude-code', 'codex-cli', 'openclaw', 'opencode']);
  assert.equal(capabilities['claude-code'].commands.status, 'native');
  assert.equal(capabilities['codex-cli'].commands.status, 'unsupported');
  assert.equal(capabilities.opencode.agents.status, 'bridged');
  assert.equal(capabilities.antigravity.commands.status, 'bridged');
  assert.equal(capabilities.openclaw.workspace_wrappers.status, 'bridged');

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
  const claude = read('adapters/claude-code/README.md');
  const openclawAgentsTemplate = read('adapters/openclaw/templates/AGENTS.md');

  assert.match(claude, /## Capability Profile/);
  assert.match(codex, /~\/\.codex\/AGENTS\.md/);
  assert.match(codex, /commands: `unsupported`/);
  assert.match(opencode, /gen-opencode-agents/);
  assert.match(opencode, /agents: `bridged`/);
  assert.match(antigravity, /gen-antigravity-gsd/);
  assert.match(antigravity, /commands: `bridged`/);
  assert.match(openclaw, /Generated workspace wrappers/);
  assert.match(openclaw, /workspace wrappers: `bridged`/);
  assert.match(openclawAgentsTemplate, /\{\{HUB\}\}\/AGENTS\.md/);
});
