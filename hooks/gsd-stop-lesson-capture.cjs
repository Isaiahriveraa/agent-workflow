#!/usr/bin/env node
// Flush queued learning-loop captures at the end of a Claude run.
// This hook stays non-blocking and silent so it does not interfere with
// normal stop handling or subagent completion.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const AGENTS_ROOT = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.join(os.homedir(), '.agents');
const LESSON_AUTOMATION_MODE = process.env.AGENTS_LESSON_AUTOMATION ?? 'on';
const LESSON_HELPER = process.env.AGENTS_LESSON_HELPER
  ? path.resolve(process.env.AGENTS_LESSON_HELPER)
  : path.join(AGENTS_ROOT, 'scripts', 'lesson-tools.mjs');

const homeDir = os.homedir();
const tmpDir = os.tmpdir();
const cacheDir = process.env.AGENTS_CACHE_DIR || path.join(homeDir, '.claude', 'cache');
const cacheFile = path.join(cacheDir, 'gsd-lesson-flush.json');

let input = '';
// Timeout guard: exit silently if stdin doesn't close within 3s
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    if (LESSON_AUTOMATION_MODE === 'off') {
      process.exit(0);
    }

    // Debounce: don't flush if we flushed recently (last 1 hour)
    if (fs.existsSync(cacheFile)) {
      try {
        const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        const now = Math.floor(Date.now() / 1000);
        if (cache.checked && (now - cache.checked) < 3600) {
          process.exit(0);
        }
      } catch (e) {
        // Corrupted cache, proceed with flush
      }
    }

    // Record this flush attempt
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(cacheFile, JSON.stringify({ checked: Math.floor(Date.now() / 1000) }));

    const payload = input.trim() ? JSON.parse(input) : {};
    const cwd = payload.cwd || payload.workspace?.current_dir || process.cwd();

    // Clean up context monitor temp files for this session (hardening)
    try {
      const sessionId = payload.session_id;
      if (sessionId) {
        const metricsPath = path.join(tmpDir, `claude-ctx-${sessionId}.json`);
        const warnPath = path.join(tmpDir, `claude-ctx-${sessionId}-warned.json`);
        if (fs.existsSync(metricsPath)) fs.unlinkSync(metricsPath);
        if (fs.existsSync(warnPath)) fs.unlinkSync(warnPath);
      }
    } catch (_) {}

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
