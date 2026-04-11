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
  assert.match(content, /thoughts\/handoffs\//);
  assert.match(content, /commands\/\*\*\/\*\.md/);
  assert.match(content, /commands\/gsd\/\*\.md/);
  assert.match(content, /\/gsd:help/);
  assert.match(content, /gsd <subcommand>/);
  assert.match(content, /underscore and hyphen variants of the same slash-style workflow command as equivalent/);
  assert.doesNotMatch(content, /Use `thoughts\/sessions\/` for ordinary workflow continuity/);
});

test('gsd namespace is first-class in the shared command contract and codex adapter', () => {
  const agentsXml = read('AGENTS.xml');
  const codexAdapter = read('adapters/codex-cli/README.md');
  const manifest = readJson('manifest.json');

  assert.match(agentsXml, /commands\/\*\*\/\*\.md/);
  assert.match(agentsXml, /commands\/gsd\/\*\.md/);
  assert.match(agentsXml, /\/gsd:help/);
  assert.match(agentsXml, /gsd-&lt;subcommand&gt;/);
  assert.match(codexAdapter, /gsd <subcommand>/);
  assert.match(codexAdapter, /\/gsd:<subcommand>/);
  assert.match(codexAdapter, /gsd memory-sync/);
  assert.match(codexAdapter, /\/gsd:memory-sync/);
  assert.match(codexAdapter, /recall <create-plan\|implement-plan>/);
  assert.match(codexAdapter, /Explicit memory bridge parity only/);
  assert.match(codexAdapter, /memory-sync-bridge\.mjs <status\|recall\|flush>/);
  assert.match(codexAdapter, /codex-memory-bridge\.mjs <status\|recall\|flush>/);
  assert.match(manifest.capabilities['codex-cli'].commands.contract, /command bridge/);
  assert.match(manifest.capabilities['codex-cli'].hooks.contract, /No hub-managed Codex hook bridge/);
});

test('system prompt documents enforcement-first router authority and stage contracts', () => {
  const content = read('prompts/system.md');
  assert.match(content, /<role>Enforcement-First Pair Engineering<\/role>/);
  assert.match(content, /workflow-router-tools\.mjs activate/);
  assert.match(content, /router remains the activation spine/);
  assert.match(content, /Memory is advisory but mandatory to attempt for `create-plan` and `implement-plan` stages/);
  assert.match(content, /If router activation requires the task to be substantial, run prompt optimization first/);
  assert.match(content, /run a brief brainstorm\/clarification pass before codebase research/);
  assert.match(content, /That explanation must separate: what the codebase proves, what memory suggests, what is inferred, and what is newly proposed/);
  assert.match(content, /Do not implement until the user explicitly approves the plan/);
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
  assert.match(session, /Project-local handoffs/);
});

