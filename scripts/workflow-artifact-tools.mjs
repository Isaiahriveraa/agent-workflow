import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const blockerClasses = [
  'blocking_unknown',
  'decision_missing',
  'evidence_weak',
  'verification_missing',
  'dependency_unmodeled',
  'rollout_unspecified'
];

const artifactRequirements = {
  research: {
    requiredFields: [
      'artifact_type',
      'substantial',
      'critique_completed',
      'critique_cycles',
      'refinement_cycles',
      'blocking_unknown_count',
      'evidence_level',
      'research_ready_for_planning',
      'related_intake',
      'last_validated'
    ],
    requiredSections: [
      'findings',
      'implementation implications',
      'interfaces and contracts',
      'verification implications'
    ]
  },
  plan: {
    requiredFields: [
      'artifact_type',
      'substantial',
      'critique_completed',
      'critique_cycles',
      'refinement_cycles',
      'blocking_unknown_count',
      'dependency_map_present',
      'verification_defined',
      'rollout_defined',
      'plan_ready_for_implementation',
      'related_research',
      'last_validated'
    ],
    requiredSections: [
      'implementation phases',
      'dependencies and sequencing',
      'failure modes and edge cases',
      'automated verification',
      'manual verification'
    ]
  }
};

const readinessFields = {
  research: 'research_ready_for_planning',
  plan: 'plan_ready_for_implementation'
};

const evidenceLevels = new Set(['weak', 'moderate', 'strong']);

const headingAliases = new Map([
  ['findings', [/^findings$/i]],
  ['implementation implications', [/^implementation implications$/i]],
  ['interfaces and contracts', [/^interfaces?(?:\/| and )contracts?$/i, /^affected interfaces?(?:\/| and )contracts?$/i]],
  ['verification implications', [/^verification implications$/i]],
  ['critique', [/^critique$/i, /^critique notes$/i, /^critique summary$/i]],
  ['blocker resolution', [/^blocker resolution$/i, /^blockers resolved$/i, /^blocking unknown resolution$/i]],
  ['implementation phases', [/^implementation approach$/i, /^implementation phases$/i, /^phases$/i]],
  ['original prompt alignment', [/^original prompt alignment$/i, /^prompt alignment$/i, /^user intent alignment$/i]],
  ['research sufficiency', [/^research sufficiency$/i, /^research adequacy$/i, /^research readiness$/i]],
  ['phase plan index', [/^phase plan index$/i, /^phase plans$/i, /^child phase plans$/i, /^planning structure$/i]],
  ['dependencies and sequencing', [/^dependencies and sequencing$/i, /^dependency map$/i, /^dependencies$/i]],
  ['failure modes and edge cases', [/^failure modes(?: and edge cases)?$/i, /^edge cases$/i]],
  ['automated verification', [/^automated verification$/i, /^verification$/i]],
  ['manual verification', [/^manual verification$/i]],
  ['rollout and compatibility', [/^rollout(?: and compatibility)?$/i, /^compatibility notes$/i, /^rollout notes$/i]]
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

const parseScalar = (value) => {
  const trimmed = value.trim();

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((item) => parseScalar(item));
  }

  return trimmed;
};

const parseFrontmatter = (content) => {
  if (!content.startsWith('---\n')) {
    throw new Error('Missing frontmatter block');
  }

  const endIndex = content.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    throw new Error('Unterminated frontmatter block');
  }

  const frontmatterBlock = content.slice(4, endIndex);
  const body = content.slice(endIndex + 5);
  const frontmatter = {};
  let currentListKey = null;

  for (const rawLine of frontmatterBlock.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      currentListKey = null;
      continue;
    }
    // YAML list continuation (e.g. "  - /path/to/file.md")
    if (line.startsWith('-')) {
      if (currentListKey && Array.isArray(frontmatter[currentListKey])) {
        const item = line.slice(1).trim();
        if (item) frontmatter[currentListKey].push(item);
      }
      continue;
    }
    currentListKey = null;
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      throw new Error(`Invalid frontmatter line: ${rawLine}`);
    }
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (value === '') {
      // Empty value starts a list — initialize as empty array
      frontmatter[key] = [];
      currentListKey = key;
    } else {
      frontmatter[key] = parseScalar(value);
    }
  }

  return { frontmatter, body };
};

const parseSections = (content) => {
  const sections = new Map();
  const headingPattern = /^##\s+(.+?)\s*$/gm;
  const matches = [...content.matchAll(headingPattern)];

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const heading = current[1].trim();
    const start = current.index + current[0].length + 1;
    const next = matches[index + 1];
    const end = next ? next.index : content.length;
    sections.set(heading, content.slice(start, end).trim());
  }

  return sections;
};

