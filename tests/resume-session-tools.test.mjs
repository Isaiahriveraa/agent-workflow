import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);

const createFixtureRepo = (baseDir, name) => {
  const repoRoot = path.join(baseDir, name);
  fs.mkdirSync(path.join(repoRoot, '.git'), { recursive: true });
  return repoRoot;
};

const writeMinimalContext = (context) => {
  const files = {
    [context.contextPaths.state]: `# Workflow State\n\n## Current Workflow\n- none\n\n## Current Phase\n- none\n\n## Next Step\n- none\n\n## Blockers\n- None.\n\n## Last Verified At\n- none\n\n## Related Plan\n- none\n\n## Active Artifact Working Set\n- Last updated: none\n- Source: none\n- Focus: none\n\n### Selected By Category\n- intake: none\n- plan: none\n- research: none\n- session: none\n- handoff: none\n\n### Ordered Artifacts\n1. none\n`,
    [context.contextPaths.sessionIndex]: `# Session Index\n\n## Active Sessions\n- No active sessions recorded.\n\n## Recent Sessions\n- No recent sessions recorded.\n\n## Entry Template\n- Session ID:\n- Date:\n- Topic:\n- Status:\n- Artifact path:\n- Related plan:\n- Next command:\n- Summary:\n`
  };
  for (const [filePath, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
};

const runProjectContext = (repoRoot) =>
  JSON.parse(execFileSync('node', ['scripts/project-context.mjs', 'current'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot
    }
  }));

const runResumeSession = (repoRoot, target) =>
  JSON.parse(execFileSync('node', ['scripts/resume-session-tools.mjs', 'resume', ...(target ? [target] : [])], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENTS_PROJECT_ROOT: repoRoot
    }
  }));

const writeSessionIndex = (sessionIndexPath, artifactPath, planPath) => {
  fs.writeFileSync(sessionIndexPath, `# Session Index

## Active Sessions
- Session ID: active-session
- Date: 2026-03-29T21:00:00Z
- Topic: Resume Work
- Status: active
- Artifact path: ${artifactPath}
- Related plan: ${planPath}
- Next command: /resume-session ${artifactPath}
- Summary: Resume from session

## Recent Sessions
- No recent sessions recorded.

## Entry Template
- Session ID:
- Date:
- Topic:
- Status:
- Artifact path:
- Related plan:
- Next command:
- Summary:
`);
};

const writeSessionArtifact = (artifactPath, { planPath, nextCommand = '/resume-session', currentTask = 'none', executionPath = 'none' }) => {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `---
session_id: ${path.basename(artifactPath, '.md')}
date: 2026-03-29T21:00:00Z
topic: "Resume Work"
status: active
related_plan: ${planPath}
related_research:
  - none
execution_state: ${executionPath}
next_command: ${nextCommand}
---

# Session: Resume Work

## Current Position
- Workflow: implementation
- Phase: phase 3
- Focus: execution-aware resume

## Active Artifacts
- ${planPath}

## Active Execution
- Path: ${executionPath}
- Status: ${executionPath === 'none' ? 'none' : 'active'}
- Current task: ${currentTask}

## Decisions In Force
- Keep the working set aligned.

## Blockers
- None.

## Next Action
- Continue the current plan
`);
};

test('resume-session resolves the active session when no explicit target is provided and recommends start-work for tracked plan recovery', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-resume-session-')), 'default-active');
  const context = runProjectContext(repoRoot);
  writeMinimalContext(context);
  const planPath = path.join(root, 'thoughts', 'plans', `resume-session-plan-${path.basename(repoRoot)}.md`);
  const sessionPath = path.join(repoRoot, '.omx', 'sessions', '2026-03-29_14-00-00_resume-work.md');

  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.writeFileSync(planPath, '# plan\n');
  writeSessionArtifact(sessionPath, { planPath });
  writeSessionIndex(context.contextPaths.sessionIndex, sessionPath, planPath);

  try {
    const result = runResumeSession(repoRoot);
    assert.equal(result.found, true);
    assert.equal(result.session.path, sessionPath);
    assert.equal(result.session.source, 'active-session');
    assert.equal(result.recommended_next_command, '/start-work');
    assert.equal(result.recovery.strategy, 'doctor_guided');
    assert.equal(result.recovery.kind, 'ordinary_session_resume');
    assert.equal(result.execution_guidance.present, false);
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    fs.rmSync(planPath, { force: true });
  }
});

