import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dispatchAutonomyEvent } from './autonomy-dispatcher.mjs';
import { ensureProjectContext } from './project-context.mjs';
import { createMemorySidecarAdapter } from './memory-sidecar-adapter.mjs';
import { writeMarkdownSections } from './runtime-state-tools.mjs';
import { loadDefaultEnvFiles } from './env-file-tools.mjs';

const root = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Load ~/.agents/.env so hooks and CLI invocations get memory config
loadDefaultEnvFiles({ cwd: root });

const defaultProject = ensureProjectContext();

const contexts = {
  userTaste: path.join(root, 'contexts', 'user-taste.md'),
  failurePatterns: path.join(root, 'contexts', 'failure-patterns.md'),
  lessonsLearned: path.join(root, 'contexts', 'lessons-learned.md')
};

const getQueueDir = (projectContext) => path.join(projectContext.thoughtPaths.lessons, 'queue', projectContext.projectSlug);
const toProcessingPath = (queuePath) => queuePath.replace(/\.json$/, '.processing');

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

const requiredArg = (args, key) => {
  const value = args[key]?.trim();
  if (!value) {
    throw new Error(`capture requires --${key}`);
  }
  return value;
};

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'lesson';

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');

const readSectionBullets = (content, heading) => {
  const match = content.match(new RegExp(`^${heading}\\n([\\s\\S]*?)(?=\\n## |\\s*$)`, 'm'));
  if (!match) return [];
  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
};

const renderBullets = (items) => (items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- None recorded yet.');

const updateBulletSection = ({ filePath, heading, newItem, noneLabel = 'None recorded yet.' }) => {
  const content = readFile(filePath);
  const existing = readSectionBullets(content, heading)
    .filter((item) => item !== noneLabel)
    .filter((item) => item !== newItem);
  const updated = [newItem, ...existing];

  writeMarkdownSections({
    filePath,
    sections: [
      {
        heading,
        replacement: updated.length > 0 ? updated.map((item) => `- ${item}`).join('\n') : `- ${noneLabel}`
      }
    ]
  });
};

const updateLastUpdated = ({ filePath, isoDate }) => {
  writeMarkdownSections({
    filePath,
    sections: [
      {
        heading: '## Last Updated',
        replacement: `- ${isoDate.slice(0, 10)}`
      }
    ]
  });
};

const writeLessonArtifact = (payload, projectContext) => {
  const now = new Date();
  const iso = now.toISOString();
  const stamp = iso.slice(0, 10);
  const slug = slugify(`${payload.taskClass}-${payload.failureClass}-${payload.rule}`);
  const artifactPath = path.join(projectContext.thoughtPaths.lessons, `${stamp}-${slug}.md`);

  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });

  const content = [
    '---',
    `date: ${iso}`,
    `task_class: ${payload.taskClass}`,
    `trigger: ${payload.trigger}`,
    `failure_class: ${payload.failureClass}`,
    `confidence: ${payload.confidence}`,
    `systemic: ${payload.systemic}`,
    `source_artifact: ${payload.sourceArtifact}`,
    '---',
    '',
    `# Lesson: ${payload.taskClass} - ${payload.failureClass}`,
    '',
    '## Failure Signal',
    `- ${payload.trigger}`,
    '',
    '## Diagnosis',
    `- ${payload.diagnosis}`,
    '',
    '## Reusable Rule',
    `- ${payload.rule}`,
    '',
    '## Current-Task Fix',
    `- ${payload.fix}`,
    '',
    '## Source Artifact',
    `- ${payload.sourceArtifact}`,
    '',
    '## Workflow Suggestion',
    `- ${payload.suggestion ?? 'none'}`,
    ''
  ].join('\n');

  fs.writeFileSync(artifactPath, content);
  return { artifactPath, iso };
};

