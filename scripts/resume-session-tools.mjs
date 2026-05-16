import fs from 'node:fs';
import path from 'node:path';

import { ensureProjectContext } from './project-context.mjs';
import { persistWorkingSetSelection } from './artifact-tools.mjs';
import { writeMarkdownSections } from './runtime-state-tools.mjs';
import { readActiveExecutionState, buildExecutionGuidance } from './execution-state-tools.mjs';
import { buildDoctorReport } from './doctor.mjs';
import { buildDelegationDecision } from './orchestration-contract-tools.mjs';

const project = ensureProjectContext();

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');
const readJson = (filePath) => {
  try {
    return JSON.parse(readFile(filePath));
  } catch {
    return null;
  }
};

const parseArgs = (args) => {
  const parsed = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current.startsWith('--')) {
      parsed._.push(current);
      continue;
    }
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
  const match = content.match(new RegExp(`${heading}\n-\s+(.*)`));
  return match ? match[1].trim() : fallback;
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
  const state = stateContent ?? readFile(project.contextPaths.state);
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
  if (headingIndex === -1) return '';
  const sectionStart = headingIndex + headingMarker.length;
  const nextHeadingIndex = content.indexOf('\n## ', sectionStart);
  const sectionEnd = nextHeadingIndex === -1 ? content.length : nextHeadingIndex;
  return content.slice(sectionStart, sectionEnd).trim();
};

const readField = (content, heading, label, fallback = 'none') => {
  const section = readSection(content, heading);
  const match = section.match(new RegExp(`^- ${label}:\\s*(.*)$`, 'm'));
  return match ? match[1].trim() : fallback;
};

const readBullets = (content, heading) => {
  const section = readSection(content, heading);
  if (!section) return [];
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
};

const parseFrontmatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const lines = match[1].split('\n');
  const parsed = {};
  let currentListKey = null;

  for (const line of lines) {
    const listItem = line.match(/^\s+-\s+(.*)$/);
    if (listItem && currentListKey) {
      parsed[currentListKey] ??= [];
      parsed[currentListKey].push(listItem[1].trim());
      continue;
    }

    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    currentListKey = null;

    if (rawValue === '') {
      currentListKey = key;
      parsed[key] = [];
      continue;
    }

    parsed[key] = rawValue.replace(/^"|"$/g, '');
  }

  return parsed;
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

const parseSessionEntries = (content, heading) => {
  const section = readSection(content, heading);
  if (!section || /^- No .* recorded\.$/m.test(section)) return [];
  return section
    .split(/(?=^- Session ID: )/m)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(parseSessionEntryFields)
    .filter((entry) => requiredSessionEntryLabels.every((label) => entry[label]));
};

const parseSessionArtifact = (filePath) => {
  const content = readFile(filePath);
  const frontmatter = parseFrontmatter(content);
  return {
    path: filePath,
    frontmatter,
    workflow: readField(content, '## Current Position', 'Workflow'),
    phase: readField(content, '## Current Position', 'Phase'),
    focus: readField(content, '## Current Position', 'Focus'),
    activeArtifacts: readBullets(content, '## Active Artifacts').filter((item) => item !== 'none'),
    blockers: readBullets(content, '## Blockers'),
    nextAction: readBullets(content, '## Next Action')[0] ?? 'none',
    recordedExecution: {
      path: readField(content, '## Active Execution', 'Path'),
      status: readField(content, '## Active Execution', 'Status'),
      currentTask: readField(content, '## Active Execution', 'Current task')
    }
  };
};

const classifyRecoveryKind = (sessionArtifact) => {
  const topic = (sessionArtifact.frontmatter.topic ?? '').toLowerCase();
  const focus = (sessionArtifact.focus ?? '').toLowerCase();
  const nextCommand = sessionArtifact.frontmatter.next_command ?? '';

  if (
    topic.includes('warning context threshold')
    || topic.includes('critical context threshold')
    || focus.includes('warning context threshold')
    || focus.includes('critical context threshold')
    || focus.includes('pre-compact')
    || nextCommand.startsWith('/resume_handoff ')
  ) {
    return 'compaction_or_context_pressure_recovery';
  }

  return 'ordinary_session_resume';
};

