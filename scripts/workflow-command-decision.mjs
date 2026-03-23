import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { dispatchAutonomyEvent } from './autonomy-dispatcher.mjs';
import { ensureProjectContext } from './project-context.mjs';

const WORKFLOW_STAGES = new Set(['create-plan', 'implement-plan', 'validate-plan']);

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

const toAbsolutePath = (value) => {
  if (value == null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return path.resolve(normalized);
};

const normalizeStage = (value) => {
  const stage = String(value ?? '').trim();
  if (!WORKFLOW_STAGES.has(stage)) {
    throw new Error(`Unsupported workflow stage: ${stage || 'missing'}`);
  }
  return stage;
};

const normalizeCommandName = (value, workflowStage) => {
  const commandName = String(value ?? workflowStage).trim();
  if (!commandName) {
    throw new Error('commandName is required');
  }
  return commandName;
};

const normalizeArtifactPathMap = (value = {}) => {
  const paths = value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  return {
    intake: toAbsolutePath(paths.intake),
    plan: toAbsolutePath(paths.plan),
    research: toAbsolutePath(paths.research),
    session: toAbsolutePath(paths.session),
    handoff: toAbsolutePath(paths.handoff)
  };
};

const normalizeRouterScore = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      present: false,
      passes: true,
      total: null,
      clarity: null,
      codebaseCoverage: null,
      thresholds: { total: 70, clarity: 15, codebaseCoverage: 15 },
      reasons: []
    };
  }

  const total = Number(value.total ?? value.score ?? NaN);
  const clarity = Number(value.clarity ?? value.clarityScore ?? NaN);
  const codebaseCoverage = Number(value.codebaseCoverage ?? value.codebase_coverage ?? NaN);
  const thresholds = {
    total: Number(value.totalThreshold ?? 70),
    clarity: Number(value.clarityThreshold ?? 15),
    codebaseCoverage: Number(value.codebaseCoverageThreshold ?? 15)
  };
  const inferredPasses = (
    !Number.isNaN(total)
    && !Number.isNaN(clarity)
    && !Number.isNaN(codebaseCoverage)
    && total >= thresholds.total
    && clarity >= thresholds.clarity
    && codebaseCoverage >= thresholds.codebaseCoverage
  );

  return {
    present: true,
    passes: value.passes == null ? inferredPasses : value.passes === true,
    total: Number.isNaN(total) ? null : total,
    clarity: Number.isNaN(clarity) ? null : clarity,
    codebaseCoverage: Number.isNaN(codebaseCoverage) ? null : codebaseCoverage,
    thresholds,
    reasons: [...(value.reasons ?? value.recommendations ?? [])].map((item) => String(item))
  };
};

const normalizeGrade = (value, readinessField) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      present: false,
      passes: false,
      declaredReady: false,
      blockers: [],
      reasons: [],
      nextAction: null,
      readinessField
    };
  }

  return {
    present: true,
    passes: value.passes === true,
    declaredReady: value.declaredReady === true || value[readinessField] === true,
    blockers: [...(value.blockers ?? [])].map((blocker) => ({
      class: String(blocker.class ?? '').trim(),
      message: String(blocker.message ?? '').trim()
    })),
    reasons: [...(value.reasons ?? [])].map((reason) => String(reason)),
    nextAction: value.nextAction ? String(value.nextAction) : null,
    requiresAnotherPass: value.requiresAnotherPass === true,
    needsThirdPass: value.needsThirdPass === true,
    critiqueCeilingReached: value.critiqueCeilingReached === true,
    readinessField
  };
};

const normalizeMemoryRecallAttempt = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      attempted: false,
      enabled: false,
      source: null,
      itemCount: 0,
      warningCount: 0,
      status: 'missing_attempt'
    };
  }

  const itemCount = Array.isArray(value.items) ? value.items.length : Number(value.itemCount ?? 0);
  const warningCount = Array.isArray(value.warnings) ? value.warnings.length : Number(value.warningCount ?? 0);
  const enabled = value.enabled === true;
  const attempted = value.attempted == null ? true : value.attempted === true;

  let status = 'empty';
  if (!attempted) {
    status = 'missing_attempt';
  } else if (!enabled) {
    status = 'disabled';
  } else if (warningCount > 0) {
    status = 'warning';
  } else if (itemCount > 0) {
    status = 'items';
  }

  return {
    attempted,
    enabled,
    source: value.source ? String(value.source) : null,
    itemCount,
    warningCount,
    status
  };
};