const normalizeCapturePayload = (args) => {
  const taskClass = requiredArg(args, 'task-class');
  const trigger = requiredArg(args, 'trigger');
  const failureClass = requiredArg(args, 'failure-class');
  const diagnosis = requiredArg(args, 'diagnosis');
  const rule = requiredArg(args, 'rule');
  const fix = requiredArg(args, 'fix');
  const sourceArtifact = requiredArg(args, 'source-artifact');
  const confidence = args.confidence?.trim() || 'medium';
  const systemic = (args.systemic?.trim() || 'false') === 'true';
  const suggestion = args.suggestion?.trim() || null;
  const preferenceKind = args['preference-kind']?.trim() || null;
  const preference = args.preference?.trim() || null;
  const supersedesMemoryId = args['supersedes-memory-id']?.trim() || null;

  if (!path.isAbsolute(sourceArtifact)) {
    throw new Error('capture requires --source-artifact to be an absolute path');
  }

  return {
    taskClass,
    trigger,
    failureClass,
    diagnosis,
    rule,
    fix,
    sourceArtifact,
    confidence,
    systemic,
    suggestion,
    preferenceKind,
    preference,
    supersedesMemoryId
  };
};

const confidenceToScore = (confidence) => {
  switch (confidence) {
    case 'high':
      return 0.9;
    case 'low':
      return 0.6;
    default:
      return 0.75;
  }
};

const createIdempotencyKey = ({ projectId, memoryKind, sourceArtifact, summary }) =>
  crypto
    .createHash('sha1')
    .update([projectId, memoryKind, sourceArtifact, summary].join('|'))
    .digest('hex');

const buildMirrorEvents = ({ payload, artifactPath, projectContext }) => {
  const projectId = projectContext.projectSlug;
  const sharedMetadata = {
    source_tool: 'lesson-tools',
    topic_tags: [payload.taskClass, payload.failureClass].filter(Boolean),
    canonical_source_artifact: payload.sourceArtifact,
    lesson_artifact: artifactPath,
    supersedes_memory_id: payload.supersedesMemoryId
  };
  const events = [];

  const lessonSummary = payload.rule;
  events.push({
    workflow_stage: 'create-plan',
    memory_kind: 'lesson',
    scope: 'project',
    summary: lessonSummary,
    source_artifact: payload.sourceArtifact,
    confidence: confidenceToScore(payload.confidence),
    idempotency_key: createIdempotencyKey({
      projectId,
      memoryKind: 'lesson',
      sourceArtifact: payload.sourceArtifact,
      summary: lessonSummary
    }),
    metadata: sharedMetadata
  });

  const failureSummary = `${payload.failureClass}: ${payload.diagnosis}`;
  events.push({
    workflow_stage: 'implement-plan',
    memory_kind: 'failure_pattern',
    scope: 'project',
    summary: failureSummary,
    source_artifact: payload.sourceArtifact,
    confidence: confidenceToScore(payload.confidence),
    idempotency_key: createIdempotencyKey({
      projectId,
      memoryKind: 'failure_pattern',
      sourceArtifact: payload.sourceArtifact,
      summary: failureSummary
    }),
    metadata: sharedMetadata
  });

  if (payload.preferenceKind && payload.preference) {
    events.push({
      workflow_stage: 'create-plan',
      memory_kind: 'user_preference',
      scope: 'shared',
      summary: payload.preference,
      source_artifact: payload.sourceArtifact,
      confidence: confidenceToScore(payload.confidence),
      idempotency_key: createIdempotencyKey({
        projectId,
        memoryKind: 'user_preference',
        sourceArtifact: payload.sourceArtifact,
        summary: payload.preference
      }),
      metadata: {
        ...sharedMetadata,
        topic_tags: [...sharedMetadata.topic_tags, payload.preferenceKind]
      }
    });
  }

  return events;
};

