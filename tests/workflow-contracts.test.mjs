import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const read = (relativePath) => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const readJson = (relativePath) => JSON.parse(read(relativePath));
const root = path.resolve(new URL('..', import.meta.url).pathname);
const copyFilter = (source) => {
  if (source.includes(`${path.sep}.git${path.sep}`) || source.includes(`${path.sep}node_modules${path.sep}`)) {
    return false;
  }

  try {
    fs.lstatSync(source);
    return true;
  } catch {
    return false;
  }
};

test('AGENTS declares operating rules and workflow triggers', () => {
  const content = read('AGENTS.md');
  assert.match(content, /## 15 Operating Rules/);
  assert.match(content, /## Workflow Triggers/);
  assert.match(content, /## Skill Routing/);
  assert.match(content, /## Herdr Delegation/);
  assert.match(content, /Clipboard automation/);
});

// create-plan.md, implement_plan.md, validate_plan.md, research_codebase.md, gsd.md deleted
// Corresponding GSD-era workflow tests removed

// gsd.md was deleted — handoff commands test shortened
test('handoff commands keep handoffs project-local while runtime state stays project-scoped', () => {
  const createHandoff = read('commands/create-handoff.md');
  const resumeHandoff = read('commands/resume-handoff.md');

  assert.match(createHandoff, /\[project root\]\/thoughts\/handoffs\//);
  assert.match(createHandoff, /current project's `state\.md`/);
  assert.match(createHandoff, /current project's `session-index\.md`/);
  assert.match(createHandoff, /project-local handoff directory/);
  assert.match(resumeHandoff, /\[project root\]\/thoughts\/handoffs\/ENG-XXXX/);
  assert.match(resumeHandoff, /thoughts\/plans/);
  assert.match(resumeHandoff, /thoughts\/research/);
});

// create-plan.md, implement_plan.md, validate_plan.md, research_codebase.md deleted — test removed

// Working-set duplication check removed from validate-ssot.mjs — test removed

// prompts/system.md was deleted — Claude entrypoint test removed

test('ssot validation fails when Claude settings lose required hub access fields', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-validate-ssot-'));
  const home = path.join(fixtureRoot, 'home');

  try {
    fs.cpSync(root, fixtureRoot, {
      recursive: true,
      filter: copyFilter
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

// get-shit-done directory was deleted — validation test removed

test('manifest points Codex CLI at the shared AGENTS contract', () => {
  const manifest = readJson('manifest.json');
  const codexLink = manifest.symlinks.find((entry) => entry.tool === 'codex-cli');

  assert.ok(codexLink);
  assert.equal(codexLink.source, '~/.codex/AGENTS.md');
  assert.equal(codexLink.target, '~/.agents/AGENTS.md');
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
  const geminiEntrypointLink = manifest.symlinks.find((entry) =>
    entry.tool === 'antigravity' && entry.source === '~/.gemini/GEMINI.md'
  );

  assert.ok(claudePromptLink);
  assert.equal(claudePromptLink.target, '~/.agents/adapters/claude-code/CLAUDE.md');
  assert.ok(openclawPromptLink);
  assert.equal(openclawPromptLink.target, '~/.agents/AGENTS.md');
  assert.ok(geminiEntrypointLink);
  assert.equal(geminiEntrypointLink.target, '~/.agents/adapters/antigravity/GEMINI.md');
  assert.deepEqual(Object.keys(capabilities).sort(), ['antigravity', 'claude-code', 'codex-cli', 'openclaw', 'opencode']);
  assert.equal(capabilities['claude-code'].entrypoint.status, 'bridged');
  assert.equal(capabilities['claude-code'].commands.status, 'native');
  assert.equal(capabilities['claude-code'].settings.status, 'validated-local');
  assert.equal(capabilities['codex-cli'].commands.status, 'unsupported');
  assert.equal(capabilities['codex-cli'].hooks.status, 'bridged');
  assert.equal(capabilities.opencode.memory.status, 'bridged-explicit');
  assert.equal(capabilities.opencode.agents.status, 'bridged');
  assert.equal(capabilities.antigravity.entrypoint.status, 'bridged');
  assert.equal(capabilities.antigravity.skills.status, 'native');
  assert.equal(capabilities.antigravity.commands.status, 'bridged');
  assert.equal(capabilities.antigravity.memory.status, 'bridged-explicit');
  assert.equal(capabilities.openclaw.memory.status, 'bridged-explicit');
  assert.equal(capabilities.openclaw.workspace_wrappers.status, 'bridged');

  assert.deepEqual(
    (generatedByTool.opencode ?? []).map((entry) => entry.surface).sort(),
    ['agents', 'skills']
  );
  assert.deepEqual(
    (generatedByTool.antigravity ?? []).map((entry) => entry.surface).sort(),
    ['agents', 'commands']
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
  const geminiWrapper = read('adapters/antigravity/GEMINI.md');
  const openclaw = read('adapters/openclaw/README.md');
  const claude = read('adapters/claude-code/README.md');
  const openclawAgentsTemplate = read('adapters/openclaw/templates/AGENTS.md');

  assert.match(claude, /## Managed Surfaces/);
  assert.match(claude, /## Capability Profile/);
  assert.match(claude, /Claude-local but contract-validated: `~\/\.claude\/settings\.json`/);
  assert.match(claude, /strongest repo-managed adapter boundary/);
  assert.match(claude, /additionalDirectories/);
  assert.match(claude, /CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1/);
  assert.match(codex, /~\/\.codex\/AGENTS\.md/);
  assert.match(codex, /commands: `unsupported`/);
  assert.match(codex, /hooks: `bridged`/);
  assert.match(codex, /what the hub currently manages for Codex/);
  assert.match(codex, /AGENTS-routing compatibility/);
  assert.match(codex, /Explicit memory bridge parity only/);
  assert.match(codex, /Hook Bridge/);
  assert.match(codex, /gsd-pre-bash-guard\.cjs/);
  assert.match(opencode, /gen-opencode-agents/);
  assert.match(opencode, /agents: `bridged`/);
  assert.match(opencode, /OpenCode upstream supports command files and plugin event hooks/);
  assert.match(opencode, /memory-sync-bridge\.mjs/);
  assert.match(opencode, /Explicit memory bridge parity only/);
  assert.match(antigravity, /~\/\.gemini\/GEMINI\.md/);
  assert.match(antigravity, /skills: `native` through Gemini's `~\/\.agents\/skills` user-scope alias/);
  assert.match(antigravity, /commands: `bridged`/);
  assert.match(antigravity, /agents: `bridged` through generated Gemini-schema agent files/);
  assert.match(antigravity, /Gemini CLI upstream supports custom commands, extensions, MCP, and native memory/);
  assert.match(antigravity, /memory-sync-bridge\.mjs/);
  assert.match(antigravity, /Explicit memory bridge parity only/);
  assert.match(geminiWrapper, /# Gemini Workflow Wrapper/);
  assert.match(geminiWrapper, /@~\/\.agents\/AGENTS\.md/);
  assert.match(openclaw, /Generated workspace wrappers/);
  assert.match(openclaw, /workspace wrappers: `bridged`/);
  assert.match(openclaw, /OpenClaw upstream documents slash commands, plugins, hooks, and built-in memory/);
  assert.match(openclaw, /memory-sync-bridge\.mjs/);
  assert.match(openclaw, /Explicit memory bridge parity only/);
  assert.match(openclawAgentsTemplate, /\{\{HUB\}\}\/AGENTS\.md/);
});

test('claude settings preserve local hooks while exposing the shared hub', () => {
  const homeDir = os.homedir();
  const agentsDir = path.join(homeDir, '.agents');
  const claudeDir = path.join(homeDir, '.claude');
  const settings = JSON.parse(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8'));
  const manifest = readJson('manifest.json');
  const validatedSettings = manifest.validated_local_contracts.find((entry) =>
    entry.tool === 'claude-code' && entry.path === '~/.claude/settings.json'
  );

  assert.ok(validatedSettings);
  assert.deepEqual(validatedSettings.required_fields, [
    'additionalDirectories includes ~/.agents',
    'permissions.allow includes Read(~/.agents/**)',
    'env.CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1',
    'hooks.Stop runs ~/.claude/hooks/gsd-stop-memory-consolidation.cjs',
    'hooks.SubagentStop runs ~/.claude/hooks/gsd-stop-memory-consolidation.cjs'
  ]);
  assert.ok(settings.additionalDirectories.includes(agentsDir));
  assert.ok(settings.permissions.allow.includes(`Read(${agentsDir}/**)`));
  assert.equal(settings.env.CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD, '1');
  assert.equal(
    settings.hooks.SessionStart[0].hooks[0].command,
    `node "${path.join(agentsDir, 'hooks/mempalace-context.cjs')}" "SessionStart"`
  );
  assert.equal(
    settings.hooks.Stop[0].hooks[0].command,
    `node "${path.join(claudeDir, 'hooks/gsd-stop-memory-consolidation.cjs')}"`
  );
  assert.equal(
    settings.hooks.SubagentStop[0].hooks[0].command,
    `node "${path.join(claudeDir, 'hooks/gsd-stop-memory-consolidation.cjs')}"`
  );
  assert.equal(
    settings.statusLine.command,
    `node \${CLAUDE_CONFIG_DIR:-\$HOME/.claude}/hud/combined-statusline.mjs`
  );
  assert.equal(settings.enabledPlugins['typescript-lsp@claude-plugins-official'], true);
});

// get-shit-done directory was deleted — GSD workflow docs test removed
