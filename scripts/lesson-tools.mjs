import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ensureProjectContext } from './project-context.mjs';
import { createMemorySidecarAdapter } from './memory-sidecar-adapter.mjs';
import { loadDefaultEnvFiles } from './env-file-tools.mjs';
import { evaluateWriteWorthiness, checkNovelty } from './memory-quality-gate.mjs';

const root = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Load ~/.agents/.env so hooks and CLI invocations get memory config
loadDefaultEnvFiles({ cwd: root });

const defaultProject = ensureProjectContext();

// ---------------------------------------------------------------------------
// Arg parsing helpers
// ---------------------------------------------------------------------------

const parseArgs = (args) => {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
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

// ---------------------------------------------------------------------------
// Payload normalization
// ---------------------------------------------------------------------------

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
    taskClass, trigger, failureClass, diagnosis, rule, fix, sourceArtifact,
    confidence, systemic, suggestion, preferenceKind, preference, supersedesMemoryId
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

// ---------------------------------------------------------------------------
// Memory event building (kept from original — builds LanceDB record shape)
// ---------------------------------------------------------------------------

const confidenceToScore = (confidence) => {
  switch (confidence) {
    case 'high': return 0.9;
    case 'low': return 0.6;
    default: return 0.75;
  }
};

const createIdempotencyKey = ({ projectId, memoryKind, sourceArtifact, summary }) =>
  crypto
    .createHash('sha1')
    .update([projectId, memoryKind, sourceArtifact, summary].join('|'))
    .digest('hex');

const buildMirrorEvents = ({ payload, projectContext }) => {
  const projectId = projectContext.projectSlug;
  const sharedMetadata = {
    source_tool: 'lesson-tools',
    topic_tags: [payload.taskClass, payload.failureClass].filter(Boolean),
    canonical_source_artifact: payload.sourceArtifact,
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
      projectId, memoryKind: 'lesson',
      sourceArtifact: payload.sourceArtifact, summary: lessonSummary
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
      projectId, memoryKind: 'failure_pattern',
      sourceArtifact: payload.sourceArtifact, summary: failureSummary
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
        projectId, memoryKind: 'user_preference',
        sourceArtifact: payload.sourceArtifact, summary: payload.preference
      }),
      metadata: {
        ...sharedMetadata,
        topic_tags: [...sharedMetadata.topic_tags, payload.preferenceKind]
      }
    });
  }

  return events;
};

// ---------------------------------------------------------------------------
// Core capture path: quality gate → dedup → LanceDB write
// ---------------------------------------------------------------------------

const applyCapturePayload = async (payload, options = {}) => {
  const projectContext = options.projectContext ?? defaultProject;
  const adapter = options.memoryAdapter ?? createMemorySidecarAdapter();

  // 1. Run write quality gate
  const verdict = await evaluateWriteWorthiness({
    what: payload.failureClass,
    why: payload.diagnosis,
    rule: payload.rule,
    context: payload.sourceArtifact
  });

  if (!verdict.pass) {
    return {
      recorded: false,
      reason: verdict.reason,
      score: verdict.score,
      gateVerdict: verdict
    };
  }

  // 2. Run dedup check
  const novelty = await checkNovelty({
    summary: payload.rule,
    projectContext,
    adapter
  });

  if (novelty.isDuplicate) {
    return {
      recorded: false,
      reason: 'Near-duplicate already exists',
      existingMemory: novelty.existingMemory
    };
  }

  // 3. Write directly to LanceDB via memory-sidecar-adapter
  const events = buildMirrorEvents({ payload, projectContext });
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
      if (result.warning) warnings.push(result.warning);
    } catch (error) {
      warnings.push(`Memory write failed for ${event.memory_kind}: ${error.message}`);
      results.push({
        memory_kind: event.memory_kind,
        recorded: false,
        warning: error.message,
        record: null
      });
    }
  }

  return {
    recorded: true,
    gateVerdict: verdict,
    memoryResults: results,
    warnings
  };
};

const captureLesson = async (args, options = {}) =>
  applyCapturePayload(normalizeCapturePayload(args), options);

const quickCapture = async (args, options = {}) =>
  applyCapturePayload(normalizeQuickCapturePayload(args), options);

// ---------------------------------------------------------------------------
// Stub: flushQueue is no longer needed (no filesystem queue).
// Kept as a no-op export for memory-sync-bridge.mjs compatibility.
// ---------------------------------------------------------------------------

const flushQueue = async () => ({
  processed: 0,
  failed: 0,
  results: [],
  note: 'flushQueue is deprecated — lessons are written directly to LanceDB via quality gate'
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  applyCapturePayload,
  captureLesson,
  flushQueue,
  normalizeCapturePayload,
  quickCapture
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  const main = async () => {
    const command = process.argv[2];
    const args = parseArgs(process.argv.slice(3));

    switch (command) {
      case 'capture':
        console.log(JSON.stringify(await captureLesson(args), null, 2));
        break;
      case 'quick-capture':
        console.log(JSON.stringify(await quickCapture(args), null, 2));
        break;
      default:
        console.error('Usage: node scripts/lesson-tools.mjs <capture|quick-capture> [options]');
        console.error('');
        console.error('  quick-capture --what "..." --why "..." --rule "..." [--source-artifact] [--kind] [--confidence]');
        console.error('  capture --task-class --trigger --failure-class --diagnosis --rule --fix --source-artifact [...]');
        process.exitCode = 1;
    }
  };

  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
