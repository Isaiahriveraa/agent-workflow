#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureProjectContext } from './project-context.mjs';
import { readActiveExecutionState } from './execution-state-tools.mjs';

const project = ensureProjectContext();
const agentsRoot = project.agentsRoot;
const cwd = project.projectRoot;

const parseArgs = (args) => {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current.startsWith('--')) continue;
    const next = args[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[current.slice(2)] = true;
      continue;
    }
    parsed[current.slice(2)] = next;
    index += 1;
  }
  return parsed;
};

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');

const readJson = (filePath) => {
  try {
    return JSON.parse(readFile(filePath));
  } catch {
    return null;
  }
};

const readStateMarkdown = () => readFile(project.contextPaths.state);

const readFirstBullet = (content, heading, fallback = 'none') => {
  const match = content.match(new RegExp(`${heading}\\n-\\s+(.*)`));
  return match ? match[1].trim() : fallback;
};

const hasRunnableVerification = () => {
  const packageJson = readJson(path.join(cwd, 'package.json'));
  const scripts = packageJson?.scripts ?? {};
  return typeof scripts.test === 'string' || typeof scripts['validate:ssot'] === 'string';
};

const parseContextRemaining = (value) => {
  if (value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const buildDecision = ({
  recommendedAction,
  reason,
  confidence,
  workflowState,
  execution,
  checks
}) => ({
  recommended_action: recommendedAction,
  reason,
  confidence,
  workflow_state: workflowState,
  execution: execution
    ? {
        path: execution.path,
        status: execution.state.status,
        current_task_key: execution.state.current_task_key ?? null,
        active_plan: execution.state.active_plan ?? null
      }
    : null,
  checks
});

export const evaluateAutonomy = ({
  stateContent,
  execution = readActiveExecutionState(),
  contextRemaining,
  verificationAvailable = hasRunnableVerification()
} = {}) => {
  const state = stateContent ?? readStateMarkdown();
  const workflowState = {
    workflow: readFirstBullet(state, '## Current Workflow'),
    phase: readFirstBullet(state, '## Current Phase'),
    next_step: readFirstBullet(state, '## Next Step'),
    related_plan: readFirstBullet(state, '## Related Plan')
  };

  const checks = {
    has_active_workflow: workflowState.workflow !== 'none',
    has_next_step: workflowState.next_step !== 'none',
    has_related_plan: workflowState.related_plan !== 'none',
    execution_active: execution?.state?.status === 'active',
    execution_paused: execution?.state?.status === 'paused',
    execution_terminal: execution ? ['completed', 'stopped'].includes(execution.state.status) : false,
    current_task_key: execution?.state?.current_task_key ?? null,
    context_remaining: contextRemaining,
    verification_available: verificationAvailable
  };

  if (contextRemaining != null && contextRemaining <= 25) {
    return buildDecision({
      recommendedAction: 'checkpoint',
      reason: 'Remaining context is critically low, so the safest next step is to checkpoint or hand off before continuing.',
      confidence: 0.96,
      workflowState,
      execution,
      checks
    });
  }

  if (checks.execution_paused) {
    return buildDecision({
      recommendedAction: 'resume_execution',
      reason: 'An execution state is paused, so the next best action is to resume or deliberately clear it before starting new work.',
      confidence: 0.92,
      workflowState,
      execution,
      checks
    });
  }

  if (checks.execution_terminal) {
    return buildDecision({
      recommendedAction: 'clear_execution',
      reason: 'Execution state is terminal, so it should be cleared or replaced before more continuation logic runs.',
      confidence: 0.9,
      workflowState,
      execution,
      checks
    });
  }

  if (checks.execution_active) {
    return buildDecision({
      recommendedAction: 'continue',
      reason: checks.current_task_key
        ? `Execution is active on ${checks.current_task_key}, so work should continue on the current task.`
        : 'Execution is active, so work should continue on the current plan before starting something new.',
      confidence: 0.9,
      workflowState,
      execution,
      checks
    });
  }

  if (checks.has_active_workflow && checks.has_related_plan && checks.has_next_step) {
    return buildDecision({
      recommendedAction: verificationAvailable ? 'resume_plan' : 'continue',
      reason: verificationAvailable
        ? 'Workflow state is active and verification surfaces are available, so the next step should resume the tracked plan intentionally.'
        : 'Workflow state is active, so the next step should continue from the tracked plan state.',
      confidence: 0.84,
      workflowState,
      execution,
      checks
    });
  }

  return buildDecision({
    recommendedAction: 'idle',
    reason: 'No active workflow or execution state is present, so there is nothing to continue automatically.',
    confidence: 0.78,
    workflowState,
    execution,
    checks
  });
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));

  if (command === 'evaluate') {
    const stateContent = args.state ? readFile(path.resolve(args.state)) : undefined;
    const decision = evaluateAutonomy({
      stateContent,
      contextRemaining: parseContextRemaining(args['context-remaining'])
    });
    console.log(JSON.stringify(decision, null, 2));
  } else {
    console.error('Usage: node scripts/autonomy-tools.mjs evaluate [--state /abs/path] [--context-remaining N]');
    process.exitCode = 1;
  }
}
