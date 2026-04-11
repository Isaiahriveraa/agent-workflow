#!/usr/bin/env node
// Mechanical wiki sync — reads project state.md files and updates wiki project pages.
// No LLM involved. Runs as a background process spawned by the stop hook.

import fs from 'fs';
import path from 'path';

const AGENTS_ROOT = path.join(process.env.HOME, '.agents');
const WIKI_ROOT = path.join(process.env.HOME, 'wiki');
const PROJECTS_DIR = path.join(AGENTS_ROOT, 'projects');
const WIKI_PROJECTS_DIR = path.join(WIKI_ROOT, 'wiki', 'projects');
const PROJECT_MAP_FILE = path.join(WIKI_ROOT, '.project-map.json');
const LOG_FILE = path.join(WIKI_ROOT, 'log.md');

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadProjectMap() {
  try {
    return JSON.parse(fs.readFileSync(PROJECT_MAP_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function parseStateSection(content, heading) {
  const re = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const m = content.match(re);
  if (!m) return null;
  return m[1].trim().replace(/^- /gm, '').trim() || null;
}

function readProjectState(projectDir) {
  const stateFile = path.join(projectDir, 'contexts', 'state.md');
  try {
    const content = fs.readFileSync(stateFile, 'utf8');
    return {
      workflow: parseStateSection(content, 'Current Workflow'),
      phase: parseStateSection(content, 'Current Phase'),
      nextStep: parseStateSection(content, 'Next Step'),
      blockers: parseStateSection(content, 'Blockers'),
      lastVerified: parseStateSection(content, 'Last Verified At'),
    };
  } catch {
    return null;
  }
}

function buildStateMarkdown(state) {
  const lines = ['## Current State', ''];
  if (state.workflow) lines.push(`- **Workflow:** ${state.workflow}`);
  if (state.phase) lines.push(`- **Phase:** ${state.phase}`);
  if (state.nextStep) lines.push(`- **Next:** ${state.nextStep}`);
  if (state.blockers && state.blockers.toLowerCase() !== 'none' && state.blockers !== 'None.')
    lines.push(`- **Blockers:** ${state.blockers}`);
  if (state.lastVerified) lines.push(`- **Last verified:** ${state.lastVerified}`);
  return lines.join('\n');
}

function updateWikiPage(wikiPagePath, state) {
  let content = fs.readFileSync(wikiPagePath, 'utf8');

  // Replace Current State section
  const stateRe = /## Current State\n[\s\S]*?(?=\n## )/;
  const newState = buildStateMarkdown(state) + '\n\n';
  if (stateRe.test(content)) {
    content = content.replace(stateRe, newState);
  }

  // Update frontmatter updated date
  content = content.replace(/^(updated:\s*).+$/m, `$1${today()}`);

  fs.writeFileSync(wikiPagePath, content, 'utf8');
}

function appendLog(updatedProjects) {
  if (updatedProjects.length === 0) return;
  const entry = [
    '',
    `## [${today()}] auto-sync | Session end state sync`,
    '',
    ...updatedProjects.map(p => `- Updated [[${p}]]`),
    '',
  ].join('\n');
  fs.appendFileSync(LOG_FILE, entry, 'utf8');
}

// Main
try {
  const projectMap = loadProjectMap();
  const updatedProjects = [];

  let projectDirs;
  try {
    projectDirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch {
    process.exit(0);
  }

  for (const dirName of projectDirs) {
    try {
      // Strip trailing hash: "agents-43142fc2" -> "agents"
      const slug = dirName.replace(/-[a-f0-9]{8}$/, '');
      const wikiPageName = projectMap[slug];

      // null means explicitly skip, undefined means no mapping
      if (wikiPageName === null || wikiPageName === undefined) continue;

      const wikiPagePath = path.join(WIKI_PROJECTS_DIR, `${wikiPageName}.md`);
      if (!fs.existsSync(wikiPagePath)) continue;

      const state = readProjectState(path.join(PROJECTS_DIR, dirName));
      if (!state || (!state.workflow && !state.phase)) continue;

      updateWikiPage(wikiPagePath, state);
      updatedProjects.push(wikiPageName);
    } catch {
      // Silent failure per project — continue to next
    }
  }

  appendLog(updatedProjects);
} catch {
  // Top-level silent failure
}

process.exit(0);
