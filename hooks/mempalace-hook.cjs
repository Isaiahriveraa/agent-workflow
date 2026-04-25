#!/usr/bin/env node

const fs = require('fs');
const { spawnSync } = require('child_process');

const hookName = process.argv[2];
const harness = process.argv[3];
const python = process.env.AGENTS_MEMPALACE_PYTHON || '/opt/homebrew/bin/python3.13';

if (!hookName || !harness) {
  process.exit(0);
}

const input = (() => {
  try {
    return fs.readFileSync('/dev/stdin', 'utf8');
  } catch {
    return '{}';
  }
})();

const installCheck = spawnSync(python, ['-c', 'import importlib.util,sys; sys.exit(0 if importlib.util.find_spec("mempalace") else 1)'], {
  encoding: 'utf8',
  env: process.env,
  timeout: 4000
});

if (installCheck.status !== 0) {
  process.exit(0);
}

const hookRun = spawnSync(python, ['-m', 'mempalace', 'hook', 'run', '--hook', hookName, '--harness', harness], {
  input,
  encoding: 'utf8',
  env: process.env,
  timeout: 30000
});

if (hookRun.stdout) {
  process.stdout.write(hookRun.stdout);
}

process.exit(0);