test('workflow commands reference explicit context files', () => {
  const createPlan = read('commands/create-plan.md');
  const implementPlan = read('commands/implement_plan.md');
  const validatePlan = read('commands/validate_plan.md');
  const rpi = read('commands/rpi.md');
  const optimizePrompt = read('commands/optimize-prompt.md');
  const fixPr = read('commands/fix-pr.md');
  const promptResearchPackager = read('skills/prompt-research-packager/SKILL.md');
  const research = read('commands/research_codebase.md');
  const sessionStart = read('commands/session-start.md');
  const pauseSession = read('commands/pause-session.md');
  const resumeSession = read('commands/resume-session.md');
  const projectTooling = read('commands/project-tooling.md');
  const projectVerification = read('commands/project-verification.md');
  const projectArtifacts = read('commands/project-artifacts.md');
  const pr = read('commands/pr.md');
  const promptOptimizationRouting = read('rules/common/prompt-optimization-routing.md');

  assert.match(createPlan, /contexts\/decisions\.md/);
  assert.match(createPlan, /current project's runtime `research-index\.md`/);
  assert.match(createPlan, /select and load the relevant capsule/);
  assert.match(createPlan, /current project's runtime `state\.md`/);
  assert.match(createPlan, /workflow-router-tools\.mjs score/);
  assert.match(createPlan, /workflow-artifact-tools\.mjs grade-research/);
  assert.match(createPlan, /workflow-artifact-tools\.mjs grade-plan/);
  assert.match(createPlan, /agents-memory recall create-plan/);
  assert.match(createPlan, /scripts\/workflow-command-decision\.mjs evaluate/);
  assert.match(createPlan, /Original Prompt Alignment/);
  assert.match(createPlan, /Research Sufficiency/);
  assert.match(createPlan, /Phase Plan Index/);
  assert.match(createPlan, /one child plan per implementation phase/);
  assert.match(createPlan, /before critique/);
  assert.match(createPlan, /workflow-command-decision\.mjs evaluate/);
  assert.match(createPlan, /do_more_research/);
  assert.match(createPlan, /run_critic/);
  assert.match(createPlan, /request_user_decision/);
  assert.match(createPlan, /Do not write advisory recall into the current project's runtime `state\.md`, `research-index\.md`, or active artifact selections/);
  assert.match(createPlan, /Do not pass advisory recall into `scripts\/workflow-artifact-tools\.mjs`/);
  assert.match(createPlan, /User-Facing Contract/);
  assert.match(createPlan, /Lead with the planning job, not with the workflow machinery/);
  assert.match(implementPlan, /current project's `state\.md`/);
  assert.match(implementPlan, /contexts\/decisions\.md/);
  assert.match(implementPlan, /rules\/common\/workflow-router\.md/);
  assert.match(implementPlan, /critic, grader, and memory-policy files/);
  assert.match(implementPlan, /workflow-artifact-tools\.mjs grade-plan/);
  assert.match(implementPlan, /plan_ready_for_implementation/);
  assert.match(implementPlan, /agents-memory recall implement-plan/);
  assert.match(implementPlan, /scripts\/workflow-command-decision\.mjs evaluate/);
  assert.match(implementPlan, /workflow-command-decision\.mjs evaluate/);
  assert.match(implementPlan, /active runtime state and selected artifacts/);
  assert.match(implementPlan, /advisory memory recall/);
  assert.match(implementPlan, /disabled mode must preserve current behavior/);
  assert.match(implementPlan, /Phase Plan Index/);
  assert.match(implementPlan, /one linked child phase plan per explicit implementation phase/);
  assert.match(implementPlan, /read the linked child phase plan for that phase before editing/);
  assert.match(implementPlan, /replan/);
  assert.match(implementPlan, /capture_lesson/);
  assert.match(implementPlan, /request_user_decision/);
  assert.match(implementPlan, /Do not write advisory recall into the current project's `state\.md`, `research-index\.md`, session continuity artifacts, or active artifact selections/);
  assert.match(implementPlan, /Do not pass advisory recall into `scripts\/workflow-artifact-tools\.mjs`/);
  assert.match(implementPlan, /Never retry blindly after a verified miss/);
  assert.match(implementPlan, /lesson-tools\.mjs quick-capture/);
  assert.match(implementPlan, /Primary Execution Contract/);
  assert.match(implementPlan, /write or update tests first when behavior is changing/);
  assert.match(validatePlan, /current project's `state\.md`/);
  assert.match(validatePlan, /current project's `research-index\.md`/);
  assert.match(validatePlan, /workflow-artifact-tools\.mjs grade-research/);
  assert.match(validatePlan, /workflow-artifact-tools\.mjs grade-plan/);
  assert.match(validatePlan, /scripts\/workflow-command-decision\.mjs evaluate/);
  assert.match(validatePlan, /request_user_decision/);
  assert.match(validatePlan, /capture_lesson/);
  assert.match(validatePlan, /lesson-tools\.mjs quick-capture/);
  assert.match(optimizePrompt, /Do not emit the rewritten prompt block from this command/);
  assert.match(optimizePrompt, /If the input is already a structured handoff or optimized prompt, use it as-is and do not rewrite it again/);
  assert.doesNotMatch(optimizePrompt, /OPTIMIZED PROMPT/);
  assert.doesNotMatch(optimizePrompt, /NOTES\n- Assumptions:/);
  assert.match(fixPr, /analysis-first/);
  assert.match(fixPr, /Do not edit conflict files until the analysis has been shared and the user approves the approach/);
  assert.match(fixPr, /Plain-English summary/);
  assert.match(fixPr, /Evidence-based resolution options/);
  assert.match(fixPr, /Uncertainty \/ validation needed before applying the fix/);
  assert.doesNotMatch(fixPr, /OPTIMIZED PROMPT/);
  assert.match(promptResearchPackager, /Use the rewritten prompt internally unless the user explicitly asks to see it/);
  assert.match(promptResearchPackager, /Only return the rewritten prompt in this shape when the user explicitly asks to see it/);
  assert.match(promptOptimizationRouting, /an already-structured handoff or optimized prompt that should be used as-is/);
  assert.match(promptOptimizationRouting, /Treat the optimized prompt as an internal working artifact that drives the next step, not as user-facing output/);
  assert.match(promptOptimizationRouting, /commands\/rpi-brainstorm\.md/);
  assert.match(research, /current project's `research-index\.md`/);
  assert.match(research, /project-context\.mjs current/);
  assert.match(research, /workflow-router-tools\.mjs capture/);
  assert.match(research, /workflow-artifact-tools\.mjs grade-research/);
  assert.match(research, /research_ready_for_planning/);
  assert.match(research, /commands\/rpi-brainstorm\.md/);
  assert.match(research, /artifact-tools\.mjs sync-research/);
  assert.match(rpi, /simple frontend/);
  assert.match(rpi, /workflow-router-tools\.mjs activate/);
  assert.match(rpi, /rpi-brainstorm\.md/);
  assert.match(rpi, /ambiguityDetected/);
  assert.match(rpi, /recommendedResearchEntry/);
  assert.match(rpi, /Brainstorm/);
  assert.match(rpi, /Tier 3: run the full strict workflow/);
  assert.match(rpi, /Do not auto-run git branch, push, or PR actions unless the user explicitly asks/);
  assert.match(sessionStart, /current project's `session-index\.md`/);
  assert.match(sessionStart, /ordinary pause\/resume continuity/);
  assert.match(pauseSession, /current project's `session-index\.md`/);
  assert.match(resumeSession, /current project's `session-index\.md`/);
  assert.match(resumeSession, /current project's `research-index\.md`/);
  assert.match(resumeSession, /project-local session artifacts/);
  assert.match(resumeSession, /continuity-authoritative/);
  assert.match(projectTooling, /contexts\/tooling\.md/);
  assert.match(projectVerification, /contexts\/verification\.md/);
  assert.match(projectArtifacts, /current project's `artifacts\.md`/);
  assert.match(projectArtifacts, /current project's `research-index\.md`/);
  assert.match(projectArtifacts, /handoffs remain project-local transfer artifacts/);
  assert.match(projectArtifacts, /--mode refresh/);
  assert.match(pr, /Describe only what is actually in the committed branch diff against the base branch/);
  assert.match(pr, /Do not invent provenance from the conversation/);
  assert.match(pr, /no machine-specific absolute filesystem paths/);
  assert.match(pr, /If `\.planning\/research\/`, `thoughts\/`, or other artifact directories are not part of the committed diff, do not mention them in the PR body/);
  assert.match(pr, /No references to `\.planning\/research` or `thoughts\/` unless those paths are committed and reviewer-relevant in this PR/);
});

test('handoff commands keep handoffs project-local while runtime state stays project-scoped', () => {
  const createHandoff = read('commands/create-handoff.md');
  const resumeHandoff = read('commands/resume-handoff.md');
  const gsd = read('commands/gsd.md');

  assert.match(createHandoff, /\[project root\]\/thoughts\/handoffs\//);
  assert.match(createHandoff, /current project's `state\.md`/);
  assert.match(createHandoff, /current project's `session-index\.md`/);
  assert.match(createHandoff, /artifact-tools\.mjs persist/);
  assert.match(createHandoff, /continuity-authoritative/);
  assert.doesNotMatch(createHandoff, /~\/\.agents\/thoughts\/shared\/handoffs\//);
  assert.match(resumeHandoff, /\[project root\]\/thoughts\/handoffs\/ENG-XXXX/);
  assert.match(resumeHandoff, /\/resume-handoff` resolves to the same command file/);
  assert.match(resumeHandoff, /~\/\.agents\/thoughts\/plans/);
  assert.match(resumeHandoff, /\.planning\/research/);
  assert.doesNotMatch(resumeHandoff, /~\/\.agents\/projects\/<project>\/thoughts\/handoffs\//);
  assert.match(gsd, /shared workflow resolver also accepts underscore and hyphen variants/);
});

test('artifact-producing workflow docs require exact next-command output', () => {
  const research = read('commands/research_codebase.md');
  const createPlan = read('commands/create-plan.md');
  const createHandoff = read('commands/create-handoff.md');
  const implementPlan = read('commands/implement_plan.md');
  const validatePlan = read('commands/validate_plan.md');
  const brainstorm = read('commands/rpi-brainstorm.md');

  assert.match(createPlan, /Next step/);
  assert.match(createPlan, /\/implement_plan \/absolute\/path\/to\/\.agents\/thoughts\/plans\/YYYY-MM-DD-description\.md/);
  assert.match(research, /\/create-plan \/absolute\/path\/to\/research\.md/);
  assert.match(brainstorm, /Next step/);
  assert.match(brainstorm, /\/research_codebase \/absolute\/path\/to\/intake\.md/);
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
      filter: copyFilter
    });

    const projectStatePath = path.join(fixtureRoot, 'projects', 'agents-43142fc2', 'contexts', 'state.md');
    fs.mkdirSync(path.dirname(projectStatePath), { recursive: true });
    const originalState = `# Workflow State

Use this file as a shared compatibility document, not the live per-project runtime state source.

Per-project runtime workflow state now lives at \`[project root]/.agents/contexts/state.md\`.
Use this global file only for legacy/shared notes that are not specific to a single repo.

## Current Workflow
- Not set.

## Current Phase
- Not set.

## Next Step
- Not set.

## Blockers
- None recorded at the project-local level.

## Last Verified At
- Not set.

## Related Plan
- Not set.

## Active Artifact Working Set
- Last updated: not set
- Source: not set
- Focus: not set

### Selected By Category
- intake: not set
- plan: not set
- research: not set
- session: not set
- handoff: not set

### Ordered Artifacts
1. not set
`;
    fs.writeFileSync(projectStatePath, originalState);
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
      filter: copyFilter
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

test('ssot validation fails when Claude get-shit-done drifts into a local directory instead of a hub symlink', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-validate-ssot-'));
  const home = path.join(fixtureRoot, 'home');

  try {
    fs.cpSync(root, fixtureRoot, {
      recursive: true,
      filter: copyFilter
    });

    fs.mkdirSync(path.join(home, '.claude', 'get-shit-done'), { recursive: true });
    fs.mkdirSync(path.join(home, '.claude', 'hooks'), { recursive: true });
    fs.symlinkSync(path.join(fixtureRoot, 'adapters/claude-code/CLAUDE.md'), path.join(home, '.claude/CLAUDE.md'));
    fs.writeFileSync(path.join(home, '.claude/settings.json'), JSON.stringify({
      additionalDirectories: [path.join(home, '.agents')],
      permissions: { allow: [`Read(${path.join(home, '.agents')}/**)`] },
      env: { CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD: '1' },
      hooks: {
        Stop: [{ hooks: [{ command: `node "${path.join(home, '.claude', 'hooks', 'gsd-stop-memory-consolidation.cjs')}"` }] }],
        SubagentStop: [{ hooks: [{ command: `node "${path.join(home, '.claude', 'hooks', 'gsd-stop-memory-consolidation.cjs')}"` }] }]
      }
    }, null, 2));

    fs.symlinkSync(fixtureRoot, path.join(home, '.agents'));

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
    assert.match(result.stderr, /Claude get-shit-done surface must be a symlink/);
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
  const referenceLibrary = read('contexts/reference-library.md');
  const uiUxBrief = read('contexts/ui-ux.md');
  const uiUxRouting = read('rules/common/ui-ux-routing.md');
  const learningLoop = read('rules/common/learning-loop.md');
  const qualityGate = read('rules/common/output-quality-gate.md');
  const creativeAssembly = read('capsules/creative-redesign/assembly.md');
  const apiCritic = read('capsules/api-workflow/critic.md');

  assert.match(userTaste, /## Preferred Characteristics/);
  assert.match(userTaste, /## Recent Confirmations/);
  assert.match(referenceLibrary, /## Approved Sources/);
  assert.match(uiUxBrief, /Placeholder values such as/);
  assert.match(uiUxRouting, /Placeholder content such as `Not set`/);
  assert.match(learningLoop, /## Required Flow/);
  assert.match(learningLoop, /lesson-tools\.mjs quick-capture/);
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
  const geminiEntrypointLink = manifest.symlinks.find((entry) =>
    entry.tool === 'antigravity' && entry.source === '~/.gemini/GEMINI.md'
  );
  const geminiGsdLink = manifest.symlinks.find((entry) =>
    entry.tool === 'antigravity' && entry.source === '~/.gemini/get-shit-done'
  );

  assert.ok(claudePromptLink);
  assert.equal(claudePromptLink.target, '~/.agents/adapters/claude-code/CLAUDE.md');
  assert.ok(openclawPromptLink);
  assert.equal(openclawPromptLink.target, '~/.agents/prompts/system.md');
  assert.ok(geminiEntrypointLink);
  assert.equal(geminiEntrypointLink.target, '~/.agents/adapters/antigravity/GEMINI.md');
  assert.ok(geminiGsdLink);
  assert.equal(geminiGsdLink.target, '~/.agents/get-shit-done');
  assert.deepEqual(Object.keys(capabilities).sort(), ['antigravity', 'claude-code', 'codex-cli', 'openclaw', 'opencode']);
  assert.equal(capabilities['claude-code'].entrypoint.status, 'bridged');
  assert.equal(capabilities['claude-code'].commands.status, 'native');
  assert.equal(capabilities['claude-code'].settings.status, 'validated-local');
  assert.equal(capabilities['codex-cli'].commands.status, 'unsupported');
  assert.equal(capabilities['codex-cli'].hooks.status, 'unsupported');
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
    ['agents']
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
  assert.match(codex, /what the hub currently manages for Codex/);
  assert.match(codex, /AGENTS-routing compatibility/);
  assert.match(codex, /Explicit memory bridge parity only/);
  assert.match(codex, /native hook writeback bridge/);
  assert.match(opencode, /gen-opencode-agents/);
  assert.match(opencode, /agents: `bridged`/);
  assert.match(opencode, /OpenCode upstream supports command files and plugin event hooks/);
  assert.match(opencode, /gsd memory-sync/);
  assert.match(opencode, /memory-sync-bridge\.mjs/);
  assert.match(opencode, /Explicit memory bridge parity only/);
  assert.match(antigravity, /~\/\.gemini\/GEMINI\.md/);
  assert.match(antigravity, /skills: `native` through Gemini's `~\/\.agents\/skills` user-scope alias/);
  assert.match(antigravity, /~\/\.gemini\/get-shit-done -> ~\/\.agents\/get-shit-done/);
  assert.match(antigravity, /commands: `bridged`/);
  assert.match(antigravity, /agents: `bridged` through generated Gemini-schema agent files/);
  assert.match(antigravity, /Gemini CLI upstream supports custom commands, extensions, MCP, and native memory/);
  assert.match(antigravity, /gsd memory-sync/);
  assert.match(antigravity, /memory-sync-bridge\.mjs/);
  assert.match(antigravity, /Explicit memory bridge parity only/);
  assert.match(geminiWrapper, /# Gemini Workflow Wrapper/);
  assert.match(geminiWrapper, /@~\/\.agents\/prompts\/system\.md/);
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
    `node "${path.join(claudeDir, 'hooks/gsd-check-update.cjs')}"`
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
    `node "${path.join(claudeDir, 'hooks/gsd-statusline.js')}"`
  );
  assert.equal(settings.enabledPlugins['typescript-lsp@claude-plugins-official'], true);
});

test('GSD workflow docs use supported gsd-tools commands for Nyquist and validation commits', () => {
  const validatePhase = read('get-shit-done/workflows/validate-phase.md');
  const auditMilestone = read('get-shit-done/workflows/audit-milestone.md');
  const planPhase = read('get-shit-done/workflows/plan-phase.md');

  assert.match(validatePhase, /config-get workflow\.nyquist_validation --raw/);
  assert.doesNotMatch(validatePhase, /config get workflow\.nyquist_validation/);
  assert.match(auditMilestone, /config-get workflow\.nyquist_validation --raw/);
  assert.doesNotMatch(auditMilestone, /config get workflow\.nyquist_validation/);

  assert.match(validatePhase, /gsd-tools\.cjs" commit "docs\(phase-\$\{PHASE\}\): add\/update validation strategy"/);
  assert.match(validatePhase, /--files "\$\{PHASE_DIR\}\/\$\{PADDED_PHASE\}-VALIDATION\.md"/);
  assert.match(planPhase, /commit "docs\(phase-\$\{PHASE\}\): add validation strategy" --files "\$\{PHASE_DIR\}\/\$\{PADDED_PHASE\}-VALIDATION\.md"/);
  assert.doesNotMatch(validatePhase, /commit-docs/);
  assert.doesNotMatch(planPhase, /commit-docs/);
});