const mirrorCaptureToMemory = async ({ payload, artifactPath, projectContext, memoryAdapter }) => {
  const adapter = memoryAdapter ?? createMemorySidecarAdapter();
  const events = buildMirrorEvents({ payload, artifactPath, projectContext });
  const results = [];
  const warnings = [];

  for (const event of events) {
    try {
      const result = await adapter.recordMemory(event, { projectContext });
      results.push({
        memory_kind: event.memory_kind,
        recorded: result.recorded,
        warning: result.warning,
        record: result.record
      });

      if (result.warning) {
        warnings.push(result.warning);
      }
    } catch (error) {
      warnings.push(`Memory mirror failed for ${event.memory_kind}: ${error.message}`);
      results.push({
        memory_kind: event.memory_kind,
        recorded: false,
        warning: error.message,
        record: null
      });
    }
  }

  return {
    attempted: events.length > 0,
    results,
    warnings
  };
};

const applyCapturePayload = async (payload, options = {}) => {
  const projectContext = options.projectContext ?? defaultProject;
  const {
    taskClass,
    trigger,
    failureClass,
    diagnosis,
    rule,
    fix,
    confidence,
    systemic,
    suggestion,
    preferenceKind,
    preference
  } = payload;
  const { artifactPath, iso } = writeLessonArtifact(payload, projectContext);
  const summary = `[${iso.slice(0, 10)}] ${taskClass} | ${trigger} | ${rule} | confidence: ${confidence} | source: ${artifactPath}`;
  const failureEntry = `[${iso.slice(0, 10)}] ${failureClass} | trigger: ${trigger} | diagnosis: ${diagnosis} | prevention: ${rule}`;
  const artifactEntry = `[${iso.slice(0, 10)}] ${artifactPath}`;

  updateBulletSection({
    filePath: contexts.lessonsLearned,
    heading: '## Active Lessons',
    newItem: summary
  });
  updateBulletSection({
    filePath: contexts.lessonsLearned,
    heading: '## Recent Artifacts',
    newItem: artifactEntry
  });
  updateLastUpdated({
    filePath: contexts.lessonsLearned,
    isoDate: iso
  });

  updateBulletSection({
    filePath: contexts.failurePatterns,
    heading: '## Recent Entries',
    newItem: failureEntry
  });
  updateLastUpdated({
    filePath: contexts.failurePatterns,
    isoDate: iso
  });

  if (preferenceKind && preference) {
    const heading = preferenceKind === 'preferred'
      ? '## Preferred Characteristics'
      : preferenceKind === 'disliked'
        ? '## Disliked Patterns'
        : null;

    if (!heading) {
      throw new Error('preference-kind must be "preferred" or "disliked"');
    }

    updateBulletSection({
      filePath: contexts.userTaste,
      heading,
      newItem: preference
    });
    updateBulletSection({
      filePath: contexts.userTaste,
      heading: '## Recent Confirmations',
      newItem: `[${iso.slice(0, 10)}] ${preferenceKind}: ${preference}`
    });
    updateLastUpdated({
      filePath: contexts.userTaste,
      isoDate: iso
    });
  }

  const memoryMirror = await mirrorCaptureToMemory({
    payload,
    artifactPath,
    projectContext,
    memoryAdapter: options.memoryAdapter
  });

  return {
    artifactPath,
    taskClass,
    trigger,
    failureClass,
    confidence,
    systemic,
    updatedContexts: [
      contexts.lessonsLearned,
      contexts.failurePatterns,
      ...(preferenceKind && preference ? [contexts.userTaste] : [])
    ],
    memoryMirror
  };
};

const captureLesson = async (args, options = {}) => applyCapturePayload(normalizeCapturePayload(args), options);

const queueLesson = (args, options = {}) => {
  const payload = normalizeCapturePayload(args);
  const iso = new Date().toISOString();
  const stamp = iso.replace(/[:.]/g, '-');
  const slug = slugify(`${payload.taskClass}-${payload.failureClass}-${payload.rule}`);
  const projectContext = optionsProjectContext(options);
  const queuePath = path.join(getQueueDir(projectContext), `${stamp}-${slug}.json`);

  fs.mkdirSync(getQueueDir(projectContext), { recursive: true });
  fs.writeFileSync(queuePath, JSON.stringify({ ...payload, queuedAt: iso }, null, 2));

  return {
    queued: true,
    queuePath,
    taskClass: payload.taskClass,
    failureClass: payload.failureClass
  };
};

