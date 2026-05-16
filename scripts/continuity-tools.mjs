import fs from 'node:fs';
import path from 'node:path';
import { ensureProjectContext } from './project-context.mjs';
import { persistWorkingSetSelection } from './artifact-tools.mjs';
import { writeMarkdownSections } from './runtime-state-tools.mjs';
import { readActiveExecutionState, buildExecutionGuidance } from './execution-state-tools.mjs';
import { buildDoctorReport } from './doctor.mjs';

const project = ensureProjectContext();
const statePath = project.contextPaths.state;
const sessionIndexPath = project.contextPaths.sessionIndex;
const sessionsDir = project.thoughtPaths.sessions;

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');
const readJson = (filePath) => {
  try {
    return JSON.parse(readFile(filePath));
  } catch {
    return null;
  }
};
const parseArgs = (args) => {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current.startsWith('--')) continue;
    parsed[current.slice(2)] = args[index + 1];
    index += 1;
  }
  return parsed;
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'session';

const pad = (value) => String(value).padStart(2, '0');

const timestampParts = (date = new Date()) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}-${minute}-${second}`,
    iso: date.toISOString()
  };
};

const latestSessionFiles = () => {
  if (!fs.existsSync(sessionsDir)) {
    return [];
  }

  return fs
    .readdirSync(sessionsDir)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .reverse()
    .map((file) => path.join(sessionsDir, file));
};

const createPath = (topic) => {
  const parts = timestampParts();
  return path.join(sessionsDir, `${parts.date}_${parts.time}_${slugify(topic)}.md`);
};

const sessionStatus = () => {
  if (!fs.existsSync(sessionIndexPath)) {
    return null;
  }

  return {
    index: readFile(sessionIndexPath),
    latest: latestSessionFiles()[0] ?? null
  };
};

const readFirstBullet = (content, heading) => {
  const match = content.match(new RegExp(`${heading}\\n-\\s+(.*)`));
  return match ? match[1].trim() : 'none';
};

const hasRunnableVerification = () => {
  const packageJson = readJson(path.join(project.projectRoot, 'package.json'));
  const scripts = packageJson?.scripts ?? {};
  return typeof scripts.test === 'string' || typeof scripts['validate:ssot'] === 'string';
};

const buildAutonomyDecision = ({ recommendedAction, reason, confidence, workflowState, execution, checks }) => ({
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

const evaluateAutonomy = ({
  stateContent,
  execution = readActiveExecutionState(),
  contextRemaining,
  verificationAvailable = hasRunnableVerification()
} = {}) => {
  const state = stateContent ?? readFile(statePath);
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
    return buildAutonomyDecision({
      recommendedAction: 'checkpoint',
      reason: 'Remaining context is critically low, so the safest next step is to checkpoint or hand off before continuing.',
      confidence: 0.96,
      workflowState,
      execution,
      checks
    });
  }

  if (checks.execution_paused) {
    return buildAutonomyDecision({
      recommendedAction: 'resume_execution',
      reason: 'An execution state is paused, so the next best action is to resume or deliberately clear it before starting new work.',
      confidence: 0.92,
      workflowState,
      execution,
      checks
    });
  }

  if (checks.execution_terminal) {
    return buildAutonomyDecision({
      recommendedAction: 'clear_execution',
      reason: 'Execution state is terminal, so it should be cleared or replaced before more continuation logic runs.',
      confidence: 0.9,
      workflowState,
      execution,
      checks
    });
  }

  if (checks.execution_active) {
    return buildAutonomyDecision({
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
    return buildAutonomyDecision({
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

  return buildAutonomyDecision({
    recommendedAction: 'idle',
    reason: 'No active workflow or execution state is present, so there is nothing to continue automatically.',
    confidence: 0.78,
    workflowState,
    execution,
    checks
  });
};

const readSection = (content, heading) => {
  const headingMarker = `${heading}\n`;
  const headingIndex = content.indexOf(headingMarker);
  if (headingIndex === -1) {
    return '';
  }

  const sectionStart = headingIndex + headingMarker.length;
  const nextHeadingIndex = content.indexOf('\n## ', sectionStart);
  const sectionEnd = nextHeadingIndex === -1 ? content.length : nextHeadingIndex;
  return content.slice(sectionStart, sectionEnd).trim();
};

const requiredSessionEntryLabels = [
  'Session ID',
  'Date',
  'Topic',
  'Status',
  'Artifact path',
  'Related plan',
  'Next command',
  'Summary'
];

const parseSessionEntryFields = (entry) => Object.fromEntries(
  entry
    .split('\n')
    .map((line) => line.match(/^- ([^:]+):\s*(.*)$/))
    .filter(Boolean)
    .map(([, label, value]) => [label.trim(), value.trim()])
);

const isCompleteSessionEntry = (entry) => {
  const fields = parseSessionEntryFields(entry);
  return requiredSessionEntryLabels.every((label) => fields[label] && fields[label] !== '');
};

const parseSessionEntries = (content, heading) => {
  const section = readSection(content, heading);
  if (!section || /^- No .* recorded\.$/m.test(section)) {
    return [];
  }

  return section
    .split(/(?=^- Session ID: )/m)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter(isCompleteSessionEntry);
};

const buildSessionEntry = ({
  sessionId,
  date,
  topic,
  status,
  artifactPath,
  relatedPlan,
  nextCommand,
  summary
}) => [
  `- Session ID: ${sessionId}`,
  `- Date: ${date}`,
  `- Topic: ${topic}`,
  `- Status: ${status}`,
  `- Artifact path: ${artifactPath}`,
  `- Related plan: ${relatedPlan ?? 'none'}`,
  `- Next command: ${nextCommand}`,
  `- Summary: ${summary}`
].join('\n');

const formatExecutionSummary = (execution) => {
  if (!execution?.state) return 'none';
  const currentTask = execution.state.current_task_key ?? 'none';
  return `${execution.state.status} @ ${currentTask}`;
};

const extractExecutionContext = () => {
  const execution = readActiveExecutionState();
  if (!execution) return null;

  return {
    path: execution.path,
    status: execution.state.status,
    currentTaskKey: execution.state.current_task_key ?? null,
    state: execution.state
  };
};

const formatContinuationGuidance = ({ guidance, nextCommand }) => {
  if (!guidance.present) {
    return [
      '## Continuation Guidance',
      '- No active execution state is present.',
      `- Next recommended command: ${nextCommand}`
    ].join('\n');
  }

  const lines = [
    '## Continuation Guidance',
    `- Remaining tasks: ${guidance.remaining_task_count}`,
    `- Completed tasks: ${guidance.completed_task_count}`,
    `- Next recommended command: ${nextCommand}`
  ];

  if (guidance.current_task) {
    lines.push(`- Current task label: ${guidance.current_task.label}`);
    lines.push(`- Current task scope: ${guidance.current_task.scope}`);
  }

  if (guidance.reminder) {
    lines.push(`- Reminder: ${guidance.reminder}`);
  }

  if (guidance.cleanup) {
    lines.push(`- Cleanup command: ${guidance.cleanup.recommended_command}`);
    lines.push(`- Cleanup reason: ${guidance.cleanup.reason}`);
  }

  for (const task of guidance.next_tasks) {
    lines.push(`- Upcoming task: ${task.label} (${task.scope})`);
  }

  return lines.join('\n');
};

const deriveCheckpointNextCommand = ({ explicitNextCommand, artifactPath, execution, selectedHandoff }) => {
  if (explicitNextCommand) return explicitNextCommand;

  if (!execution && selectedHandoff && selectedHandoff !== 'none') {
    return `/resume_handoff ${selectedHandoff}`;
  }

  const autonomy = evaluateAutonomy();
  const doctor = buildDoctorReport();
  const guidance = buildExecutionGuidance(execution ? { path: execution.path, state: execution.state } : null);
  const recommended = doctor?.recommended_next_command ?? null;
  const action = autonomy?.recommended_action ?? null;

  if (guidance.cleanup?.recommended_command === '/stop-work') {
    return guidance.cleanup.recommended_command;
  }

  if (recommended === '/stop-work') {
    return recommended;
  }

  if (recommended && (recommended.startsWith('/resume_') || recommended === '/project-doctor')) {
    return recommended;
  }

  if (['resume_execution', 'continue', 'resume_plan'].includes(action)) {
    return '/start-work';
  }

  if (execution?.status === 'active' || execution?.status === 'paused') {
    return '/start-work';
  }

  if (recommended) {
    return recommended;
  }

  return `/resume-session ${artifactPath}`;
};

const setStateValues = ({ workflow, phase, nextStep, relatedPlan, verifiedAt }) => {
  writeMarkdownSections({
    filePath: statePath,
    sections: [
      { heading: '## Current Workflow', replacement: `- ${workflow}` },
      { heading: '## Current Phase', replacement: `- ${phase}` },
      { heading: '## Next Step', replacement: `- ${nextStep}` },
      { heading: '## Related Plan', replacement: `- ${relatedPlan ?? 'none'}` },
      { heading: '## Last Verified At', replacement: `- ${verifiedAt}` }
    ]
  });
};

const setActiveSessionIndex = ({ sessionId, iso, topic, artifactPath, relatedPlan, nextCommand, summary }) => {
  writeMarkdownSections({
    filePath: sessionIndexPath,
    sections: [
      {
        heading: '## Active Sessions',
        replacement: buildSessionEntry({
          sessionId,
          date: iso,
          topic,
          status: 'active',
          artifactPath,
          relatedPlan,
          nextCommand,
          summary
        })
      }
    ]
  });
};

const setHandoffSessionIndex = ({ sessionId, iso, topic, artifactPath, relatedPlan, nextCommand, summary }) => {
  const sessionIndex = readFile(sessionIndexPath);
  const recentEntries = parseSessionEntries(sessionIndex, '## Recent Sessions')
    .filter((entry) => !entry.includes(`- Artifact path: ${artifactPath}`));

  writeMarkdownSections({
    filePath: sessionIndexPath,
    sections: [
      {
        heading: '## Active Sessions',
        replacement: '- No active sessions recorded.'
      },
      {
        heading: '## Recent Sessions',
        replacement: [
          buildSessionEntry({
            sessionId,
            date: iso,
            topic,
            status: 'handed_off',
            artifactPath,
            relatedPlan,
            nextCommand,
            summary
          }),
          ...recentEntries
        ].join('\n')
      }
    ]
  });
};

const writeCheckpointArtifact = ({
  artifactPath,
  iso,
  topic,
  workflow,
  phase,
  focus,
  artifacts,
  blockers,
  nextAction,
  nextCommand,
  relatedPlan,
  execution,
  executionGuidance
}) => {
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  const content = [
    '---',
    `session_id: ${path.basename(artifactPath, '.md')}`,
    `date: ${iso}`,
    `topic: "${topic}"`,
    'status: active',
    `related_plan: ${relatedPlan ?? 'none'}`,
    'related_research:',
    `  - ${artifacts.research ?? 'none'}`,
    `execution_state: ${execution?.path ?? 'none'}`,
    `next_command: ${nextCommand}`,
    '---',
    '',
    `# Session: ${topic}`,
    '',
    '## Current Position',
    `- Workflow: ${workflow}`,
    `- Phase: ${phase}`,
    `- Focus: ${focus}`,
    '',
    '## Active Artifacts',
    `- ${artifacts.plan ?? 'none'}`,
    `- ${artifacts.research ?? 'none'}`,
    `- ${artifacts.handoff ?? 'none'}`,
    '',
    '## Active Execution',
    `- Path: ${execution?.path ?? 'none'}`,
    `- Status: ${execution?.status ?? 'none'}`,
    `- Current task: ${execution?.currentTaskKey ?? 'none'}`,
    '',
    formatContinuationGuidance({
      guidance: executionGuidance,
      nextCommand
    }),
    '',
    '## Decisions In Force',
    '- Keep this repo as the provider-agnostic single source of truth.',
    '',
    '## Blockers',
    `- ${blockers}`,
    '',
    '## Next Action',
    `- ${nextAction}`
  ].join('\n');
  fs.writeFileSync(artifactPath, `${content}\n`);
};

