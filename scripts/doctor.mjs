#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

import { ensureProjectContext } from './project-context.mjs';
import { readActiveExecutionState } from './execution-state-tools.mjs';
import { getMemoryHealth } from './memory-health-check.mjs';
import { detectProvider, route } from './model-router.mjs';

const project = ensureProjectContext();
const STALE_EXECUTION_MS = 6 * 60 * 60 * 1000;

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');

const readJson = (filePath) => {
  try {
    return JSON.parse(readFile(filePath));
  } catch {
    return null;
  }
};

const readFirstBullet = (content, heading, fallback = 'none') => {
  const match = content.match(new RegExp(`${heading}\\n-\\s+(.*)`));
  return match ? match[1].trim() : fallback;
};

const readSection = (content, heading) => {
  const headingMarker = `${heading}\n`;
  const headingIndex = content.indexOf(headingMarker);
  if (headingIndex === -1) return '';

  const sectionStart = headingIndex + headingMarker.length;
  const nextHeadingIndex = content.indexOf('\n## ', sectionStart);
  const sectionEnd = nextHeadingIndex === -1 ? content.length : nextHeadingIndex;
  return content.slice(sectionStart, sectionEnd).trim();
};

const detectAdapterStatus = () => {
  const manifest = readJson(path.join(project.agentsRoot, 'manifest.json')) ?? {};
  const capabilities = manifest.capabilities ?? {};
  const summarize = (tool, fields) => {
    const entry = capabilities[tool] ?? {};
    return Object.fromEntries(fields.map((field) => [
      field,
      entry[field]?.status ?? 'unknown'
    ]));
  };

  return {
    'claude-code': summarize('claude-code', ['hooks', 'session_continuity', 'settings']),
    opencode: summarize('opencode', ['commands', 'agents', 'hooks', 'session_continuity']),
    'codex-cli': summarize('codex-cli', ['agents', 'hooks', 'session_continuity']),
    antigravity: summarize('antigravity', ['commands', 'agents', 'hooks', 'session_continuity']),
    openclaw: summarize('openclaw', ['workspace_wrappers', 'memory', 'session_continuity'])
  };
};

const detectVerification = () => {
  const packageJson = readJson(path.join(project.projectRoot, 'package.json')) ?? {};
  const scripts = packageJson.scripts ?? {};
  return {
    available: typeof scripts.test === 'string' || typeof scripts['validate:ssot'] === 'string',
    preferred: ['validate:ssot', 'test'].filter((name) => typeof scripts[name] === 'string')
  };
};

const detectRouter = () => {
  const configPath = path.join(project.agentsRoot, 'config', 'model-router.json');
  const config = readJson(configPath);
  const provider = detectProvider();
  const probe = route({
    taskDescription: 'implement phase 3 diagnostics and guardrails',
    provider,
    intentKind: 'implementation'
  });

  return {
    provider,
    config_present: fs.existsSync(configPath),
    config_valid: fs.existsSync(configPath) ? Boolean(config) : true,
    config_path: fs.existsSync(configPath) ? configPath : null,
    sample_resolution: {
      category: probe.category,
      intent_kind: probe.intent_kind,
      primary_model: probe.primary_model,
      fallback_candidates: probe.fallback_candidates,
      provenance: probe.provenance
    }
  };
};

const detectContinuity = () => {
  const stateContent = readFile(project.contextPaths.state);
  const workingSetSection = readSection(stateContent, '## Active Artifact Working Set');
  const selectedPath = (category) => {
    const match = workingSetSection.match(new RegExp(`- ${category}:\\s+(.*)`));
    return match ? match[1].trim() : 'none';
  };
  return {
    state_path: project.contextPaths.state,
    session_index_path: project.contextPaths.sessionIndex,
    current_workflow: readFirstBullet(stateContent, '## Current Workflow'),
    current_phase: readFirstBullet(stateContent, '## Current Phase'),
    next_step: readFirstBullet(stateContent, '## Next Step'),
    related_plan: readFirstBullet(stateContent, '## Related Plan'),
    working_set_present: workingSetSection.includes('### Selected By Category'),
    handoff_selected: /- handoff:\s+(?!none$).+/m.test(workingSetSection),
    session_selected: /- session:\s+(?!none$).+/m.test(workingSetSection),
    session_path: selectedPath('session'),
    handoff_path: selectedPath('handoff')
  };
};

