import path from 'node:path';

export const AUTONOMY_EVENTS = Object.freeze([
  'session_start',
  'pre_tool',
  'post_tool',
  'stop',
  'subagent_stop',
  'turn_complete',
  'context_warning',
  'context_critical',
  'lesson_flush',
  'memory_health_check',
  'memory_smoke'
]);

export const AUTONOMY_ACTION_CLASSES = Object.freeze([
  'inline_safe',
  'enqueue_only',
  'manual_or_config_change_only'
]);

export const AUTONOMY_RUNTIME_MODES = Object.freeze([
  'fire_and_forget',
  'synchronous_hook',
  'sequential_plugin',
  'wrapper_notify'
]);

export const EVAL_SUBJECT_TYPES = Object.freeze([
  'workflow_artifact',
  'lesson_flush',
  'memory_health_check',
  'autonomy_event',
  'strategy_decision'
]);

export const STRATEGY_ACTIONS = Object.freeze([
  'continue',
  'do_more_research',
  'replan',
  'run_critic',
  'capture_lesson',
  'request_user_decision',
  'defer'
]);

export const AUTONOMY_LATENCY_BUDGETS_MS = Object.freeze({
  fire_and_forget: 75,
  synchronous_hook: 25,
  sequential_plugin: 40,
  wrapper_notify: 150
});

const EVENT_DEDUPE_CONFIG = Object.freeze({
  post_tool: { requiredMetadata: ['toolId'], windowMs: 0 },
  stop: { requiredMetadata: [], windowMs: 5000 },
  subagent_stop: { requiredMetadata: [], windowMs: 5000 },
  turn_complete: { requiredMetadata: ['turnIndex'], windowMs: 0 }
});

const ensureEnum = (value, allowed, field) => {
  if (!allowed.includes(value)) {
    throw new Error(`Unsupported ${field}: ${value}`);
  }
};

const ensureObject = (value, field) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field} must be an object`);
  }
  return value;
};

const normalizeTimestamp = (value) => {
  const timestamp = value ?? new Date().toISOString();
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }
  return parsed.toISOString();
};

const normalizeOptionalAbsolutePath = (value, field) => {
  if (value == null) return null;
  if (!path.isAbsolute(value)) {
    throw new Error(`${field} must be an absolute path`);
  }
  return value;
};

export const normalizeAutonomyEvent = (input) => {
  ensureEnum(input?.event, AUTONOMY_EVENTS, 'event');
  ensureEnum(input?.runtimeMode, AUTONOMY_RUNTIME_MODES, 'runtimeMode');

  const metadata = input.metadata == null ? {} : ensureObject(input.metadata, 'metadata');
  const subject = input.subject == null ? {} : ensureObject(input.subject, 'subject');
  const scope = input.scope ?? 'project';

  if (!['project', 'shared'].includes(scope)) {
    throw new Error(`Unsupported scope: ${scope}`);
  }

  const provider = String(input.provider ?? 'local').trim();
  const sessionId = String(input.sessionId ?? '').trim();
  const turnId = String(input.turnId ?? '').trim();

  if (!provider) throw new Error('provider is required');
  if (!sessionId) throw new Error('sessionId is required');
  if (!turnId) throw new Error('turnId is required');

  return {
    event: input.event,
    provider,
    sessionId,
    turnId,
    timestamp: normalizeTimestamp(input.timestamp),
    runtimeMode: input.runtimeMode,
    scope,
    subject: {
      type: subject.type ?? 'autonomy_event',
      id: subject.id ?? null,
      path: normalizeOptionalAbsolutePath(subject.path ?? null, 'subject.path')
    },
    metadata: { ...metadata }
  };
};

export const buildAutonomyDedupeKey = (event) => {
  const config = EVENT_DEDUPE_CONFIG[event.event];
  if (!config) {
    return `${event.event}:${event.sessionId}:${event.turnId}`;
  }

  const parts = [event.event, event.sessionId];
  for (const field of config.requiredMetadata) {
    const value = event.metadata?.[field];
    if (value == null || value === '') {
      throw new Error(`${event.event} requires metadata.${field} for dedupe`);
    }
    parts.push(String(value));
  }

  return parts.join(':');
};

export const getAutonomyDedupeWindowMs = (eventName) =>
  EVENT_DEDUPE_CONFIG[eventName]?.windowMs ?? 0;

export const normalizeEvalVerdict = (input) => {
  ensureEnum(input?.subjectType, EVAL_SUBJECT_TYPES, 'subjectType');

  const score = Number(input.score);
  if (Number.isNaN(score) || score < 0 || score > 100) {
    throw new Error(`Eval verdict score must be between 0 and 100: ${input.score}`);
  }

  const findings = Array.isArray(input.findings) ? input.findings.map((item) => String(item)) : [];
  const subjectPath = normalizeOptionalAbsolutePath(input.subjectPath ?? null, 'subjectPath');

  return {
    subjectType: input.subjectType,
    subjectPath,
    suite: String(input.suite ?? 'autonomy-dispatcher').trim(),
    score,
    blocking: input.blocking === true,
    findings,
    recommendedNextAction: String(input.recommendedNextAction ?? (input.blocking ? 'request_user_decision' : 'continue')).trim(),
    confidence: Number(input.confidence ?? 0.75)
  };
};

export const normalizeStrategyDecision = (input) => {
  ensureEnum(input?.action, STRATEGY_ACTIONS, 'strategy action');

  return {
    action: input.action,
    rationale: String(input.rationale ?? '').trim(),
    confidence: Number(input.confidence ?? 0.75),
    dependsOn: [...(input.dependsOn ?? [])].map((item) => String(item)),
    deferred: input.deferred === true
  };
};

export const normalizeLearningRecord = (input) => {
  const sourceArtifacts = [...(input?.sourceArtifacts ?? [])].map((artifactPath) =>
    normalizeOptionalAbsolutePath(artifactPath, 'learningRecord.sourceArtifacts')
  );

  return {
    failureClass: String(input?.failureClass ?? '').trim(),
    trigger: String(input?.trigger ?? '').trim(),
    evidence: String(input?.evidence ?? '').trim(),
    correction: String(input?.correction ?? '').trim(),
    reuseRule: String(input?.reuseRule ?? '').trim(),
    sourceArtifacts: sourceArtifacts.filter(Boolean)
  };
};

export const deriveDefaultEvalVerdict = ({ event, status, findings = [], subjectPath = null }) =>
  normalizeEvalVerdict({
    subjectType: event.event === 'lesson_flush' ? 'lesson_flush' : 'autonomy_event',
    subjectPath,
    suite: 'autonomy-dispatcher',
    score: status === 'failed' ? 25 : status === 'duplicate' ? 80 : 100,
    blocking: status === 'failed',
    findings,
    recommendedNextAction: status === 'failed' ? 'request_user_decision' : 'continue',
    confidence: status === 'failed' ? 0.9 : 0.8
  });

export const deriveDefaultStrategyDecision = ({ status, findings = [] }) =>
  normalizeStrategyDecision({
    action: status === 'failed'
      ? 'request_user_decision'
      : findings.length > 0
        ? 'capture_lesson'
        : 'continue',
    rationale: status === 'failed'
      ? 'Automation surfaced a blocking issue that needs operator attention.'
      : findings.length > 0
        ? 'Automation found reusable signals worth preserving.'
        : 'No blocking issue was detected.',
    confidence: status === 'failed' ? 0.9 : 0.75,
    dependsOn: findings
  });
