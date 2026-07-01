#!/usr/bin/env node

/**
 * check-unsaved-decisions.mjs — Stop hook that detects undocumented changes.
 *
 * Runs on session Stop. If source files were changed this session but no
 * corresponding decision entry exists in the weekly decisions.md, warns.
 *
 * Hook output format (stdout JSON):
 *   { hookSpecificOutput: { hookEventName, additionalContext } }
 *
 * Silent exit (no output) when no gaps found.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const IGNORED_PATTERNS = [
  /node_modules/,
  /\.git/,
  /package-lock\.json/,
  /yarn\.lock/,
  /pnpm-lock\.yaml/,
  /\.env/,
  /\.env\./,
  /memory\.db/,
  /\.jpg$/, /\.png$/, /\.gif$/, /\.svg$/, /\.ico$/,
  /\.woff/, /\.ttf/, /\.eot/,
];

function isIgnored(filePath) {
  return IGNORED_PATTERNS.some((p) => p.test(filePath));
}

function getChangedFiles(cwd) {
  try {
    // Staged changes
    const staged = execSync('git diff --cached --name-only', {
      cwd, encoding: 'utf8', timeout: 10000,
    }).split('\n').filter(Boolean);

    // Unstaged changes
    const unstaged = execSync('git diff --name-only', {
      cwd, encoding: 'utf8', timeout: 10000,
    }).split('\n').filter(Boolean);

    // Untracked files
    const untracked = execSync('git ls-files --others --exclude-standard', {
      cwd, encoding: 'utf8', timeout: 10000,
    }).split('\n').filter(Boolean);

    return [...new Set([...staged, ...unstaged, ...untracked])]
      .filter((f) => !isIgnored(f));
  } catch {
    return [];
  }
}

function getCurrentMonth() {
  const now = new Date();
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  return `${months[now.getMonth()]}-${now.getFullYear()}`;
}

function findAgentsRoot(cwd) {
  // Walk up from cwd looking for .agents/AGENTS.md
  let current = path.resolve(cwd);
  while (current !== '/') {
    if (fs.existsSync(path.join(current, '.agents', 'AGENTS.md'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  // Check if cwd IS the agents root
  if (fs.existsSync(path.join(cwd, 'AGENTS.md'))) {
    return cwd;
  }
  return null;
}

function main() {
  const cwd = process.cwd();
  const agentsRoot = findAgentsRoot(cwd);
  if (!agentsRoot) return;

  const month = getCurrentMonth();
  const decisionsPath = path.join(agentsRoot, 'thoughts', month, 'decisions.md');

  if (!fs.existsSync(decisionsPath)) {
    // No decisions file for this week — nothing to check against
    return;
  }

  const changedFiles = getChangedFiles(agentsRoot);
  if (changedFiles.length === 0) return;

  const decisionsContent = fs.readFileSync(decisionsPath, 'utf8');

  // Find files that were changed but not mentioned in any decision entry
  const undocumented = changedFiles.filter((file) => {
    // Normalize: strip leading ./ and any common prefixes
    const normalized = file.replace(/^\.\//, '');
    return !decisionsContent.includes(normalized);
  });

  if (undocumented.length === 0) return;

  const warning = [
    `**Undocumented changes detected.** The following files were modified this session but are not referenced in \`thoughts/${week}/decisions.md\`:`,
    '',
    ...undocumented.map((f) => `- \`${f}\``),
    '',
    'Run `/capture-decision` for each distinct change that represents an architectural or implementation choice.',
    'If the changes are all trivial (typos, formatting, comments), ignore this warning.',
  ].join('\n');

  const output = JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'Stop',
      additionalContext: warning,
      source: 'check-unsaved-decisions',
    },
  });

  process.stdout.write(output);
}

main();
