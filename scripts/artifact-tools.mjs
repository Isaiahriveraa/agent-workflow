import fs from 'node:fs';
import path from 'node:path';

const root = '/Users/isaiahrivera/.agents';
const thoughtsRoot = path.join(root, 'thoughts');
const statePath = path.join(root, 'contexts/state.md');

const categories = {
  plans: path.join(thoughtsRoot, 'plans'),
  research: path.join(thoughtsRoot, 'research'),
  sessions: path.join(thoughtsRoot, 'sessions'),
  handoffs: path.join(thoughtsRoot, 'handoffs')
};

const readFile = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const readState = () => fs.readFileSync(statePath, 'utf8');

const replaceSection = (content, heading, replacement) => {
  const pattern = new RegExp(`(^${heading}\\n)([\\s\\S]*?)(?=\\n## |\\s*$)`, 'm');
  if (!pattern.test(content)) {
    return `${content.trimEnd()}\n\n${heading}\n${replacement.trimEnd()}\n`;
  }
  return content.replace(pattern, `$1${replacement.trimEnd()}\n`);
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
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
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

const readPersistedWorkingSet = () => {
  const state = readState();
  const sectionMatch = state.match(/## Active Artifact Working Set\n([\s\S]*?)(?=\n## |\s*$)/);
  if (!sectionMatch) {
    return {
      lastUpdated: 'none',
      source: 'none',
      focus: 'none',
      selected: {
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
  for (const key of ['plan', 'research', 'session', 'handoff']) {
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
  const updated = replaceSection(state, '## Active Artifact Working Set', renderWorkingSetSection(workingSet));
  fs.writeFileSync(statePath, updated);
  return workingSet;
};

const state = readState();
const sessionIndex = readFile('contexts/session-index.md');
const researchIndex = readFile('contexts/research-index.md');
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

const scoreFile = (filePath) => {
  const base = path.basename(filePath).toLowerCase();
  let score = 0;
  for (const term of stateTerms) {
    if (base.includes(term)) score += 3;
  }
  const stat = fs.statSync(filePath);
  score += Math.min(5, Math.round((Date.now() - stat.mtimeMs < 7 * 24 * 60 * 60 * 1000) ? 5 : 1));
  return score;
};

const pickLatest = (category) => listFiles(categories[category])[0] ?? null;

const pickRelated = (category) => {
  const files = listFiles(categories[category]);
  if (files.length === 0) return null;
  return files
    .map((filePath) => ({ filePath, score: scoreFile(filePath) }))
    .sort((a, b) => b.score - a.score || fs.statSync(b.filePath).mtimeMs - fs.statSync(a.filePath).mtimeMs)[0]?.filePath ?? null;
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
  plan: explicitRelatedPlan && explicitRelatedPlan !== 'workflow upgrade from external repo comparison and SSOT integration'
    ? explicitRelatedPlan
    : pickRelated('plans'),
  research: researchFromIndex() ?? pickRelated('research'),
  session: latestSessionFromIndex(),
  handoff: pickRelated('handoffs')
});

const resolvedWorkingSet = (overrides = {}, metadata = {}) => {
  const suggested = heuristicSuggestions();
  const selected = {
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
    plan: workingSet.selected.plan,
    research: workingSet.selected.research,
    session: workingSet.selected.session,
    handoff: workingSet.selected.handoff,
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
      const workingSet = resolvedWorkingSet({
        plan: args.plan,
        research: args.research,
        session: args.session,
        handoff: args.handoff
      }, {
        lastUpdated: new Date().toISOString(),
        source: args.source ?? 'manual',
        focus: args.focus ?? persistedWorkingSet.focus ?? 'none'
      });
      console.log(JSON.stringify(persistWorkingSet(workingSet), null, 2));
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
