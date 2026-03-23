#!/usr/bin/env node
// PostToolUse hook — auto-grades research/plan artifacts after Write/Edit/MultiEdit.
// Updates research-index.md and STATE.md working set without blocking Claude.

const path = require('path');
const { spawn } = require('child_process');

const AGENTS_ROOT = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(__dirname, '../../..');
const ARTIFACT_TOOLS = path.join(AGENTS_ROOT, 'scripts', 'workflow-artifact-tools.mjs');

const RESEARCH_RE = /\/.planning\/research\/[^/]+\.md$/;
const PLAN_RE = /\/.planning\/plans\/[^/]+\.md$/;

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
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
  } catch (_) {
    // Silent fail — never block Claude.
  }

  process.exit(0);
});