const detectExecution = () => {
  const execution = readActiveExecutionState();
  if (!execution) {
    return {
      present: false,
      path: path.join(project.projectDir, 'runtime', 'execution', 'active.json'),
      status: 'missing',
      current_task_key: null,
      updated_at: null,
      stale: false
    };
  }

  const updatedAt = execution.state.updated_at ?? null;
  const stale = Boolean(
    updatedAt
    && ['active', 'paused'].includes(execution.state.status)
    && (Date.now() - new Date(updatedAt).getTime()) > STALE_EXECUTION_MS
  );

  return {
    present: true,
    path: execution.path,
    status: execution.state.status,
    current_task_key: execution.state.current_task_key ?? null,
    active_plan: execution.state.active_plan ?? null,
    notes_dir: execution.state.notes_dir ?? null,
    updated_at: updatedAt,
    stale
  };
};

const buildActions = ({ continuity, execution, router, memory }) => {
  const actions = [];

  if (execution.present && execution.stale) {
    actions.push({
      issue: 'stale_execution_state',
      severity: 'high',
      rationale: 'Execution state is still marked active or paused, but its last update is older than the stale threshold.',
      recommended_command: '/stop-work',
      suggested_transition: execution.status === 'paused' ? 'resume or clear' : 'pause or stop'
    });
  }

  if (execution.present && ['completed', 'stopped'].includes(execution.status)) {
    actions.push({
      issue: 'terminal_execution_state',
      severity: 'medium',
      rationale: 'Execution state is terminal and should be cleared before more continuation logic runs.',
      recommended_command: '/stop-work',
      suggested_transition: 'clear'
    });
  }

  if (!execution.present && continuity.related_plan !== 'none') {
    actions.push({
      issue: 'missing_execution_state',
      severity: 'medium',
      rationale: 'Workflow state points at an active plan, but there is no execution sidecar to track current task progress.',
      recommended_command: '/start-work'
    });
  }

  if (!execution.present && continuity.session_selected && continuity.session_path !== 'none') {
    actions.push({
      issue: 'stale_session_selection',
      severity: 'medium',
      rationale: 'The working set still points at a session artifact even though no active execution state exists.',
      recommended_command: `/resume-session ${continuity.session_path}`
    });
  }

  if (!execution.present && continuity.handoff_selected && continuity.handoff_path !== 'none') {
    actions.push({
      issue: 'stale_handoff_selection',
      severity: 'medium',
      rationale: 'The working set points at a handoff artifact and no active execution state is present.',
      recommended_command: `/resume_handoff ${continuity.handoff_path}`
    });
  }

  if (!router.config_valid) {
    actions.push({
      issue: 'invalid_router_config',
      severity: 'medium',
      rationale: 'The model-router config exists but could not be parsed.',
      recommended_command: '/project-doctor'
    });
  }

  if (memory.ok !== true) {
    actions.push({
      issue: 'memory_health',
      severity: memory.status === 'fatal' ? 'high' : 'medium',
      rationale: `Memory health is ${memory.status}.`,
      recommended_command: 'node ~/.agents/scripts/memory-health-check.mjs'
    });
  }

  return actions;
};

export const buildDoctorReport = () => {
  const continuity = detectContinuity();
  const execution = detectExecution();
  const verification = detectVerification();
  const router = detectRouter();
  const memory = getMemoryHealth().result;
  const adapters = detectAdapterStatus();
  const actions = buildActions({ continuity, execution, router, memory });

  const warnings = [];
  if (!execution.present && continuity.related_plan !== 'none') {
    warnings.push('workflow has a related plan but no active execution state');
  }
  if (execution.stale) {
    warnings.push('execution state appears stale and should be paused, stopped, resumed, or cleared deliberately');
  }
  if (execution.present && ['completed', 'stopped'].includes(execution.status)) {
    warnings.push('execution state is terminal and should be cleared before more continuation work starts');
  }
  if (!execution.present && continuity.session_selected && continuity.session_path !== 'none') {
    warnings.push('working set still points at a session artifact without active execution state');
  }
  if (!execution.present && continuity.handoff_selected && continuity.handoff_path !== 'none') {
    warnings.push('working set points at a handoff artifact without active execution state');
  }
  if (!router.config_valid) {
    warnings.push('model-router config file exists but could not be parsed');
  }
  if (memory.ok !== true) {
    warnings.push(`memory health is ${memory.status}`);
  }

  return {
    ok: warnings.length === 0,
    recommended_next_command: actions[0]?.recommended_command ?? null,
    project: {
      root: project.projectRoot,
      slug: project.projectSlug
    },
    continuity,
    execution,
    verification,
    router,
    memory,
    adapters,
    warnings,
    actions
  };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] ?? 'report';

  switch (command) {
    case 'report':
      console.log(JSON.stringify(buildDoctorReport(), null, 2));
      break;
    default:
      console.error('Usage: node scripts/doctor.mjs [report]');
      process.exitCode = 1;
  }
}
