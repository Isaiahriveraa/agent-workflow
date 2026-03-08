import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureProjectContext } from './project-context.mjs';

const root = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const project = ensureProjectContext();
const intakeDir = path.join(project.planningDir, 'intake');

const substantialSignals = [
  /ambiguous/i,
  /multi-step/i,
  /\bworkflow\b/i,
  /\bhandoff\b/i,
  /\bplan\b/i,
  /\bresearch\b/i,
  /\barchitecture\b/i,
  /\bshared\b/i,
  /\b3\+\s*files\b/i,
  /\bmultiple subsystems\b/i
];

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

const classifyTask = (input) => {
  const matches = substantialSignals.filter((pattern) => pattern.test(input));
  const fileEstimate = input.match(/\b(\d+)\s*files?\b/i);
  const explicitFileCount = fileEstimate ? Number.parseInt(fileEstimate[1], 10) : null;
  const substantial = matches.length > 0 || (explicitFileCount !== null && explicitFileCount >= 3);

  return {
    substantial,
    reasons: matches.map((pattern) => pattern.source),
    explicitFileCount
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
      : 'continue research or ask focused questions'
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
      case 'score':
        console.log(JSON.stringify(scoreReadiness(args), null, 2));
        break;
      case 'capture':
        console.log(JSON.stringify(writeIntakeArtifact(args), null, 2));
        break;
      default:
        console.error('Usage: node scripts/workflow-router-tools.mjs <classify|score|capture> [--key value]');
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