const findSection = (sections, label) => {
  const matchers = headingAliases.get(label) ?? [new RegExp(`^${label}$`, 'i')];

  for (const [heading, body] of sections.entries()) {
    if (matchers.some((pattern) => pattern.test(heading))) {
      return { heading, body };
    }
  }

  return null;
};

const parseArtifact = ({ content, filePath = null }) => {
  const { frontmatter, body } = parseFrontmatter(content);
  const artifactType = frontmatter.artifact_type;
  const sections = parseSections(body);

  return {
    filePath: filePath ? path.resolve(filePath) : null,
    artifactType,
    frontmatter,
    body,
    headings: [...sections.keys()],
    sections
  };
};

const validateArtifact = (artifact) => {
  const issues = [];
  const warnings = [];

  if (!artifactRequirements[artifact.artifactType]) {
    issues.push(`Unsupported artifact_type: ${artifact.artifactType ?? 'missing'}`);
    return { ok: false, issues, warnings };
  }

  const requirements = artifactRequirements[artifact.artifactType];

  for (const field of requirements.requiredFields) {
    if (!Object.hasOwn(artifact.frontmatter, field)) {
      issues.push(`Missing required frontmatter field: ${field}`);
    }
  }

  if (artifact.frontmatter.artifact_type !== artifact.artifactType) {
    issues.push(`artifact_type must equal ${artifact.artifactType}`);
  }

  for (const sectionLabel of requirements.requiredSections) {
    if (!findSection(artifact.sections, sectionLabel)) {
      issues.push(`Missing required section: ${sectionLabel}`);
    }
  }

  if (!Number.isInteger(artifact.frontmatter.blocking_unknown_count) || artifact.frontmatter.blocking_unknown_count < 0) {
    issues.push('blocking_unknown_count must be a non-negative integer');
  }

  for (const field of ['critique_cycles', 'refinement_cycles']) {
    if (!Number.isInteger(artifact.frontmatter[field]) || artifact.frontmatter[field] < 0) {
      issues.push(`${field} must be a non-negative integer`);
    }
  }

  if (artifact.artifactType === 'research' && !evidenceLevels.has(String(artifact.frontmatter.evidence_level))) {
    issues.push('evidence_level must be one of: weak, moderate, strong');
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings
  };
};

const hasCritiqueEvidence = (artifact) => {
  const linked = artifact.frontmatter.critique_artifacts;
  if (Array.isArray(linked) && linked.length > 0) return true;
  return Boolean(findSection(artifact.sections, 'critique'));
};

const hasBlockerResolutionEvidence = (artifact) => Boolean(findSection(artifact.sections, 'blocker resolution'));

const hasAutomatedVerification = (artifact) => Boolean(findSection(artifact.sections, 'automated verification'));
const hasManualVerification = (artifact) => Boolean(findSection(artifact.sections, 'manual verification'));
const hasRolloutEvidence = (artifact) => Boolean(findSection(artifact.sections, 'rollout and compatibility'));
const hasOriginalPromptAlignment = (artifact) => Boolean(findSection(artifact.sections, 'original prompt alignment'));
const hasResearchSufficiency = (artifact) => Boolean(findSection(artifact.sections, 'research sufficiency'));
const getPhasePlanIndexSection = (artifact) => findSection(artifact.sections, 'phase plan index');