const normalizeVerificationSummary = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      automated: { attempted: false, passed: true, failedCount: 0 },
      manual: { required: false, completed: true, missing: false },
      workflowFidelity: { issues: [], traceGradePassed: true, lessonCaptureRequired: false, lessonCaptured: true },
      failureSignals: { durable: false, repeated: false, reusable: false, blockerClasses: [] }
    };
  }

  const automatedFailedChecks = [...(value.automated?.failedChecks ?? value.failedChecks ?? [])].map((item) => String(item));
  const workflowIssues = [...(value.workflowFidelity?.issues ?? value.workflowIssues ?? [])].map((item) => String(item));
  const blockerClasses = [...(value.failureSignals?.blockerClasses ?? value.blockerClasses ?? [])].map((item) => String(item));

  return {
    automated: {
      attempted: value.automated?.attempted === true || automatedFailedChecks.length > 0 || value.automated?.passed === true,
      passed: value.automated?.passed == null ? automatedFailedChecks.length === 0 : value.automated.passed === true,
      failedCount: automatedFailedChecks.length,
      failedChecks: automatedFailedChecks
    },
    manual: {
      required: value.manual?.required === true || value.manualVerificationRequired === true,
      completed: value.manual?.completed === true || value.manualVerificationComplete === true,
      missing: value.manual?.missing === true || value.manualVerificationMissing === true
    },
    workflowFidelity: {
      issues: workflowIssues,
      traceGradePassed: value.workflowFidelity?.traceGradePassed == null ? true : value.workflowFidelity.traceGradePassed === true,
      lessonCaptureRequired: value.workflowFidelity?.lessonCaptureRequired === true,
      lessonCaptured: value.workflowFidelity?.lessonCaptured == null ? true : value.workflowFidelity.lessonCaptured === true
    },
    failureSignals: {
      durable: value.failureSignals?.durable === true || value.durableMiss === true,
      repeated: value.failureSignals?.repeated === true || value.repeatedMiss === true,
      reusable: value.failureSignals?.reusable === true || value.reusableMiss === true,
      blockerClasses
    }
  };
};

const blockersInclude = (grade, matcher) =>
  grade.blockers.some((blocker) => matcher(blocker.class, blocker.message));

const buildFindings = ({
  workflowStage,
  routerScore,
  researchGrade,
  planGrade,
  memoryRecall,
  verificationSummary
}) => {
  const findings = [];

  if (routerScore.present) {
    findings.push(`router:${routerScore.passes ? 'pass' : 'fail'}`);
  }

  if (researchGrade.present) {
    findings.push(`research_grade:${researchGrade.passes ? 'pass' : 'fail'}`);
  }

  if (planGrade.present) {
    findings.push(`plan_grade:${planGrade.passes ? 'pass' : 'fail'}`);
  }

  findings.push(`memory_recall:${memoryRecall.status}`);

  if (verificationSummary.automated.attempted) {
    findings.push(`automated_verification:${verificationSummary.automated.passed ? 'pass' : 'fail'}`);
  }

  if (verificationSummary.manual.required) {
    findings.push(`manual_verification:${verificationSummary.manual.missing ? 'missing' : verificationSummary.manual.completed ? 'complete' : 'pending'}`);
  }

  for (const blocker of [...researchGrade.blockers, ...planGrade.blockers]) {
    findings.push(`${blocker.class || 'blocker'}:${blocker.message}`);
  }

  for (const issue of verificationSummary.workflowFidelity.issues) {
    findings.push(`workflow_fidelity:${issue}`);
  }

  for (const blockerClass of verificationSummary.failureSignals.blockerClasses) {
    findings.push(`failure_class:${blockerClass}`);
  }

  findings.push(`workflow_stage:${workflowStage}`);
  return findings;
};

