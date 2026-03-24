import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

const readInput = (args) => {
  if (args.file) {
    return fs.readFileSync(path.resolve(args.file), 'utf8');
  }

  return args.input ?? '';
};

const workflowPatterns = [
  /\bworkflow\b/i,
  /\bcontinuity\b/i,
  /\bcritique\b/i,
  /\brevision\b/i,
  /\brefinement\b/i,
  /\bgate(?:keeper)?\b/i,
  /\bpromotion\b/i,
  /\bready to advance\b/i,
  /\btrace\b/i,
  /\btrajectory\b/i,
  /\bdelegation\b/i,
  /\bhandoff\b/i,
  /\bsession\b/i,
  /\bparity\b/i,
  /\badapter\b/i,
  /\bcapability\b/i,
  /\beval\b/i,
  /\bregression\b/i,
  /\bscenario\b/i,
  /\bmcp\b/i,
  /\bapproval\b/i,
  /\bsandbox\b/i,
  /\btooling\b/i,
  /\breadiness\b/i,
  /\brpi\b/i,
  /\bvalidate:ssot\b/i
];

const directExecutionPatterns = [
  /\bsingle[- ]file\b/i,
  /\bsmall\b/i,
  /\bdirect\b/i,
  /\bstraightforward\b/i,
  /\bwording\b/i,
  /\btypo\b/i,
  /\bcopy edit\b/i
];

const categoryMatchers = {
  continuity: [
    /\bcontinuity\b/i,
    /\bsession(?:-index)?\b/i,
    /\bpause-session\b/i,
    /\bresume-session\b/i,
    /\bresume[-_]handoff\b/i,
    /\bhandoff\b/i,
    /\bcheckpoint\b/i,
    /\bworking set\b/i,
    /\bruntime state\b/i
  ],
  critique_response: [
    /\bcritique\b/i,
    /\breviewer findings\b/i,
    /\brespond to critique\b/i,
    /\bresponse matrix\b/i,
    /\brevision loop\b/i,
    /\brefinement cycle\b/i,
    /\baddress findings\b/i
  ],
  artifact_governance: [
    /\bartifact\b/i,
    /\bpromotion\b/i,
    /\badvance\b/i,
    /\bready(?: for)? planning\b/i,
    /\bready(?: to)? execute\b/i,
    /\bgate(?:keeper)?\b/i,
    /\bgrade(?:-research|-plan)?\b/i,
    /\bpromotion-ready\b/i
  ],
  parity: [
    /\bparity\b/i,
    /\badapter\b/i,
    /\bcapability\b/i,
    /\bmanifest\b/i,
    /\bnative\b/i,
    /\bbridged\b/i,
    /\bunsupported\b/i,
    /\bcodex(?: cli)?\b/i,
    /\bclaude code\b/i,
    /\bopencode\b/i,
    /\bantigravity\b/i,
    /\bopenclaw\b/i
  ],
  workflow_gating: [
    /\breadiness\b/i,
    /\brpi\b/i,
    /\bworkflow gate\b/i,
    /\bprompt optimization\b/i,
    /\bcreate-plan\b/i,
    /\bimplement[-_]plan\b/i,
    /\bvalidate[-_]plan\b/i,
    /\bresearch -> plan -> implement -> validate\b/i,
    /\bskipping .*coding\b/i
  ],
  eval: [
    /\beval\b/i,
    /\bregression\b/i,
    /\bscenario\b/i,
    /\bcoverage\b/i,
    /\bverification\b/i,
    /\btest(?:s|ing)?\b/i
  ],
  trace: [
    /\btrace\b/i,
    /\btrajectory\b/i,
    /\bdelegation\b/i,
    /\bhandoff quality\b/i,
    /\btool[- ]use\b/i,
    /\bcheckpoint quality\b/i,
    /\borchestration drift\b/i
  ],
  tooling: [
    /\bmcp\b/i,
    /\bapproval\b/i,
    /\bapprovals\b/i,
    /\bpermission\b/i,
    /\bsandbox\b/i,
    /\bhelper script\b/i,
    /\btool wiring\b/i,
    /\bintegration\b/i
  ]
};

const expertByCategory = {
  continuity: 'continuity-manager',
  critique_response: 'critique-responder',
  artifact_governance: 'artifact-gatekeeper',
  parity: 'adapter-parity-auditor',
  workflow_gating: 'workflow-router-auditor',
  eval: 'eval-engineer',
  trace: 'trace-grader',
  tooling: 'tooling-integrator'
};

