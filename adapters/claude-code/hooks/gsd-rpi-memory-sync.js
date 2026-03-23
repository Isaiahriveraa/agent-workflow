#!/usr/bin/env node
// PostToolUse hook — immediately mirrors a newly written lesson artifact to mem0/LanceDB.
// Fires only on Write to **/.planning/lessons/*.md (queue files handled at Stop).

const path = require('path');
const { spawn } = require('child_process');

const AGENTS_ROOT = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(__dirname, '../../..');
const LESSON_TOOLS = process.env.AGENTS_LESSON_HELPER
  ? path.resolve(process.env.AGENTS_LESSON_HELPER)
  : path.join(AGENTS_ROOT, 'scripts', 'lesson-tools.mjs');

const LESSON_RE = /\/.planning\/lessons\/[^/]+\.md$/;
const QUEUE_RE = /\/.planning\/lessons\/(?:queue|pending|draft)/i;

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = input.trim() ? JSON.parse(input) : {};
    const toolName = payload.tool_name ?? '';
    const filePath = payload.tool_input?.file_path ?? payload.tool_input?.path ?? '';

    if (toolName !== 'Write' || !filePath) {
      process.exit(0);
    }

    if (!LESSON_RE.test(filePath) || QUEUE_RE.test(filePath)) {
      process.exit(0);
    }

    const cwd = payload.cwd || payload.workspace?.current_dir || process.cwd();

    const flusher = spawn(
      process.execPath,
      [LESSON_TOOLS, 'flush', '--file', filePath],
      {
        detached: true,
        stdio: 'ignore',
        cwd,
        env: { ...process.env, AGENTS_PROJECT_ROOT: cwd }
      }
    );
    flusher.unref();
  } catch (_) {
    // Silent fail — never block Claude.
  }

  process.exit(0);
});