const recommendCreatePlanAction = ({ routerScore, researchGrade, planGrade, verificationSummary }) => {
  if (planGrade.present && !planGrade.passes && blockersInclude(planGrade, (_className, message) => /critique|refinement cycle/i.test(message))) {
    return {
      action: 'run_critic',
      rationale: 'The draft plan is not critique-complete yet, so planning should stay in critique/refinement before it is treated as implementation-ready.'
    };
  }

  if (routerScore.present && !routerScore.passes) {
    return {
      action: 'do_more_research',
      rationale: 'The readiness gate is still below threshold, so planning should continue research instead of drafting against weak evidence.'
    };
  }

  if (researchGrade.present && !researchGrade.passes) {
    return {
      action: 'do_more_research',
      rationale: 'The research artifact is not ready for planning, so the command should continue research before drafting or finalizing the plan.'
    };
  }

  if (verificationSummary.workflowFidelity.issues.length > 0) {
    return {
      action: 'request_user_decision',
      rationale: 'Planning evidence is incomplete in a way that needs a human decision before the command can proceed safely.'
    };
  }

  return {
    action: 'continue',
    rationale: 'Readiness, research quality, and workflow evidence are strong enough to continue with planning.'
  };
};

const recommendImplementPlanAction = ({ planGrade, verificationSummary }) => {
  if (planGrade.present && (!planGrade.passes || !planGrade.declaredReady)) {
    return {
      action: 'replan',
      rationale: 'Implementation entry must refuse plans that are malformed or not marked ready for implementation.'
    };
  }

  if (!verificationSummary.automated.passed && (
    verificationSummary.failureSignals.durable
    || verificationSummary.failureSignals.repeated
    || verificationSummary.failureSignals.reusable
  )) {
    return {
      action: 'capture_lesson',
      rationale: 'Automated verification failed with a durable or reusable miss, so the command should capture a lesson before resuming.'
    };
  }

  if (verificationSummary.failureSignals.blockerClasses.some((item) => [
    'blocking_unknown',
    'decision_missing',
    'evidence_weak',
    'verification_missing',
    'dependency_unmodeled',
    'rollout_unspecified'
  ].includes(item))) {
    return {
      action: 'replan',
      rationale: 'The implementation uncovered a modeled blocker class that should route back through plan refinement instead of being designed ad hoc during execution.'
    };
  }

  if (verificationSummary.workflowFidelity.issues.length > 0) {
    return {
      action: 'request_user_decision',
      rationale: 'Implementation hit an evidence-backed blocker that needs operator direction before continuing.'
    };
  }

  return {
    action: 'continue',
    rationale: 'The plan is implementation-ready and no blocking verification or workflow-fidelity issue was found.'
  };
};

const recommendValidatePlanAction = ({ researchGrade, planGrade, verificationSummary }) => {
  if (!verificationSummary.automated.passed && (
    verificationSummary.failureSignals.durable
    || verificationSummary.failureSignals.repeated
    || verificationSummary.failureSignals.reusable
    || (
      verificationSummary.workflowFidelity.lessonCaptureRequired
      && verificationSummary.workflowFidelity.lessonCaptured === false
    )
  )) {
    return {
      action: 'capture_lesson',
      rationale: 'Validation found a durable miss or an unmet learning obligation, so the command should capture a reusable lesson.'
    };
  }

  if (
    verificationSummary.manual.missing
    || verificationSummary.workflowFidelity.issues.length > 0
    || verificationSummary.workflowFidelity.traceGradePassed === false
    || (researchGrade.present && !researchGrade.passes)
    || (planGrade.present && !planGrade.passes)
  ) {
    return {
      action: 'request_user_decision',
      rationale: 'Validation evidence shows divergence, missing manual confirmation, or workflow-fidelity gaps that need a human decision before the work can be accepted.'
    };
  }

  return {
    action: 'continue',
    rationale: 'Implementation evidence, verification, and workflow fidelity are strong enough to treat validation as complete.'
  };
};