const extractIndexedPhasePlanPaths = (artifact) => {
  const section = getPhasePlanIndexSection(artifact);
  if (!section?.body) return [];

  const matches = section.body.match(/\/[^\s`]+\.md\b/g) ?? [];
  return [...new Set(matches.map((item) => path.resolve(item)))];
};

const parseChildPlan = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return parseArtifact({ filePath, content });
  } catch {
    return null;
  }
};

const childPlanLooksImplementable = (artifact) => {
  if (!artifact) return false;
  const hasSummary = Boolean(findSection(artifact.sections, 'summary'));
  const hasImplementationBody =
    Boolean(findSection(artifact.sections, 'implementation changes'))
    || Boolean(findSection(artifact.sections, 'key changes'))
    || Boolean(findSection(artifact.sections, 'surgical changes'));
  const hasTests =
    Boolean(findSection(artifact.sections, 'tests'))
    || Boolean(findSection(artifact.sections, 'test plan'));
  const hasAssumptions = Boolean(findSection(artifact.sections, 'assumptions'));

  return hasSummary && hasImplementationBody && hasTests && hasAssumptions;
};

const extractArtifactTitle = (artifact) => {
  const match = artifact.body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '';
};

const inferCreativePlan = (artifact) =>
  /\b(redesign|landing page|marketing page|visual direction|design system)\b/i.test(
    extractArtifactTitle(artifact)
  );

const placeholderPattern = /^(not set|tbd|todo|to do|placeholder|n\/a|none|replace me)$/i;
const creativePacketLabels = [
  'intent',
  'audience',
  'visual direction',
  'constraints',
  'references',
  'banned patterns',
  'differentiation target',
  'required states',
  'selected skill',
  'selected capsule'
];

const creativePacketKeyByLabel = {
  intent: 'intent',
  audience: 'audience',
  'visual direction': 'visualDirection',
  constraints: 'constraints',
  references: 'references',
  'banned patterns': 'bannedPatterns',
  'differentiation target': 'differentiationTarget',
  'required states': 'requiredStates',
  'selected skill': 'selectedSkill',
  'selected capsule': 'selectedCapsule'
};

const sectionHasSubstance = (section) => {
  if (!section) return false;
  const body = section.body.trim();
  if (!body) return false;
  if (placeholderPattern.test(body)) return false;
  if (body.length < 20) return false;
  return true;
};

const sectionHasValue = (section) => {
  if (!section) return false;
  const body = section.body.trim();
  if (!body) return false;
  return !placeholderPattern.test(body);
};

const creativePacketPresent = (artifact) => {
  return {
    intent: sectionHasSubstance(findSection(artifact.sections, 'intent')),
    audience: sectionHasSubstance(findSection(artifact.sections, 'audience')),
    visualDirection: sectionHasSubstance(findSection(artifact.sections, 'visual direction')),
    constraints: sectionHasSubstance(findSection(artifact.sections, 'constraints')),
    references: sectionHasSubstance(findSection(artifact.sections, 'references')),
    bannedPatterns: sectionHasSubstance(findSection(artifact.sections, 'banned patterns')),
    differentiationTarget: sectionHasSubstance(findSection(artifact.sections, 'differentiation target')),
    requiredStates: sectionHasSubstance(findSection(artifact.sections, 'required states')),
    selectedSkill: sectionHasValue(findSection(artifact.sections, 'selected skill')),
    selectedCapsule: sectionHasValue(findSection(artifact.sections, 'selected capsule'))
  };
};

const classifyValidationIssue = (issue) => {
  if (/verification/i.test(issue)) return 'verification_missing';
  if (/dependenc/i.test(issue)) return 'dependency_unmodeled';
  if (/rollout|compatibility/i.test(issue)) return 'rollout_unspecified';
  if (/evidence_level/i.test(issue)) return 'evidence_weak';
  return 'decision_missing';
};

const extractPlanPhaseCount = (artifact) =>
  artifact.headings.filter((heading) => /^phase\s+\d+/i.test(heading)).length;

const buildResearchChecks = (artifact) => ({
  critiqueEvidence: hasCritiqueEvidence(artifact),
  minimumIterationSatisfied:
    artifact.frontmatter.critique_cycles >= 1 && artifact.frontmatter.refinement_cycles >= 1,
  blockerResolutionEvidence:
    artifact.frontmatter.blocking_unknown_count > 0 || hasBlockerResolutionEvidence(artifact),
  findingsSection: Boolean(findSection(artifact.sections, 'findings')),
  implementationImplications: Boolean(findSection(artifact.sections, 'implementation implications')),
  interfacesAndContracts: Boolean(findSection(artifact.sections, 'interfaces and contracts')),
  verificationImplications: Boolean(findSection(artifact.sections, 'verification implications')),
  evidenceLevelStrongEnough: ['moderate', 'strong'].includes(String(artifact.frontmatter.evidence_level))
});

const buildPlanChecks = (artifact) => ({
  critiqueEvidence: hasCritiqueEvidence(artifact),
  minimumIterationSatisfied:
    artifact.frontmatter.critique_cycles >= 1 && artifact.frontmatter.refinement_cycles >= 1,
  blockerResolutionEvidence:
    artifact.frontmatter.blocking_unknown_count > 0 || hasBlockerResolutionEvidence(artifact),
  implementationPhasesSection: Boolean(findSection(artifact.sections, 'implementation phases')),
  explicitPhaseCount: extractPlanPhaseCount(artifact),
  originalPromptAlignment: hasOriginalPromptAlignment(artifact),
  researchSufficiency: hasResearchSufficiency(artifact),
  phasePlanIndex: Boolean(getPhasePlanIndexSection(artifact)),
  indexedPhasePlanPaths: extractIndexedPhasePlanPaths(artifact),
  dependenciesAndSequencing: Boolean(findSection(artifact.sections, 'dependencies and sequencing')),
  failureModes: Boolean(findSection(artifact.sections, 'failure modes and edge cases')),
  automatedVerification: hasAutomatedVerification(artifact),
  manualVerification: hasManualVerification(artifact),
  rolloutEvidence: artifact.frontmatter.rollout_defined !== true || hasRolloutEvidence(artifact),
  creativePlan: inferCreativePlan(artifact),
  creativePacket: creativePacketPresent(artifact)
});

const buildGradeResult = (artifact, validation) => {
  const readinessField = readinessFields[artifact.artifactType];
  const blockers = [];
  const reasons = [...validation.issues];

  if (!validation.ok) {
    return {
      artifactType: artifact.artifactType,
      filePath: artifact.filePath,
      passes: false,
      readinessField,
      declaredReady: artifact.frontmatter?.[readinessField] ?? false,
      blockers: validation.issues.map((message) => ({
        class: classifyValidationIssue(message),
        message
      })),
      reasons,
      checks: {}
    };
  }

  const checks = artifact.artifactType === 'research'
    ? buildResearchChecks(artifact)
    : buildPlanChecks(artifact);

  if (!checks.critiqueEvidence) {
    blockers.push({
      class: 'decision_missing',
      message: 'substantial artifacts require critique evidence (a critique section or critique_artifacts) before readiness'
    });
  }

  if (!checks.minimumIterationSatisfied) {
    blockers.push({
      class: 'decision_missing',
      message: 'substantial artifacts require at least one critique cycle and one refinement cycle'
    });
  }

  if (!checks.blockerResolutionEvidence && artifact.frontmatter.blocking_unknown_count === 0) {
    blockers.push({
      class: 'blocking_unknown',
      message: 'blocking_unknown_count is 0 but no blocker resolution section exists'
    });
  }

  if (artifact.artifactType === 'research') {
    if (!checks.implementationImplications || !checks.interfacesAndContracts) {
      blockers.push({
        class: 'decision_missing',
        message: 'research must tie findings to implementation implications and affected interfaces/contracts'
      });
    }

    if (!checks.verificationImplications) {
      blockers.push({
        class: 'verification_missing',
        message: 'research must include verification implications before planning'
      });
    }

    if (!checks.evidenceLevelStrongEnough) {
      blockers.push({
        class: 'evidence_weak',
        message: 'research evidence must be at least moderate to pass readiness'
      });
    }
  }

  if (artifact.artifactType === 'plan') {
    if (checks.explicitPhaseCount === 0) {
      blockers.push({
        class: 'decision_missing',
        message: 'plan must include explicit Phase headings so sequencing is enforceable'
      });
    }

    if (artifact.frontmatter.substantial === true && !checks.originalPromptAlignment) {
      blockers.push({
        class: 'decision_missing',
        message: 'substantial plans must include an Original Prompt Alignment section that proves the plan still targets the user request instead of the bare minimum interpretation'
      });
    }

    if (artifact.frontmatter.substantial === true && !checks.researchSufficiency) {
      blockers.push({
        class: 'evidence_weak',
        message: 'substantial plans must include a Research Sufficiency section that states whether the research is actually enough to support implementation'
      });
    }

    if (artifact.frontmatter.substantial === true) {
      if (!checks.phasePlanIndex) {
        blockers.push({
          class: 'decision_missing',
          message: 'substantial plans must include a Phase Plan Index that links every implementation phase to a detailed child phase plan'
        });
      } else if (checks.indexedPhasePlanPaths.length !== checks.explicitPhaseCount) {
        blockers.push({
          class: 'decision_missing',
          message: 'substantial plans must link one child phase plan per explicit implementation phase'
        });
      } else if (artifact.filePath) {
        const invalidChildPlans = checks.indexedPhasePlanPaths.filter((childPath) => {
          const childArtifact = parseChildPlan(childPath);
          return !childPlanLooksImplementable(childArtifact);
        });

        if (invalidChildPlans.length > 0) {
          blockers.push({
            class: 'decision_missing',
            message: `child phase plans must be implementation-ready and readable before the parent plan can pass: ${invalidChildPlans.join(', ')}`
          });
        }
      }
    }

    if (!checks.dependenciesAndSequencing || artifact.frontmatter.dependency_map_present !== true) {
      blockers.push({
        class: 'dependency_unmodeled',
        message: 'plan dependencies are not modeled strongly enough for implementation'
      });
    }

    if (!checks.automatedVerification || !checks.manualVerification || artifact.frontmatter.verification_defined !== true) {
      blockers.push({
        class: 'verification_missing',
        message: 'plan must define both automated and manual verification before implementation'
      });
    }

    if (!checks.failureModes) {
      blockers.push({
        class: 'decision_missing',
        message: 'plan must cover failure modes and edge cases'
      });
    }

    if (!checks.rolloutEvidence) {
      blockers.push({
        class: 'rollout_unspecified',
        message: 'rollout_defined is true but no rollout/compatibility section exists'
      });
    }

    if (checks.creativePlan) {
      const creativeMissing = creativePacketLabels
        .filter((label) => checks.creativePacket[creativePacketKeyByLabel[label]] !== true);

      if (creativeMissing.length > 0) {
        blockers.push({
          class: 'decision_missing',
          message: `redesign and other creative plans must include the full creative packet before implementation: missing ${creativeMissing.join(', ')}`
        });
      }
    }
  }

  reasons.push(...blockers.map((blocker) => blocker.message));

  const declaredReady = artifact.frontmatter[readinessField] === true;
  if (declaredReady && blockers.length > 0) {
    reasons.push(`${readinessField} is true but structural checks still fail`);
  }

  const critiqueCeilingReached = artifact.frontmatter.critique_cycles >= 3;
  const requiresAnotherPass = blockers.length > 0;
  const needsThirdPass =
    artifact.frontmatter.refinement_cycles >= 1 &&
    blockers.length > 0 &&
    !critiqueCeilingReached;

  return {
    artifactType: artifact.artifactType,
    filePath: artifact.filePath,
    passes: blockers.length === 0 && declaredReady,
    readinessField,
    declaredReady,
    requiresAnotherPass,
    needsThirdPass,
    critiqueCeilingReached,
    nextAction: blockers.length === 0
      ? readinessField === 'research_ready_for_planning'
        ? 'create-plan'
        : 'implement-plan'
      : 'refine-artifact',
    blockers,
    reasons,
    checks
  };
};

const readArtifactInput = (args) => {
  if (args.file) {
    const filePath = path.resolve(args.file);
    return {
      filePath,
      content: fs.readFileSync(filePath, 'utf8')
    };
  }

  if (args.input) {
    return {
      filePath: null,
      content: args.input
    };
  }

  throw new Error('Provide --file or --input');
};

export const parseWorkflowArtifact = ({ filePath = null, content }) =>
  parseArtifact({ filePath, content });

export const validateWorkflowArtifact = ({ filePath = null, content }) => {
  const artifact = parseArtifact({ filePath, content });
  return {
    ...validateArtifact(artifact),
    artifactType: artifact.artifactType,
    filePath: artifact.filePath
  };
};

export const gradeResearchArtifact = ({ filePath = null, content }) => {
  const artifact = parseArtifact({ filePath, content });
  if (artifact.artifactType !== 'research') {
    throw new Error(`grade-research requires artifact_type: research, received ${artifact.artifactType ?? 'missing'}`);
  }
  return buildGradeResult(artifact, validateArtifact(artifact));
};

export const gradePlanArtifact = ({ filePath = null, content }) => {
  const artifact = parseArtifact({ filePath, content });
  if (artifact.artifactType !== 'plan') {
    throw new Error(`grade-plan requires artifact_type: plan, received ${artifact.artifactType ?? 'missing'}`);
  }
  return buildGradeResult(artifact, validateArtifact(artifact));
};

const runCli = () => {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));

  try {
    const input = command ? readArtifactInput(args) : null;

    switch (command) {
      case 'parse':
        console.log(JSON.stringify(parseWorkflowArtifact(input), null, 2));
        break;
      case 'validate':
        console.log(JSON.stringify(validateWorkflowArtifact(input), null, 2));
        break;
      case 'grade-research':
        console.log(JSON.stringify(gradeResearchArtifact(input), null, 2));
        break;
      case 'grade-plan':
        console.log(JSON.stringify(gradePlanArtifact(input), null, 2));
        break;
      default:
        console.error('Usage: node scripts/workflow-artifact-tools.mjs <parse|validate|grade-research|grade-plan> [--file path | --input markdown]');
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
};

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  runCli();
}
