import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureProjectContext } from './project-context.mjs';
import { readActiveExecutionState, buildExecutionGuidance } from './execution-state-tools.mjs';
import { detectProvider, route } from './model-router.mjs';

const project = ensureProjectContext();
const NOTE_FILES = Object.freeze([
  'learnings.md',
  'decisions.md',
  'issues.md',
  'verification.md',
  'problems.md'
]);

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');

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

const readFirstBullet = (content, heading, fallback = 'none') => {
  const match = content.match(new RegExp(`${heading}\\n-\\s+(.*)`));
  return match ? match[1].trim() : fallback;
};

const readStateContext = () => {
  const content = readFile(project.contextPaths.state);
  return {
    workflow: readFirstBullet(content, '## Current Workflow'),
    phase: readFirstBullet(content, '## Current Phase'),
    nextStep: readFirstBullet(content, '## Next Step'),
    relatedPlan: readFirstBullet(content, '## Related Plan')
  };
};

const deriveAccelerationMode = (provider) => {
  if (provider === 'claude-code') {
    return {
      mode: 'claude-first-accelerated',
      honest_degraded: false,
      rationale: 'Claude Code is the first adapter in this repo with native hook-backed workflow acceleration.'
    };
  }

  return {
    mode: 'honest-degraded',
    honest_degraded: true,
    rationale: 'This adapter does not currently have native orchestration enforcement in the repo, so the contract is conventional rather than runtime-enforced.'
  };
};

const buildConductorResponsibilities = ({ state, execution, executionGuidance }) => {
  const responsibilities = [
    'Read the active plan and continue from the current task instead of restarting the whole effort.',
    'Delegate only bounded implementation, fix, or investigation tasks.',
    'Verify delegated results before advancing plan progress.'
  ];

  if (execution?.state?.active_plan) {
    responsibilities.push(`Stay anchored to the active execution plan: ${execution.state.active_plan}.`);
  } else if (state.relatedPlan !== 'none') {
    responsibilities.push(`Use the tracked plan as the orchestration authority: ${state.relatedPlan}.`);
  }

  if (executionGuidance.current_task?.label) {
    responsibilities.push(`Current task focus: ${executionGuidance.current_task.label}.`);
  }

  return responsibilities;
};

const buildExecutorResponsibilities = ({ routing }) => [
  'Stay focused on the delegated task scope and do not redelegate by default.',
  `Use the delegated routing category ${routing.category} with primary model ${routing.primary_model}.`,
  'Read carried-forward notes before editing or verifying code.',
  'Return results in a reviewable form with verification notes.'
];