function optionsProjectContext(options) {
  return options?.projectContext ?? defaultProject;
}

const flushSingleFile = async ({ filePath, projectContext, options }) => {
  if (!fs.existsSync(filePath)) {
    return { filePath, processed: 0, failed: 1, results: [{ filePath, status: 'not_found' }] };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatter = {};
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (fmMatch) {
      for (const line of fmMatch[1].split('\n')) {
        const [key, ...rest] = line.split(': ');
        if (key && rest.length) frontmatter[key.trim()] = rest.join(': ').trim();
      }
    }

    const payload = {
      taskClass: frontmatter.task_class || 'unknown',
      trigger: frontmatter.trigger || 'file-flush',
      failureClass: frontmatter.failure_class || 'unknown',
      diagnosis: 'Flushed from lesson artifact file',
      rule: frontmatter.task_class ? `${frontmatter.task_class} lesson` : 'lesson',
      fix: 'See lesson artifact',
      sourceArtifact: filePath,
      confidence: frontmatter.confidence || 'medium',
      systemic: frontmatter.systemic === 'true',
      suggestion: null,
      preferenceKind: null,
      preference: null,
      supersedesMemoryId: null
    };

    const capture = await applyCapturePayload(payload, { ...options, projectContext });
    return {
      filePath,
      processed: 1,
      failed: 0,
      results: [{ filePath, status: 'processed', artifactPath: capture.artifactPath, memoryMirror: capture.memoryMirror }]
    };
  } catch (error) {
    return { filePath, processed: 0, failed: 1, results: [{ filePath, status: 'failed', error: error.message }] };
  }
};

const flushQueue = async (options = {}) => {
  const projectContext = optionsProjectContext(options);
  const filePath = options.filePath || null;

  if (filePath) {
    return flushSingleFile({ filePath, projectContext, options });
  }

  const queueDir = getQueueDir(projectContext);
  if (!fs.existsSync(queueDir)) {
    return {
      queueDir,
      processed: 0,
      failed: 0,
      results: []
    };
  }

  const queueEntries = fs.readdirSync(queueDir)
    .filter((entry) => entry.endsWith('.json'))
    .sort();
  const results = [];
  let processed = 0;
  let failed = 0;

  for (const entry of queueEntries) {
    const queuePath = path.join(queueDir, entry);
    const processingPath = toProcessingPath(queuePath);

    try {
      fs.renameSync(queuePath, processingPath);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        continue;
      }

      failed += 1;
      results.push({
        queuePath,
        status: 'failed',
        error: error.message
      });
      continue;
    }

    try {
      const payload = JSON.parse(fs.readFileSync(processingPath, 'utf8'));
      const dispatched = await dispatchAutonomyEvent({
        event: 'lesson_flush',
        provider: 'local',
        sessionId: projectContext.projectSlug,
        turnId: payload.queuedAt ?? entry,
        timestamp: payload.queuedAt,
        runtimeMode: 'fire_and_forget',
        scope: 'project',
        subject: {
          type: 'lesson_queue_item',
          id: entry,
          path: processingPath
        },
        metadata: {
          taskClass: payload.taskClass,
          failureClass: payload.failureClass
        }
      }, {
        projectContext,
        handlers: {
          lesson_flush: async () => {
            const capture = await applyCapturePayload(payload, options);
            return {
              status: 'processed',
              actionClass: 'enqueue_only',
              actions: ['capture_lesson', 'mirror_memory'],
              warnings: [...capture.memoryMirror.warnings],
              metrics: {
                processed: 1,
                mirrored: capture.memoryMirror.results.filter((item) => item.recorded === true).length
              },
              evalVerdict: {
                subjectType: 'lesson_flush',
                subjectPath: capture.artifactPath,
                suite: 'lesson-tools',
                score: capture.memoryMirror.warnings.length > 0 ? 85 : 100,
                blocking: false,
                findings: [...capture.memoryMirror.warnings],
                recommendedNextAction: capture.memoryMirror.warnings.length > 0 ? 'capture_lesson' : 'continue',
                confidence: 0.85
              },
              strategyDecision: {
                action: capture.memoryMirror.warnings.length > 0 ? 'capture_lesson' : 'continue',
                rationale: capture.memoryMirror.warnings.length > 0
                  ? 'Canonical write succeeded but the advisory mirror produced warnings.'
                  : 'Canonical lesson capture and advisory mirroring succeeded.',
                confidence: 0.8,
                dependsOn: [...capture.memoryMirror.warnings]
              },
              learningRecords: [
                {
                  failureClass: payload.failureClass,
                  trigger: payload.trigger,
                  evidence: payload.diagnosis,
                  correction: payload.fix,
                  reuseRule: payload.rule,
                  sourceArtifacts: [payload.sourceArtifact, capture.artifactPath]
                }
              ]
            };
          }
        }
      });

      fs.rmSync(processingPath, { force: true });
      processed += 1;
      results.push({
        queuePath,
        status: 'processed',
        tracePath: dispatched.tracePath,
        evalPath: dispatched.evalPath,
        strategyPath: dispatched.strategyPath,
        learningRecords: dispatched.learningRecords
      });
    } catch (error) {
      failed += 1;
      results.push({
        queuePath,
        status: 'failed',
        error: error.message
      });
    } finally {
      fs.rmSync(processingPath, { force: true });
    }
  }

  return {
    queueDir,
    processed,
    failed,
    results
  };
};

