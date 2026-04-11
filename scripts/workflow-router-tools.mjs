import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureProjectContext } from './project-context.mjs';

const root = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const project = ensureProjectContext();
const intakeDir = path.join(project.planningDir, 'intake');

const strictWorkflowSignals = Object.freeze([
  {
    id: 'vague_or_under_specified',
    reason: 'request is vague or under-specified',
    weight: 'heavy',
    patterns: [/\bambiguous\b/i, /\bvague\b/i, /\bunderspecified\b/i, /\bunder-specified\b/i]
  },
  {
    id: 'multi_step_or_execution_heavy',
    reason: 'task is multi-step or implementation-heavy',
    weight: 'heavy',
    patterns: [/\bmulti-step\b/i, /\bimplementation-heavy\b/i, /\bphase(?:d)?\b/i]
  },
  {
    id: 'workflow_or_planning_change',
    reason: 'task changes workflow behavior or requires planning',
    weight: 'heavy',
    patterns: [/\bworkflow\b/i, /\bplan(?:ning)?\b/i, /\bresearch\b/i, /\bhandoff\b/i, /\bdelegat(?:e|ion)\b/i]
  },
  {
    id: 'shared_behavior_change',
    reason: 'task changes shared prompts, rules, adapters, or continuity behavior',
    weight: 'heavy',
    patterns: [/\bshared\b/i, /\bprompts?\b/i, /\brules?\b/i, /\badapters?\b/i, /\bcontinuity\b/i]
  },
  {
    id: 'cross_subsystem_scope',
    reason: 'task spans multiple subsystems or architectural boundaries',
    weight: 'heavy',
    patterns: [/\barchitecture\b/i, /\bmultiple subsystems\b/i, /\bcross-layer\b/i, /\bcross-provider\b/i]
  },
  {
    id: 'long_running_scope',
    reason: 'task is likely to take more than 30 minutes',
    weight: 'heavy',
    patterns: [/\b30\+?\s*minutes?\b/i, /\bmore than 30 minutes\b/i, /\bhalf[- ]day\b/i, /\blarge refactor\b/i]
  },
  {
    id: 'moderate_multi_file',
    reason: 'task touches multiple files but scope is clear',
    weight: 'moderate',
    patterns: [/\b(?:2|3|few)\s*files?\b/i, /\bsmall change\b/i, /\bquick fix\b/i, /\bminor update\b/i]
  },
  {
    id: 'moderate_feature_addition',
    reason: 'task adds a bounded feature or subcommand',
    weight: 'moderate',
    patterns: [/\badd (?:a |the )?(?:command|subcommand|flag|option)\b/i, /\bextend\b/i, /\bnew hook\b/i]
  }
]);

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
    .slice(0, 64) || 'workflow-intake';

const readInput = (args) => {
  if (args.file) {
    return fs.readFileSync(path.resolve(args.file), 'utf8');
  }

  return args.input ?? '';
};

const collectActivationReasons = (input, explicitFileCount) => {
  const reasons = strictWorkflowSignals.flatMap((signal) =>
    signal.patterns.some((pattern) => pattern.test(input))
      ? [{ id: signal.id, reason: signal.reason, weight: signal.weight }]
      : []
  );

  if (explicitFileCount !== null && explicitFileCount >= 3) {
    reasons.push({
      id: 'touches_three_or_more_files',
      reason: 'task is likely to touch 3 or more files',
      weight: 'heavy'
    });
  }

  return reasons;
};

const deriveTier = (reasons) => {
  const heavyCount = reasons.filter((r) => r.weight === 'heavy').length;
  const moderateCount = reasons.filter((r) => r.weight === 'moderate').length;

  if (heavyCount >= 2 || (heavyCount >= 1 && moderateCount >= 1)) return 3;
  if (heavyCount === 1 || moderateCount >= 1) return 2;
  return 1;
};

const tierLabels = Object.freeze({
  1: 'lightweight',
  2: 'moderate',
  3: 'substantial'
});

const tierNextActions = Object.freeze({
  1: 'proceed-lightweight',
  2: 'plan-then-implement',
  3: 'optimize-prompt'
});

