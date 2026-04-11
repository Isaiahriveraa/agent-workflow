#!/usr/bin/env node
// PostToolUse hook — auto-grades research/plan artifacts after Write/Edit/MultiEdit.
// Updates research-index.md and STATE.md working set without blocking Claude.
// Also prompts Claude to run /rpi-critique on the artifact.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const AGENTS_ROOT = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(__dirname, '../../..');
const ARTIFACT_TOOLS = path.join(AGENTS_ROOT, 'scripts', 'workflow-artifact-tools.mjs');

const RESEARCH_RE = /\/thoughts\/research\/[^/]+\.md$/;
const PLAN_RE = /\/thoughts\/plans\/[^/]+\.md$/;

// Debounce repeated PostToolUse events for the same artifact.
const DEBOUNCE_SECONDS = 10;
const cacheDir = path.join(os.homedir(), '.claude', 'cache');
const debounceFile = path.join(cacheDir, 'gsd-artifact-debounce.json');

let input = '';
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
    grader.unref();

    const artifactType = isResearch ? 'research' : 'plan';
    process.stdout.write(
      `\n${artifactType.charAt(0).toUpperCase() + artifactType.slice(1)} artifact detected: ${filePath}\n`
      + `Run /rpi-critique ${filePath} to critique and improve this artifact in-place.\n`
    );
  } catch (_) {
    // Silent fail — never block Claude.
  }

  process.exit(0);
});