const normalizeQuickCapturePayload = (args) => {
  const what = requiredArg(args, 'what');
  const why = requiredArg(args, 'why');
  const rule = requiredArg(args, 'rule');
  const sourceArtifact = args['source-artifact']?.trim() || process.cwd();
  const kind = args.kind?.trim() || 'lesson';
  const confidence = args.confidence?.trim() || 'medium';

  return {
    taskClass: kind === 'preference' ? 'user-preference' : 'agent-learning',
    trigger: kind === 'failure' ? 'repeated-failure' : 'correction',
    failureClass: kind === 'failure' ? what.slice(0, 64) : 'workflow-gap',
    diagnosis: why,
    rule,
    fix: rule,
    sourceArtifact: path.isAbsolute(sourceArtifact) ? sourceArtifact : path.resolve(sourceArtifact),
    confidence,
    systemic: false,
    suggestion: null,
    preferenceKind: kind === 'preference' ? 'preferred' : null,
    preference: kind === 'preference' ? rule : null,
    supersedesMemoryId: null
  };
};

const quickCapture = async (args, options = {}) =>
  applyCapturePayload(normalizeQuickCapturePayload(args), options);

export {
  applyCapturePayload,
  captureLesson,
  flushQueue,
  normalizeCapturePayload,
  quickCapture,
  queueLesson
};

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  const main = async () => {
    const command = process.argv[2];
    const args = parseArgs(process.argv.slice(3));

    switch (command) {
      case 'capture':
        console.log(JSON.stringify(await captureLesson(args), null, 2));
        break;
      case 'queue':
        console.log(JSON.stringify(queueLesson(args), null, 2));
        break;
      case 'flush': {
        const filePath = args.file?.trim() || null;
        console.log(JSON.stringify(await flushQueue({ filePath }), null, 2));
        break;
      }
      case 'quick-capture':
        console.log(JSON.stringify(await quickCapture(args), null, 2));
        break;
      default:
        console.error('Usage: node scripts/lesson-tools.mjs <capture|queue|flush|quick-capture> [--task-class <value> --trigger <value> --failure-class <value> --diagnosis <value> --rule <value> --fix <value> --source-artifact <absolute path> [--confidence low|medium|high] [--systemic true|false] [--suggestion <text>] [--preference-kind preferred|disliked --preference <text>] [--supersedes-memory-id <id>]]');
        process.exitCode = 1;
    }
  };

  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