const classifyArtifactPath = (artifactPath) => {
  if (!artifactPath || artifactPath === 'none') return null;
  if (artifactPath.startsWith(project.thoughtPaths.plans) || artifactPath.startsWith(project.planningDir)) {
    return 'plan';
  }
  if (artifactPath.startsWith(project.thoughtPaths.research)) {
    return 'research';
  }
  if (artifactPath.startsWith(project.thoughtPaths.handoffs)) {
    return 'handoff';
  }
  return null;
};

const resolveSessionTarget = (input) => {
  const sessionIndex = readFile(project.contextPaths.sessionIndex);
  const activeEntries = parseSessionEntries(sessionIndex, '## Active Sessions');
  const recentEntries = parseSessionEntries(sessionIndex, '## Recent Sessions');
  const allEntries = [...activeEntries, ...recentEntries];

  if (!input) {
    const active = activeEntries.find((entry) => entry.Status === 'active');
    if (!active) {
      return null;
    }
    return {
      source: 'active-session',
      sessionId: active['Session ID'],
      path: active['Artifact path']
    };
  }

  const asPath = path.isAbsolute(input) ? input : null;
  if (asPath) {
    return {
      source: 'explicit-path',
      sessionId: path.basename(asPath, '.md'),
      path: asPath
    };
  }

  const matched = allEntries.find((entry) => entry['Session ID'] === input || path.basename(entry['Artifact path'], '.md') === input);
  if (!matched) return null;
  return {
    source: 'explicit-id',
    sessionId: matched['Session ID'],
    path: matched['Artifact path']
  };
};

const deriveRecommendedCommand = ({ sessionArtifact, execution, explicitTarget }) => {
  if (execution?.state?.status === 'active' || execution?.state?.status === 'paused') {
    return '/start-work';
  }

  const doctor = buildDoctorReport();
  if (!explicitTarget && doctor.recommended_next_command) {
    return doctor.recommended_next_command;
  }

  const recorded = sessionArtifact.frontmatter.next_command;
  if (recorded && recorded !== '/resume-session') {
    return recorded;
  }

  return `/resume-session ${sessionArtifact.path}`;
};

const deriveRecoveryGuidance = ({ sessionArtifact, execution, explicitTarget, conflicts }) => {
  const doctor = buildDoctorReport();
  const recorded = sessionArtifact.frontmatter.next_command;
  const kind = classifyRecoveryKind(sessionArtifact);

  if (execution?.state?.status === 'active' || execution?.state?.status === 'paused') {
    return {
      kind,
      strategy: 'live_execution',
      source: 'execution-state',
      next_command: '/start-work',
      reason: 'A live execution state exists, so recovery should resume execution instead of replaying the session artifact.',
      warnings: conflicts.map((conflict) => conflict.detail)
    };
  }

  if (!explicitTarget && doctor.recommended_next_command) {
    return {
      kind,
      strategy: 'doctor_guided',
      source: 'doctor',
      next_command: doctor.recommended_next_command,
      reason: 'No live execution state exists, so the doctor recommendation is the safest recovery command.',
      warnings: doctor.warnings ?? []
    };
  }

  if (recorded && recorded !== '/resume-session') {
    return {
      kind,
      strategy: 'recorded_session_command',
      source: 'session-frontmatter',
      next_command: recorded,
      reason: 'The session artifact recorded a more specific recovery command than the generic resume flow.',
      warnings: conflicts.map((conflict) => conflict.detail)
    };
  }

  return {
    kind,
    strategy: 'session_replay',
    source: explicitTarget ? 'explicit-session-target' : 'default-session-target',
    next_command: `/resume-session ${sessionArtifact.path}`,
    reason: 'No live execution or stronger recovery hint exists, so the session artifact itself is the recovery source.',
    warnings: conflicts.map((conflict) => conflict.detail)
  };
};

