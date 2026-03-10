#!/usr/bin/env node
// Flush queued learning-loop captures at the end of a Claude run.
// This hook stays non-blocking and silent so it does not interfere with
// normal stop handling or subagent completion.

const path = require('path');
const { spawn } = require('child_process');

const AGENTS_ROOT = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(__dirname, '../../..');
const LESSON_AUTOMATION_MODE = process.env.AGENTS_LESSON_AUTOMATION ?? 'on';
const LESSON_HELPER = process.env.AGENTS_LESSON_HELPER
  ? path.resolve(process.env.AGENTS_LESSON_HELPER)
  : path.join(AGENTS_ROOT, 'scripts', 'lesson-tools.mjs');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', () => {
  try {
    if (LESSON_AUTOMATION_MODE === 'off') {
      process.exit(0);
    }

    const payload = input.trim() ? JSON.parse(input) : {};
    const cwd = payload.cwd || payload.workspace?.current_dir || process.cwd();

    const child = spawn(process.execPath, [LESSON_HELPER, 'flush'], {
      detached: false,
      stdio: 'ignore',
      cwd,
      env: {
        ...process.env,
        AGENTS_PROJECT_ROOT: cwd
      }
    });

    child.unref();
  } catch (error) {
    // Silent fail to keep Stop/SubagentStop non-blocking.
  }

  process.exit(0);
});