const deriveActivationDecision = (input) => {
  const fileEstimate = input.match(/\b(\d+)\s*\+?\s*files?\b/i);
  const explicitFileCount = fileEstimate ? Number.parseInt(fileEstimate[1], 10) : null;
  const reasons = collectActivationReasons(input, explicitFileCount);
  const tier = deriveTier(reasons);
  const substantial = tier === 3;
  const ambiguityDetected = reasons.some((item) => item.id === 'vague_or_under_specified');

  return {
    strictWorkflowRequired: substantial,
    tier,
    tierLabel: tierLabels[tier],
    taskSize: tierLabels[tier],
    reasons,
    explicitFileCount,
    ambiguityDetected,
    recommendedResearchEntry: ambiguityDetected ? 'brainstorm' : 'research',
    recommendedNextAction: tierNextActions[tier]
  };
};

const classifyTask = (input) => {
  const activation = deriveActivationDecision(input);
  return {
    substantial: activation.strictWorkflowRequired,
    tier: activation.tier,
    tierLabel: activation.tierLabel,
    reasons: activation.reasons.map((item) => item.id),
    explicitFileCount: activation.explicitFileCount,
    activation
  };
};

const normalizedScore = (value, max) => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(max, parsed));
};

const scoreReadiness = (args) => {
  const scorecard = {
    clarity: normalizedScore(args.clarity, 25),
    codebaseCoverage: normalizedScore(args['codebase-coverage'], 25),
    constraints: normalizedScore(args.constraints, 20),
    risks: normalizedScore(args.risks, 15),
    verification: normalizedScore(args.verification, 15)
  };

  const total =
    scorecard.clarity +
    scorecard.codebaseCoverage +
    scorecard.constraints +
    scorecard.risks +
    scorecard.verification;

  const passes = total >= 70 && scorecard.clarity >= 15 && scorecard.codebaseCoverage >= 15;

  return {
    total,
    threshold: 70,
    minima: {
      clarity: 15,
      codebaseCoverage: 15
    },
    scorecard,
    passes,
    nextAction: passes
      ? 'create-plan'
      : 'continue research or ask focused questions',
    recommendedNextAction: passes
      ? 'create-plan'
      : 'continue-research',
    reasons: passes
      ? ['readiness gate passed']
      : [
        total < 70 ? 'total score below 70' : null,
        scorecard.clarity < 15 ? 'clarity below 15' : null,
        scorecard.codebaseCoverage < 15 ? 'codebase coverage below 15' : null
      ].filter(Boolean)
  };
};

const writeIntakeArtifact = (args) => {
  const input = readInput(args).trim();
  if (!input) {
    throw new Error('capture requires --input or --file');
  }

  fs.mkdirSync(intakeDir, { recursive: true });
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);
  const slug = slugify(args.topic ?? input.split('\n')[0]);
  const intakePath = path.join(intakeDir, `${stamp}-${slug}.md`);
  const classify = classifyTask(input);
  const content = [
    '---',
    `date: ${now.toISOString()}`,
    `topic: "${(args.topic ?? 'Workflow intake').replace(/"/g, '\\"')}"`,
    `substantial: ${classify.substantial}`,
    `source: ${args.source ?? 'workflow-router-tools'}`,
    'status: captured',
    '---',
    '',
    `# Intake: ${args.topic ?? 'Workflow Intake'}`,
    '',
    '## Raw Request',
    input
  ].join('\n');

  fs.writeFileSync(intakePath, `${content}\n`);

  return {
    path: intakePath,
    classification: classify
  };
};

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));

  try {
    switch (command) {
      case 'classify':
        console.log(JSON.stringify(classifyTask(readInput(args)), null, 2));
        break;
      case 'activate':
        console.log(JSON.stringify(deriveActivationDecision(readInput(args)), null, 2));
        break;
      case 'score':
        console.log(JSON.stringify(scoreReadiness(args), null, 2));
        break;
      case 'capture':
        console.log(JSON.stringify(writeIntakeArtifact(args), null, 2));
        break;
      default:
        console.error('Usage: node scripts/workflow-router-tools.mjs <activate|classify|score|capture> [--key value]');
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
