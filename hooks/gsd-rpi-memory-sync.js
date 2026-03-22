#!/usr/bin/env node

import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const hookPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  './gsd-rpi-memory-sync.cjs'
);

const child = spawn(process.execPath, [hookPath], {
  stdio: 'inherit'
});

child.on('error', () => {
  process.exit(0);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