const checkpoint = (args) => {
  const state = readFile(statePath);
  const now = timestampParts();
  const topic = args.topic ?? args.focus ?? 'session';
  const workflow = args.workflow ?? readFirstBullet(state, '## Current Workflow');
  const phase = args.phase ?? readFirstBullet(state, '## Current Phase');
  const nextAction = args['next-step'] ?? readFirstBullet(state, '## Next Step');
  const relatedPlan = args.plan ?? readFirstBullet(state, '## Related Plan');
  const blockers = args.blockers ?? readFirstBullet(state, '## Blockers');
  const execution = extractExecutionContext();
  const executionGuidance = buildExecutionGuidance(execution ? { path: execution.path, state: execution.state } : null);
  const artifactPath = createPath(topic);
  const sessionId = path.basename(artifactPath, '.md');

  setStateValues({
    workflow,
    phase,
    nextStep: nextAction,
    relatedPlan: relatedPlan === 'none' ? null : relatedPlan,
    verifiedAt: now.iso
  });

  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  if (!fs.existsSync(artifactPath)) {
    fs.writeFileSync(artifactPath, '');
  }

  const artifactState = persistWorkingSetSelection({
    overrides: {
      plan: args.plan,
      research: args.research,
      session: artifactPath,
      handoff: args.handoff
    },
    metadata: {
      lastUpdated: now.iso,
      mode: 'refresh',
      source: args.source ?? 'continuity-tools',
      focus: args.focus ?? topic
    }
  });

  const nextCommand = deriveCheckpointNextCommand({
    explicitNextCommand: args['next-command'],
    artifactPath,
    execution,
    selectedHandoff: artifactState.selected.handoff
  });

  writeCheckpointArtifact({
    artifactPath,
    iso: now.iso,
    topic,
    workflow,
    phase,
    focus: args.focus ?? topic,
    artifacts: artifactState.selected,
    blockers,
    nextAction,
    nextCommand,
    relatedPlan: relatedPlan === 'none' ? null : relatedPlan,
    execution,
    executionGuidance
  });

  setActiveSessionIndex({
    sessionId,
    iso: now.iso,
    topic,
    artifactPath,
    relatedPlan: relatedPlan === 'none' ? null : relatedPlan,
    nextCommand,
    summary: `Checkpoint created by ${args.source ?? 'continuity-tools'}; execution ${formatExecutionSummary(execution)}`
  });

  return {
    action: 'checkpoint',
    artifactPath,
    sessionId,
    workingSet: artifactState,
    diagnostics: {
      contract_version: 'continuity-tools.v1',
      action: 'checkpoint',
      persistence_mode: artifactState.mode,
      focus: args.focus ?? topic,
      next_command: nextCommand,
      execution: execution
        ? {
          path: execution.path,
          status: execution.status,
          current_task_key: execution.currentTaskKey
        }
        : null,
      execution_guidance: executionGuidance,
      selected_categories: Object.fromEntries(
        Object.entries(artifactState.selected).map(([key, value]) => [key, Boolean(value)])
      )
    },
    execution
  };
};

