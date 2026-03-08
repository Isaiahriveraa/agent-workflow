import fs from 'node:fs';
import path from 'node:path';
import { ensureProjectContext } from './project-context.mjs';
import { createPath, status as sessionStatus, timestampParts, slugify } from './session-tools.mjs';
import { persistWorkingSetSelection } from './artifact-tools.mjs';
import { writeMarkdownSections } from './runtime-state-tools.mjs';

const project = ensureProjectContext();
const statePath = project.contextPaths.state;
const sessionIndexPath = project.contextPaths.sessionIndex;

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
  const match = content.match(new RegExp(`^${heading}\\n([\\s\\S]*?)(?=\\n## |\\s*$)`, 'm'));
  return match ? match[1].trim() : '';
};

const parseSessionEntries = (content, heading) => {
  const section = readSection(content, heading);
  if (!section || /^- No .* recorded\.$/m.test(section)) {
    return [];
  }

  return section
    .split(/(?=^- Session ID: )/m)
    .map((entry) => entry.trim())
    .filter(Boolean);
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
  const artifactState = persistWorkingSetSelection({
    overrides: {
      plan: args.plan,
      research: args.research,
      handoff: args.handoff
    },
    metadata: {
      lastUpdated: now.iso,
      source: args.source ?? 'continuity-tools',
      focus: args.focus ?? topic
    }
  });

  const artifactPath = createPath(topic);
  const sessionId = path.basename(artifactPath, '.md');
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

  setStateValues({
    workflow,
    phase,
    nextStep: nextAction,
    relatedPlan: relatedPlan === 'none' ? null : relatedPlan,
    verifiedAt: now.iso
  });

  return {
    action: 'checkpoint',
    artifactPath,
    sessionId,
    workingSet: artifactState
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
    fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
    fs.writeFileSync(handoffPath, [
      '---',
      `date: ${now.iso}`,
      'researcher: Codex',
      'status: complete',
      'type: continuity_handoff',
      '---',
      '',
      `# Handoff: ${topic}`,
      '',
      '## Current Position',
      `- Workflow: ${workflow}`,
      `- Phase: ${phase}`,
      '',
      '## Next Action',
      `- ${nextAction}`
    ].join('\n') + '\n');
  }

  const artifactState = persistWorkingSetSelection({
    overrides: {
      plan: args.plan,
      research: args.research,
      session: args.session,
      handoff: handoffPath
    },
    metadata: {
      lastUpdated: now.iso,
      source: args.source ?? 'continuity-tools',
      focus: args.focus ?? topic
    }
  });

  setStateValues({
    workflow,
    phase,
    nextStep: nextAction,
    relatedPlan: relatedPlan === 'none' ? null : relatedPlan,
    verifiedAt: now.iso
  });

  setHandoffSessionIndex({
    sessionId: `handoff-${path.basename(handoffPath, '.md').slice(0, 19).replace(/_/g, '-')}`,
    iso: now.iso,
    topic,
    artifactPath: handoffPath,
    relatedPlan: relatedPlan === 'none' ? null : relatedPlan,
    nextCommand: `/resume_handoff ${handoffPath}`,
    summary: handoffExists
      ? `Handoff sync recorded by ${args.source ?? 'continuity-tools'}`
      : `Handoff created by ${args.source ?? 'continuity-tools'}`
  });

  return {
    action: 'handoff',
    artifactPath: handoffPath,
    workingSet: artifactState
  };
};

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
  } else {
    console.error('Usage: node scripts/continuity-tools.mjs <checkpoint|handoff|status> [--key value]');
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