test('resume-session prioritizes start-work when live execution exists', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-resume-session-')), 'active-execution');
  const context = runProjectContext(repoRoot);
  writeMinimalContext(context);
  const planPath = path.join(root, 'thoughts', 'plans', `resume-session-plan-${path.basename(repoRoot)}.md`);
  const sessionPath = path.join(repoRoot, '.omx', 'sessions', '2026-03-29_14-00-00_resume-work.md');
  const executionPath = path.join(repoRoot, '.omx', 'runtime', 'execution', 'active.json');

  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.mkdirSync(path.dirname(executionPath), { recursive: true });
  fs.writeFileSync(planPath, '# plan\n');
  writeSessionArtifact(sessionPath, { planPath, currentTask: 'phase-3-step-1-line-71' });
  writeSessionIndex(context.contextPaths.sessionIndex, sessionPath, planPath);
  fs.writeFileSync(executionPath, JSON.stringify({
    schema: 'execution-state.v1',
    active_plan: planPath,
    plan_name: 'resume session plan',
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'active',
    session_ids: [],
    current_task_key: 'phase-3-step-2-line-83',
    completed_task_keys: [],
    task_sessions: {}
  }, null, 2));

  try {
    const result = runResumeSession(repoRoot);
    assert.equal(result.recommended_next_command, '/start-work');
    assert.equal(result.execution.current_task_key, 'phase-3-step-2-line-83');
    assert.equal(result.conflicts[0].type, 'active_execution_conflicts_with_session');
    assert.equal(result.recovery.strategy, 'live_execution');
    assert.equal(result.recovery.kind, 'ordinary_session_resume');
    assert.equal(result.execution_guidance.remaining_task_count, 1);
    assert.match(result.execution_guidance.reminder, /Continue the current task/);
    assert.equal(result.orchestration.decision, 'delegate_executor');
    assert.equal(result.orchestration.current_task.key, 'phase-3-step-2-line-83');
    assert.equal(result.orchestration.delegated_task.executor_constraints.length, 3);

    const state = fs.readFileSync(context.contextPaths.state, 'utf8');
    assert.match(state, /## Current Workflow\n- implementation/);
    assert.match(state, new RegExp(`- session: ${sessionPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    fs.rmSync(planPath, { force: true });
  }
});

test('resume-session respects explicit session artifacts and preserves their non-generic next command', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-resume-session-')), 'explicit-session');
  const context = runProjectContext(repoRoot);
  writeMinimalContext(context);
  const planPath = path.join(root, 'thoughts', 'plans', `resume-session-plan-${path.basename(repoRoot)}.md`);
  const sessionPath = path.join(repoRoot, '.omx', 'sessions', '2026-03-29_14-00-00_resume-work.md');

  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.writeFileSync(planPath, '# plan\n');
  writeSessionArtifact(sessionPath, { planPath, nextCommand: '/project-doctor' });
  writeSessionIndex(context.contextPaths.sessionIndex, sessionPath, planPath);

  try {
    const result = runResumeSession(repoRoot, sessionPath);
    assert.equal(result.recommended_next_command, '/project-doctor');
    assert.equal(result.session.source, 'explicit-path');
    assert.equal(result.working_set.selected.session, sessionPath);
    assert.equal(result.recovery.strategy, 'recorded_session_command');
    assert.equal(result.recovery.source, 'session-frontmatter');
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    fs.rmSync(planPath, { force: true });
  }
});

test('resume-session marks warning-threshold sessions as context-pressure recovery', () => {
  const repoRoot = createFixtureRepo(fs.mkdtempSync(path.join(os.tmpdir(), 'agents-resume-session-')), 'warning-threshold');
  const context = runProjectContext(repoRoot);
  writeMinimalContext(context);
  const planPath = path.join(root, 'thoughts', 'plans', `resume-session-plan-${path.basename(repoRoot)}.md`);
  const sessionPath = path.join(repoRoot, '.omx', 'sessions', '2026-03-29_14-00-00_warning-context-threshold.md');

  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.writeFileSync(planPath, '# plan\n');
  writeSessionArtifact(sessionPath, {
    planPath,
    nextCommand: '/resume_handoff /tmp/example-handoff.md'
  });
  writeSessionIndex(context.contextPaths.sessionIndex, sessionPath, planPath);

  const content = fs.readFileSync(sessionPath, 'utf8').replace(
    'topic: "Resume Work"',
    'topic: "Warning Context Threshold"'
  ).replace(
    '- Focus: execution-aware resume',
    '- Focus: Warning Context Threshold'
  );
  fs.writeFileSync(sessionPath, content);

  try {
    const result = runResumeSession(repoRoot, sessionPath);
    assert.equal(result.recovery.kind, 'compaction_or_context_pressure_recovery');
    assert.equal(result.recovery.strategy, 'recorded_session_command');
    assert.equal(result.recommended_next_command, '/resume_handoff /tmp/example-handoff.md');
    assert.equal(result.execution_guidance.present, false);
  } finally {
    fs.rmSync(path.dirname(repoRoot), { recursive: true, force: true });
    fs.rmSync(planPath, { force: true });
  }
});