const handoff = (args) => {
  if (!args.handoff) {
    throw new Error('handoff action requires --handoff <absolute path>');
  }

  const handoffPath = path.resolve(args.handoff);
  const now = timestampParts();
  const state = readFile(statePath);
  const workflow = args.workflow ?? readFirstBullet(state, '## Current Workflow');
  const phase = args.phase ?? readFirstBullet(state, '## Current Phase');
  const nextAction = args['next-step'] ?? readFirstBullet(state, '## Next Step');
  const relatedPlan = args.plan ?? readFirstBullet(state, '## Related Plan');
  const topic = args.topic ?? args.focus ?? 'handoff';
  const handoffExists = fs.existsSync(handoffPath);
  const execution = extractExecutionContext();
  const executionGuidance = buildExecutionGuidance(execution ? { path: execution.path, state: execution.state } : null);

  if (!handoffExists) {
    throw new Error(`Authored handoff does not exist: ${handoffPath}`);
  }

  setStateValues({
    workflow,
    phase,
    nextStep: nextAction,
    relatedPlan: relatedPlan === 'none' ? null : relatedPlan,
    verifiedAt: now.iso
  });

  const artifactState = persistWorkingSetSelection({
    overrides: {
      plan: args.plan,
      research: args.research,
      session: args.session ?? 'none',
      handoff: handoffPath
    },
    metadata: {
      lastUpdated: now.iso,
      mode: 'authoritative',
      source: args.source ?? 'continuity-tools-handoff',
      focus: args.focus ?? topic
    }
  });

  setHandoffSessionIndex({
    sessionId: `handoff-${path.basename(handoffPath, '.md').slice(0, 19).replace(/_/g, '-')}`,
    iso: now.iso,
    topic,
    artifactPath: handoffPath,
    relatedPlan: relatedPlan === 'none' ? null : relatedPlan,
    nextCommand: `/resume_handoff ${handoffPath}`,
    summary: `Handoff sync recorded by ${args.source ?? 'continuity-tools'}; execution ${formatExecutionSummary(execution)}`
  });

  return {
    action: 'handoff',
    artifactPath: handoffPath,
    workingSet: artifactState,
    diagnostics: {
      contract_version: 'continuity-tools.v1',
      action: 'handoff',
      persistence_mode: artifactState.mode,
      focus: args.focus ?? topic,
      execution: execution
        ? {
          path: execution.path,
          status: execution.status,
          current_task_key: execution.currentTaskKey
        }
        : null,
      execution_guidance: executionGuidance,
      selected_categories: Object.fromEntries(
        Object.entries(artifactState.selected).map(([key, value]) => [key, Boolean(value)])
      )
    },
    execution
  };
};

