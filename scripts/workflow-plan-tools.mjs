import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PHASE_INDEX_HEADING = '## Phase Plan Index';

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

const parseFrontmatter = (content) => {
  if (!content.startsWith('---\n')) {
    return {
      frontmatter: {},
      body: content,
      frontmatterBlock: null
    };
  }

  const endIndex = content.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    throw new Error('Unterminated frontmatter block');
  }

  const frontmatterBlock = content.slice(4, endIndex);
  const body = content.slice(endIndex + 5);
  const frontmatter = {};

  for (const rawLine of frontmatterBlock.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    frontmatter[key] = value;
  }

  return {
    frontmatter,
    body,
    frontmatterBlock
  };
};

const extractSectionBody = (content, heading) => {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`^${escapedHeading}\\n([\\s\\S]*?)(?=\\n## |\\s*$)`, 'm'));
  return match ? match[1].trim() : '';
};

const extractBullets = (content) =>
  content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);

const parsePhases = (body) => {
  const headingPattern = /^##\s+Phase\s+(\d+):\s+(.+?)\s*$/gm;
  const matches = [...body.matchAll(headingPattern)];

  return matches.map((match, index) => {
    const phaseNumber = Number.parseInt(match[1], 10);
    const title = match[2].trim();
    const start = match.index + match[0].length + 1;
    const next = matches[index + 1];
    const end = next ? next.index : body.length;
    const content = body.slice(start, end).trim();
    return {
      phaseNumber,
      title,
      content
    };
  });
};

const findSectionRange = (body, matchers) => {
  const headingPattern = /^##\s+(.+?)\s*$/gm;
  const matches = [...body.matchAll(headingPattern)];

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const heading = current[1].trim();
    if (!matchers.some((matcher) => matcher.test(heading))) continue;

    const start = current.index;
    const next = matches[index + 1];
    const end = next ? next.index : body.length;
    return { start, end };
  }

  return null;
};

const normalizeSentence = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const toBulletBlock = (items, fallback) => {
  const normalized = items
    .map((item) => item.trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return `- ${fallback}`;
  }

  return normalized.map((item) => `- ${normalizeSentence(item)}`).join('\n');
};

const buildChildPlanPath = (parentPath, phaseNumber) =>
  parentPath.replace(/\.md$/, `-phase-${phaseNumber}.md`);

const renderChildPlan = ({
  parentPath,
  parentFrontmatter,
  phase,
  publicInterfaceChanges,
  automatedVerification,
  manualVerification,
  failureModes
}) => {
  const phaseBullets = extractBullets(phase.content);
  const summary =
    normalizeSentence(phase.content.split('\n').find((line) => line.trim()) ?? '') ||
    `This phase delivers ${phase.title.toLowerCase()}.`;
  const interfaceBullets = publicInterfaceChanges.length > 0
    ? publicInterfaceChanges
    : ['No additional public interface changes are expected beyond the parent plan contracts for this phase'];
  const testBullets = [
    ...automatedVerification.map((item) => `Automated: ${item}`),
    ...manualVerification.map((item) => `Manual: ${item}`)
  ];
  const assumptionBullets = [
    phaseBullets.length > 0
      ? `Implement this phase by following the scoped changes listed below and preserve the sequencing defined in the parent plan`
      : `This phase should stay bounded to the parent plan sequencing and not absorb later phases`,
    failureModes.length > 0
      ? `Account for the parent-plan risks relevant to this phase, especially: ${failureModes[0]}`
      : 'No additional phase-specific assumptions were discovered beyond the parent plan'
  ];

  return `---
artifact_type: plan
substantial: ${parentFrontmatter.substantial ?? 'true'}
parent_plan: ${parentPath}
phase: ${phase.phaseNumber}
---

# Phase ${phase.phaseNumber} Plan: ${phase.title}

## Summary

${summary}

## Surgical Changes

${toBulletBlock(
    phaseBullets,
    `Translate the parent plan's Phase ${phase.phaseNumber} section into implementation changes before execution`
  )}

## Interface Changes

${toBulletBlock(interfaceBullets, 'No public interface changes are expected in this phase')}

## Tests

${toBulletBlock(
    testBullets,
    'Run the parent plan verification commands and add phase-specific coverage for touched behavior'
  )}

## Assumptions

