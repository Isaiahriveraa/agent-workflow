#!/usr/bin/env node
// Run memory consolidation (dedup, expiry, promotion) at session end
// Debounced to 1 hour to avoid redundant runs across rapid session cycles
// Adapter copy — mirrors hooks/gsd-stop-memory-consolidation.cjs

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CACHE = path.join(process.env.HOME, '.claude', 'cache', 'gsd-memory-consolidation.json');
const DEBOUNCE_SECONDS = 3600;

let cwd;
try {
  const input = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'));
  cwd = input.cwd || (input.workspace && input.workspace.current_dir) || process.cwd();
} catch {
  cwd = process.cwd();
}

// Debounce: skip if ran within the last hour
try {
  const cache = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  if (Date.now() / 1000 - cache.lastRun < DEBOUNCE_SECONDS) process.exit(0);
} catch {
  // No cache or unreadable — proceed
}

fs.mkdirSync(path.dirname(CACHE), { recursive: true });
fs.writeFileSync(CACHE, JSON.stringify({ lastRun: Date.now() / 1000 }));

const child = spawn('node', [
  path.join(process.env.HOME, '.agents', 'scripts', 'memory-consolidation.mjs'),
  'run'
], {
  detached: true,
  stdio: 'ignore',
  env: Object.assign({}, process.env, { AGENTS_PROJECT_ROOT: cwd })
});

child.unref();
process.exit(0);
