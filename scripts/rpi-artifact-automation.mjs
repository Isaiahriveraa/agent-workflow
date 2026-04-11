#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  gradePlanArtifact,
  gradeResearchArtifact,
  parseWorkflowArtifact
} from './workflow-artifact-tools.mjs';

const DEFAULT_COOLDOWN_MS = 30_000;
const ARTIFACT_DIRS = [
  ['research', 'thoughts/research'],
  ['plan', 'thoughts/plans'],
  ['legacy-research', '.planning/research'],
  ['legacy-plan', '.planning/plans']
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

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const projectKey = (projectRoot) =>
  crypto.createHash('sha1').update(path.resolve(projectRoot)).digest('hex').slice(0, 12);

const stateFileForProject = (projectRoot) =>
  path.join(getStateDir(), `rpi-artifact-automation-${projectKey(projectRoot)}.json`);

const loadState = (projectRoot) => {
  const stateFile = stateFileForProject(projectRoot);
  if (!fs.existsSync(stateFile)) {
    return {
      projectRoot: path.resolve(projectRoot),
      artifacts: {}
    };
  }

  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return {
      projectRoot: path.resolve(projectRoot),
      artifacts: {}
    };
  }
};

const saveState = (projectRoot, state) => {
  ensureDir(getStateDir());
  fs.writeFileSync(stateFileForProject(projectRoot), JSON.stringify(state, null, 2));
};

const listMarkdownFiles = (dirPath) => {
  if (!fs.existsSync(dirPath)) return [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files.sort();
};

const collectArtifactPaths = (projectRoot) =>
  ARTIFACT_DIRS.flatMap(([, relativeDir]) => listMarkdownFiles(path.join(projectRoot, relativeDir)));

const buildCriticPrompt = (artifactPath) => [
  `Run the rpi-critique workflow on this artifact: ${artifactPath}.`,
  `Read ${path.join(getAgentsRoot(), 'skills', 'rpi-critique', 'SKILL.md')} and follow it exactly.`,
  'Revise the artifact in place.',
  'Print only the required improvement summary after changes are applied.'
].join(' ');

const triggerCritic = ({ artifactPath, projectRoot, stateEntry }) => {
  const now = Date.now();
  stateEntry.lastTriggeredAt = now;
  stateEntry.triggerCount = Number(stateEntry.triggerCount ?? 0) + 1;

  if (process.env.AGENTS_RPI_CRITIC_LOG) {
    const payload = {
      artifactPath,
      projectRoot,
      triggeredAt: new Date(now).toISOString()
    };
    fs.appendFileSync(process.env.AGENTS_RPI_CRITIC_LOG, `${JSON.stringify(payload)}\n`);
    stateEntry.lastTriggerMode = 'log';
    return;
  }

  const child = spawn(
    'codex',
    [
      'exec',
      '--skip-git-repo-check',
      '--sandbox',
      'workspace-write',
      '--full-auto',
      '-C',
      projectRoot,
      buildCriticPrompt(artifactPath)
    ],
    {
      detached: true,
      stdio: 'ignore',
      cwd: projectRoot,
      env: process.env
    }
  );
  child.unref();
  stateEntry.lastTriggerMode = 'codex';
};

const artifactNeedsCritique = ({ artifactPath, projectRoot, stateEntry, cooldownMs }) => {
  const content = fs.readFileSync(artifactPath, 'utf8');

  let artifact;
  try {
    artifact = parseWorkflowArtifact({ filePath: artifactPath, content });
  } catch (error) {
    stateEntry.lastParseError = error.message;
    return false;
  }

  stateEntry.lastParseError = null;
  stateEntry.artifactType = artifact.artifactType;
  stateEntry.substantial = artifact.frontmatter.substantial === true;

  if (artifact.frontmatter.substantial !== true) {
    stateEntry.lastDecision = 'skip_non_substantial';
    return false;
  }

  const grade = artifact.artifactType === 'research'
    ? gradeResearchArtifact({ filePath: artifactPath, content })
    : artifact.artifactType === 'plan'
      ? gradePlanArtifact({ filePath: artifactPath, content })
      : null;

  if (!grade) {
    stateEntry.lastDecision = 'skip_unknown_artifact_type';
    return false;
  }

  stateEntry.lastGrade = {
    passes: grade.passes,
    declaredReady: grade.declaredReady,
    blockers: grade.blockers.map((blocker) => blocker.message)
  };

  if (grade.passes) {
    stateEntry.lastDecision = 'skip_ready';
    return false;
  }

  const now = Date.now();
  if ((now - Number(stateEntry.lastTriggeredAt ?? 0)) < cooldownMs) {
    stateEntry.lastDecision = 'skip_cooldown';
    return false;
  }

  stateEntry.lastDecision = 'trigger_critic';
  return true;
};

export const scanProjectArtifacts = ({
  projectRoot,
  cooldownMs = DEFAULT_COOLDOWN_MS
}) => {
  const resolvedProjectRoot = path.resolve(projectRoot);
  const state = loadState(resolvedProjectRoot);
  const artifactPaths = collectArtifactPaths(resolvedProjectRoot);
  const seenPaths = new Set(artifactPaths);

  let triggered = 0;

  for (const artifactPath of artifactPaths) {
    const stats = fs.statSync(artifactPath);
    const fingerprint = `${stats.size}:${Math.floor(stats.mtimeMs)}`;
    const stateEntry = state.artifacts[artifactPath] ?? {};

    if (stateEntry.fingerprint === fingerprint) {
      state.artifacts[artifactPath] = stateEntry;
      continue;
    }

    stateEntry.fingerprint = fingerprint;
    stateEntry.lastSeenAt = new Date().toISOString();
    state.artifacts[artifactPath] = stateEntry;

    if (artifactNeedsCritique({
      artifactPath,
      projectRoot: resolvedProjectRoot,
      stateEntry,
      cooldownMs
    })) {
      triggerCritic({
        artifactPath,
        projectRoot: resolvedProjectRoot,
        stateEntry
      });
      triggered += 1;
    }
  }

  for (const existingPath of Object.keys(state.artifacts)) {
    if (!seenPaths.has(existingPath)) {
      delete state.artifacts[existingPath];
    }
  }

  saveState(resolvedProjectRoot, state);

  return {
    projectRoot: resolvedProjectRoot,
    scannedCount: artifactPaths.length,
    triggeredCount: triggered,
    stateFile: stateFileForProject(resolvedProjectRoot)
  };
};

const runCli = () => {
  const command = process.argv[2];
  const args = parseArgs(process.argv.slice(3));

  try {
    switch (command) {
      case 'scan': {
        const projectRoot = args['project-root'] ?? process.cwd();
        const cooldownMs = args['cooldown-ms'] ? Number(args['cooldown-ms']) : DEFAULT_COOLDOWN_MS;
        const result = scanProjectArtifacts({ projectRoot, cooldownMs });
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      default:
        console.error('Usage: node scripts/rpi-artifact-automation.mjs scan [--project-root path] [--cooldown-ms number]');
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
const getAgentsRoot = () =>
  process.env.AGENTS_ROOT
    ? path.resolve(process.env.AGENTS_ROOT)
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const getStateDir = () => path.join(getAgentsRoot(), '.pids');