// ---------------------------------------------------------------------------
// Phase checkpoint (PR #6: Structured Phase Checkpoints)
// Writes compact JSON to the project runtime session checkpoint directory.
// Distinct from `checkpoint`: no session index update, no markdown artifact.
// ---------------------------------------------------------------------------

const readPhaseCheckpointDir = (sessionId) => {
  const dir = path.join(sessionsDir, sessionId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const nextPhaseNumber = (dir) => {
  const existing = fs.readdirSync(dir)
    .map((f) => f.match(/^phase-(\d+)\.json$/))
    .filter(Boolean)
    .map((m) => parseInt(m[1], 10));
  return existing.length > 0 ? Math.max(...existing) + 1 : 1;
};

const phaseCheckpoint = (args) => {
  const now = timestampParts();
  const state = readFile(statePath);
  const phaseName = args.phase ?? args['phase-name'] ?? readFirstBullet(state, '## Current Phase');
  const workflow = args.workflow ?? readFirstBullet(state, '## Current Workflow');
  const relatedPlan = args.plan ?? readFirstBullet(state, '## Related Plan');

  // Resolve session directory. If --session-id not provided, use today-based slug.
  const sessionId = args['session-id'] ??
    `${now.date}_${slugify(workflow || 'session').slice(0, 40)}`;
  const checkpointDir = readPhaseCheckpointDir(sessionId);
  const phaseNum = nextPhaseNumber(checkpointDir);
  const checkpointPath = path.join(checkpointDir, `phase-${phaseNum}.json`);

  // Parse completed/pending/decisions/files from args (pipe-separated lists)
  const splitList = (val) =>
    val ? val.split('|').map((s) => s.trim()).filter(Boolean) : [];

  const payload = {
    schema: 'phase-checkpoint.v1',
    session_id: sessionId,
    phase_number: phaseNum,
    phase_name: phaseName,
    workflow,
    related_plan: relatedPlan ?? null,
    captured_at: now.iso,
    // Duration in seconds since session started (best-effort)
    duration_seconds: args['duration-seconds'] ? Number(args['duration-seconds']) : null,
    completed: splitList(args.completed),
    pending: splitList(args.pending),
    key_decisions: splitList(args.decisions),
    files_modified: splitList(args.files),
    test_results: args['test-results'] ?? null,
    next_phase: args['next-phase'] ?? null,
    notes: args.notes ?? null
  };

  fs.writeFileSync(checkpointPath, JSON.stringify(payload, null, 2) + '\n');

  return {
    action: 'phase-checkpoint',
    session_id: sessionId,
    phase_number: phaseNum,
    phase_name: phaseName,
    checkpoint_path: checkpointPath
  };
};

const listPhaseCheckpoints = (args) => {
  const sessionId = args['session-id'];
  if (!sessionId) throw new Error('phase-checkpoint list requires --session-id');
  const dir = path.join(sessionsDir, sessionId);
  if (!fs.existsSync(dir)) return { checkpoints: [] };
  const files = fs.readdirSync(dir)
    .filter((f) => /^phase-\d+\.json$/.test(f))
    .sort();
  const checkpoints = files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  return { session_id: sessionId, checkpoints };
};

// ---------------------------------------------------------------------------
// CLI router
// ---------------------------------------------------------------------------

const command = process.argv[2];
const args = parseArgs(process.argv.slice(3));

try {
  if (command === 'checkpoint') {
    console.log(JSON.stringify(checkpoint(args), null, 2));
  } else if (command === 'handoff') {
    console.log(JSON.stringify(handoff(args), null, 2));
  } else if (command === 'status') {
    console.log(JSON.stringify({
      project,
      session: sessionStatus(),
      state: readFile(statePath)
    }, null, 2));
  } else if (command === 'phase-checkpoint') {
    const subcommand = args.list !== undefined ? 'list' : 'write';
    if (subcommand === 'list') {
      console.log(JSON.stringify(listPhaseCheckpoints(args), null, 2));
    } else {
      console.log(JSON.stringify(phaseCheckpoint(args), null, 2));
    }
  } else {
    console.error(
      'Usage: node scripts/continuity-tools.mjs <checkpoint|handoff|status|phase-checkpoint> [--key value]\n' +
      '       phase-checkpoint: --phase <name> [--session-id <id>] [--completed <a|b>] [--pending <c>] [--decisions <d>] [--files <f>] [--next-phase <name>]\n' +
      '       phase-checkpoint --list --session-id <id>'
    );
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
