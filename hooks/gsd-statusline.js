#!/usr/bin/env node

import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const statuslinePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../adapters/claude-code/statusline/gsd-statusline.cjs'
);

const child = spawn(process.execPath, [statuslinePath], {
  stdio: 'inherit'
});

child.on('error', () => {
  process.exit(0);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
