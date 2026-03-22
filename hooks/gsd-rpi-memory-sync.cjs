#!/usr/bin/env node
// PostToolUse hook — immediately mirrors a newly written lesson artifact to mem0/LanceDB.
// Fires only on Write to **/.planning/lessons/*.md (queue files handled at Stop).

const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const AGENTS_ROOT = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.join(os.homedir(), '.agents');
const LESSON_TOOLS = process.env.AGENTS_LESSON_HELPER
  ? path.resolve(process.env.AGENTS_LESSON_HELPER)
  : path.join(AGENTS_ROOT, 'scripts', 'lesson-tools.mjs');

const LESSON_RE = /\/.planning\/lessons\/[^/]+\.md$/;
const QUEUE_RE = /\/.planning\/lessons\/(?:queue|pending|draft)/i;

// Lock guard — prevent multiple concurrent lesson-flush spawns
const LOCK_FILE = path.join(os.tmpdir(), 'gsd-lesson-flush.lock');
const LOCK_TTL = 60; // seconds

function isFlushRunning() {
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

    if (toolName !== 'Write' || !filePath) {
      process.exit(0);
    }

    if (!LESSON_RE.test(filePath) || QUEUE_RE.test(filePath)) {
      process.exit(0);
    }

    const cwd = payload.cwd || payload.workspace?.current_dir || process.cwd();

    if (isFlushRunning()) {
      process.exit(0);
    }

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
    writeLock(flusher.pid);
    flusher.unref();
  } catch (_) {
    // Silent fail — never block Claude.
  }

  process.exit(0);
});