export const buildOrchestrationContract = ({
  taskDescription,
  provider,
  intentKind,
  category,
  execution = readActiveExecutionState()
} = {}) => {
  const state = readStateContext();
  const executionGuidance = buildExecutionGuidance(execution);
  const providerName = provider ?? detectProvider();
  const taskInput = taskDescription
    ?? executionGuidance.current_task?.label
    ?? state.nextStep
    ?? 'continue the active plan';
  const effectiveIntentKind = intentKind
    ?? (
      executionGuidance.present
      && execution?.state?.status === 'active'
      && executionGuidance.current_task
        ? 'implementation'
        : undefined
    );
  const routing = route({
    taskDescription: taskInput,
    provider: providerName,
    intentKind: effectiveIntentKind,
    category,
    workflowTier: 3
  });
  const acceleration = deriveAccelerationMode(providerName);
  const notesDir = execution?.state?.notes_dir ?? null;
  const warnings = [];

  if (!executionGuidance.present) {
    warnings.push('No active execution state is present; initialize or resume execution before orchestration delegates work.');
  }
  if (executionGuidance.cleanup?.reason) {
    warnings.push(executionGuidance.cleanup.reason);
  }
  if (acceleration.honest_degraded) {
    warnings.push(acceleration.rationale);
  }

  const shouldDelegate = Boolean(
    executionGuidance.present
    && execution?.state?.status === 'active'
    && ['implementation', 'fix', 'investigation'].includes(routing.intent_kind)
  );

  return {
    contract_version: 'orchestration-contract.v1',
    workflow: state.workflow,
    phase: state.phase,
    provider: providerName,
    acceleration,
    intent_reset: {
      required: true,
      intent_kind: routing.intent_kind,
      rationale: 'Reset turn-local intent before orchestration so conductor mode does not drift across turns.'
    },
    execution: execution
      ? {
          path: execution.path,
          status: execution.state.status,
          active_plan: execution.state.active_plan ?? null,
          current_task_key: execution.state.current_task_key ?? null
        }
      : null,
    execution_guidance: executionGuidance,
    routing,
    conductor: {
      should_delegate: shouldDelegate,
      responsibilities: buildConductorResponsibilities({ state, execution, executionGuidance }),
      forbidden: [
        'Do not bypass execution state when choosing the next task.',
        'Do not silently switch adapters into stronger orchestration claims than they support.',
        'Do not collapse conductor and executor roles into the same unconstrained pass.'
      ]
    },
    executor: {
      non_redelegating_by_default: true,
      responsibilities: buildExecutorResponsibilities({ routing }),
      learnings_handoff: {
        notes_dir: notesDir,
        required_files: notesDir ? NOTE_FILES.map((file) => path.join(notesDir, file)) : [],
        instruction: notesDir
          ? 'Read the active execution notes before starting work and append verification or learnings before returning.'
          : 'No active notes directory is present, so the delegated task must rely on the active plan and returned verification notes.'
      }
    },
    verification_gate: {
      required: true,
      expectations: [
        'Review delegated output against the active plan and current task.',
        'Run the relevant automated verification before advancing plan progress.',
        'Record learnings or verification notes back into the execution note files when they exist.'
      ]
    },
    recommended_next_command: executionGuidance.cleanup?.recommended_command
      ?? (!executionGuidance.present ? '/start-work' : null),
    warnings
  };
};

export const buildDelegationDecision = (options = {}) => {
  const contract = buildOrchestrationContract(options);
  const currentTask = contract.execution_guidance.current_task;
  const shouldDelegate = contract.conductor.should_delegate;

  if (!shouldDelegate) {
    return {
      contract_version: contract.contract_version,
      decision: 'stay_conductor',
      reason: contract.warnings[0]
        ?? 'No active execution-backed task is ready for bounded delegation.',
      next_command: contract.recommended_next_command,
      current_task: currentTask,
      routing: contract.routing,
      acceleration: contract.acceleration
    };
  }

  return {
    contract_version: contract.contract_version,
    decision: 'delegate_executor',
    reason: currentTask
      ? `Delegate the current execution task ${currentTask.label} using the category-first routing decision.`
      : 'Delegate the current bounded task using the category-first routing decision.',
    next_command: null,
    current_task: currentTask,
    routing: contract.routing,
    acceleration: contract.acceleration,
    delegated_task: {
      task_label: currentTask?.label ?? options.taskDescription ?? contract.execution_guidance.current_task?.label ?? 'current task',
      task_scope: currentTask?.scope ?? 'active plan',
      active_plan: contract.execution?.active_plan ?? null,
      notes_dir: contract.executor.learnings_handoff.notes_dir,
      required_note_files: contract.executor.learnings_handoff.required_files,
      executor_constraints: [
        'Do not redelegate by default.',
        'Stay within the delegated task scope.',
        'Return verification notes with the implementation result.'
      ],
      verification_expectations: contract.verification_gate.expectations
    }
  };
};

const command = process.argv[2] ?? 'contract';
const args = parseArgs(process.argv.slice(3));

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  if (command === 'contract') {
    console.log(JSON.stringify(buildOrchestrationContract({
      taskDescription: args.input,
      provider: args.provider,
      intentKind: args.intent,
      category: args.category
    }), null, 2));
  } else if (command === 'decide') {
    console.log(JSON.stringify(buildDelegationDecision({
      taskDescription: args.input,
      provider: args.provider,
      intentKind: args.intent,
      category: args.category
    }), null, 2));
  } else {
    console.error('Usage: node scripts/orchestration-contract-tools.mjs <contract|decide> [--input "..."] [--provider ...] [--intent ...] [--category ...]');
    process.exitCode = 1;
  }
}
