import {
  AUTONOMY_ACTION_CLASSES,
  AUTONOMY_LATENCY_BUDGETS_MS,
  buildAutonomyDedupeKey,
  deriveDefaultEvalVerdict,
  deriveDefaultStrategyDecision,
  getAutonomyDedupeWindowMs,
  normalizeAutonomyEvent,
  normalizeEvalVerdict,
  normalizeLearningRecord,
  normalizeStrategyDecision
} from './autonomy-dispatcher-contract.mjs';
import { ensureProjectContext } from './project-context.mjs';
import {
  writeEvalArtifact,
  writeStrategyArtifact,
  writeTraceArtifact
} from './self-improvement-artifacts.mjs';

const dedupeRegistry = new Map();

const cleanupExpiredKeys = (timestamp) => {
  for (const [key, expiresAt] of dedupeRegistry.entries()) {
    if (expiresAt !== 0 && expiresAt <= timestamp) {
      dedupeRegistry.delete(key);
    }
  }
};

const isInlineAllowed = (runtimeMode, actionClass) => {
  if (!AUTONOMY_ACTION_CLASSES.includes(actionClass)) {
    throw new Error(`Unsupported actionClass: ${actionClass}`);
  }

  if (runtimeMode === 'synchronous_hook') {
    return actionClass !== 'manual_or_config_change_only';
  }

  if (runtimeMode === 'sequential_plugin') {
    return actionClass !== 'manual_or_config_change_only';
  }

  return true;
};

export const clearAutonomyDedupeRegistry = () => {
  dedupeRegistry.clear();
};

export const createAutonomyDispatcher = ({ handlers = {} } = {}) => ({
  async dispatch(input, options = {}) {
    const event = normalizeAutonomyEvent(input);
    const projectContext = options.projectContext ?? ensureProjectContext({
      cwd: options.cwd,
      projectRoot: options.projectRoot,
      projectSlug: options.projectSlug
    });
    const now = Date.now();
    cleanupExpiredKeys(now);

    const dedupeKey = buildAutonomyDedupeKey(event);
    const hasExisting = dedupeRegistry.has(dedupeKey);
    if (hasExisting) {
      const duplicateResult = {
        status: 'duplicate',
        dedupeKey,
        duplicate: true,
        latency_budget_ms: AUTONOMY_LATENCY_BUDGETS_MS[event.runtimeMode],
        actions: [],
        warnings: []
      };
      const tracePath = writeTraceArtifact({
        projectContext,
        event,
        result: duplicateResult
      });
      const evalVerdict = deriveDefaultEvalVerdict({
        event,
        status: 'duplicate',
        findings: ['Duplicate autonomy event suppressed by dedupe policy.'],
        subjectPath: tracePath
      });
      const strategyDecision = deriveDefaultStrategyDecision({
        status: 'duplicate'
      });

      return {
        event,
        ...duplicateResult,
        tracePath,
        evalVerdict,
        evalPath: writeEvalArtifact({ projectContext, verdict: evalVerdict }),
        strategyDecision,
        strategyPath: writeStrategyArtifact({ projectContext, decision: strategyDecision, event }),
        learningRecords: []
      };
    }

    const windowMs = getAutonomyDedupeWindowMs(event.event);
    dedupeRegistry.set(dedupeKey, windowMs > 0 ? now + windowMs : 0);

    try {
      const mergedHandlers = {
        ...handlers,
        ...(options.handlers ?? {})
      };
      const handler = mergedHandlers[event.event];
      const handled = handler
        ? await handler({ event, projectContext, options })
        : {
            status: 'noop',
            actionClass: 'inline_safe',
            actions: [],
            warnings: []
          };

      const actionClass = handled.actionClass ?? 'inline_safe';
      if (!isInlineAllowed(event.runtimeMode, actionClass)) {
        throw new Error(`Runtime mode ${event.runtimeMode} does not allow ${actionClass}`);
      }

      const learningRecords = [...(handled.learningRecords ?? [])].map(normalizeLearningRecord);
      const traceResult = {
        status: handled.status ?? 'processed',
        dedupeKey,
        duplicate: false,
        actionClass,
        latency_budget_ms: AUTONOMY_LATENCY_BUDGETS_MS[event.runtimeMode],
        actions: [...(handled.actions ?? [])],
        warnings: [...(handled.warnings ?? [])],
        metrics: { ...(handled.metrics ?? {}) }
      };
      const tracePath = writeTraceArtifact({
        projectContext,
        event,
        result: traceResult
      });
      const evalVerdict = handled.evalVerdict
        ? normalizeEvalVerdict(handled.evalVerdict)
        : deriveDefaultEvalVerdict({
            event,
            status: traceResult.status,
            findings: traceResult.warnings,
            subjectPath: tracePath
          });
      const strategyDecision = handled.strategyDecision
        ? normalizeStrategyDecision(handled.strategyDecision)
        : deriveDefaultStrategyDecision({
            status: traceResult.status,
            findings: traceResult.warnings
          });

      return {
        event,
        ...traceResult,
        tracePath,
        evalVerdict,
        evalPath: writeEvalArtifact({ projectContext, verdict: evalVerdict }),
        strategyDecision,
        strategyPath: writeStrategyArtifact({ projectContext, decision: strategyDecision, event }),
        learningRecords
      };
    } catch (error) {
      const traceResult = {
        status: 'failed',
        dedupeKey,
        duplicate: false,
        actionClass: 'inline_safe',
        latency_budget_ms: AUTONOMY_LATENCY_BUDGETS_MS[event.runtimeMode],
        actions: [],
        warnings: [error.message]
      };
      const tracePath = writeTraceArtifact({
        projectContext,
        event,
        result: traceResult
      });
      const evalVerdict = deriveDefaultEvalVerdict({
        event,
        status: 'failed',
        findings: [error.message],
        subjectPath: tracePath
      });
      const strategyDecision = deriveDefaultStrategyDecision({
        status: 'failed',
        findings: [error.message]
      });

      return {
        event,
        ...traceResult,
        tracePath,
        evalVerdict,
        evalPath: writeEvalArtifact({ projectContext, verdict: evalVerdict }),
        strategyDecision,
        strategyPath: writeStrategyArtifact({ projectContext, decision: strategyDecision, event }),
        learningRecords: []
      };
    } finally {
      if (event.event === 'stop' || event.event === 'subagent_stop') {
        for (const key of [...dedupeRegistry.keys()]) {
          if (key.startsWith(`stop:${event.sessionId}`) || key.startsWith(`subagent_stop:${event.sessionId}`)) {
            dedupeRegistry.delete(key);
          }
        }
      }
    }
  }
});

const defaultDispatcher = createAutonomyDispatcher();

export const dispatchAutonomyEvent = (input, options = {}) =>
  defaultDispatcher.dispatch(input, options);
