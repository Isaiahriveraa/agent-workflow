// Thin stub — the full dispatcher (trace/eval/strategy artifact writing) has been removed.
// workflow-command-decision.mjs still imports dispatchAutonomyEvent, so this stub
// calls the provided handler directly and returns a compatible result shape.

export const clearAutonomyDedupeRegistry = () => {};

export const createAutonomyDispatcher = () => ({
  async dispatch(input, options = {}) {
    const handler = options.handlers?.[input.event];
    const handled = handler
      ? await handler({ event: input, projectContext: options.projectContext, options })
      : { status: 'noop', actionClass: 'inline_safe', actions: [], warnings: [] };

    return {
      event: input,
      status: handled.status ?? 'processed',
      duplicate: false,
      actionClass: handled.actionClass ?? 'inline_safe',
      actions: handled.actions ?? [],
      warnings: handled.warnings ?? [],
      evalVerdict: handled.evalVerdict ?? null,
      strategyDecision: handled.strategyDecision ?? null,
      learningRecords: []
    };
  }
});

const defaultDispatcher = createAutonomyDispatcher();

export const dispatchAutonomyEvent = (input, options = {}) =>
  defaultDispatcher.dispatch(input, options);