const dominantIntentMatchers = {
  critique_response: [/\brespond\b/i, /\brevise\b/i, /\bfix findings\b/i, /\baddress critique\b/i],
  artifact_governance: [/\badvance\b/i, /\bgate\b/i, /\bpromotion\b/i, /\bready\b/i],
  eval: [/\bdesign\b/i, /\bregression\b/i, /\bscenario\b/i, /\bcoverage\b/i, /\btest(?:s|ing)?\b/i],
  trace: [/\btrace\b/i, /\btrajectory\b/i, /\bdelegation\b/i, /\btool[- ]use\b/i],
  workflow_gating: [/\baudit\b/i, /\bcheck whether\b/i, /\bskipp(?:ed|ing)\b/i, /\breadiness\b/i],
  tooling: [/\bclarify\b/i, /\bconfigure\b/i, /\bintegrat(?:e|ion)\b/i, /\bwire\b/i],
  parity: [/\baudit\b/i, /\bcompare\b/i, /\bmatrix\b/i],
  continuity: [/\bresume\b/i, /\brepair\b/i, /\brestore\b/i, /\bcheckpoint\b/i]
};

const detectCategories = (input) =>
  Object.entries(categoryMatchers)
    .filter(([, patterns]) => patterns.some((pattern) => pattern.test(input)))
    .map(([category]) => category);

const shouldStayLocal = (input, categories) => {
  const hasWorkflowSignal = workflowPatterns.some((pattern) => pattern.test(input));
  const isDirectExecution = directExecutionPatterns.some((pattern) => pattern.test(input));

  if (!hasWorkflowSignal) {
    return {
      stayLocal: true,
      reason: 'No workflow-system signal detected.'
    };
  }

  if (categories.length === 0 && isDirectExecution) {
    return {
      stayLocal: true,
      reason: 'The request is narrow and operational; delegation would add overhead.'
    };
  }

  return {
    stayLocal: false,
    reason: null
  };
};

const evaluateConfidence = (trimmed, categories) => {
  const scores = {};
  for (const cat of categories) {
    let score = 0.5; // Base score for matching a category
    if (dominantIntentMatchers[cat]?.some((pattern) => pattern.test(trimmed))) {
      score += 0.4;
    }
    // Boost if it's the only category mentioned
    if (categories.length === 1) {
      score += 0.2;
    }
    scores[cat] = Math.min(1.0, score);
  }
  return scores;
};

const routeTask = (input) => {
  const trimmed = input.trim();
  const categories = detectCategories(trimmed);
  const localDecision = shouldStayLocal(trimmed, categories);

  if (localDecision.stayLocal) {
    return {
      route: 'stay-local',
      confidence: 1.0,
      stayLocal: true,
      categories,
      reason: localDecision.reason
    };
  }

  const scores = evaluateConfidence(trimmed, categories);
  
  let bestCategory = null;
  let maxScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = cat;
    }
  }

  if (categories.length > 1 && /\btogether\b|\bacross\b|\bplus\b|\bcombine\b|\bmixed\b/i.test(trimmed)) {
    return {
      route: 'expert-agent-router',
      confidence: 0.9,
      stayLocal: false,
      categories,
      reason: 'The request explicitly bundles multiple workflow surfaces together.'
    };
  }

  const rankedCandidates = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, score]) => ({ route: expertByCategory[cat], score, category: cat }));

  if (maxScore >= 0.6 && bestCategory) {
    return {
      route: expertByCategory[bestCategory],
      confidence: Number(maxScore.toFixed(2)),
      stayLocal: false,
      categories,
      reason: `High confidence match for ${bestCategory} (score: ${maxScore.toFixed(2)}).`
    };
  }

  return {
    route: 'expert-agent-router',
    confidence: Number((maxScore > 0 ? maxScore : 0.1).toFixed(2)),
    stayLocal: false,
    categories,
    candidates: rankedCandidates.length > 0 ? rankedCandidates : undefined,
    reason: rankedCandidates.length > 0 
      ? 'Confidence too low (< 0.6) for a single route. Ranked candidates provided.'
      : 'Workflow-system request detected, but no matching expert categories found.'
  };
};

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));

  try {
    switch (command) {
      case 'route':
        console.log(JSON.stringify(routeTask(readInput(args)), null, 2));
        break;
      default:
        console.error('Usage: node scripts/expert-agent-routing-tools.mjs route [--input text|--file path]');
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

export { routeTask };