export const deriveWorkflowCommandDecision = (input) => {
  const workflowStage = normalizeStage(input.workflowStage);
  const commandName = normalizeCommandName(input.commandName, workflowStage);
  const activeArtifacts = normalizeArtifactPathMap(input.activeArtifacts);
  const routerScore = normalizeRouterScore(input.routerScore);
  const researchGrade = normalizeGrade(input.artifactGrades?.research ?? input.researchGrade, 'research_ready_for_planning');
  const planGrade = normalizeGrade(input.artifactGrades?.plan ?? input.planGrade, 'plan_ready_for_implementation');
  const memoryRecall = normalizeMemoryRecallAttempt(input.memoryRecallAttempt ?? input.memoryRecall);
  const verificationSummary = normalizeVerificationSummary(input.verificationSummary);

  const recommendation = workflowStage === 'create-plan'
    ? recommendCreatePlanAction({ routerScore, researchGrade, planGrade, verificationSummary })
    : workflowStage === 'implement-plan'
      ? recommendImplementPlanAction({ planGrade, verificationSummary })
      : recommendValidatePlanAction({ researchGrade, planGrade, verificationSummary });

  const findings = buildFindings({
    workflowStage,
    routerScore,
    researchGrade,
    planGrade,
    memoryRecall,
    verificationSummary
  });

  return {
    workflowStage,
    commandName,
    activeArtifacts,
    routerScore,
    artifactGrades: {
      research: researchGrade,
      plan: planGrade
    },
    verificationSummary,
    memoryRecall,
    evalVerdict: {
      subjectType: 'strategy_decision',
      subjectPath: activeArtifacts.plan ?? activeArtifacts.research ?? null,
      suite: 'workflow-command-decision',
      score: recommendation.action === 'continue' ? 96 : recommendation.action === 'request_user_decision' ? 55 : 42,
      blocking: recommendation.action !== 'continue',
      findings,
      recommendedNextAction: recommendation.action,
      confidence: recommendation.action === 'continue' ? 0.85 : 0.9
    },
    strategyDecision: {
      action: recommendation.action,
      rationale: recommendation.rationale,
      confidence: recommendation.action === 'continue' ? 0.82 : 0.9,
      dependsOn: findings,
      deferred: recommendation.action === 'request_user_decision'
    }
  };
};

export const evaluateWorkflowCommandDecision = async (input, options = {}) => {
  const decision = deriveWorkflowCommandDecision(input);
  const projectContext = options.projectContext ?? ensureProjectContext({
    cwd: options.cwd,
    projectRoot: options.projectRoot,
    projectSlug: options.projectSlug
  });

  const turnIndex = Number.isInteger(input.turnIndex) ? input.turnIndex : Date.now();

  return dispatchAutonomyEvent({
    event: 'turn_complete',
    provider: input.provider ?? 'local',
    sessionId: input.sessionId ?? projectContext.projectSlug,
    turnId: input.turnId ?? `${decision.commandName}:${decision.workflowStage}:${turnIndex}`,
    timestamp: input.timestamp,
    runtimeMode: input.runtimeMode ?? 'wrapper_notify',
    scope: 'project',
    subject: {
      type: 'strategy_decision',
      id: `${decision.commandName}:${decision.workflowStage}`,
      path: decision.activeArtifacts.plan ?? decision.activeArtifacts.research ?? null
    },
    metadata: {
      turnIndex,
      commandName: decision.commandName,
      workflowStage: decision.workflowStage,
      memoryRecallStatus: decision.memoryRecall.status
    }
  }, {
    projectContext,
    handlers: {
      turn_complete: async () => ({
        status: 'processed',
        actionClass: 'inline_safe',
        actions: ['evaluate_workflow_command', decision.strategyDecision.action],
        warnings: decision.strategyDecision.action === 'continue' ? [] : [decision.strategyDecision.rationale],
        metrics: {
          command: decision.commandName,
          workflowStage: decision.workflowStage
        },
        evalVerdict: decision.evalVerdict,
        strategyDecision: decision.strategyDecision
      })
    }
  });
};

const readInputPayload = (args) => {
  if (args.file) {
    return JSON.parse(fs.readFileSync(path.resolve(args.file), 'utf8'));
  }

  if (args.input) {
    return JSON.parse(args.input);
  }

  throw new Error('Provide --file or --input');
};

const runCli = async () => {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));

  try {
    switch (command) {
      case 'derive': {
        const payload = readInputPayload(args);
        console.log(JSON.stringify(deriveWorkflowCommandDecision(payload), null, 2));
        break;
      }
      case 'evaluate': {
        const payload = readInputPayload(args);
        const result = await evaluateWorkflowCommandDecision(payload);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      default:
        console.error('Usage: node scripts/workflow-command-decision.mjs <derive|evaluate> [--file path | --input json]');
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
};

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  await runCli();
}
