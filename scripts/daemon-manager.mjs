#!/usr/bin/env node
/**
 * daemon-manager.mjs
 * 
 * Lightweight local Background Daemon Manager for periodic maintenance.
 * Subcommands:
 *   start   - Spawns the daemon locally in the background
 *   stop    - Kills the daemon process
 *   status  - Shows if the daemon is running
 *   run     - Internal detached process loop
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const AGENTS_ROOT = process.env.AGENTS_ROOT
  ? path.resolve(process.env.AGENTS_ROOT)
  : path.resolve(__filename, '..', '..');

const pidsDir = path.join(AGENTS_ROOT, '.pids');
const pidFile = path.join(pidsDir, 'daemon.pid');
const logFile = path.join(pidsDir, 'daemon.log');
const syncScript = path.join(AGENTS_ROOT, 'scripts', 'memory-sync-tools.mjs');

const ONE_HOUR_MS = 60 * 60 * 1000;

const log = (msg) => {
  const ts = new Date().toISOString();
  fs.appendFileSync(logFile, `[${ts}] ${msg}\n`);
};

const getStatus = () => {
  if (!fs.existsSync(pidFile)) return { running: false, pid: null };
  const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
  if (isNaN(pid)) return { running: false, pid: null };
  try {
    process.kill(pid, 0); // Check if process exists
    return { running: true, pid };
  } catch (e) {
    if (e.code === 'ESRCH') {
      // Process is dead, clean up pid
      fs.unlinkSync(pidFile);
      return { running: false, pid: null };
    }
    throw e;
  }
};

const start = () => {
  const status = getStatus();
  if (status.running) {
    console.log(`Daemon is already running with PID ${status.pid}`);
    return;
  }
  if (!fs.existsSync(pidsDir)) {
    fs.mkdirSync(pidsDir, { recursive: true });
  }

  const out = fs.openSync(logFile, 'a');
  const err = fs.openSync(logFile, 'a');

  log('Starting daemon...');
  const child = spawn(process.execPath, [__filename, 'run'], {
    detached: true,
    stdio: ['ignore', out, err],
    env: process.env
  });

  fs.writeFileSync(pidFile, child.pid.toString() + '\n');
  child.unref();

  console.log(`Daemon started in background with PID ${child.pid}`);
  console.log(`Logs available at ${logFile}`);
};

const stop = () => {
  const status = getStatus();
  if (!status.running) {
    console.log('Daemon is not running.');
    return;
  }
  try {
    process.kill(status.pid, 'SIGTERM');
    console.log(`Stopped daemon (PID ${status.pid}).`);
    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile);
    }
  } catch (e) {
    console.error(`Failed to stop daemon: ${e.message}`);
  }
};

const runLoop = () => {
  log('Daemon loop initialized.');
  
  const tick = () => {
    log('Running hourly memory consolidation...');
    try {
      if (fs.existsSync(syncScript)) {
        const result = spawnSync(process.execPath, [syncScript, 'consolidate'], {
          encoding: 'utf8',
          env: process.env
        });
        if (result.status === 0) {
          log('Consolidation succeeded.');
        } else {
          log(`Consolidation failed: ${result.stderr || result.stdout}`);
        }
      } else {
        log(`WARNING: memory-sync-tools.mjs not found at ${syncScript}`);
      }
    } catch (e) {
      log(`Error running consolidation: ${e.message}`);
    }
  };

  // Run once on startup, then every hour
  tick();
  setInterval(tick, ONE_HOUR_MS);

  process.on('SIGTERM', () => {
    log('Received SIGTERM, shutting down gently.');
    if (fs.existsSync(pidFile)) {
      try { fs.unlinkSync(pidFile); } catch(e){}
    }
    process.exit(0);
  });
};

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'start':
    start();
    break;
  case 'stop':
    stop();
    break;
  case 'status': {
    const status = getStatus();
    console.log(`Daemon is ${status.running ? 'RUNNING (PID ' + status.pid + ')' : 'STOPPED'}`);
    break;
  }
  case 'run':
    runLoop();
    break;
  default:
    console.log('Usage: node scripts/daemon-manager.mjs <start|stop|status>');
    process.exit(1);
}