const syncStateFromSession = (sessionArtifact) => {
  const overrides = {
    session: sessionArtifact.path
  };
  for (const artifactPath of sessionArtifact.activeArtifacts) {
    const category = classifyArtifactPath(artifactPath);
    if (category) overrides[category] = artifactPath;
  }

  const workingSet = persistWorkingSetSelection({
    overrides,
    metadata: {
      source: 'resume-session',
      focus: sessionArtifact.focus,
      mode: 'authoritative',
      lastUpdated: new Date().toISOString()
    }
  });

  writeMarkdownSections({
    filePath: project.contextPaths.state,
    sections: [
      { heading: '## Current Workflow', replacement: `- ${sessionArtifact.workflow}` },
      { heading: '## Current Phase', replacement: `- ${sessionArtifact.phase}` },
      { heading: '## Next Step', replacement: `- ${sessionArtifact.nextAction}` },
      { heading: '## Related Plan', replacement: `- ${sessionArtifact.frontmatter.related_plan ?? 'none'}` },
      { heading: '## Last Verified At', replacement: `- ${new Date().toISOString()}` }
    ]
  });

  return workingSet;
};

const buildConflicts = ({ sessionArtifact, execution }) => {
  const conflicts = [];

  if (execution?.state?.status === 'active' || execution?.state?.status === 'paused') {
    conflicts.push({
      type: 'active_execution_conflicts_with_session',
      detail: 'A live execution state exists, so session recovery should defer to /start-work instead of replaying stale session context.',
      execution_path: execution.path,
      session_path: sessionArtifact.path
    });
  }

  if (
    execution?.state?.active_plan
    && sessionArtifact.frontmatter.related_plan
    && sessionArtifact.frontmatter.related_plan !== 'none'
    && execution.state.active_plan !== sessionArtifact.frontmatter.related_plan
  ) {
    conflicts.push({
      type: 'execution_plan_mismatch',
      detail: 'The session artifact references a different plan than the live execution state.',
      execution_plan: execution.state.active_plan,
      session_plan: sessionArtifact.frontmatter.related_plan
    });
  }

  if (
    execution?.state?.current_task_key
    && sessionArtifact.recordedExecution.currentTask !== 'none'
    && execution.state.current_task_key !== sessionArtifact.recordedExecution.currentTask
  ) {
    conflicts.push({
      type: 'execution_task_mismatch',
      detail: 'The session artifact points at a different current task than the live execution state.',
      execution_task: execution.state.current_task_key,
      session_task: sessionArtifact.recordedExecution.currentTask
    });
  }

  return conflicts;
};

const resume = ({ target }) => {
  const resolved = resolveSessionTarget(target);
  if (!resolved) {
    return {
      found: false,
      recommended_next_command: '/session-start'
    };
  }

  const sessionArtifact = parseSessionArtifact(resolved.path);
  const execution = readActiveExecutionState();
  const executionGuidance = buildExecutionGuidance(execution);
  const orchestration = buildDelegationDecision({
    taskDescription: executionGuidance.current_task?.label ?? sessionArtifact.nextAction,
    execution
  });
  const autonomy = evaluateAutonomy();
  const conflicts = buildConflicts({ sessionArtifact, execution });
  const workingSet = syncStateFromSession(sessionArtifact);
  const recovery = deriveRecoveryGuidance({
    sessionArtifact,
    execution,
    explicitTarget: Boolean(target),
    conflicts
  });
  const recommendedNextCommand = recovery.next_command;

  return {
    found: true,
    session: {
      id: resolved.sessionId,
      source: resolved.source,
      path: resolved.path,
      topic: sessionArtifact.frontmatter.topic ?? sessionArtifact.focus,
      status: sessionArtifact.frontmatter.status ?? 'unknown'
    },
    current_position: {
      workflow: sessionArtifact.workflow,
      phase: sessionArtifact.phase,
      focus: sessionArtifact.focus,
      next_action: sessionArtifact.nextAction
    },
    active_artifacts: sessionArtifact.activeArtifacts,
    working_set: workingSet,
    execution: execution
      ? {
          path: execution.path,
          status: execution.state.status,
          current_task_key: execution.state.current_task_key ?? null,
          active_plan: execution.state.active_plan ?? null
        }
      : null,
    execution_guidance: executionGuidance,
    orchestration,
    autonomy: {
      recommended_action: autonomy.recommended_action,
      reason: autonomy.reason
    },
    recovery,
    conflicts,
    recommended_next_command: recommendedNextCommand
  };
};

const command = process.argv[2] ?? 'resume';
const args = parseArgs(process.argv.slice(3));

if (command === 'resume') {
  console.log(JSON.stringify(resume({ target: args._[0] }), null, 2));
} else {
  console.error('Usage: node scripts/resume-session-tools.mjs resume [session-path-or-id]');
  process.exitCode = 1;
}
