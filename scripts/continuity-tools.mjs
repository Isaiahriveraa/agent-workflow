import fs from 'node:fs';
import path from 'node:path';
import { ensureProjectContext } from './project-context.mjs';
import { createPath, status as sessionStatus, timestampParts, slugify } from './session-tools.mjs';
import { persistWorkingSetSelection } from './artifact-tools.mjs';
import { writeMarkdownSections } from './runtime-state-tools.mjs';

const project = ensureProjectContext();
const statePath = project.contextPaths.state;
const sessionIndexPath = project.contextPaths.sessionIndex;
const sessionsDir = project.thoughtPaths.sessions;

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');
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

const readFirstBullet = (content, heading) => {
  const match = content.match(new RegExp(`${heading}\\n-\\s+(.*)`));
  return match ? match[1].trim() : 'none';
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

const writeCheckpointArtifact = ({ artifactPath, iso, topic, workflow, phase, focus, artifacts, blockers, nextAction, nextCommand, relatedPlan }) => {
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

  const nextCommand = args['next-command'] ?? '/resume-session';

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
    relatedPlan: relatedPlan === 'none' ? null : relatedPlan
  });

  setActiveSessionIndex({
    sessionId,
    iso: now.iso,
    topic,
    artifactPath,
    relatedPlan: relatedPlan === 'none' ? null : relatedPlan,
    nextCommand,
    summary: `Checkpoint created by ${args.source ?? 'continuity-tools'}`
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
      selected_categories: Object.fromEntries(
        Object.entries(artifactState.selected).map(([key, value]) => [key, Boolean(value)])
      )
    }
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
    summary: `Handoff sync recorded by ${args.source ?? 'continuity-tools'}`
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
      selected_categories: Object.fromEntries(
        Object.entries(artifactState.selected).map(([key, value]) => [key, Boolean(value)])
      )
    }
  };
};

// ---------------------------------------------------------------------------
// Phase checkpoint (PR #6: Structured Phase Checkpoints)
// Writes compact JSON to .agents/sessions/{session-id}/phase-{n}.json
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