${toBulletBlock(assumptionBullets, 'No additional assumptions recorded')}
`;
};

const replaceOrInsertPhasePlanIndex = (body, indexBlock) => {
  const existingSection = findSectionRange(body, [
    /^Phase Plan Index$/i,
    /^Phase Plans$/i,
    /^Child Phase Plans$/i,
    /^Planning Structure$/i
  ]);
  if (existingSection) {
    return `${body.slice(0, existingSection.start)}${indexBlock}\n\n${body.slice(existingSection.end).trimStart()}`;
  }

  const insertionTargets = [
    [/^Research Sufficiency$/i],
    [/^Implementation Phases$/i]
  ];

  for (const matchers of insertionTargets) {
    const section = findSectionRange(body, matchers);
    if (section) {
      return `${body.slice(0, section.end).trimEnd()}\n\n${indexBlock}\n\n${body.slice(section.end).trimStart()}`;
    }
  }

  return `${body.trimEnd()}\n\n${indexBlock}\n`;
};

const renderPhasePlanIndex = (entries) =>
  `${PHASE_INDEX_HEADING}\n${entries.map(({ phaseNumber, filePath }) => `- Phase ${phaseNumber} detail plan: ${filePath}`).join('\n')}`;

const parseChildFrontmatter = (content) => parseFrontmatter(content).frontmatter;

const syncChildPlans = ({ parentPath }) => {
  const resolvedParentPath = path.resolve(parentPath);
  const parentContent = fs.readFileSync(resolvedParentPath, 'utf8');
  const { frontmatter, body, frontmatterBlock } = parseFrontmatter(parentContent);

  if (frontmatter.artifact_type !== 'plan') {
    throw new Error(`sync-child-plans requires artifact_type: plan, received ${frontmatter.artifact_type ?? 'missing'}`);
  }

  const phases = parsePhases(body);
  if (phases.length === 0) {
    throw new Error('sync-child-plans requires at least one explicit "## Phase N: Title" section');
  }

  const publicInterfaceChanges = extractBullets(extractSectionBody(body, '## Public Interface Changes'));
  const automatedVerification = extractBullets(extractSectionBody(body, '## Automated Verification'));
  const manualVerification = extractBullets(extractSectionBody(body, '## Manual Verification'));
  const failureModes = extractBullets(extractSectionBody(body, '## Failure Modes and Edge Cases'));

  const childPlans = phases.map((phase) => {
    const filePath = buildChildPlanPath(resolvedParentPath, phase.phaseNumber);
    const content = renderChildPlan({
      parentPath: resolvedParentPath,
      parentFrontmatter: frontmatter,
      phase,
      publicInterfaceChanges,
      automatedVerification,
      manualVerification,
      failureModes
    });

    fs.writeFileSync(filePath, content);
    return {
      phaseNumber: phase.phaseNumber,
      title: phase.title,
      filePath
    };
  });

  const siblingEntries = fs.readdirSync(path.dirname(resolvedParentPath), { withFileTypes: true });
  const managedChildPrefix = `${path.basename(resolvedParentPath, '.md')}-phase-`;
  const activeChildPaths = new Set(childPlans.map((item) => item.filePath));

  for (const entry of siblingEntries) {
    if (!entry.isFile() || !entry.name.startsWith(managedChildPrefix) || !entry.name.endsWith('.md')) continue;
    const childPath = path.join(path.dirname(resolvedParentPath), entry.name);
    if (activeChildPaths.has(childPath)) continue;

    try {
      const childFrontmatter = parseChildFrontmatter(fs.readFileSync(childPath, 'utf8'));
      if (path.resolve(childFrontmatter.parent_plan ?? '') === resolvedParentPath) {
        fs.rmSync(childPath, { force: true });
      }
    } catch {
      // Leave unreadable sibling artifacts alone.
    }
  }

  const phasePlanIndex = renderPhasePlanIndex(childPlans);
  const updatedBody = replaceOrInsertPhasePlanIndex(body, phasePlanIndex);
  const updatedParentContent = frontmatterBlock === null
    ? updatedBody
    : `---\n${frontmatterBlock}\n---\n${updatedBody}`;
  fs.writeFileSync(resolvedParentPath, updatedParentContent);

  return {
    parentPath: resolvedParentPath,
    childPlans
  };
};

const runCli = () => {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));

  try {
    switch (command) {
      case 'sync-child-plans':
        if (!args.parent) {
          throw new Error('sync-child-plans requires --parent [absolute parent plan path]');
        }
        console.log(JSON.stringify(syncChildPlans({ parentPath: args.parent }), null, 2));
        break;
      default:
        console.error('Usage: node scripts/workflow-plan-tools.mjs sync-child-plans --parent [absolute parent plan path]');
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
};

export { syncChildPlans };

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  runCli();
}
