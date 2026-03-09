import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureProjectContext } from './project-context.mjs';
import { assertSingleHeading, writeProjectStateSections } from './runtime-state-tools.mjs';
import { gradePlanArtifact, gradeResearchArtifact } from './workflow-artifact-tools.mjs';

const root = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = ensureProjectContext();
const statePath = project.contextPaths.state;
const researchIndexPath = project.contextPaths.researchIndex;
const repoLocalArtifactRoots = {
  intake: project.thoughtPaths.intake,
  research: project.thoughtPaths.research
};
const canonicalPlanRoot = project.thoughtPaths.plans;
const legacyPlanRoot = path.join(project.planningDir, 'plans');
const sharedArtifactRoots = {
  plans: canonicalPlanRoot,
  handoffs: project.thoughtPaths.handoffs
};
const projectRuntimeArtifactRoots = {
  sessions: project.thoughtPaths.sessions
};
const categories = {
  ...repoLocalArtifactRoots,
  ...sharedArtifactRoots,
  ...projectRuntimeArtifactRoots
};

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');
const readState = () => fs.readFileSync(statePath, 'utf8');
const workingSetHeading = '## Active Artifact Working Set';
const safeStat = (filePath) => {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
};

const assertSingleWorkingSetSection = (state) => {
  assertSingleHeading(state, workingSetHeading);
};

const listFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== '.gitkeep') {
      if (safeStat(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  return files.sort((a, b) => (safeStat(b)?.mtimeMs ?? 0) - (safeStat(a)?.mtimeMs ?? 0));
};

const listPlanFiles = () => {
  const canonical = listFiles(canonicalPlanRoot);
  if (canonical.length > 0) return canonical;
  return listFiles(legacyPlanRoot);
};

const parseBullets = (content, heading) => {
  const match = content.match(new RegExp(`${heading}\\n([\\s\\S]*?)(?:\\n## |$)`));
  if (!match) return [];
  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
};

const parseStateField = (section, label) => {
  const match = section.match(new RegExp(`^- ${label}:\\s*(.*)$`, 'm'));
  return match ? match[1].trim() : 'none';
};

const parseOrderedArtifacts = (section) => {
  const match = section.match(/### Ordered Artifacts\n([\s\S]*?)$/);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^\d+\.\s+/, '').trim())
    .filter((line) => line && line !== 'none');
};

const safeReadFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
};

const looksSubstantial = (content) => {
  if (!content) return false;
  return (
    /^##\s+Phase\s+\d+/im.test(content) ||
    /^##\s+Implementation Approach$/im.test(content) ||
    /^##\s+Detailed Findings$/im.test(content) ||
    /^##\s+Testing Strategy$/im.test(content)
  );
};

const classifyArtifactReadiness = (category, filePath) => {
  if (!filePath) {
    return {
      status: 'missing',
      ready: false,
      legacySubstantial: false,
      blockedCommands: []
    };
  }

  if (category !== 'plan' && category !== 'research') {
    return {
      status: 'not_applicable',
      ready: false,
      legacySubstantial: false,
      blockedCommands: []
    };
  }

  const content = safeReadFile(filePath);
  if (!content) {
    return {
      status: 'unreadable',
      ready: false,
      legacySubstantial: false,
      blockedCommands: []
    };
  }

  try {
    const grade = category === 'plan'
      ? gradePlanArtifact({ filePath, content })
      : gradeResearchArtifact({ filePath, content });

    return {
      status: grade.passes ? 'ready' : 'not_ready',
      ready: grade.passes,
      legacySubstantial: false,
      blockedCommands: grade.passes
        ? []
        : category === 'plan'
          ? ['/implement_plan', '/resume-session']
          : ['/create-plan'],
      blockers: grade.blockers,
      readinessField: grade.readinessField
    };
  } catch (error) {
    const legacySubstantial = looksSubstantial(content);
    return {
      status: legacySubstantial ? 'legacy_substantial' : 'legacy_nonready',
      ready: false,
      legacySubstantial,
      blockedCommands: legacySubstantial
        ? category === 'plan'
          ? ['/implement_plan', '/resume-session']
          : ['/create-plan']
        : [],
      warning: error.message
    };
  }
};

const readPersistedWorkingSet = () => {
  const state = readState();
  assertSingleWorkingSetSection(state);
  const sectionMatch = state.match(/## Active Artifact Working Set\n([\s\S]*?)(?=\n## |\s*$)/);
  if (!sectionMatch) {
    return {
      lastUpdated: 'none',
      source: 'none',
      focus: 'none',
      selected: {
        intake: null,
        plan: null,
        research: null,
        session: null,
        handoff: null
      },
      ordered: []
    };
  }

  const section = sectionMatch[1].trim();
  const selectedMatch = section.match(/### Selected By Category\n([\s\S]*?)(?=\n### |\s*$)/);
  const selectedSection = selectedMatch ? selectedMatch[1] : '';

  const selected = {
    intake: parseStateField(selectedSection, 'intake'),
    plan: parseStateField(selectedSection, 'plan'),
    research: parseStateField(selectedSection, 'research'),
    session: parseStateField(selectedSection, 'session'),
    handoff: parseStateField(selectedSection, 'handoff')
  };

  return {
    lastUpdated: parseStateField(section, 'Last updated'),
    source: parseStateField(section, 'Source'),
    focus: parseStateField(section, 'Focus'),
    selected: Object.fromEntries(
      Object.entries(selected).map(([key, value]) => [key, value === 'none' ? null : value])
    ),
    ordered: parseOrderedArtifacts(section)
  };
};

const normalizeArtifactPath = (value) => {
  if (!value || value === 'none') return null;
  if (!path.isAbsolute(value)) {
    throw new Error(`Artifact path must be absolute or "none": ${value}`);
  }
  if (!fs.existsSync(value)) {
    throw new Error(`Artifact path does not exist: ${value}`);
  }
  return value;
};

const buildOrderedArtifacts = (selected) => {
  const ordered = [];
  for (const key of ['intake', 'plan', 'research', 'session', 'handoff']) {
    const value = selected[key];
    if (value && !ordered.includes(value)) {
      ordered.push(value);
    }
  }
  return ordered;
};

const renderWorkingSetSection = (workingSet) => {
  const ordered = workingSet.ordered.length > 0 ? workingSet.ordered : ['none'];
  return [
    `- Last updated: ${workingSet.lastUpdated}`,
    `- Source: ${workingSet.source}`,
    `- Focus: ${workingSet.focus}`,
    '',
    '### Selected By Category',
    `- intake: ${workingSet.selected.intake ?? 'none'}`,
    `- plan: ${workingSet.selected.plan ?? 'none'}`,
    `- research: ${workingSet.selected.research ?? 'none'}`,
    `- session: ${workingSet.selected.session ?? 'none'}`,
    `- handoff: ${workingSet.selected.handoff ?? 'none'}`,
    '',
    '### Ordered Artifacts',
    ...ordered.map((artifactPath, index) => `${index + 1}. ${artifactPath}`)
  ].join('\n');
};

const persistWorkingSet = (workingSet) => {
  const state = readState();
  assertSingleWorkingSetSection(state);
  writeProjectStateSections({
    statePath,
    sections: [
      {
        heading: workingSetHeading,
        replacement: renderWorkingSetSection(workingSet)
      }
    ]
  });
  return workingSet;
};

export const persistWorkingSetSelection = ({ overrides = {}, metadata = {} } = {}) =>
  persistWorkingSet(resolvedWorkingSet(overrides, metadata));

const state = readState();
const sessionIndex = readFile(project.contextPaths.sessionIndex);
const researchIndex = readFile(researchIndexPath);
const persistedWorkingSet = readPersistedWorkingSet();

const tokenize = (value) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);

const stateTerms = new Set([
  ...tokenize(parseBullets(state, '## Current Workflow').join(' ')),
  ...tokenize(parseBullets(state, '## Current Phase').join(' ')),
  ...tokenize(parseBullets(state, '## Next Step').join(' ')),
  ...tokenize(parseBullets(state, '## Related Plan').join(' '))
]);

const explicitRelatedPlan = parseBullets(state, '## Related Plan').find((line) => line && line !== 'none');
const canonicalLatestPlan = () => listFiles(canonicalPlanRoot)[0] ?? null;
const legacyLatestPlan = () => listFiles(legacyPlanRoot)[0] ?? null;
const defaultPlanSuggestion = () => {
  if (explicitRelatedPlan && explicitRelatedPlan !== 'workflow upgrade from external repo comparison and SSOT integration') {
    return explicitRelatedPlan;
  }

  if (project.projectRoot !== root) {
    return legacyLatestPlan() ?? canonicalLatestPlan();
  }

  return canonicalLatestPlan() ?? legacyLatestPlan();
};

const scoreFile = (filePath) => {
  const base = path.basename(filePath).toLowerCase();
  let score = 0;
  for (const term of stateTerms) {
    if (base.includes(term)) score += 3;
  }
  const stat = safeStat(filePath);
  if (!stat) return score;
  score += Math.min(5, Math.round((Date.now() - stat.mtimeMs < 7 * 24 * 60 * 60 * 1000) ? 5 : 1));
  return score;
};

const readinessRank = (category, filePath) => {
  const readiness = classifyArtifactReadiness(category, filePath);
  if (readiness.ready) return 3;
  if (!readiness.legacySubstantial && readiness.status === 'not_ready') return 2;
  if (readiness.legacySubstantial) return 0;
  return 1;
};

const pickLatest = (category) => (
  category === 'plans'
    ? listPlanFiles()[0] ?? null
    : listFiles(categories[category])[0] ?? null
);

const pickRelated = (category) => {
  const files = category === 'plans' ? listPlanFiles() : listFiles(categories[category]);
  if (files.length === 0) return null;
  const readinessCategory = category === 'plans' ? 'plan' : category === 'research' ? 'research' : null;
  return files
    .map((filePath) => ({
      filePath,
      score: scoreFile(filePath),
      readiness: readinessCategory ? readinessRank(readinessCategory, filePath) : -1
    }))
    .sort((a, b) =>
      b.readiness - a.readiness ||
      b.score - a.score ||
      (safeStat(b.filePath)?.mtimeMs ?? 0) - (safeStat(a.filePath)?.mtimeMs ?? 0)
    )[0]?.filePath ?? null;
};

const latestSessionFromIndex = () => {
  const active = parseBullets(sessionIndex, '## Active Sessions');
  if (active.length > 0 && !active[0].includes('No active sessions')) {
    const artifactLine = active.find((line) => line.includes('Artifact path:'));
    if (artifactLine) return artifactLine.replace('Artifact path:', '').trim();
  }
  return pickLatest('sessions');
};

const researchFromIndex = () => {
  const entries = parseBullets(researchIndex, '## Entries');
  const artifactLine = entries.find((line) => line.toLowerCase().includes('artifact path:'));
  return artifactLine ? artifactLine.replace(/artifact path:/i, '').trim() : null;
};

const heuristicSuggestions = () => ({
  intake: pickRelated('intake'),
  plan: defaultPlanSuggestion(),
  research: pickRelated('research') ?? researchFromIndex(),
  session: latestSessionFromIndex(),
  handoff: pickRelated('handoffs')
});

const resolvedWorkingSet = (overrides = {}, metadata = {}) => {
  const suggested = heuristicSuggestions();
  const selected = {
    intake: normalizeArtifactPath(overrides.intake ?? persistedWorkingSet.selected.intake ?? suggested.intake ?? 'none'),
    plan: normalizeArtifactPath(overrides.plan ?? persistedWorkingSet.selected.plan ?? suggested.plan ?? 'none'),
    research: normalizeArtifactPath(overrides.research ?? persistedWorkingSet.selected.research ?? suggested.research ?? 'none'),
    session: normalizeArtifactPath(overrides.session ?? persistedWorkingSet.selected.session ?? suggested.session ?? 'none'),
    handoff: normalizeArtifactPath(overrides.handoff ?? persistedWorkingSet.selected.handoff ?? suggested.handoff ?? 'none')
  };

  return {
    lastUpdated: metadata.lastUpdated ?? persistedWorkingSet.lastUpdated ?? 'none',
    source: metadata.source ?? persistedWorkingSet.source ?? 'none',
    focus: metadata.focus ?? persistedWorkingSet.focus ?? 'none',
    selected,
    ordered: buildOrderedArtifacts(selected)
  };
};

const suggest = () => {
  const suggested = heuristicSuggestions();
  const workingSet = resolvedWorkingSet({}, {
    lastUpdated: persistedWorkingSet.lastUpdated,
    source: persistedWorkingSet.source,
    focus: persistedWorkingSet.focus
  });

  return {
    intake: workingSet.selected.intake,
    plan: workingSet.selected.plan,
    research: workingSet.selected.research,
    session: workingSet.selected.session,
    handoff: workingSet.selected.handoff,
    readiness: {
      plan: classifyArtifactReadiness('plan', workingSet.selected.plan),
      research: classifyArtifactReadiness('research', workingSet.selected.research)
    },
    active: workingSet,
    suggested
  };
};

const parseArgs = (args) => {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const value = args[index + 1];
    parsed[key] = value;
    index += 1;
  }
  return parsed;
};

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'latest': {
        const category = process.argv[3];
        if (!categories[category]) {
          console.error('Usage: node scripts/artifact-tools.mjs latest <plans|research|sessions|handoffs>');
          process.exitCode = 1;
          break;
        }
        console.log(pickLatest(category) ?? '');
        break;
      }
      case 'related':
        console.log(JSON.stringify({
          intake: pickRelated('intake'),
          plans: pickRelated('plans'),
          research: pickRelated('research'),
          sessions: pickRelated('sessions'),
          handoffs: pickRelated('handoffs')
        }, null, 2));
        break;
      case 'active':
        console.log(JSON.stringify(readPersistedWorkingSet(), null, 2));
        break;
      case 'persist': {
        const args = parseArgs(process.argv.slice(3));
        console.log(JSON.stringify(persistWorkingSetSelection({
          overrides: {
            intake: args.intake,
            plan: args.plan,
            research: args.research,
            session: args.session,
            handoff: args.handoff
          },
          metadata: {
            lastUpdated: new Date().toISOString(),
            source: args.source ?? 'manual',
            focus: args.focus ?? persistedWorkingSet.focus ?? 'none'
          }
        }), null, 2));
        break;
      }
      case 'suggest':
        console.log(JSON.stringify(suggest(), null, 2));
        break;
      default:
        console.error('Usage: node scripts/artifact-tools.mjs <suggest|related|latest|active|persist>');
        process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
