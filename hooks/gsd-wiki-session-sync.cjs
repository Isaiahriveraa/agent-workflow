#!/usr/bin/env node
// Sync project state to wiki project pages at session end.
// Debounced to 5 minutes. Spawns wiki-session-sync.mjs in background.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CACHE = path.join(process.env.HOME, '.claude', 'cache', 'gsd-wiki-session-sync.json');
const DEBOUNCE_SECONDS = 300;
const SYNC_SCRIPT = path.join(process.env.HOME, '.agents', 'scripts', 'wiki-session-sync.mjs');

// Read stdin (hook contract), but we don't need the data
let input = '';
const stdinTimeout = setTimeout(() => run(), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => { clearTimeout(stdinTimeout); run(); });

function run() {
  try {
    // Debounce: skip if ran within the last 5 minutes
    try {
      const cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
      if (Date.now() / 1000 - cache.lastRun < DEBOUNCE_SECONDS) process.exit(0);
    } catch {
      // No cache or unreadable — proceed
    }

    // Check wiki exists
    if (!fs.existsSync(path.join(process.env.HOME, 'wiki', 'CLAUDE.md'))) process.exit(0);

    fs.mkdirSync(path.dirname(CACHE), { recursive: true });
    fs.writeFileSync(CACHE, JSON.stringify({ lastRun: Date.now() / 1000 }));

    const child = spawn(process.execPath, [SYNC_SCRIPT], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  } catch {
    // Silent failure
  }
  process.exit(0);
}
