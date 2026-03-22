#!/usr/bin/env node
// PostToolUse hook — auto-grades research/plan artifacts after Write/Edit/MultiEdit.
// Updates research-index.md and STATE.md working set without blocking Claude.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const AGENTS_ROOT = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.join(os.homedir(), '.agents');
const ARTIFACT_TOOLS = path.join(AGENTS_ROOT, 'scripts', 'workflow-artifact-tools.mjs');

const RESEARCH_RE = /\/.planning\/research\/[^/]+\.md$/;
const PLAN_RE = /\/.planning\/plans\/[^/]+\.md$/;

// Debounce: skip if we already graded this file within the last 10 seconds
const DEBOUNCE_SECONDS = 10;
const cacheDir = path.join(os.homedir(), '.claude', 'cache');
const debounceFile = path.join(cacheDir, 'gsd-artifact-debounce.json');

// Lock guard — prevent multiple concurrent grader spawns
const LOCK_FILE = path.join(os.tmpdir(), 'gsd-artifact-grader.lock');
const LOCK_TTL = 60; // seconds

function isGraderRunning() {
  try {
    if (!fs.existsSync(LOCK_FILE)) return false;
    const data = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
    if ((Date.now() / 1000) - (data.ts || 0) > LOCK_TTL) return false;
    try { process.kill(data.pid, 0); return true; } catch (_) { return false; }
  } catch (_) { return false; }
}

function writeLock(pid) {
  try { fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid, ts: Date.now() / 1000 })); } catch (_) {}
}

let input = '';
// Timeout guard: exit silently if stdin doesn't close within 3s
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const payload = input.trim() ? JSON.parse(input) : {};
    const toolName = payload.tool_name ?? '';
    const filePath = payload.tool_input?.file_path ?? payload.tool_input?.path ?? '';

    if (!['Write', 'Edit', 'MultiEdit'].includes(toolName) || !filePath) {
      process.exit(0);
    }

    const isResearch = RESEARCH_RE.test(filePath);
    const isPlan = PLAN_RE.test(filePath);

    if (!isResearch && !isPlan) {
      process.exit(0);
    }

    // Debounce: skip if we graded this file recently
    const now = Math.floor(Date.now() / 1000);
    let debounceData = {};
    try {
      if (fs.existsSync(debounceFile)) {
        debounceData = JSON.parse(fs.readFileSync(debounceFile, 'utf8'));
      }
    } catch (_) {}

    if ((now - (debounceData[filePath] ?? 0)) < DEBOUNCE_SECONDS) {
      process.exit(0);
    }

    // Update debounce record, pruning entries older than 60s
    debounceData[filePath] = now;
    for (const key of Object.keys(debounceData)) {
      if (now - debounceData[key] > 60) delete debounceData[key];
    }
    try {
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(debounceFile, JSON.stringify(debounceData));
    } catch (_) {}

    const command = isResearch ? 'grade-research' : 'grade-plan';
    const cwd = payload.cwd || payload.workspace?.current_dir || process.cwd();

    if (isGraderRunning()) {
      process.exit(0);
    }

    const grader = spawn(
      process.execPath,
      [ARTIFACT_TOOLS, command, '--file', filePath],
      {
        detached: true,
        stdio: 'ignore',
        cwd,
        env: { ...process.env, AGENTS_PROJECT_ROOT: cwd }
      }
    );
    writeLock(grader.pid);
    grader.unref();
  } catch (_) {
    // Silent fail — never block Claude.
  }

  process.exit(0);
});
