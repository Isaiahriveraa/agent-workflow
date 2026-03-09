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
  assert.match(content, /Capsules:/);
  assert.match(content, /Rules:/);
  assert.match(content, /Adapters:/);
  assert.match(content, /contexts\/agent-catalog\.md/);
  assert.match(content, /contexts\/user-taste\.md/);
  assert.match(content, /Capsule Rules/);
  assert.match(content, /output-quality gate rule/);
  assert.match(content, /learning-loop rule/);
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
  assert.match(content, /## Capsule Routing/);
  assert.match(content, /## Learning Loop/);
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
  assert.match(content, /- intake: /);
  assert.match(content, /- plan: /);
  assert.match(content, /- research: /);
  assert.match(content, /- session: /);
  assert.match(content, /- handoff: /);
});

test('global research and session indexes are compatibility documents with runtime pointers', () => {
  const research = read('contexts/research-index.md');
  const session = read('contexts/session-index.md');

  assert.match(research, /shared compatibility document/);
  assert.match(research, /\[project root\]\/\.agents\/contexts\/research-index\.md/);
  assert.match(session, /shared compatibility document/);
  assert.match(session, /\[project root\]\/\.agents\/contexts\/session-index\.md/);
  assert.match(session, /Shared\/global handoffs/);
});

test('workflow commands reference explicit context files', () => {
  const createPlan = read('commands/create-plan.md');
  const implementPlan = read('commands/implement_plan.md');
  const validatePlan = read('commands/validate_plan.md');
  const optimizePrompt = read('commands/optimize-prompt.md');
  const research = read('commands/research_codebase.md');
  const sessionStart = read('commands/session-start.md');
  const pauseSession = read('commands/pause-session.md');
  const resumeSession = read('commands/resume-session.md');
  const projectTooling = read('commands/project-tooling.md');
  const projectVerification = read('commands/project-verification.md');
  const projectArtifacts = read('commands/project-artifacts.md');

  assert.match(createPlan, /contexts\/decisions\.md/);
  assert.match(createPlan, /current project's runtime `research-index\.md`/);
  assert.match(createPlan, /contexts\/failure-patterns\.md/);
  assert.match(createPlan, /contexts\/lessons-learned\.md/);
  assert.match(createPlan, /select and load the relevant capsule/);
  assert.match(createPlan, /current project's runtime `state\.md`/);
  assert.match(createPlan, /workflow-router-tools\.mjs score/);
  assert.match(createPlan, /workflow-artifact-tools\.mjs grade-research/);
  assert.match(createPlan, /workflow-artifact-tools\.mjs grade-plan/);
  assert.match(implementPlan, /current project's `state\.md`/);
  assert.match(implementPlan, /contexts\/decisions\.md/);
  assert.match(implementPlan, /rules\/common\/workflow-router\.md/);
  assert.match(implementPlan, /critic, grader, and memory-policy files/);
  assert.match(implementPlan, /workflow-artifact-tools\.mjs grade-plan/);
  assert.match(implementPlan, /plan_ready_for_implementation/);
  assert.match(implementPlan, /Never retry blindly after a verified miss/);
  assert.match(implementPlan, /lesson-tools\.mjs capture/);
  assert.match(validatePlan, /current project's `state\.md`/);
  assert.match(validatePlan, /contexts\/lessons-learned\.md/);
  assert.match(validatePlan, /contexts\/failure-patterns\.md/);
  assert.match(validatePlan, /current project's `research-index\.md`/);
  assert.match(validatePlan, /workflow-artifact-tools\.mjs grade-research/);
  assert.match(validatePlan, /workflow-artifact-tools\.mjs grade-plan/);
  assert.match(validatePlan, /lesson-tools\.mjs capture/);
  assert.match(optimizePrompt, /Capsule:/);
  assert.match(research, /current project's `research-index\.md`/);
  assert.match(research, /project-context\.mjs current/);
  assert.match(research, /workflow-router-tools\.mjs capture/);
  assert.match(research, /workflow-artifact-tools\.mjs grade-research/);
  assert.match(research, /research_ready_for_planning/);
  assert.match(sessionStart, /current project's `session-index\.md`/);
  assert.match(sessionStart, /ordinary pause\/resume continuity/);
  assert.match(pauseSession, /current project's `session-index\.md`/);
  assert.match(resumeSession, /current project's `session-index\.md`/);
  assert.match(resumeSession, /current project's `research-index\.md`/);
  assert.match(resumeSession, /project-local session artifacts/);
  assert.match(projectTooling, /contexts\/tooling\.md/);
  assert.match(projectVerification, /contexts\/verification\.md/);
  assert.match(projectArtifacts, /current project's `artifacts\.md`/);
  assert.match(projectArtifacts, /current project's `research-index\.md`/);
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
  assert.match(resumeHandoff, /~\/\.agents\/thoughts\/plans/);
  assert.match(resumeHandoff, /\.planning\/research/);
  assert.doesNotMatch(resumeHandoff, /~\/\.agents\/projects\/<project>\/thoughts\/handoffs\//);
});

test('artifact-producing workflow docs require exact next-command output', () => {
  const research = read('commands/research_codebase.md');
  const createPlan = read('commands/create-plan.md');
  const createHandoff = read('commands/create-handoff.md');
  const implementPlan = read('commands/implement_plan.md');
  const validatePlan = read('commands/validate_plan.md');

  assert.match(createPlan, /Next step/);
  assert.match(createPlan, /\/implement_plan \/Users\/[^/\n]+\/\.agents\/thoughts\/plans\/YYYY-MM-DD-description\.md/);
  assert.match(research, /\/create-plan \/absolute\/path\/to\/research\.md/);
  assert.match(createHandoff, /Use the exact absolute handoff path written in the current run\./);
  assert.match(createHandoff, /Next step/);
  assert.match(createHandoff, /\/resume_handoff path\/to\/handoff\.md/);
  assert.match(implementPlan, /Next step/);
  assert.match(implementPlan, /\/validate_plan \/absolute\/path\/to\/plan\.md/);
  assert.match(validatePlan, /Do not emit a standalone `Next step` command block/);
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

test('ssot validation fails when Claude entrypoint drifts back to the raw prompt target', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-validate-ssot-'));
  const home = path.join(fixtureRoot, 'home');

  try {
    fs.cpSync(root, fixtureRoot, {
      recursive: true,
      filter: (source) => !source.includes(`${path.sep}.git${path.sep}`) && !source.includes(`${path.sep}node_modules${path.sep}`)
    });

    fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
    fs.symlinkSync(path.join(fixtureRoot, 'prompts/system.md'), path.join(home, '.claude/CLAUDE.md'));
    fs.writeFileSync(path.join(home, '.claude/settings.json'), JSON.stringify({
      additionalDirectories: [fixtureRoot],
      permissions: { allow: [`Read(${fixtureRoot}/**)`] },
      env: { CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD: '1' }
    }, null, 2));

    const result = spawnSync('node', ['scripts/validate-ssot.mjs'], {
      cwd: fixtureRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        AGENTS_ROOT: fixtureRoot,
        HOME: home
      }
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Claude Code entrypoint points to .*prompts\/system\.md.*expected .*adapters\/claude-code\/CLAUDE\.md/);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('ssot validation fails when Claude settings lose required hub access fields', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-validate-ssot-'));
  const home = path.join(fixtureRoot, 'home');

  try {
    fs.cpSync(root, fixtureRoot, {
      recursive: true,
      filter: (source) => !source.includes(`${path.sep}.git${path.sep}`) && !source.includes(`${path.sep}node_modules${path.sep}`)
    });

    fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
    fs.symlinkSync(path.join(fixtureRoot, 'adapters/claude-code/CLAUDE.md'), path.join(home, '.claude/CLAUDE.md'));
    fs.writeFileSync(path.join(home, '.claude/settings.json'), JSON.stringify({
      additionalDirectories: [],
      permissions: { allow: [] },
      env: {}
    }, null, 2));

    const result = spawnSync('node', ['scripts/validate-ssot.mjs'], {
      cwd: fixtureRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        AGENTS_ROOT: fixtureRoot,
        HOME: home
      }
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Claude settings missing additionalDirectories entry/);
    assert.match(result.stderr, /Claude settings missing Read\(.*\/\*\*\) permission/);
    assert.match(result.stderr, /CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD/);
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
  assert.equal(manifest.managed_content.capsules, '~/.agents/capsules');
});

test('learning contexts, quality gate rules, and capsules exist with expected sections', () => {
  const userTaste = read('contexts/user-taste.md');
  const failurePatterns = read('contexts/failure-patterns.md');
  const referenceLibrary = read('contexts/reference-library.md');
  const lessons = read('contexts/lessons-learned.md');
  const learningLoop = read('rules/common/learning-loop.md');
  const qualityGate = read('rules/common/output-quality-gate.md');
  const creativeAssembly = read('capsules/creative-redesign/assembly.md');
  const apiCritic = read('capsules/api-workflow/critic.md');

  assert.match(userTaste, /## Preferred Characteristics/);
  assert.match(userTaste, /## Recent Confirmations/);
  assert.match(failurePatterns, /## Recurring Failure Classes/);
  assert.match(failurePatterns, /## Recent Entries/);
  assert.match(referenceLibrary, /## Approved Sources/);
  assert.match(lessons, /## Writeback Policy/);
  assert.match(lessons, /## Recent Artifacts/);
  assert.match(learningLoop, /## Required Flow/);
  assert.match(learningLoop, /lesson-tools\.mjs capture/);
  assert.match(qualityGate, /## Minimum Creative Gate/);
  assert.match(qualityGate, /## Minimum API Gate/);
  assert.match(creativeAssembly, /contexts\/user-taste\.md/);
  assert.match(apiCritic, /edge cases are not handled/);
});

test('manifest represents prompt parity and generated adapter surfaces for all supported CLIs', () => {
  const manifest = readJson('manifest.json');
  const claudePromptLink = manifest.symlinks.find((entry) =>
    entry.tool === 'claude-code' && entry.source === '~/.claude/CLAUDE.md'
  );
  const openclawPromptLink = manifest.symlinks.find((entry) =>
    entry.tool === 'openclaw' && entry.source === '~/.openclaw/CLAUDE.md'
  );
  const generatedByTool = Object.groupBy(manifest.generated, ({ tool }) => tool);
  const capabilities = manifest.capabilities;

  assert.ok(claudePromptLink);
  assert.equal(claudePromptLink.target, '~/.agents/adapters/claude-code/CLAUDE.md');
  assert.ok(openclawPromptLink);
  assert.equal(openclawPromptLink.target, '~/.agents/prompts/system.md');
  assert.deepEqual(Object.keys(capabilities).sort(), ['antigravity', 'claude-code', 'codex-cli', 'openclaw', 'opencode']);
  assert.equal(capabilities['claude-code'].entrypoint.status, 'bridged');
  assert.equal(capabilities['claude-code'].commands.status, 'native');
  assert.equal(capabilities['claude-code'].settings.status, 'validated-local');
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

  assert.match(claude, /## Managed Surfaces/);
  assert.match(claude, /## Capability Profile/);
  assert.match(claude, /Claude-local but contract-validated: `~\/\.claude\/settings\.json`/);
  assert.match(claude, /additionalDirectories/);
  assert.match(claude, /CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1/);
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

test('claude settings preserve local hooks while exposing the shared hub', () => {
  const settings = JSON.parse(fs.readFileSync('/Users/isaiahrivera/.claude/settings.json', 'utf8'));
  const manifest = readJson('manifest.json');
  const validatedSettings = manifest.validated_local_contracts.find((entry) =>
    entry.tool === 'claude-code' && entry.path === '~/.claude/settings.json'
  );

  assert.ok(validatedSettings);
  assert.deepEqual(validatedSettings.required_fields, [
    'additionalDirectories includes ~/.agents',
    'permissions.allow includes Read(~/.agents/**)',
    'env.CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1',
    'hooks.Stop runs ~/.claude/hooks/gsd-stop-lesson-capture.js',
    'hooks.SubagentStop runs ~/.claude/hooks/gsd-stop-lesson-capture.js'
  ]);
  assert.ok(settings.additionalDirectories.includes('/Users/isaiahrivera/.agents'));
  assert.ok(settings.permissions.allow.includes('Read(/Users/isaiahrivera/.agents/**)'));
  assert.equal(settings.env.CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD, '1');
  assert.equal(
    settings.hooks.SessionStart[0].hooks[0].command,
    'node "/Users/isaiahrivera/.claude/hooks/gsd-check-update.js"'
  );
  assert.equal(
    settings.hooks.Stop[0].hooks[0].command,
    'node "/Users/isaiahrivera/.claude/hooks/gsd-stop-lesson-capture.js"'
  );
  assert.equal(
    settings.hooks.SubagentStop[0].hooks[0].command,
    'node "/Users/isaiahrivera/.claude/hooks/gsd-stop-lesson-capture.js"'
  );
  assert.equal(
    settings.statusLine.command,
    'node "/Users/isaiahrivera/.claude/hooks/gsd-statusline.js"'
  );
  assert.equal(settings.enabledPlugins['typescript-lsp@claude-plugins-official'], true);
});
